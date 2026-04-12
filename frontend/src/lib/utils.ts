export const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export function formatDate(dateValue: string | null) {
  if (!dateValue) return "Sem data";
  return new Date(dateValue).toLocaleDateString("pt-BR");
}
