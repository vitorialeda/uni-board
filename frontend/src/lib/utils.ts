export const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export function formatDate(dateValue: string | null) {
  if (!dateValue) return "Sem data";
  return new Date(dateValue).toLocaleDateString("pt-BR");
}

export function toLocalDatetimeValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function calculateProgress(
  topics: { completed: boolean }[],
  evaluations: { completed: boolean }[],
): number {
  const hasTopics = topics.length > 0;
  const hasEvals = evaluations.length > 0;
  if (!hasTopics && !hasEvals) return 0;

  const topicWeight = hasTopics && hasEvals ? 0.5 : hasTopics ? 1 : 0;
  const evalWeight = hasTopics && hasEvals ? 0.5 : hasEvals ? 1 : 0;

  const topicScore = hasTopics
    ? topics.filter((t) => t.completed).length / topics.length
    : 0;
  const evalScore = hasEvals
    ? evaluations.filter((e) => e.completed).length / evaluations.length
    : 0;

  return topicScore * topicWeight + evalScore * evalWeight;
}
