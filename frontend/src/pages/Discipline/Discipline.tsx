import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { Link, useNavigate, useParams } from "react-router-dom";
import Topbar from "../../components/Topbar";
import ProgressBanner from "../../components/ProgressBanner";
import TopicSection from "../../components/TopicSection";
import EvaluationSection from "../../components/EvaluationSection";
import ScheduleSection from "../../components/ScheduleSection";
import ReferencesSection from "../../components/ReferencesSection";
import RagImportModal from "../../components/RagImportModal";
import { calculateProgress } from "../../lib/utils";
import { api } from "../../lib/api";
import type { DisciplineDetails } from "../../lib/types";
import "./Discipline.css";

const Discipline = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [discipline, setDiscipline] = useState<DisciplineDetails | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [showRagModal, setShowRagModal] = useState(false);
  const [editingProfessor, setEditingProfessor] = useState(false);
  const [professorDraft, setProfessorDraft] = useState("");

  useEffect(() => {
    if (discipline?.name) {
      document.title = `${discipline.name} | Dashboard Universitário`;
      return;
    }
    document.title = "Disciplina | Dashboard Universitário";
  }, [discipline?.name]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { navigate("/login"); return; }
    if (!id) { setErrorMessage("Disciplina inválida."); setIsLoading(false); return; }

    const fetchDiscipline = async () => {
      setIsLoading(true);
      setErrorMessage("");
      try {
        const response = await api.get<DisciplineDetails>(`/disciplines/${id}`);
        setDiscipline(response.data);
      } catch (error: unknown) {
        if (axios.isAxiosError<{ error?: string }>(error)) {
          setErrorMessage(error.response?.data?.error ?? "Não foi possível carregar a disciplina.");
        } else {
          setErrorMessage("Erro de conexão ao carregar a disciplina.");
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchDiscipline();
  }, [id, navigate]);

  /* ── Refetch after RAG import ── */
  const refetchDiscipline = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token || !id) return;
    try {
      const response = await api.get<DisciplineDetails>(`/disciplines/${id}`);
      setDiscipline(response.data);
    } catch {
      // silently fail — data was already inserted
    }
  }, [id]);

  /* ── Loading & Error states ── */

  if (isLoading) {
    return (
      <div className="page-state">
        <p className="page-state-text">Carregando disciplina…</p>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="page-state">
        <p className="page-state-text">{errorMessage}</p>
        <Link to="/" className="page-state-link">← Voltar para Home</Link>
      </div>
    );
  }

  if (!discipline) {
    return (
      <div className="page-state">
        <p className="page-state-text">Disciplina não encontrada.</p>
        <Link to="/" className="page-state-link">← Voltar para Home</Link>
      </div>
    );
  }

  /* ── Derived data ── */
  const progress = calculateProgress(discipline.topics, discipline.evaluations);

  const handleSaveProfessor = async () => {
    try {
      await api.put(
        `/disciplines/${discipline.id}`,
        { professor: professorDraft.trim() || null },
      );
      setDiscipline((prev) => prev ? { ...prev, professor: professorDraft.trim() || null } : prev);
      setEditingProfessor(false);
    } catch (err) {
      if (axios.isAxiosError(err)) return;
    }
  };

  /* ── Render ── */
  return (
    <div className="page-root">
      <Topbar backTo="/" showLogout={false} />

      <main className="page-content">
        <div className="page-header">
          <div className="page-header-row" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
            <div>
              <p className="page-header-eyebrow">Disciplina</p>
              <h1 className="page-header-title">{discipline.name}</h1>

              {editingProfessor ? (
                <div className="professor-edit">
                  <input
                    className="professor-edit-input"
                    type="text"
                    value={professorDraft}
                    onChange={(e) => setProfessorDraft(e.target.value)}
                    placeholder="Nome do professor"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveProfessor();
                      if (e.key === "Escape") setEditingProfessor(false);
                    }}
                  />
                  <button className="btn-secondary" onClick={handleSaveProfessor} style={{ padding: '0.25rem 0.75rem', fontSize: 'var(--text-label-sm)' }}>Salvar</button>
                  <button className="btn-secondary btn-secondary--cancel" onClick={() => setEditingProfessor(false)} style={{ padding: '0.25rem 0.75rem', fontSize: 'var(--text-label-sm)' }}>Cancelar</button>
                </div>
              ) : (
                <p
                  className={`page-header-professor page-header-professor--editable`}
                  onClick={() => { setEditingProfessor(true); setProfessorDraft(discipline.professor ?? ""); }}
                  title="Clique para editar"
                >
                  {discipline.professor ? `Prof. ${discipline.professor}` : "+ Adicionar professor"}
                </p>
              )}

              {discipline.description && (
                <p className="page-header-desc">{discipline.description}</p>
              )}
            </div>
            <button
              className="btn-secondary"
              onClick={() => setShowRagModal(true)}
              style={{ marginTop: '0.5rem' }}
            >
              Importar Documento
            </button>
          </div>
        </div>

        <ProgressBanner
          progress={progress}
          completedTopics={discipline.topics.filter((t) => t.completed).length}
          totalTopics={discipline.topics.length}
          completedEvals={discipline.evaluations.filter((e) => e.completed).length}
          totalEvals={discipline.evaluations.length}
        />

        <div className="bento-grid">
          <TopicSection
            disciplineId={discipline.id}
            topics={discipline.topics}
            onTopicsChange={(topics) => setDiscipline((prev) => prev ? { ...prev, topics } : prev)}
            openDropdownId={openDropdownId}
            setOpenDropdownId={setOpenDropdownId}
          />

          <EvaluationSection
            disciplineId={discipline.id}
            evaluations={discipline.evaluations}
            onEvaluationsChange={(evaluations) => setDiscipline((prev) => prev ? { ...prev, evaluations } : prev)}
            openDropdownId={openDropdownId}
            setOpenDropdownId={setOpenDropdownId}
          />

          <ScheduleSection
            disciplineId={discipline.id}
            schedules={discipline.schedules}
            onSchedulesChange={(schedules) => setDiscipline((prev) => prev ? { ...prev, schedules } : prev)}
            openDropdownId={openDropdownId}
            setOpenDropdownId={setOpenDropdownId}
          />

          <ReferencesSection
            disciplineId={discipline.id}
            references={discipline.references}
            onReferencesChange={(references) => setDiscipline((prev) => prev ? { ...prev, references } : prev)}
          />
        </div>
      </main>

      {showRagModal && (
        <RagImportModal
          disciplineId={discipline.id}
          onClose={() => setShowRagModal(false)}
          onConfirmed={() => {
            setShowRagModal(false);
            refetchDiscipline();
          }}
        />
      )}
    </div>
  );
};

export default Discipline;
