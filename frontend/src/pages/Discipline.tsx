import type { ChangeEvent } from "react";
import { useEffect, useState } from "react";
import axios from "axios";
import { Link, useNavigate, useParams } from "react-router-dom";
import Topbar from "../components/Topbar";
import { API_URL, formatDate } from "../lib/utils";
import "./Discipline.css";

type Topic = {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  completed: boolean;
};

type Evaluation = {
  id: string;
  title: string;
  date: string | null;
  grade: number | null;
  maxGrade: number;
  completed: boolean;
};

type Schedule = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};

type DisciplineDetails = {
  id: string;
  name: string;
  description: string | null;
  references: string | null;
  topics: Topic[];
  evaluations: Evaluation[];
  schedules: Schedule[];
};

type DisciplineUpdateResponse = {
  id: string;
  name: string;
  description: string | null;
  references: string | null;
  schedules: Schedule[];
};

const DAY_LABELS = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
];

const DAY_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function calculateProgress(topics: Topic[], evaluations: Evaluation[]) {
  const hasTopics = topics.length > 0;
  const hasEvaluations = evaluations.length > 0;

  if (!hasTopics && !hasEvaluations) {
    return 0;
  }

  const topicWeight = hasTopics && hasEvaluations ? 0.5 : hasTopics ? 1 : 0;
  const evalWeight = hasTopics && hasEvaluations ? 0.5 : hasEvaluations ? 1 : 0;

  const topicProgress = hasTopics
    ? topics.filter((t) => t.completed).length / topics.length
    : 0;
  const evalProgress = hasEvaluations
    ? evaluations.filter((e) => e.completed).length / evaluations.length
    : 0;

  return topicProgress * topicWeight + evalProgress * evalWeight;
}

function toLocalDatetimeValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function getToken(navigate: ReturnType<typeof useNavigate>): string | null {
  const token = localStorage.getItem("token");
  if (!token) {
    localStorage.removeItem("user");
    navigate("/login");
  }
  return token;
}

function handle401(status: number | undefined, navigate: ReturnType<typeof useNavigate>): boolean {
  if (status === 401) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
    return true;
  }
  return false;
}

const Discipline = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [discipline, setDiscipline] = useState<DisciplineDetails | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  /* ── Topic form state ── */
  const [isTopicFormOpen, setIsTopicFormOpen] = useState(false);
  const [isTopicSubmitting, setIsTopicSubmitting] = useState(false);
  const [topicTitle, setTopicTitle] = useState("");
  const [topicDescription, setTopicDescription] = useState("");
  const [topicDueDate, setTopicDueDate] = useState("");
  const [topicFormError, setTopicFormError] = useState("");
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
  const [deletingTopicId, setDeletingTopicId] = useState<string | null>(null);

  /* ── Evaluation form state ── */
  const [isEvaluationFormOpen, setIsEvaluationFormOpen] = useState(false);
  const [isEvaluationSubmitting, setIsEvaluationSubmitting] = useState(false);
  const [evaluationTitle, setEvaluationTitle] = useState("");
  const [evaluationDate, setEvaluationDate] = useState("");
  const [evaluationMaxGrade, setEvaluationMaxGrade] = useState("10");
  const [evaluationGrade, setEvaluationGrade] = useState("");
  const [evaluationFormError, setEvaluationFormError] = useState("");
  const [editingEvalId, setEditingEvalId] = useState<string | null>(null);
  const [deletingEvalId, setDeletingEvalId] = useState<string | null>(null);

  /* ── References form state ── */
  const [isReferencesFormOpen, setIsReferencesFormOpen] = useState(false);
  const [isReferencesSubmitting, setIsReferencesSubmitting] = useState(false);
  const [referencesValue, setReferencesValue] = useState("");
  const [referencesFormError, setReferencesFormError] = useState("");

  /* ── Schedule form state ── */
  const [isScheduleFormOpen, setIsScheduleFormOpen] = useState(false);
  const [isScheduleSubmitting, setIsScheduleSubmitting] = useState(false);
  const [scheduleDayOfWeek, setScheduleDayOfWeek] = useState("1");
  const [scheduleStartTime, setScheduleStartTime] = useState("");
  const [scheduleEndTime, setScheduleEndTime] = useState("");
  const [scheduleFormError, setScheduleFormError] = useState("");
  const [editingScheduleIndex, setEditingScheduleIndex] = useState<number | null>(null);
  const [deletingScheduleIndex, setDeletingScheduleIndex] = useState<number | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { navigate("/login"); return; }
    if (!id) { setErrorMessage("Disciplina inválida."); setIsLoading(false); return; }

    const fetchDiscipline = async () => {
      setIsLoading(true);
      setErrorMessage("");
      try {
        const response = await axios.get<DisciplineDetails>(
          `${API_URL}/disciplines/${id}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        setDiscipline(response.data);
      } catch (error: unknown) {
        if (axios.isAxiosError<{ error?: string }>(error)) {
          if (handle401(error.response?.status, navigate)) return;
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

  /* ════════════════════════════════════════════════════════════════
     TOPIC handlers
     ════════════════════════════════════════════════════════════════ */

  const openTopicCreate = () => {
    setEditingTopicId(null);
    setTopicTitle(""); setTopicDescription(""); setTopicDueDate("");
    setTopicFormError("");
    setIsTopicFormOpen(true);
  };

  const openTopicEdit = (topic: Topic) => {
    setEditingTopicId(topic.id);
    setTopicTitle(topic.title);
    setTopicDescription(topic.description ?? "");
    setTopicDueDate(toLocalDatetimeValue(topic.dueDate));
    setTopicFormError("");
    setIsTopicFormOpen(true);
  };

  const handleSubmitTopic = async (event: ChangeEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTopicFormError("");
    const token = getToken(navigate);
    if (!token || !id) return;

    const trimmedTitle = topicTitle.trim();
    if (!trimmedTitle) { setTopicFormError("Informe o título do tópico."); return; }

    setIsTopicSubmitting(true);
    const payload: { title: string; description?: string; dueDate?: string } = { title: trimmedTitle };
    const trimmedDesc = topicDescription.trim();
    if (trimmedDesc) payload.description = trimmedDesc;
    if (topicDueDate) payload.dueDate = new Date(topicDueDate).toISOString();

    try {
      if (editingTopicId) {
        const response = await axios.put<Topic>(
          `${API_URL}/disciplines/${id}/topics/${editingTopicId}`,
          payload,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        setDiscipline((prev) => prev ? { ...prev, topics: prev.topics.map((t) => t.id === editingTopicId ? response.data : t) } : prev);
      } else {
        const response = await axios.post<Topic>(
          `${API_URL}/disciplines/${id}/topics`,
          payload,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        setDiscipline((prev) => prev ? { ...prev, topics: [...prev.topics, response.data] } : prev);
      }
      setTopicTitle(""); setTopicDescription(""); setTopicDueDate("");
      setEditingTopicId(null);
      setIsTopicFormOpen(false);
    } catch (error: unknown) {
      if (axios.isAxiosError<{ error?: string }>(error)) {
        if (handle401(error.response?.status, navigate)) return;
        setTopicFormError(error.response?.data?.error ?? "Não foi possível salvar o tópico.");
      } else {
        setTopicFormError("Erro de conexão ao salvar tópico.");
      }
    } finally {
      setIsTopicSubmitting(false);
    }
  };

  const handleDeleteTopic = async (topicId: string) => {
    const token = getToken(navigate);
    if (!token || !id) return;
    try {
      await axios.delete(`${API_URL}/disciplines/${id}/topics/${topicId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDiscipline((prev) => prev ? { ...prev, topics: prev.topics.filter((t) => t.id !== topicId) } : prev);
      setDeletingTopicId(null);
    } catch (error: unknown) {
      if (axios.isAxiosError<{ error?: string }>(error)) {
        if (handle401(error.response?.status, navigate)) return;
      }
    }
  };

  /* ════════════════════════════════════════════════════════════════
     EVALUATION handlers
     ════════════════════════════════════════════════════════════════ */

  const openEvalCreate = () => {
    setEditingEvalId(null);
    setEvaluationTitle(""); setEvaluationDate(""); setEvaluationMaxGrade("10"); setEvaluationGrade("");
    setEvaluationFormError("");
    setIsEvaluationFormOpen(true);
  };

  const openEvalEdit = (ev: Evaluation) => {
    setEditingEvalId(ev.id);
    setEvaluationTitle(ev.title);
    setEvaluationDate(toLocalDatetimeValue(ev.date));
    setEvaluationMaxGrade(String(ev.maxGrade));
    setEvaluationGrade(ev.grade !== null ? String(ev.grade) : "");
    setEvaluationFormError("");
    setIsEvaluationFormOpen(true);
  };

  const handleSubmitEvaluation = async (event: ChangeEvent<HTMLFormElement>) => {
    event.preventDefault();
    setEvaluationFormError("");
    const token = getToken(navigate);
    if (!token || !id) return;

    const trimmedTitle = evaluationTitle.trim();
    if (!trimmedTitle) { setEvaluationFormError("Informe o título da avaliação."); return; }
    const parsedMaxGrade = Number(evaluationMaxGrade);
    if (!Number.isFinite(parsedMaxGrade) || parsedMaxGrade <= 0) { setEvaluationFormError("A nota máxima deve ser maior que zero."); return; }

    setIsEvaluationSubmitting(true);
    const payload: { title: string; date?: string; maxGrade: number; grade?: number } = { title: trimmedTitle, maxGrade: parsedMaxGrade };
    if (evaluationDate) payload.date = new Date(evaluationDate).toISOString();
    if (evaluationGrade !== "") payload.grade = Number(evaluationGrade);

    try {
      if (editingEvalId) {
        const response = await axios.put<Evaluation>(
          `${API_URL}/disciplines/${id}/evaluations/${editingEvalId}`,
          payload,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        setDiscipline((prev) => prev ? { ...prev, evaluations: prev.evaluations.map((e) => e.id === editingEvalId ? response.data : e) } : prev);
      } else {
        const response = await axios.post<Evaluation>(
          `${API_URL}/disciplines/${id}/evaluations`,
          payload,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        setDiscipline((prev) => prev ? { ...prev, evaluations: [...prev.evaluations, response.data] } : prev);
      }
      setEvaluationTitle(""); setEvaluationDate(""); setEvaluationMaxGrade("10"); setEvaluationGrade("");
      setEditingEvalId(null);
      setIsEvaluationFormOpen(false);
    } catch (error: unknown) {
      if (axios.isAxiosError<{ error?: string }>(error)) {
        if (handle401(error.response?.status, navigate)) return;
        setEvaluationFormError(error.response?.data?.error ?? "Não foi possível salvar a avaliação.");
      } else {
        setEvaluationFormError("Erro de conexão ao salvar avaliação.");
      }
    } finally {
      setIsEvaluationSubmitting(false);
    }
  };

  const handleDeleteEvaluation = async (evalId: string) => {
    const token = getToken(navigate);
    if (!token || !id) return;
    try {
      await axios.delete(`${API_URL}/disciplines/${id}/evaluations/${evalId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDiscipline((prev) => prev ? { ...prev, evaluations: prev.evaluations.filter((e) => e.id !== evalId) } : prev);
      setDeletingEvalId(null);
    } catch (error: unknown) {
      if (axios.isAxiosError<{ error?: string }>(error)) {
        if (handle401(error.response?.status, navigate)) return;
      }
    }
  };

  /* ════════════════════════════════════════════════════════════════
     REFERENCES handler
     ════════════════════════════════════════════════════════════════ */

  const handleSaveReferences = async (event: ChangeEvent<HTMLFormElement>) => {
    event.preventDefault();
    setReferencesFormError("");
    const token = getToken(navigate);
    if (!token || !id) return;

    setIsReferencesSubmitting(true);
    try {
      const response = await axios.put<DisciplineUpdateResponse>(
        `${API_URL}/disciplines/${id}`,
        { references: referencesValue.trim() },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setDiscipline((prev) => prev ? { ...prev, references: response.data.references } : prev);
      setIsReferencesFormOpen(false);
    } catch (error: unknown) {
      if (axios.isAxiosError<{ error?: string }>(error)) {
        if (handle401(error.response?.status, navigate)) return;
        setReferencesFormError(error.response?.data?.error ?? "Não foi possível salvar a referência bibliográfica.");
      } else {
        setReferencesFormError("Erro de conexão ao salvar referência.");
      }
    } finally {
      setIsReferencesSubmitting(false);
    }
  };

  /* ════════════════════════════════════════════════════════════════
     SCHEDULE handlers
     ════════════════════════════════════════════════════════════════ */

  const openScheduleCreate = () => {
    setEditingScheduleIndex(null);
    setScheduleDayOfWeek("1"); setScheduleStartTime(""); setScheduleEndTime("");
    setScheduleFormError("");
    setIsScheduleFormOpen(true);
  };

  const openScheduleEdit = (index: number, schedule: Schedule) => {
    setEditingScheduleIndex(index);
    setScheduleDayOfWeek(String(schedule.dayOfWeek));
    setScheduleStartTime(schedule.startTime);
    setScheduleEndTime(schedule.endTime);
    setScheduleFormError("");
    setIsScheduleFormOpen(true);
  };

  const saveSchedules = async (newSchedules: Schedule[]) => {
    const token = getToken(navigate);
    if (!token || !id) return false;

    const sorted = [...newSchedules].sort((a, b) => {
      if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
      return a.startTime.localeCompare(b.startTime);
    });

    try {
      const response = await axios.put<DisciplineUpdateResponse>(
        `${API_URL}/disciplines/${id}`,
        { schedules: sorted },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setDiscipline((prev) => prev ? { ...prev, schedules: (response.data.schedules as Schedule[]) ?? sorted } : prev);
      return true;
    } catch (error: unknown) {
      if (axios.isAxiosError<{ error?: string }>(error)) {
        if (handle401(error.response?.status, navigate)) return false;
        setScheduleFormError(error.response?.data?.error ?? "Não foi possível salvar o horário.");
      } else {
        setScheduleFormError("Erro de conexão ao salvar horário.");
      }
      return false;
    }
  };

  const handleSubmitSchedule = async (event: ChangeEvent<HTMLFormElement>) => {
    event.preventDefault();
    setScheduleFormError("");
    if (!discipline) return;

    const parsedDay = Number(scheduleDayOfWeek);
    if (!Number.isInteger(parsedDay) || parsedDay < 0 || parsedDay > 6) { setScheduleFormError("Dia da semana inválido."); return; }
    if (!scheduleStartTime || !scheduleEndTime) { setScheduleFormError("Informe o horário de início e fim."); return; }
    if (scheduleEndTime <= scheduleStartTime) { setScheduleFormError("O horário de fim deve ser maior que o de início."); return; }

    setIsScheduleSubmitting(true);
    const newEntry: Schedule = { dayOfWeek: parsedDay, startTime: scheduleStartTime, endTime: scheduleEndTime };

    let updated: Schedule[];
    if (editingScheduleIndex !== null) {
      updated = discipline.schedules.map((s, i) => i === editingScheduleIndex ? newEntry : s);
    } else {
      updated = [...discipline.schedules, newEntry];
    }

    const ok = await saveSchedules(updated);
    if (ok) {
      setScheduleDayOfWeek("1"); setScheduleStartTime(""); setScheduleEndTime("");
      setEditingScheduleIndex(null);
      setIsScheduleFormOpen(false);
    }
    setIsScheduleSubmitting(false);
  };

  const handleDeleteSchedule = async (index: number) => {
    if (!discipline) return;
    const updated = discipline.schedules.filter((_, i) => i !== index);
    const ok = await saveSchedules(updated);
    if (ok) setDeletingScheduleIndex(null);
  };

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
  const progressPercent = Math.round(progress * 100);
  const completedTopics = discipline.topics.filter((t) => t.completed).length;
  const completedEvals = discipline.evaluations.filter((e) => e.completed).length;

  const ringRadius = 34;
  const ringCirc = 2 * Math.PI * ringRadius;
  const ringOffset = ringCirc - progress * ringCirc;

  const sortedSchedules = [...discipline.schedules].sort((a, b) => {
    if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
    return a.startTime.localeCompare(b.startTime);
  });

  // Map sorted index back to original index for edit/delete
  const sortedScheduleOriginalIndices = [...discipline.schedules]
    .map((s, i) => ({ s, i }))
    .sort((a, b) => {
      if (a.s.dayOfWeek !== b.s.dayOfWeek) return a.s.dayOfWeek - b.s.dayOfWeek;
      return a.s.startTime.localeCompare(b.s.startTime);
    })
    .map((x) => x.i);

  /* ── Render ── */

  return (
    <div className="page-root">
      <Topbar backTo="/" showLogout={false} />

      <main className="page-content">
        {/* ── Page header ── */}
        <div className="page-header">
          <p className="page-header-eyebrow">Disciplina</p>
          <h1 className="page-header-title">{discipline.name}</h1>
          {discipline.description && (
            <p className="page-header-desc">{discipline.description}</p>
          )}
        </div>

        {/* ── Progress banner ── */}
        <div className="disc-progress-banner">
          <div className="disc-progress-ring">
            <svg width="80" height="80" viewBox="0 0 80 80">
              <defs>
                <linearGradient id="disc-progress-gradient" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" />
                  <stop offset="100%" stopColor="var(--primary-container)" />
                </linearGradient>
              </defs>
              <circle className="disc-progress-ring-bg" cx="40" cy="40" r={ringRadius} />
              <circle className="disc-progress-ring-fill" cx="40" cy="40" r={ringRadius} strokeDasharray={ringCirc} strokeDashoffset={ringOffset} />
            </svg>
            <span className="disc-progress-ring-label">{progressPercent}%</span>
          </div>
          <div className="disc-progress-details">
            <div className="disc-progress-stat">
              <span className="disc-progress-stat-value">{completedTopics}/{discipline.topics.length}</span>
              <span className="disc-progress-stat-label">Tópicos concluídos</span>
            </div>
            <div className="disc-progress-stat">
              <span className="disc-progress-stat-value">{completedEvals}/{discipline.evaluations.length}</span>
              <span className="disc-progress-stat-label">Avaliações concluídas</span>
            </div>
          </div>
        </div>

        {/* ── Bento grid ── */}
        <div className="bento-grid">

          {/* ─── Tópicos ─── */}
          <section className="card" id="topics-card">
            <div className="card-header">
              <div>
                <h2 className="card-title">Tópicos</h2>
                <p className="card-subtitle">
                  {discipline.topics.length}{" "}
                  {discipline.topics.length === 1 ? "tópico" : "tópicos"}
                </p>
              </div>
              <button
                type="button"
                className={`btn-secondary ${isTopicFormOpen ? "btn-secondary--cancel" : ""}`}
                onClick={() => {
                  if (isTopicFormOpen) { setIsTopicFormOpen(false); setEditingTopicId(null); }
                  else openTopicCreate();
                }}
              >
                {isTopicFormOpen ? "✕ Cancelar" : "+ Adicionar"}
              </button>
            </div>

            {isTopicFormOpen && (
              <form className="inline-form" onSubmit={handleSubmitTopic}>
                <div className="inline-form-field">
                  <label className="inline-form-label" htmlFor="topic-title">Título</label>
                  <input id="topic-title" className="inline-form-input" type="text" placeholder="Ex: Limites e Continuidade" value={topicTitle} required onChange={(e) => setTopicTitle(e.target.value)} />
                </div>
                <div className="inline-form-row">
                  <div className="inline-form-field">
                    <label className="inline-form-label" htmlFor="topic-desc">Descrição</label>
                    <input id="topic-desc" className="inline-form-input" type="text" placeholder="Opcional" value={topicDescription} onChange={(e) => setTopicDescription(e.target.value)} />
                  </div>
                  <div className="inline-form-field">
                    <label className="inline-form-label" htmlFor="topic-due">Vencimento</label>
                    <input id="topic-due" className="inline-form-input" type="datetime-local" value={topicDueDate} onChange={(e) => setTopicDueDate(e.target.value)} />
                  </div>
                </div>
                {topicFormError && <p className="inline-form-error">{topicFormError}</p>}
                <div className="inline-form-footer">
                  <button type="submit" className="btn-primary" disabled={isTopicSubmitting}>
                    {isTopicSubmitting ? "Salvando…" : editingTopicId ? "Atualizar" : "Salvar"}
                  </button>
                </div>
              </form>
            )}

            {deletingTopicId && (
              <div className="confirm-delete-bar">
                <p>Excluir este tópico?</p>
                <div className="confirm-delete-bar-actions">
                  <button type="button" className="btn-secondary btn-secondary--cancel" onClick={() => setDeletingTopicId(null)}>Cancelar</button>
                  <button type="button" className="btn-danger" onClick={() => handleDeleteTopic(deletingTopicId)}>Excluir</button>
                </div>
              </div>
            )}

            {discipline.topics.length === 0 ? (
              <p className="empty-text">Nenhum tópico cadastrado.</p>
            ) : (
              <ul className="disc-topic-list">
                {discipline.topics.map((topic) => (
                  <li key={topic.id} className="disc-topic-item">
                    <div className="disc-topic-left">
                      <span className="disc-topic-title">{topic.title}</span>
                      <span className="disc-topic-meta">
                        {formatDate(topic.dueDate)}
                        {topic.description ? ` · ${topic.description}` : ""}
                      </span>
                    </div>
                    <div className="disc-topic-right">
                      <span className={`badge ${topic.completed ? "badge--done" : "badge--pending"}`}>
                        {topic.completed ? "Concluído" : "Pendente"}
                      </span>
                      <div className="item-dropdown">
                        <button type="button" className="item-dropdown-trigger" aria-expanded={openDropdownId === `topic-${topic.id}`} onClick={() => setOpenDropdownId(openDropdownId === `topic-${topic.id}` ? null : `topic-${topic.id}`)}>⋮</button>
                        {openDropdownId === `topic-${topic.id}` && (
                          <>
                            <div className="item-dropdown-backdrop" onClick={() => setOpenDropdownId(null)} />
                            <div className="item-dropdown-menu">
                              <button type="button" className="item-dropdown-option" onClick={() => { setOpenDropdownId(null); openTopicEdit(topic); }}>Editar</button>
                              <button type="button" className="item-dropdown-option item-dropdown-option--danger" onClick={() => { setOpenDropdownId(null); setDeletingTopicId(topic.id); }}>Excluir</button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* ─── Avaliações ─── */}
          <section className="card" id="evaluations-card">
            <div className="card-header">
              <div>
                <h2 className="card-title">Avaliações</h2>
                <p className="card-subtitle">
                  {discipline.evaluations.length}{" "}
                  {discipline.evaluations.length === 1 ? "avaliação" : "avaliações"}
                </p>
              </div>
              <button
                type="button"
                className={`btn-secondary ${isEvaluationFormOpen ? "btn-secondary--cancel" : ""}`}
                onClick={() => {
                  if (isEvaluationFormOpen) { setIsEvaluationFormOpen(false); setEditingEvalId(null); }
                  else openEvalCreate();
                }}
              >
                {isEvaluationFormOpen ? "✕ Cancelar" : "+ Adicionar"}
              </button>
            </div>

            {isEvaluationFormOpen && (
              <form className="inline-form" onSubmit={handleSubmitEvaluation}>
                <div className="inline-form-field">
                  <label className="inline-form-label" htmlFor="eval-title">Título</label>
                  <input id="eval-title" className="inline-form-input" type="text" placeholder="Ex: Prova 1" value={evaluationTitle} required onChange={(e) => setEvaluationTitle(e.target.value)} />
                </div>
                <div className="inline-form-row">
                  <div className="inline-form-field">
                    <label className="inline-form-label" htmlFor="eval-date">Data</label>
                    <input id="eval-date" className="inline-form-input" type="datetime-local" value={evaluationDate} onChange={(e) => setEvaluationDate(e.target.value)} />
                  </div>
                  <div className="inline-form-field">
                    <label className="inline-form-label" htmlFor="eval-max-grade">Nota máxima</label>
                    <input id="eval-max-grade" className="inline-form-input" type="number" min="0.1" step="0.1" value={evaluationMaxGrade} onChange={(e) => setEvaluationMaxGrade(e.target.value)} />
                  </div>
                </div>
                {editingEvalId && (
                  <div className="inline-form-field">
                    <label className="inline-form-label" htmlFor="eval-grade">Nota obtida</label>
                    <input id="eval-grade" className="inline-form-input" type="number" min="0" step="0.1" placeholder="Opcional" value={evaluationGrade} onChange={(e) => setEvaluationGrade(e.target.value)} />
                  </div>
                )}
                {evaluationFormError && <p className="inline-form-error">{evaluationFormError}</p>}
                <div className="inline-form-footer">
                  <button type="submit" className="btn-primary" disabled={isEvaluationSubmitting}>
                    {isEvaluationSubmitting ? "Salvando…" : editingEvalId ? "Atualizar" : "Salvar"}
                  </button>
                </div>
              </form>
            )}

            {deletingEvalId && (
              <div className="confirm-delete-bar">
                <p>Excluir esta avaliação?</p>
                <div className="confirm-delete-bar-actions">
                  <button type="button" className="btn-secondary btn-secondary--cancel" onClick={() => setDeletingEvalId(null)}>Cancelar</button>
                  <button type="button" className="btn-danger" onClick={() => handleDeleteEvaluation(deletingEvalId)}>Excluir</button>
                </div>
              </div>
            )}

            {discipline.evaluations.length === 0 ? (
              <p className="empty-text">Nenhuma avaliação cadastrada.</p>
            ) : (
              <ul className="disc-eval-list">
                {discipline.evaluations.map((ev) => (
                  <li key={ev.id} className="disc-eval-item">
                    <div className="disc-eval-left">
                      <span className="disc-eval-title">{ev.title}</span>
                      <span className="disc-eval-meta">{formatDate(ev.date)}</span>
                    </div>
                    <div className="disc-eval-right">
                      <span className="disc-eval-grade">{ev.grade ?? "–"}/{ev.maxGrade}</span>
                      <span className={`badge ${ev.completed ? "badge--done" : "badge--pending"}`}>
                        {ev.completed ? "Concluída" : "Pendente"}
                      </span>
                      <div className="item-dropdown">
                        <button type="button" className="item-dropdown-trigger" aria-expanded={openDropdownId === `eval-${ev.id}`} onClick={() => setOpenDropdownId(openDropdownId === `eval-${ev.id}` ? null : `eval-${ev.id}`)}>⋮</button>
                        {openDropdownId === `eval-${ev.id}` && (
                          <>
                            <div className="item-dropdown-backdrop" onClick={() => setOpenDropdownId(null)} />
                            <div className="item-dropdown-menu">
                              <button type="button" className="item-dropdown-option" onClick={() => { setOpenDropdownId(null); openEvalEdit(ev); }}>Editar</button>
                              <button type="button" className="item-dropdown-option item-dropdown-option--danger" onClick={() => { setOpenDropdownId(null); setDeletingEvalId(ev.id); }}>Excluir</button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* ─── Horários ─── */}
          <section className="card" id="schedules-card">
            <div className="card-header">
              <div>
                <h2 className="card-title">Horários</h2>
                <p className="card-subtitle">
                  {discipline.schedules.length}{" "}
                  {discipline.schedules.length === 1 ? "horário" : "horários"}
                </p>
              </div>
              <button
                type="button"
                className={`btn-secondary ${isScheduleFormOpen ? "btn-secondary--cancel" : ""}`}
                onClick={() => {
                  if (isScheduleFormOpen) { setIsScheduleFormOpen(false); setEditingScheduleIndex(null); }
                  else openScheduleCreate();
                }}
              >
                {isScheduleFormOpen ? "✕ Cancelar" : "+ Adicionar"}
              </button>
            </div>

            {isScheduleFormOpen && (
              <form className="inline-form" onSubmit={handleSubmitSchedule}>
                <div className="inline-form-field">
                  <label className="inline-form-label" htmlFor="schedule-day">Dia da semana</label>
                  <select id="schedule-day" className="inline-form-select" value={scheduleDayOfWeek} onChange={(e) => setScheduleDayOfWeek(e.target.value)}>
                    {DAY_LABELS.map((label, index) => (
                      <option key={label} value={index}>{label}</option>
                    ))}
                  </select>
                </div>
                <div className="inline-form-row">
                  <div className="inline-form-field">
                    <label className="inline-form-label" htmlFor="schedule-start">Início</label>
                    <input id="schedule-start" className="inline-form-input" type="time" value={scheduleStartTime} onChange={(e) => setScheduleStartTime(e.target.value)} />
                  </div>
                  <div className="inline-form-field">
                    <label className="inline-form-label" htmlFor="schedule-end">Fim</label>
                    <input id="schedule-end" className="inline-form-input" type="time" value={scheduleEndTime} onChange={(e) => setScheduleEndTime(e.target.value)} />
                  </div>
                </div>
                {scheduleFormError && <p className="inline-form-error">{scheduleFormError}</p>}
                <div className="inline-form-footer">
                  <button type="submit" className="btn-primary" disabled={isScheduleSubmitting}>
                    {isScheduleSubmitting ? "Salvando…" : editingScheduleIndex !== null ? "Atualizar" : "Salvar"}
                  </button>
                </div>
              </form>
            )}

            {deletingScheduleIndex !== null && (
              <div className="confirm-delete-bar">
                <p>Excluir este horário?</p>
                <div className="confirm-delete-bar-actions">
                  <button type="button" className="btn-secondary btn-secondary--cancel" onClick={() => setDeletingScheduleIndex(null)}>Cancelar</button>
                  <button type="button" className="btn-danger" onClick={() => handleDeleteSchedule(deletingScheduleIndex)}>Excluir</button>
                </div>
              </div>
            )}

            {sortedSchedules.length === 0 ? (
              <p className="empty-text">Nenhum horário cadastrado.</p>
            ) : (
              <ul className="disc-schedule-list">
                {sortedSchedules.map((schedule, sortedIdx) => {
                  const origIdx = sortedScheduleOriginalIndices[sortedIdx];
                  return (
                    <li key={`${schedule.dayOfWeek}-${schedule.startTime}-${sortedIdx}`} className="disc-schedule-chip">
                      <span className="disc-schedule-day">{DAY_SHORT[schedule.dayOfWeek]}</span>
                      <span className="disc-schedule-time">{schedule.startTime}–{schedule.endTime}</span>
                      <div className="item-dropdown">
                        <button type="button" className="item-dropdown-trigger" aria-expanded={openDropdownId === `sched-${origIdx}`} onClick={() => setOpenDropdownId(openDropdownId === `sched-${origIdx}` ? null : `sched-${origIdx}`)}>⋮</button>
                        {openDropdownId === `sched-${origIdx}` && (
                          <>
                            <div className="item-dropdown-backdrop" onClick={() => setOpenDropdownId(null)} />
                            <div className="item-dropdown-menu">
                              <button type="button" className="item-dropdown-option" onClick={() => { setOpenDropdownId(null); openScheduleEdit(origIdx, schedule); }}>Editar</button>
                              <button type="button" className="item-dropdown-option item-dropdown-option--danger" onClick={() => { setOpenDropdownId(null); setDeletingScheduleIndex(origIdx); }}>Excluir</button>
                            </div>
                          </>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* ─── Referências Bibliográficas ─── */}
          <section className="card" id="references-card">
            <div className="card-header">
              <div>
                <h2 className="card-title">Referências</h2>
                <p className="card-subtitle">Bibliografia e materiais</p>
              </div>
              <button
                type="button"
                className={`btn-secondary ${isReferencesFormOpen ? "btn-secondary--cancel" : ""}`}
                onClick={() => {
                  setReferencesFormError("");
                  setReferencesValue(discipline.references ?? "");
                  setIsReferencesFormOpen((prev) => !prev);
                }}
              >
                {isReferencesFormOpen
                  ? "✕ Cancelar"
                  : discipline.references?.trim()
                    ? "✎ Editar"
                    : "+ Adicionar"}
              </button>
            </div>

            {isReferencesFormOpen && (
              <form className="inline-form" onSubmit={handleSaveReferences}>
                <div className="inline-form-field">
                  <label className="inline-form-label" htmlFor="references-text">Referência bibliográfica</label>
                  <textarea id="references-text" className="inline-form-textarea" value={referencesValue} rows={5} placeholder="Cole ou escreva as referências aqui…" onChange={(e) => setReferencesValue(e.target.value)} />
                </div>
                {referencesFormError && <p className="inline-form-error">{referencesFormError}</p>}
                <div className="inline-form-footer">
                  <button type="submit" className="btn-primary" disabled={isReferencesSubmitting}>
                    {isReferencesSubmitting ? "Salvando…" : "Salvar"}
                  </button>
                </div>
              </form>
            )}

            {!isReferencesFormOpen && (
              discipline.references?.trim() ? (
                <div className="disc-references-text">{discipline.references}</div>
              ) : (
                <p className="empty-text">Nenhuma referência cadastrada.</p>
              )
            )}
          </section>

        </div>
      </main>
    </div>
  );
};

export default Discipline;
