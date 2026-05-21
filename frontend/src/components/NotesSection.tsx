import type { FormEvent } from "react";
import { useState } from "react";
import axios from "axios";
import { api } from "../lib/api";
import { formatDate } from "../lib/utils";
import type { Note } from "../lib/types";
import ConfirmDeleteBar from "./ConfirmDeleteBar";
import ItemDropdown from "./ItemDropdown";

type NotesSectionProps = {
  disciplineId: string;
  notes: Note[];
  onNotesChange: (notes: Note[]) => void;
  openDropdownId: string | null;
  setOpenDropdownId: (id: string | null) => void;
};

const NotesSection = ({
  disciplineId,
  notes,
  onNotesChange,
  openDropdownId,
  setOpenDropdownId,
}: NotesSectionProps) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [content, setContent] = useState("");
  const [formError, setFormError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const openCreate = () => {
    setEditingId(null);
    setContent("");
    setFormError("");
    setIsFormOpen(true);
  };

  const openEdit = (note: Note) => {
    setEditingId(note.id);
    setContent(note.content);
    setFormError("");
    setIsFormOpen(true);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");

    const trimmedContent = content.trim();
    if (!trimmedContent) {
      setFormError("Escreva o conteúdo da nota.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingId) {
        const response = await api.put<Note>(
          `/disciplines/${disciplineId}/notes/${editingId}`,
          { content: trimmedContent },
        );
        onNotesChange(notes.map((note) => (note.id === editingId ? response.data : note)));
      } else {
        const response = await api.post<Note>(
          `/disciplines/${disciplineId}/notes`,
          { content: trimmedContent },
        );
        onNotesChange([response.data, ...notes]);
      }

      setContent("");
      setEditingId(null);
      setIsFormOpen(false);
    } catch (error: unknown) {
      if (axios.isAxiosError<{ error?: string }>(error)) {
        setFormError(error.response?.data?.error ?? "Não foi possível salvar a nota.");
      } else {
        setFormError("Erro de conexão ao salvar nota.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (noteId: string) => {
    try {
      await api.delete(`/disciplines/${disciplineId}/notes/${noteId}`);
      onNotesChange(notes.filter((note) => note.id !== noteId));
      setDeletingId(null);
    } catch (error: unknown) {
      if (axios.isAxiosError<{ error?: string }>(error)) {
        return;
      }
    }
  };

  return (
    <section className="card" id="notes-card">
      <div className="card-header">
        <div>
          <h2 className="card-title">Notas</h2>
          <p className="card-subtitle">
            {notes.length} {notes.length === 1 ? "nota" : "notas"}
          </p>
        </div>
        <button
          type="button"
          className={`btn-secondary ${isFormOpen ? "btn-secondary--cancel" : ""}`}
          onClick={() => {
            if (isFormOpen) {
              setIsFormOpen(false);
              setEditingId(null);
            } else {
              openCreate();
            }
          }}
        >
          {isFormOpen ? "✕ Cancelar" : "+ Adicionar"}
        </button>
      </div>

      {isFormOpen && (
        <form className="inline-form" onSubmit={handleSubmit}>
          <div className="inline-form-field">
            <label className="inline-form-label" htmlFor="note-content">
              Conteúdo
            </label>
            <textarea
              id="note-content"
              className="inline-form-textarea"
              rows={4}
              placeholder="Escreva sua nota..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
            />
          </div>
          {formError && <p className="inline-form-error">{formError}</p>}
          <div className="inline-form-footer">
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? "Salvando…" : editingId ? "Atualizar" : "Salvar"}
            </button>
          </div>
        </form>
      )}

      {deletingId && (
        <ConfirmDeleteBar
          message="Excluir esta nota?"
          onCancel={() => setDeletingId(null)}
          onConfirm={() => handleDelete(deletingId)}
        />
      )}

      {notes.length === 0 ? (
        <p className="empty-text">Nenhuma nota cadastrada.</p>
      ) : (
        <ul className="disc-note-list">
          {notes.map((note) => (
            <li key={note.id} className="disc-note-item">
              <div className="disc-note-left">
                <p className="disc-note-content">{note.content}</p>
                <span className="disc-note-meta">
                  Criada em {formatDate(note.createdAt)}
                </span>
              </div>
              <div className="disc-note-right">
                <ItemDropdown
                  id={`note-${note.id}`}
                  openDropdownId={openDropdownId}
                  setOpenDropdownId={setOpenDropdownId}
                  onEdit={() => openEdit(note)}
                  onDelete={() => setDeletingId(note.id)}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default NotesSection;
