import Groq from "groq-sdk";
import { env } from "../config/env.js";

function getGroqClient() {
  if (!env.groqApiKey) {
    throw new Error("GROQ_API_KEY is required to use document import.");
  }

  return new Groq({ apiKey: env.groqApiKey });
}

const SYSTEM_PROMPT = `Você é um assistente que extrai dados acadêmicos de documentos universitários.
Retorne APENAS um objeto JSON válido, sem explicações, sem markdown, sem texto adicional.
Se um campo não for encontrado no documento, omita-o ou use null.
Datas devem estar no formato ISO 8601 (YYYY-MM-DD).
Horários no formato HH:MM. dayOfWeek: 0 = domingo, 1 = segunda, …, 6 = sábado.
Caso não encontre nada relacionado ao assunto, diga que não foi possível encontrar o conteúdo`;

const SCHEMA_PROMPT = `O JSON de saída deve seguir este schema:
{
  "disciplineName": "string?",
  "description": "string?",
  "references": "string?",
  "topics": [
    { "title": "string", "description": "string?", "dueDate": "YYYY-MM-DD?" }
  ],
  "evaluations": [{ "title": "string", "date": "YYYY-MM-DD?", "maxGrade": 10 }],
  "schedules": [{ "dayOfWeek": 0, "startTime": "HH:MM", "endTime": "HH:MM" }]
}`;

export interface ExtractedData {
  disciplineName?: string | null;
  description?: string | null;
  references?: string | null;
  topics?: {
    title: string;
    description?: string | null;
    dueDate?: string | null;
  }[];
  evaluations?: { title: string; date?: string | null; maxGrade?: number }[];
  schedules?: { dayOfWeek: number; startTime: string; endTime: string }[];
}

export async function extractFromDocument(
  content: string,
  contentType: "text" | "pdf",
  disciplineName?: string,
): Promise<ExtractedData> {
  const groq = getGroqClient();
  const contextLine = disciplineName
    ? `\nContexto: o documento pertence à disciplina "${disciplineName}".`
    : "";

  const userMessage =
    contentType === "pdf"
      ? `Extraia os dados acadêmicos do seguinte conteúdo extraído de um PDF:${contextLine}\n\n${content}`
      : `Extraia os dados acadêmicos do seguinte texto:${contextLine}\n\n${content}`;

  const response = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    max_tokens: 2048,
    temperature: 0.1,
    messages: [
      { role: "system", content: `${SYSTEM_PROMPT}\n\n${SCHEMA_PROMPT}` },
      { role: "user", content: userMessage },
    ],
  });

  const raw = response.choices[0]?.message?.content?.trim();

  if (!raw) {
    throw new Error("Resposta vazia da API");
  }

  // Strip potential markdown code fences the LLM might add despite instructions
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");

  const parsed: ExtractedData = JSON.parse(cleaned);
  return parsed;
}
