import type { FormEvent } from "react";
import { useState } from "react";
import axios from "axios";
import { api } from "../lib/api";
import type { DisciplineUpdateResponse } from "../lib/types";

type ReferencesSectionProps = {
  disciplineId: string;
  references: string | null;
  onReferencesChange: (references: string | null) => void;
};

const ReferencesSection = ({
  disciplineId,
  references,
  onReferencesChange,
}: ReferencesSectionProps) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [value, setValue] = useState("");
  const [formError, setFormError] = useState("");

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");

    setIsSubmitting(true);
    try {
      const response = await api.put<DisciplineUpdateResponse>(
        `/disciplines/${disciplineId}`,
        { references: value.trim() },
      );
      onReferencesChange(response.data.references);
      setIsFormOpen(false);
    } catch (error: unknown) {
      if (axios.isAxiosError<{ error?: string }>(error)) {
        setFormError(error.response?.data?.error ?? "Não foi possível salvar a referência bibliográfica.");
      } else {
        setFormError("Erro de conexão ao salvar referência.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="card" id="references-card">
      <div className="card-scroll">
        <div className="card-header">
          <div>
            <h2 className="card-title">Referências</h2>
            <p className="card-subtitle">Bibliografia e materiais</p>
          </div>
          <button
            type="button"
            className={`btn-secondary ${isFormOpen ? "btn-secondary--cancel" : ""}`}
            onClick={() => {
              setFormError("");
              setValue(references ?? "");
              setIsFormOpen((prev) => !prev);
            }}
          >
            {isFormOpen ? "✕ Cancelar" : references?.trim() ? "Editar" : "+ Adicionar"}
          </button>
        </div>

        {isFormOpen && (
          <form className="inline-form" onSubmit={handleSave}>
            <div className="inline-form-field">
              <label className="inline-form-label" htmlFor="references-text">Referência bibliográfica</label>
              <textarea id="references-text" className="inline-form-textarea" value={value} rows={5} placeholder="Cole ou escreva as referências aqui…" onChange={(e) => setValue(e.target.value)} />
            </div>
            {formError && <p className="inline-form-error">{formError}</p>}
            <div className="inline-form-footer">
              <button type="submit" className="btn-primary" disabled={isSubmitting}>
                {isSubmitting ? "Salvando…" : "Salvar"}
              </button>
            </div>
          </form>
        )}

        {!isFormOpen && (
          references?.trim() ? (
            <div className="disc-references-text">{references}</div>
          ) : (
            <p className="empty-text">Nenhuma referência cadastrada.</p>
          )
        )}
      </div>
    </section>
  );
};

export default ReferencesSection;
