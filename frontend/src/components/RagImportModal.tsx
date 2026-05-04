import { useState, useRef, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../lib/utils";
import { handle401 } from "../lib/auth";
import type { Topic, Evaluation, Schedule } from "../lib/types";
import "./RagImportModal.css";

/* ── Types ── */
interface ExtractedData {
  disciplineName?: string | null;
  description?: string | null;
  references?: string | null;
  topics?: { title: string; description?: string | null; dueDate?: string | null }[];
  evaluations?: { title: string; date?: string | null; maxGrade?: number }[];
  schedules?: { dayOfWeek: number; startTime: string; endTime: string }[];
}

interface InsertedResult {
  topics: number;
  evaluations: number;
  schedules: number;
}

type Step = "input" | "loading" | "review" | "success";
type InputMode = "text" | "pdf";

interface Props {
  disciplineId: string;
  onClose: () => void;
  onConfirmed: (data: {
    topics?: Topic[];
    evaluations?: Evaluation[];
    schedules?: Schedule[];
    description?: string | null;
    references?: string | null;
  }) => void;
}

const DAY_NAMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

/* ── PDF text extraction via pdfjs-dist ── */
async function extractTextFromPdf(file: File): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.mjs",
    import.meta.url,
  ).toString();

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((item: unknown) => (item as { str: string }).str)
      .join(" ");
    pages.push(text);
  }

  return pages.join("\n\n");
}

/* ── Component ── */
const RagImportModal = ({ disciplineId, onClose, onConfirmed }: Props) => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("input");
  const [inputMode, setInputMode] = useState<InputMode>("text");
  const [textContent, setTextContent] = useState("");
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");

  // Review state
  const [extracted, setExtracted] = useState<ExtractedData>({});
  const [insertedResult, setInsertedResult] = useState<InsertedResult | null>(null);

  const token = localStorage.getItem("token");

  /* ── Handle PDF file pick ── */
  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      setError("Formato não suportado. Apenas arquivos PDF são aceitos. Para outros formatos, copie o texto e cole na aba \"Colar Texto\".");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("O arquivo é muito grande (máx. 10 MB). Tente um PDF menor ou cole o texto manualmente.");
      return;
    }

    setFileName(file.name);
    setError("");

    try {
      const text = await extractTextFromPdf(file);
      if (!text.trim()) {
        setError("O PDF não contém texto extraível. Ele pode ser uma imagem digitalizada. Tente copiar o texto manualmente e colar na aba \"Colar Texto\".");
        setInputMode("text");
        return;
      }
      setTextContent(text);
    } catch {
      setError("Não foi possível ler o PDF. O arquivo pode estar corrompido ou protegido por senha. Tente colar o texto manualmente.");
      setInputMode("text");
    }
  }, []);

  /* ── Step 1 → Extract ── */
  const handleExtract = useCallback(async () => {
    if (!textContent.trim()) {
      setError("Nenhum conteúdo para extrair. Cole o texto do documento ou carregue um PDF antes de continuar.");
      return;
    }

    setStep("loading");
    setError("");

    try {
      const res = await axios.post<{ extracted: ExtractedData }>(
        `${API_URL}/rag/extract`,
        {
          content: textContent,
          contentType: inputMode === "pdf" ? "pdf" : "text",
          disciplineId,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      const data = res.data.extracted;
      const hasData =
        (data.topics?.length ?? 0) > 0 ||
        (data.evaluations?.length ?? 0) > 0 ||
        (data.schedules?.length ?? 0) > 0 ||
        data.description ||
        data.references;

      if (!hasData) {
        setError("A IA não encontrou tópicos, avaliações ou horários no documento. Verifique se o texto contém informações acadêmicas estruturadas (cronograma, plano de ensino, ementa).");
        setStep("input");
        return;
      }

      setExtracted(data);
      setStep("review");
    } catch (err) {
      if (axios.isAxiosError(err)) {
        if (handle401(err.response?.status, navigate)) return;

        const status = err.response?.status;
        const serverMsg = (err.response?.data as { error?: string })?.error;

        if (status === 502) {
          setError(serverMsg ?? "O serviço de IA está temporariamente indisponível. Aguarde alguns instantes e tente novamente.");
        } else if (status === 400) {
          setError(serverMsg ?? "Os dados enviados são inválidos. Verifique o conteúdo e tente novamente.");
        } else {
          setError(serverMsg ?? "Ocorreu um erro inesperado. Tente novamente.");
        }
      } else {
        setError("Sem conexão com o servidor. Verifique sua internet e tente novamente.");
      }
      setStep("input");
    }
  }, [textContent, inputMode, disciplineId, token, navigate]);

  /* ── Step 2 → Confirm ── */
  const handleConfirm = useCallback(async () => {
    setStep("loading");
    setError("");

    try {
      const res = await axios.post<{ inserted: InsertedResult }>(
        `${API_URL}/rag/confirm/${disciplineId}`,
        extracted,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setInsertedResult(res.data.inserted);
      setStep("success");

      // Notify parent to refetch discipline
      onConfirmed({
        description: extracted.description,
        references: extracted.references,
      });
    } catch (err) {
      if (axios.isAxiosError(err)) {
        if (handle401(err.response?.status, navigate)) return;

        const status = err.response?.status;
        const serverMsg = (err.response?.data as { error?: string })?.error;

        if (status === 403) {
          setError("Você não tem permissão para modificar esta disciplina. Ela pode pertencer a outro usuário.");
        } else if (status === 404) {
          setError("Disciplina não encontrada. Ela pode ter sido excluída. Volte para a página inicial e tente novamente.");
        } else if (status === 400) {
          setError(serverMsg ?? "Alguns dados extraídos estão em formato inválido. Revise os campos e tente novamente.");
        } else {
          setError(serverMsg ?? "Erro ao salvar os dados. Tente novamente.");
        }
      } else {
        setError("Sem conexão com o servidor. Verifique sua internet e tente novamente.");
      }
      setStep("review");
    }
  }, [extracted, disciplineId, token, navigate, onConfirmed]);

  /* ── Review helpers ── */
  const removeTopic = (i: number) =>
    setExtracted((prev) => ({
      ...prev,
      topics: prev.topics?.filter((_, idx) => idx !== i),
    }));

  const removeEvaluation = (i: number) =>
    setExtracted((prev) => ({
      ...prev,
      evaluations: prev.evaluations?.filter((_, idx) => idx !== i),
    }));

  const removeSchedule = (i: number) =>
    setExtracted((prev) => ({
      ...prev,
      schedules: prev.schedules?.filter((_, idx) => idx !== i),
    }));

  /* ── Render ── */
  return (
    <div className="rag-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="rag-modal">
        <button className="rag-close" onClick={onClose} aria-label="Fechar">
          ✕
        </button>

        <div className="rag-header">
          <p className="rag-header-eyebrow">Importação automática</p>
          <h2 className="rag-header-title">Importar Documento</h2>
          <p className="rag-header-desc">
            Extraia tópicos, avaliações e horários automaticamente a partir de um plano
            de ensino, ementa ou cronograma.
          </p>
        </div>

        {error && <div className="rag-error">{error}</div>}

        {/* ── STEP: Input ── */}
        {step === "input" && (
          <div className="rag-input-area">
            {/* Instructions */}
            <div className="rag-instructions">
              <h3 className="rag-instructions-title">Como funciona</h3>
              <ol className="rag-instructions-list">
                <li>Cole o texto de um plano de ensino ou carregue um PDF</li>
                <li>A IA analisa o documento e extrai os dados automaticamente</li>
                <li>Revise, edite ou remova itens antes de confirmar</li>
                <li>Os dados são <strong>adicionados</strong> à disciplina (não substituem o que já existe)</li>
              </ol>

              <div className="rag-limits">
                <span className="rag-limits-title">Limitações</span>
                <ul className="rag-limits-list">
                  <li>Imagens e fotos do quadro não são suportados</li>
                  <li>PDFs digitalizados (sem texto selecionável) não funcionam</li>
                  <li>A extração é feita por IA e pode conter erros — sempre revise</li>
                  <li>Documentos muito longos podem ter dados truncados</li>
                </ul>
              </div>
            </div>

            <div className="rag-tabs">
              <button
                className={`rag-tab ${inputMode === "text" ? "rag-tab--active" : ""}`}
                onClick={() => setInputMode("text")}
              >
                Colar Texto
              </button>
              <button
                className={`rag-tab ${inputMode === "pdf" ? "rag-tab--active" : ""}`}
                onClick={() => setInputMode("pdf")}
              >
                Upload PDF
              </button>
            </div>

            {inputMode === "text" ? (
              <textarea
                className="rag-textarea"
                placeholder={"Cole aqui o conteúdo do plano de ensino, ementa ou cronograma.\n\nExemplo:\n• Unidade 1 — Introdução à Álgebra Linear (10/03)\n• Prova 1 — 15/04, valor 10 pontos\n• Aulas: Segunda 08:00–10:00, Quarta 14:00–16:00"}
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
              />
            ) : (
              <>
                <div
                  className="rag-upload-zone"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <span className="rag-upload-icon">+</span>
                  <p className="rag-upload-label">
                    Clique para selecionar um <strong>PDF</strong>
                    <br />
                    <span className="rag-upload-hint">Máx. 10 MB · Apenas PDFs com texto selecionável</span>
                  </p>
                  {fileName && <span className="rag-file-name">✓ {fileName}</span>}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  style={{ display: "none" }}
                  onChange={handleFileChange}
                />
              </>
            )}

            <div className="rag-actions">
              <button className="btn-secondary btn-secondary--cancel" onClick={onClose}>
                Cancelar
              </button>
              <button
                className="btn-primary"
                onClick={handleExtract}
                disabled={!textContent.trim()}
              >
                Extrair Dados
              </button>
            </div>
          </div>
        )}

        {/* ── STEP: Loading ── */}
        {step === "loading" && (
          <div className="rag-loading">
            <div className="rag-spinner" />
            <p className="rag-loading-text">Analisando documento com IA…</p>
            <p className="rag-loading-subtext">Isso pode levar alguns segundos</p>
          </div>
        )}

        {/* ── STEP: Review ── */}
        {step === "review" && (
          <div className="rag-review">
            <div className="rag-review-notice">
              Revise os dados abaixo antes de confirmar. Você pode <strong>remover</strong> itens
              indesejados clicando no ✕ e <strong>editar</strong> a descrição e referências.
              Os dados serão <strong>adicionados</strong> aos já existentes na disciplina.
            </div>

            {/* Topics */}
            {(extracted.topics?.length ?? 0) > 0 && (
              <div className="rag-review-section">
                <div className="rag-review-section-header">
                  <h3 className="rag-review-section-title">Tópicos</h3>
                  <span className="rag-review-count">{extracted.topics!.length}</span>
                </div>
                {extracted.topics!.map((t, i) => (
                  <div className="rag-review-item" key={i}>
                    <div className="rag-review-item-row">
                      <span className="rag-review-item-title">{t.title}</span>
                      <button
                        className="rag-remove-btn"
                        onClick={() => removeTopic(i)}
                        aria-label="Remover tópico"
                        title="Remover este tópico"
                      >
                        ✕
                      </button>
                    </div>
                    {t.description && (
                      <span className="rag-review-item-meta">{t.description}</span>
                    )}
                    {t.dueDate && (
                      <span className="rag-review-item-meta">
                        {new Date(t.dueDate).toLocaleDateString("pt-BR")}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Evaluations */}
            {(extracted.evaluations?.length ?? 0) > 0 && (
              <div className="rag-review-section">
                <div className="rag-review-section-header">
                  <h3 className="rag-review-section-title">Avaliações</h3>
                  <span className="rag-review-count">
                    {extracted.evaluations!.length}
                  </span>
                </div>
                {extracted.evaluations!.map((e, i) => (
                  <div className="rag-review-item" key={i}>
                    <div className="rag-review-item-row">
                      <span className="rag-review-item-title">{e.title}</span>
                      <button
                        className="rag-remove-btn"
                        onClick={() => removeEvaluation(i)}
                        aria-label="Remover avaliação"
                        title="Remover esta avaliação"
                      >
                        ✕
                      </button>
                    </div>
                    <span className="rag-review-item-meta">
                      {e.date
                        ? new Date(e.date).toLocaleDateString("pt-BR")
                        : "Sem data"}
                      {" · "}Nota máx: {e.maxGrade ?? 10}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Schedules */}
            {(extracted.schedules?.length ?? 0) > 0 && (
              <div className="rag-review-section">
                <div className="rag-review-section-header">
                  <h3 className="rag-review-section-title">Horários</h3>
                  <span className="rag-review-count">
                    {extracted.schedules!.length}
                  </span>
                </div>
                {extracted.schedules!.map((s, i) => (
                  <div className="rag-review-item" key={i}>
                    <div className="rag-review-item-row">
                      <span className="rag-review-item-title">
                        {DAY_NAMES[s.dayOfWeek]} · {s.startTime}–{s.endTime}
                      </span>
                      <button
                        className="rag-remove-btn"
                        onClick={() => removeSchedule(i)}
                        aria-label="Remover horário"
                        title="Remover este horário"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Description */}
            {extracted.description && (
              <div className="rag-review-section">
                <h3 className="rag-review-section-title">Descrição / Ementa</h3>
                <textarea
                  className="rag-review-textarea"
                  value={extracted.description}
                  onChange={(e) =>
                    setExtracted((prev) => ({ ...prev, description: e.target.value }))
                  }
                />
              </div>
            )}

            {/* References */}
            {extracted.references && (
              <div className="rag-review-section">
                <h3 className="rag-review-section-title">Referências Bibliográficas</h3>
                <textarea
                  className="rag-review-textarea"
                  value={extracted.references}
                  onChange={(e) =>
                    setExtracted((prev) => ({ ...prev, references: e.target.value }))
                  }
                />
              </div>
            )}

            <div className="rag-actions">
              <button
                className="btn-secondary btn-secondary--cancel"
                onClick={() => {
                  setStep("input");
                  setExtracted({});
                }}
              >
                ← Voltar
              </button>
              <button className="btn-primary" onClick={handleConfirm}>
                Confirmar e Inserir
              </button>
            </div>
          </div>
        )}

        {/* ── STEP: Success ── */}
        {step === "success" && insertedResult && (
          <div className="rag-success">
            <span className="rag-success-icon">Pronto</span>
            <h3 className="rag-success-title">Dados inseridos com sucesso!</h3>
            <p className="rag-success-detail">
              {insertedResult.topics > 0 && `${insertedResult.topics} tópico(s)`}
              {insertedResult.topics > 0 && insertedResult.evaluations > 0 && " · "}
              {insertedResult.evaluations > 0 &&
                `${insertedResult.evaluations} avaliação(ões)`}
              {(insertedResult.topics > 0 || insertedResult.evaluations > 0) &&
                insertedResult.schedules > 0 &&
                " · "}
              {insertedResult.schedules > 0 &&
                `${insertedResult.schedules} horário(s)`}
            </p>
            <p className="rag-success-hint">
              Os dados foram adicionados à disciplina. Você pode editá-los ou removê-los
              individualmente nas seções correspondentes.
            </p>
            <div className="rag-actions">
              <button className="btn-primary" onClick={onClose}>
                Fechar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RagImportModal;
