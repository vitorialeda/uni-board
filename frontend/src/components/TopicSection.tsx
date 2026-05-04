import type { FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { API_URL, formatDate, toLocalDatetimeValue } from "../lib/utils";
import { getToken, handle401 } from "../lib/auth";
import type { Topic } from "../lib/types";
import ConfirmDeleteBar from "./ConfirmDeleteBar";
import ItemDropdown from "./ItemDropdown";

type TopicSectionProps = {
  disciplineId: string;
  topics: Topic[];
  onTopicsChange: (topics: Topic[]) => void;
  openDropdownId: string | null;
  setOpenDropdownId: (id: string | null) => void;
};

const TopicSection = ({
  disciplineId,
  topics,
  onTopicsChange,
  openDropdownId,
  setOpenDropdownId,
}: TopicSectionProps) => {
  const navigate = useNavigate();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [completed, setCompleted] = useState(false);
  const [formError, setFormError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const cardRef = useRef<HTMLElement | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);

  useEffect(() => {
    if (!isFormOpen || !editingId) return;

    const animationId = requestAnimationFrame(() => {
      const card = cardRef.current;
      const form = formRef.current;
      if (!card || !form) return;

      const cardRect = card.getBoundingClientRect();
      const formRect = form.getBoundingClientRect();
      const targetTop = card.scrollTop + (formRect.top - cardRect.top) - 8;

      card.scrollTo({ top: Math.max(0, targetTop), behavior: "smooth" });
    });

    return () => cancelAnimationFrame(animationId);
  }, [isFormOpen, editingId]);

  const openCreate = () => {
    setEditingId(null);
    setTitle(""); setDescription(""); setDueDate(""); setCompleted(false);
    setFormError("");
    setIsFormOpen(true);
  };

  const openEdit = (topic: Topic) => {
    setEditingId(topic.id);
    setTitle(topic.title);
    setDescription(topic.description ?? "");
    setDueDate(toLocalDatetimeValue(topic.dueDate));
    setCompleted(topic.completed);
    setFormError("");
    setIsFormOpen(true);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");
    const token = getToken(navigate);
    if (!token) return;

    const trimmedTitle = title.trim();
    if (!trimmedTitle) { setFormError("Informe o título do tópico."); return; }

    setIsSubmitting(true);
    const payload: {
      title: string;
      description?: string;
      dueDate?: string;
      completed?: boolean;
    } = { title: trimmedTitle };
    const trimmedDesc = description.trim();
    if (trimmedDesc) payload.description = trimmedDesc;
    if (dueDate) payload.dueDate = new Date(dueDate).toISOString();
    if (editingId) payload.completed = completed;

    try {
      if (editingId) {
        const response = await axios.put<Topic>(
          `${API_URL}/disciplines/${disciplineId}/topics/${editingId}`,
          payload,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        onTopicsChange(topics.map((t) => (t.id === editingId ? response.data : t)));
      } else {
        const response = await axios.post<Topic>(
          `${API_URL}/disciplines/${disciplineId}/topics`,
          payload,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        onTopicsChange([...topics, response.data]);
      }
      setTitle(""); setDescription(""); setDueDate(""); setCompleted(false);
      setEditingId(null);
      setIsFormOpen(false);
    } catch (error: unknown) {
      if (axios.isAxiosError<{ error?: string }>(error)) {
        if (handle401(error.response?.status, navigate)) return;
        setFormError(error.response?.data?.error ?? "Não foi possível salvar o tópico.");
      } else {
        setFormError("Erro de conexão ao salvar tópico.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (topicId: string) => {
    const token = getToken(navigate);
    if (!token) return;
    try {
      await axios.delete(`${API_URL}/disciplines/${disciplineId}/topics/${topicId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      onTopicsChange(topics.filter((t) => t.id !== topicId));
      setDeletingId(null);
    } catch (error: unknown) {
      if (axios.isAxiosError<{ error?: string }>(error)) {
        if (handle401(error.response?.status, navigate)) return;
      }
    }
  };

  const handleToggle = async (topicId: string) => {
    const token = getToken(navigate);
    if (!token) return;
    try {
      const response = await axios.patch<Topic>(
        `${API_URL}/disciplines/${disciplineId}/topics/${topicId}/toggle`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );
      onTopicsChange(topics.map((t) => (t.id === topicId ? response.data : t)));
    } catch (error: unknown) {
      if (axios.isAxiosError<{ error?: string }>(error)) {
        if (handle401(error.response?.status, navigate)) return;
      }
    }
  };

  return (
    <section ref={cardRef} className="card" id="topics-card">
      <div className="card-header">
        <div>
          <h2 className="card-title">Tópicos</h2>
          <p className="card-subtitle">
            {topics.length} {topics.length === 1 ? "tópico" : "tópicos"}
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
        <form ref={formRef} className="inline-form" onSubmit={handleSubmit}>
          <div className="inline-form-field">
            <label className="inline-form-label" htmlFor="topic-title">Título</label>
            <input id="topic-title" className="inline-form-input" type="text" placeholder="Ex: Limites e Continuidade" value={title} required onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="inline-form-row">
            <div className="inline-form-field">
              <label className="inline-form-label" htmlFor="topic-desc">Descrição</label>
              <input id="topic-desc" className="inline-form-input" type="text" placeholder="Opcional" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="inline-form-field">
              <label className="inline-form-label" htmlFor="topic-due">Vencimento</label>
              <input id="topic-due" className="inline-form-input" type="datetime-local" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>
          {editingId && (
            <label className="inline-form-checkbox" htmlFor="topic-completed">
              <input
                id="topic-completed"
                type="checkbox"
                checked={completed}
                onChange={(e) => setCompleted(e.target.checked)}
              />
              Marcar como concluído
            </label>
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
        <ConfirmDeleteBar message="Excluir este tópico?" onCancel={() => setDeletingId(null)} onConfirm={() => handleDelete(deletingId)} />
      )}

      {topics.length === 0 ? (
        <p className="empty-text">Nenhum tópico cadastrado.</p>
      ) : (
        <ul className="disc-topic-list">
          {topics.map((topic) => (
            <li key={topic.id} className="disc-topic-item">
              <div className="disc-topic-left">
                <span className="disc-topic-title">{topic.title}</span>
                <span className="disc-topic-meta">
                  {formatDate(topic.dueDate)}
                  {topic.description ? ` · ${topic.description}` : ""}
                </span>
              </div>
              <div className="disc-topic-right">
                <button
                  type="button"
                  className={`badge ${topic.completed ? "badge--done" : "badge--pending"} badge--clickable`}
                  onClick={() => handleToggle(topic.id)}
                >
                  {topic.completed ? "Concluído" : "Pendente"}
                </button>
                <ItemDropdown
                  id={`topic-${topic.id}`}
                  openDropdownId={openDropdownId}
                  setOpenDropdownId={setOpenDropdownId}
                  onEdit={() => openEdit(topic)}
                  onDelete={() => setDeletingId(topic.id)}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default TopicSection;
