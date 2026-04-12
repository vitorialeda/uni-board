import { useEffect, useState } from "react";
import axios from "axios";
import { Link, useNavigate, useParams } from "react-router-dom";
import Topbar from "../components/Topbar";
import ProgressBanner from "../components/ProgressBanner";
import TopicSection from "../components/TopicSection";
import EvaluationSection from "../components/EvaluationSection";
import ScheduleSection from "../components/ScheduleSection";
import ReferencesSection from "../components/ReferencesSection";
import { API_URL, calculateProgress } from "../lib/utils";
import { handle401 } from "../lib/auth";
import type { DisciplineDetails } from "../lib/types";
import "./Discipline.css";

const Discipline = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [discipline, setDiscipline] = useState<DisciplineDetails | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

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

  /* ── Render ── */
  return (
    <div className="page-root">
      <Topbar backTo="/" showLogout={false} />

      <main className="page-content">
        <div className="page-header">
          <p className="page-header-eyebrow">Disciplina</p>
          <h1 className="page-header-title">{discipline.name}</h1>
          {discipline.description && (
            <p className="page-header-desc">{discipline.description}</p>
          )}
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
    </div>
  );
};

export default Discipline;
