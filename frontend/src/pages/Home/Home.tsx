import { useEffect, useMemo, useCallback, useState } from "react";
import type { FormEvent } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import Topbar from "../../components/Topbar";
import { formatDate } from "../../lib/utils";
import { api } from "../../lib/api";
import "./Home.css";

type Evaluation = {
  id: string;
  title: string;
  date: string | null;
  grade: number | null;
  maxGrade: number;
  completed: boolean;
  createdAt: string;
  disciplineId: string;
};

type ScheduleItem = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};

type Discipline = {
  id: string;
  name: string;
  description: string | null;
  professor: string | null;
  progress: number;
  schedules: ScheduleItem[];
  evaluations: Evaluation[];
};

type DisciplineCreateResponse = {
  id: string;
  name: string;
  description: string | null;
  professor: string | null;
};

type Schedule = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  disciplineId: string;
};

type Todo = {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
  userId: string;
};

type EvaluationWithDiscipline = Evaluation & {
  disciplineName: string;
};

type ScheduleWithDiscipline = Schedule & {
  disciplineName: string;
};

const TIME_SLOTS = [
  { start: "13:00", end: "13:50" },
  { start: "13:50", end: "14:40" },
  { start: "14:50", end: "15:40" },
  { start: "15:40", end: "16:30" },
  { start: "16:40", end: "17:30" },
  { start: "17:30", end: "18:20" },
];

const WEEKDAYS = [
  { key: 1, label: "Segunda" },
  { key: 2, label: "Terça" },
  { key: 3, label: "Quarta" },
  { key: 4, label: "Quinta" },
  { key: 5, label: "Sexta" },
];

const DISCIPLINE_COLORS = [
  { bg: "#1565C0", text: "#f5f7fa" },
  { bg: "#2E7D32", text: "#f5f7fa" },
  { bg: "#AD1457", text: "#f5f7fa" },
  { bg: "#E65100", text: "#f5f7fa" },
  { bg: "#00838F", text: "#f5f7fa" },
  { bg: "#8E24AA", text: "#f5f7fa" },
  { bg: "#F9A825", text: "#f5f7fa" },
  { bg: "#283593", text: "#f5f7fa" },
  { bg: "#C62828", text: "#f5f7fa" },
  { bg: "#00695C", text: "#f5f7fa" },
];

function getCurrentWeekRange() {
  const now = new Date();
  const start = new Date(now);
  const currentDay = start.getDay();
  const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;

  start.setDate(start.getDate() + diffToMonday);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

function isEvaluationInCurrentWeek(
  evaluation: Evaluation,
  start: Date,
  end: Date,
) {
  if (!evaluation.date) return false;

  const evaluationDate = new Date(evaluation.date);
  return evaluationDate >= start && evaluationDate <= end;
}

/** Check if a schedule entry covers a given time slot on a given day */
function findScheduleForSlot(
  schedules: ScheduleWithDiscipline[],
  dayOfWeek: number,
  slotStart: string,
  slotEnd: string,
): ScheduleWithDiscipline | undefined {
  return schedules.find(
    (s) =>
      s.dayOfWeek === dayOfWeek &&
      s.startTime <= slotStart &&
      s.endTime >= slotEnd,
  );
}

const Home = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [schedules, setSchedules] = useState<ScheduleWithDiscipline[]>([]);
  const [weeklyEvaluations, setWeeklyEvaluations] = useState<
    EvaluationWithDiscipline[]
  >([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [isDisciplineFormOpen, setIsDisciplineFormOpen] = useState(false);
  const [isDisciplineSubmitting, setIsDisciplineSubmitting] = useState(false);
  const [disciplineName, setDisciplineName] = useState("");
  const [disciplineDescription, setDisciplineDescription] = useState("");
  const [disciplineFormError, setDisciplineFormError] = useState("");
  const [isTodoFormOpen, setIsTodoFormOpen] = useState(false);
  const [isTodoSubmitting, setIsTodoSubmitting] = useState(false);
  const [todoTitle, setTodoTitle] = useState("");
  const [todoFormError, setTodoFormError] = useState("");
  const [todoActionError, setTodoActionError] = useState("");
  const [togglingTodoId, setTogglingTodoId] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Visão Geral | Dashboard Universitário";
  }, []);

  const userName = useMemo(() => {
    try {
      const raw = localStorage.getItem("user");
      if (raw) {
        const parsed = JSON.parse(raw);
        return parsed.name ?? "";
      }
    } catch {
      /* ignore */
    }
    return "";
  }, []);

  /** Stable map: disciplineId → color pair */
  const disciplineColorMap = useMemo(() => {
    const map = new Map<string, { bg: string; text: string }>();
    const ids = [...new Set(schedules.map((s) => s.disciplineId))];
    ids.forEach((id, i) => {
      map.set(id, DISCIPLINE_COLORS[i % DISCIPLINE_COLORS.length]);
    });
    return map;
  }, [schedules]);

  const getDisciplineColor = useCallback(
    (disciplineId: string) => disciplineColorMap.get(disciplineId) ?? DISCIPLINE_COLORS[0],
    [disciplineColorMap],
  );

  const weekLabel = useMemo(() => {
    const { start, end } = getCurrentWeekRange();
    const startLabel = start.toLocaleDateString("pt-BR");
    const endLabel = end.toLocaleDateString("pt-BR");

    return `${startLabel} a ${endLabel}`;
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      navigate("/login");
      return;
    }

    const fetchHomeData = async () => {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const [disciplinesResponse, todosResponse] = await Promise.all([
          api.get<Discipline[]>("/disciplines"),
          api.get<Todo[]>("/todos"),
        ]);

        const loadedDisciplines = disciplinesResponse.data;
        setDisciplines(loadedDisciplines);
        setTodos(todosResponse.data);

        // Extract schedules from disciplines (already included in response)
        const aggregatedSchedules = loadedDisciplines
          .flatMap((discipline) =>
            (Array.isArray(discipline.schedules) ? discipline.schedules : []).map(
              (schedule) => ({
                ...schedule,
                disciplineId: discipline.id,
                disciplineName: discipline.name,
              }),
            ),
          )
          .sort((a, b) => {
            if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
            return a.startTime.localeCompare(b.startTime);
          });

        // Extract weekly evaluations from disciplines (already included in response)
        const { start, end } = getCurrentWeekRange();
        const aggregatedWeeklyEvaluations = loadedDisciplines
          .flatMap((discipline) =>
            (discipline.evaluations ?? [])
              .filter((evaluation) => isEvaluationInCurrentWeek(evaluation, start, end))
              .map((evaluation) => ({
                ...evaluation,
                disciplineId: discipline.id,
                disciplineName: discipline.name,
              })),
          )
          .sort((a, b) => {
            const aTime = a.date ? new Date(a.date).getTime() : 0;
            const bTime = b.date ? new Date(b.date).getTime() : 0;
            return aTime - bTime;
          });

        setSchedules(aggregatedSchedules);
        setWeeklyEvaluations(aggregatedWeeklyEvaluations);
      } catch (error: unknown) {
        if (axios.isAxiosError<{ error?: string }>(error)) {
          setErrorMessage(
            error.response?.data?.error ??
              "Nao foi possivel carregar os dados da home.",
          );
        } else {
          setErrorMessage("Erro de conexao ao carregar a home.");
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchHomeData();
  }, [navigate]);

  const handleCreateDiscipline = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setDisciplineFormError("");

    const trimmedName = disciplineName.trim();
    if (!trimmedName) {
      setDisciplineFormError("Informe o nome da disciplina.");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    setIsDisciplineSubmitting(true);

    try {
      const payload: { name: string; description?: string } = {
        name: trimmedName,
      };
      const trimmedDescription = disciplineDescription.trim();
      if (trimmedDescription) {
        payload.description = trimmedDescription;
      }

      const response = await api.post<DisciplineCreateResponse>("/disciplines", payload);

      setDisciplines((prev) => [
        ...prev,
        {
          id: response.data.id,
          name: response.data.name,
          description: response.data.description ?? null,
          professor: response.data.professor ?? null,
          progress: 0,
          schedules: [],
          evaluations: [],
        },
      ]);

      setDisciplineName("");
      setDisciplineDescription("");
      setIsDisciplineFormOpen(false);
    } catch (error: unknown) {
      if (axios.isAxiosError<{ error?: string }>(error)) {
        setDisciplineFormError(
          error.response?.data?.error ?? "Nao foi possivel criar a disciplina.",
        );
      } else {
        setDisciplineFormError("Erro de conexao ao criar disciplina.");
      }
    } finally {
      setIsDisciplineSubmitting(false);
    }
  };

  const handleCreateTodo = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTodoFormError("");
    setTodoActionError("");

    const trimmedTitle = todoTitle.trim();
    if (!trimmedTitle) {
      setTodoFormError("Informe o titulo do to-do.");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    setIsTodoSubmitting(true);

    try {
      const response = await api.post<Todo>("/todos", { title: trimmedTitle });

      setTodos((previous) => [...previous, response.data]);
      setTodoTitle("");
      setIsTodoFormOpen(false);
    } catch (error: unknown) {
      if (axios.isAxiosError<{ error?: string }>(error)) {
        setTodoFormError(
          error.response?.data?.error ?? "Nao foi possivel criar o to-do.",
        );
      } else {
        setTodoFormError("Erro de conexao ao criar to-do.");
      }
    } finally {
      setIsTodoSubmitting(false);
    }
  };

  const handleToggleTodo = async (todoId: string) => {
    setTodoActionError("");

    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    setTogglingTodoId(todoId);

    try {
      const response = await api.patch<Todo>(`/todos/${todoId}/toggle`, {});

      setTodos((previous) =>
        previous.map((todo) =>
          todo.id === todoId
            ? {
                ...todo,
                ...response.data,
                completed:
                  typeof response.data?.completed === "boolean"
                    ? response.data.completed
                    : !todo.completed,
              }
            : todo,
        ),
      );
    } catch (error: unknown) {
      if (axios.isAxiosError<{ error?: string }>(error)) {
        setTodoActionError(
          error.response?.data?.error ??
            "Nao foi possivel atualizar o status do to-do.",
        );
      } else {
        setTodoActionError("Erro de conexao ao atualizar to-do.");
      }
    } finally {
      setTogglingTodoId(null);
    }
  };

  /* ── Loading & Error states ── */

  if (isLoading) {
    return (
      <div className="page-state">
        <p className="page-state-text">Carregando dados…</p>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="page-state">
        <p className="page-state-text">{errorMessage}</p>
      </div>
    );
  }

  /* ── Render ── */

  return (
    <div className="page-root">
      <Topbar userName={userName} />

      {/* ── Main content ── */}
      <main className="page-content">
        <div className="page-header">
          <p className="page-header-eyebrow">Painel geral</p>
          <h1 className="page-header-title">Visão do Semestre</h1>
        </div>

        {/* ── Bento grid ── */}
        <div className="bento-grid">
          {/* ─── Disciplinas ─── */}
          <section className="card" id="disciplines-card">
            <div className="card-header">
              <div>
                <h2 className="card-title">Disciplinas</h2>
                <p className="card-subtitle">
                  {disciplines.length}{" "}
                  {disciplines.length === 1 ? "matéria" : "matérias"}
                </p>
              </div>
              <button
                type="button"
                className={`btn-secondary ${isDisciplineFormOpen ? "btn-secondary--cancel" : ""}`}
                onClick={() => {
                  setDisciplineFormError("");
                  setIsDisciplineFormOpen((prev) => !prev);
                }}
              >
                {isDisciplineFormOpen ? "✕ Cancelar" : "+ Adicionar"}
              </button>
            </div>

            {isDisciplineFormOpen && (
              <form className="inline-form" onSubmit={handleCreateDiscipline}>
                <div className="inline-form-field">
                  <label className="inline-form-label" htmlFor="discipline-name">
                    Nome
                  </label>
                  <input
                    id="discipline-name"
                    className="inline-form-input"
                    type="text"
                    placeholder="Ex: Cálculo I"
                    value={disciplineName}
                    required
                    onChange={(e) => setDisciplineName(e.target.value)}
                  />
                </div>
                <div className="inline-form-field">
                  <label className="inline-form-label" htmlFor="discipline-desc">
                    Descrição
                  </label>
                  <input
                    id="discipline-desc"
                    className="inline-form-input"
                    type="text"
                    placeholder="Opcional"
                    value={disciplineDescription}
                    onChange={(e) => setDisciplineDescription(e.target.value)}
                  />
                </div>
                {disciplineFormError && (
                  <p className="inline-form-error">{disciplineFormError}</p>
                )}
                <div className="inline-form-footer">
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={isDisciplineSubmitting}
                  >
                    {isDisciplineSubmitting ? "Salvando…" : "Salvar"}
                  </button>
                </div>
              </form>
            )}

            {disciplines.length === 0 ? (
              <p className="empty-text">Nenhuma disciplina cadastrada.</p>
            ) : (
              <ul className="home-discipline-list">
                {disciplines.map((d) => (
                  <li key={d.id}>
                    <Link
                      to={`/disciplines/${d.id}`}
                      className="home-discipline-item"
                    >
                      <div className="home-discipline-item-left">
                        <span className="home-discipline-name">{d.name}</span>
                        {d.professor && (
                          <span className="home-discipline-desc">
                            {`Prof. ${d.professor}`}
                          </span>
                        )}
                      </div>
                      <div className="home-progress-wrap">
                        <div className="home-progress-bar">
                          <div
                            className="home-progress-fill"
                            style={{ width: `${d.progress * 100}%` }}
                          />
                        </div>
                        <span className="home-progress-label">
                          {(d.progress * 100).toFixed(0)}%
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* ─── To-do ─── */}
          <section className="card" id="todo-card">
            <div className="card-header">
              <div>
                <h2 className="card-title">To-do</h2>
                <p className="card-subtitle">
                  {todos.filter((t) => !t.completed).length} pendentes
                </p>
              </div>
              <button
                type="button"
                className={`btn-secondary ${isTodoFormOpen ? "btn-secondary--cancel" : ""}`}
                onClick={() => {
                  setTodoFormError("");
                  setIsTodoFormOpen((prev) => !prev);
                }}
              >
                {isTodoFormOpen ? "✕ Cancelar" : "+ Adicionar"}
              </button>
            </div>

            {isTodoFormOpen && (
              <form className="inline-form" onSubmit={handleCreateTodo}>
                <div className="inline-form-field">
                  <label className="inline-form-label" htmlFor="todo-title">
                    Título
                  </label>
                  <input
                    id="todo-title"
                    className="inline-form-input"
                    type="text"
                    placeholder="O que precisa fazer?"
                    value={todoTitle}
                    required
                    onChange={(e) => setTodoTitle(e.target.value)}
                  />
                </div>
                {todoFormError && (
                  <p className="inline-form-error">{todoFormError}</p>
                )}
                <div className="inline-form-footer">
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={isTodoSubmitting}
                  >
                    {isTodoSubmitting ? "Salvando…" : "Salvar"}
                  </button>
                </div>
              </form>
            )}

            {todoActionError && (
              <div className="action-error">⚠ {todoActionError}</div>
            )}

            {todos.length === 0 ? (
              <p className="empty-text">Nenhum to-do cadastrado.</p>
            ) : (
              <ul className="home-todo-list">
                {todos.map((todo) => (
                  <li key={todo.id} className="home-todo-item">
                    <button
                      type="button"
                      className={`home-todo-check ${todo.completed ? "home-todo-check--done" : ""}`}
                      onClick={() => handleToggleTodo(todo.id)}
                      disabled={togglingTodoId === todo.id}
                      aria-label={
                        todo.completed
                          ? "Marcar como pendente"
                          : "Marcar como concluído"
                      }
                    >
                      {todo.completed ? "✓" : ""}
                    </button>
                    <span
                      className={`home-todo-title ${todo.completed ? "home-todo-title--done" : ""}`}
                    >
                      {todo.title}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* ─── Horários (Timetable) ─── */}
          <section className="card bento-grid-wide" id="schedule-card">
            <div className="card-header">
              <div>
                <h2 className="card-title">Horários</h2>
                <p className="card-subtitle">Grade semanal</p>
              </div>
            </div>

            <div className="home-timetable-wrapper">
              <table className="home-timetable">
                <thead>
                  <tr>
                    <th className="home-timetable-corner">Horário</th>
                    {WEEKDAYS.map((day) => (
                      <th key={day.key} className="home-timetable-day-header">
                        {day.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {TIME_SLOTS.map((slot) => (
                    <tr key={`${slot.start}-${slot.end}`}>
                      <td className="home-timetable-time">
                        {slot.start}
                        <span className="home-timetable-time-sep">–</span>
                        {slot.end}
                      </td>
                      {WEEKDAYS.map((day) => {
                        const match = findScheduleForSlot(
                          schedules,
                          day.key,
                          slot.start,
                          slot.end,
                        );
                        const color = match ? getDisciplineColor(match.disciplineId) : null;
                        return (
                          <td
                            key={day.key}
                            className={`home-timetable-cell ${match ? "home-timetable-cell--filled" : ""}`}
                            style={
                              color
                                ? { backgroundColor: color.bg }
                                : undefined
                            }
                          >
                          {match ? (
                              <Link
                                to={`/disciplines/${match.disciplineId}`}
                                className="home-timetable-discipline"
                                style={{ color: color!.text }}
                              >
                                {match.disciplineName.split(" - ")[0]}
                              </Link>
                            ) : (
                              <span className="home-timetable-empty">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* ─── Avaliações da semana ─── */}
          <section className="card bento-grid-wide" id="evaluations-card">
            <div className="card-header">
              <div>
                <h2 className="card-title">Avaliações da semana</h2>
                <p className="card-subtitle">{weekLabel}</p>
              </div>
            </div>

            {weeklyEvaluations.length === 0 ? (
              <p className="empty-text">
                Nenhuma avaliação para esta semana.
              </p>
            ) : (
              <ul className="home-eval-list">
                {weeklyEvaluations.map((ev) => (
                  <li key={ev.id} className="home-eval-item">
                    <div className="home-eval-left">
                      <span className="home-eval-title">{ev.title}</span>
                      <span className="home-eval-discipline">
                        {ev.disciplineName}
                      </span>
                    </div>
                    <div className="home-eval-right">
                      <span className="home-eval-date">
                        {formatDate(ev.date)}
                      </span>
                      <span
                        className={`badge ${ev.completed ? "badge--done" : "badge--pending"}`}
                      >
                        {ev.completed ? "Concluída" : "Pendente"}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </main>
    </div>
  );
};

export default Home;
