import type { FormEvent } from "react";
import { useState } from "react";
import axios from "axios";
import { api } from "../lib/api";
import type { Schedule, DisciplineUpdateResponse } from "../lib/types";
import ConfirmDeleteBar from "./ConfirmDeleteBar";
import ItemDropdown from "./ItemDropdown";

const DAY_LABELS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const DAY_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

type ScheduleSectionProps = {
  disciplineId: string;
  schedules: Schedule[];
  onSchedulesChange: (schedules: Schedule[]) => void;
  openDropdownId: string | null;
  setOpenDropdownId: (id: string | null) => void;
};

const ScheduleSection = ({
  disciplineId,
  schedules,
  onSchedulesChange,
  openDropdownId,
  setOpenDropdownId,
}: ScheduleSectionProps) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dayOfWeek, setDayOfWeek] = useState("1");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [formError, setFormError] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);

  const openCreate = () => {
    setEditingIndex(null);
    setDayOfWeek("1"); setStartTime(""); setEndTime("");
    setFormError("");
    setIsFormOpen(true);
  };

  const openEdit = (index: number, schedule: Schedule) => {
    setEditingIndex(index);
    setDayOfWeek(String(schedule.dayOfWeek));
    setStartTime(schedule.startTime);
    setEndTime(schedule.endTime);
    setFormError("");
    setIsFormOpen(true);
  };

  const saveSchedules = async (newSchedules: Schedule[]) => {
    const sorted = [...newSchedules].sort((a, b) => {
      if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
      return a.startTime.localeCompare(b.startTime);
    });

    try {
      const response = await api.put<DisciplineUpdateResponse>(
        `/disciplines/${disciplineId}`,
        { schedules: sorted },
      );
      onSchedulesChange((response.data.schedules as Schedule[]) ?? sorted);
      return true;
    } catch (error: unknown) {
      if (axios.isAxiosError<{ error?: string }>(error)) {
        setFormError(error.response?.data?.error ?? "Não foi possível salvar o horário.");
      } else {
        setFormError("Erro de conexão ao salvar horário.");
      }
      return false;
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");

    const parsedDay = Number(dayOfWeek);
    if (!Number.isInteger(parsedDay) || parsedDay < 0 || parsedDay > 6) { setFormError("Dia da semana inválido."); return; }
    if (!startTime || !endTime) { setFormError("Informe o horário de início e fim."); return; }
    if (endTime <= startTime) { setFormError("O horário de fim deve ser maior que o de início."); return; }

    setIsSubmitting(true);
    const newEntry: Schedule = { dayOfWeek: parsedDay, startTime, endTime };
    let updated: Schedule[];
    if (editingIndex !== null) {
      updated = schedules.map((s, i) => (i === editingIndex ? newEntry : s));
    } else {
      updated = [...schedules, newEntry];
    }

    const ok = await saveSchedules(updated);
    if (ok) {
      setDayOfWeek("1"); setStartTime(""); setEndTime("");
      setEditingIndex(null);
      setIsFormOpen(false);
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (index: number) => {
    const updated = schedules.filter((_, i) => i !== index);
    const ok = await saveSchedules(updated);
    if (ok) setDeletingIndex(null);
  };

  const sortedMapping = schedules
    .map((s, i) => ({ s, i }))
    .sort((a, b) => {
      if (a.s.dayOfWeek !== b.s.dayOfWeek) return a.s.dayOfWeek - b.s.dayOfWeek;
      return a.s.startTime.localeCompare(b.s.startTime);
    });

  return (
    <section className="card" id="schedules-card">
      <div className="card-scroll">
        <div className="card-header">
          <div>
            <h2 className="card-title">Horários</h2>
            <p className="card-subtitle">
              {schedules.length} {schedules.length === 1 ? "horário" : "horários"}
            </p>
          </div>
          <button
            type="button"
            className={`btn-secondary ${isFormOpen ? "btn-secondary--cancel" : ""}`}
            onClick={() => {
              if (isFormOpen) { setIsFormOpen(false); setEditingIndex(null); }
              else openCreate();
            }}
          >
            {isFormOpen ? "✕ Cancelar" : "+ Adicionar"}
          </button>
        </div>

        {isFormOpen && (
          <form className="inline-form" onSubmit={handleSubmit}>
            <div className="inline-form-field">
              <label className="inline-form-label" htmlFor="schedule-day">Dia da semana</label>
              <select id="schedule-day" className="inline-form-select" value={dayOfWeek} onChange={(e) => setDayOfWeek(e.target.value)}>
                {DAY_LABELS.map((label, index) => (
                  <option key={label} value={index}>{label}</option>
                ))}
              </select>
            </div>
            <div className="inline-form-row">
              <div className="inline-form-field">
                <label className="inline-form-label" htmlFor="schedule-start">Início</label>
                <input id="schedule-start" className="inline-form-input" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              </div>
              <div className="inline-form-field">
                <label className="inline-form-label" htmlFor="schedule-end">Fim</label>
                <input id="schedule-end" className="inline-form-input" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
              </div>
            </div>
            {formError && <p className="inline-form-error">{formError}</p>}
            <div className="inline-form-footer">
              <button type="submit" className="btn-primary" disabled={isSubmitting}>
                {isSubmitting ? "Salvando…" : editingIndex !== null ? "Atualizar" : "Salvar"}
              </button>
            </div>
          </form>
        )}

        {deletingIndex !== null && (
          <ConfirmDeleteBar message="Excluir este horário?" onCancel={() => setDeletingIndex(null)} onConfirm={() => handleDelete(deletingIndex)} />
        )}

        {sortedMapping.length === 0 ? (
          <p className="empty-text">Nenhum horário cadastrado.</p>
        ) : (
          <ul className="disc-schedule-list">
            {sortedMapping.map(({ s: schedule, i: origIdx }, sortedIdx) => (
              <li key={`${schedule.dayOfWeek}-${schedule.startTime}-${sortedIdx}`} className="disc-schedule-chip">
                <span className="disc-schedule-day">{DAY_SHORT[schedule.dayOfWeek]}</span>
                <span className="disc-schedule-time">{schedule.startTime}–{schedule.endTime}</span>
                <ItemDropdown
                  id={`sched-${origIdx}`}
                  openDropdownId={openDropdownId}
                  setOpenDropdownId={setOpenDropdownId}
                  onEdit={() => openEdit(origIdx, schedule)}
                  onDelete={() => setDeletingIndex(origIdx)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
};

export default ScheduleSection;
