import type { FormEvent } from "react";
import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { API_URL, formatDate, toLocalDatetimeValue } from "../lib/utils";
import { getToken, handle401 } from "../lib/auth";
import type { Evaluation } from "../lib/types";
import ConfirmDeleteBar from "./ConfirmDeleteBar";
import ItemDropdown from "./ItemDropdown";

type EvaluationSectionProps = {
  disciplineId: string;
  evaluations: Evaluation[];
  onEvaluationsChange: (evaluations: Evaluation[]) => void;
  openDropdownId: string | null;
  setOpenDropdownId: (id: string | null) => void;
};

const EvaluationSection = ({
  disciplineId,
  evaluations,
  onEvaluationsChange,
  openDropdownId,
  setOpenDropdownId,
}: EvaluationSectionProps) => {
  const navigate = useNavigate();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [maxGrade, setMaxGrade] = useState("10");
  const [grade, setGrade] = useState("");
  const [formError, setFormError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const openCreate = () => {
    setEditingId(null);
    setTitle(""); setDate(""); setMaxGrade("10"); setGrade("");
    setFormError("");
    setIsFormOpen(true);
  };

  const openEdit = (ev: Evaluation) => {
    setEditingId(ev.id);
    setTitle(ev.title);
    setDate(toLocalDatetimeValue(ev.date));
    setMaxGrade(String(ev.maxGrade));
    setGrade(ev.grade !== null ? String(ev.grade) : "");
    setFormError("");
    setIsFormOpen(true);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");
    const token = getToken(navigate);
    if (!token) return;

    const trimmedTitle = title.trim();
    if (!trimmedTitle) { setFormError("Informe o título da avaliação."); return; }
    const parsedMaxGrade = Number(maxGrade);
    if (!Number.isFinite(parsedMaxGrade) || parsedMaxGrade <= 0) { setFormError("A nota máxima deve ser maior que zero."); return; }

    setIsSubmitting(true);
    const payload: { title: string; date?: string; maxGrade: number; grade?: number } = {
      title: trimmedTitle, maxGrade: parsedMaxGrade,
    };
    if (date) payload.date = new Date(date).toISOString();
    if (grade !== "") payload.grade = Number(grade);

    try {
      if (editingId) {
        const response = await axios.put<Evaluation>(
          `${API_URL}/disciplines/${disciplineId}/evaluations/${editingId}`,
          payload,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        onEvaluationsChange(evaluations.map((e) => (e.id === editingId ? response.data : e)));
      } else {
        const response = await axios.post<Evaluation>(
          `${API_URL}/disciplines/${disciplineId}/evaluations`,
          payload,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        onEvaluationsChange([...evaluations, response.data]);
      }
      setTitle(""); setDate(""); setMaxGrade("10"); setGrade("");
      setEditingId(null);
      setIsFormOpen(false);
    } catch (error: unknown) {
      if (axios.isAxiosError<{ error?: string }>(error)) {
        if (handle401(error.response?.status, navigate)) return;
        setFormError(error.response?.data?.error ?? "Não foi possível salvar a avaliação.");
      } else {
        setFormError("Erro de conexão ao salvar avaliação.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (evalId: string) => {
    const token = getToken(navigate);
    if (!token) return;
    try {
      await axios.delete(`${API_URL}/disciplines/${disciplineId}/evaluations/${evalId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      onEvaluationsChange(evaluations.filter((e) => e.id !== evalId));
      setDeletingId(null);
    } catch (error: unknown) {
      if (axios.isAxiosError<{ error?: string }>(error)) {
        if (handle401(error.response?.status, navigate)) return;
      }
    }
  };

  const handleToggle = async (evalId: string) => {
    const token = getToken(navigate);
    if (!token) return;
    try {
      const response = await axios.patch<Evaluation>(
        `${API_URL}/disciplines/${disciplineId}/evaluations/${evalId}/toggle`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );
      onEvaluationsChange(evaluations.map((e) => (e.id === evalId ? response.data : e)));
    } catch (error: unknown) {
      if (axios.isAxiosError<{ error?: string }>(error)) {
        if (handle401(error.response?.status, navigate)) return;
      }
    }
  };

  return (
    <section className="card" id="evaluations-card">
      <div className="card-header">
        <div>
          <h2 className="card-title">Avaliações</h2>
          <p className="card-subtitle">
            {evaluations.length} {evaluations.length === 1 ? "avaliação" : "avaliações"}
          </p>
        </div>
        <button
          type="button"
          className={`btn-secondary ${isFormOpen ? "btn-secondary--cancel" : ""}`}
          onClick={() => {
            if (isFormOpen) { setIsFormOpen(false); setEditingId(null); }
            else openCreate();
          }}
        >
          {isFormOpen ? "✕ Cancelar" : "+ Adicionar"}
        </button>
      </div>

      {isFormOpen && (
        <form className="inline-form" onSubmit={handleSubmit}>
          <div className="inline-form-field">
            <label className="inline-form-label" htmlFor="eval-title">Título</label>
            <input id="eval-title" className="inline-form-input" type="text" placeholder="Ex: Prova 1" value={title} required onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="inline-form-row">
            <div className="inline-form-field">
              <label className="inline-form-label" htmlFor="eval-date">Data</label>
              <input id="eval-date" className="inline-form-input" type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="inline-form-field">
              <label className="inline-form-label" htmlFor="eval-max-grade">Nota máxima</label>
              <input id="eval-max-grade" className="inline-form-input" type="number" min="0.1" step="0.1" value={maxGrade} onChange={(e) => setMaxGrade(e.target.value)} />
            </div>
          </div>
          {editingId && (
            <div className="inline-form-field">
              <label className="inline-form-label" htmlFor="eval-grade">Nota obtida</label>
              <input id="eval-grade" className="inline-form-input" type="number" min="0" step="0.1" placeholder="Opcional" value={grade} onChange={(e) => setGrade(e.target.value)} />
            </div>
          )}
          {formError && <p className="inline-form-error">{formError}</p>}
          <div className="inline-form-footer">
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? "Salvando…" : editingId ? "Atualizar" : "Salvar"}
            </button>
          </div>
        </form>
      )}

      {deletingId && (
        <ConfirmDeleteBar message="Excluir esta avaliação?" onCancel={() => setDeletingId(null)} onConfirm={() => handleDelete(deletingId)} />
      )}

      {evaluations.length === 0 ? (
        <p className="empty-text">Nenhuma avaliação cadastrada.</p>
      ) : (
        <ul className="disc-eval-list">
          {evaluations.map((ev) => (
            <li key={ev.id} className="disc-eval-item">
              <div className="disc-eval-left">
                <span className="disc-eval-title">{ev.title}</span>
                <span className="disc-eval-meta">{formatDate(ev.date)}</span>
              </div>
              <div className="disc-eval-right">
                <span className="disc-eval-grade">{ev.grade ?? "–"}/{ev.maxGrade}</span>
                <button
                  type="button"
                  className={`badge ${ev.completed ? "badge--done" : "badge--pending"} badge--clickable`}
                  onClick={() => handleToggle(ev.id)}
                >
                  {ev.completed ? "Concluída" : "Pendente"}
                </button>
                <ItemDropdown
                  id={`eval-${ev.id}`}
                  openDropdownId={openDropdownId}
                  setOpenDropdownId={setOpenDropdownId}
                  onEdit={() => openEdit(ev)}
                  onDelete={() => setDeletingId(ev.id)}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default EvaluationSection;
