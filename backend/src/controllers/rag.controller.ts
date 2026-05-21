import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { prisma } from "../database/prisma.js";
import { assertDisciplineOwnership } from "../middlewares/assert-discipline-ownership.js";
import { extractFromDocument } from "../services/rag.service.js";

/* ── Zod schemas ── */

const extractBodySchema = z.object({
  content: z.string().min(1),
  contentType: z.enum(["text", "pdf"]),
  disciplineId: z.string().uuid().optional(),
});

const topicSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  dueDate: z.string().optional().nullable(),
});

const evaluationSchema = z.object({
  title: z.string().min(1).max(200),
  date: z.string().optional().nullable(),
  maxGrade: z.number().positive().default(10),
});

const scheduleSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
});

const confirmBodySchema = z.object({
  disciplineName: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  references: z.string().optional().nullable(),
  topics: z.array(topicSchema).optional().default([]),
  evaluations: z.array(evaluationSchema).optional().default([]),
  schedules: z.array(scheduleSchema).optional().default([]),
});

/* ── POST /rag/extract ── */

export async function extractController(
  _app: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const parsed = extractBodySchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({
      error: "Dados de entrada inválidos. Verifique se o campo de texto não está vazio e se o tipo de conteúdo é 'text' ou 'pdf'.",
    });
  }

  const { content, contentType, disciplineId } = parsed.data;

  // If disciplineId is provided, fetch discipline name for context
  let disciplineName: string | undefined;
  if (disciplineId) {
    const discipline = await prisma.discipline.findUnique({
      where: { id: disciplineId },
      select: { name: true, userId: true },
    });

    if (discipline && discipline.userId === request.user.userId) {
      disciplineName = discipline.name;
    }
  }

  try {
    const extracted = await extractFromDocument(content, contentType, disciplineName);
    return reply.send({ extracted });
  } catch (err) {
    console.error("RAG extraction error:", err);

    const message = err instanceof SyntaxError
      ? "A IA não conseguiu estruturar os dados corretamente. Tente enviar um texto mais claro ou com menos formatação."
      : (err instanceof Error && err.message === "Resposta vazia da API")
        ? "A IA não retornou nenhum dado. O documento pode estar vazio ou ilegível. Tente colar o texto manualmente."
        : "O serviço de IA está temporariamente indisponível. Aguarde alguns instantes e tente novamente.";

    return reply.status(502).send({ error: message });
  }
}

/* ── POST /rag/confirm/:disciplineId ── */

export async function confirmController(
  _app: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { disciplineId } = request.params as { disciplineId: string };
  const { userId } = request.user;

  const discipline = await assertDisciplineOwnership(disciplineId, userId, reply);
  if (!discipline) return;

  const parsed = confirmBodySchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({
      error: "Os dados revisados contêm campos inválidos. Verifique se todos os títulos estão preenchidos e se os horários estão no formato correto (HH:MM).",
    });
  }

  const { topics, evaluations, schedules, description, references } = parsed.data;

  let insertedTopics = 0;
  let insertedEvaluations = 0;
  let insertedSchedules = 0;

  // Insert topics
  if (topics.length > 0) {
    const result = await prisma.topic.createMany({
      data: topics.map((t) => ({
        title: t.title,
        description: t.description ?? undefined,
        dueDate: t.dueDate ? new Date(t.dueDate) : undefined,
        disciplineId,
      })),
    });
    insertedTopics = result.count;
  }

  // Insert evaluations
  if (evaluations.length > 0) {
    const result = await prisma.evaluation.createMany({
      data: evaluations.map((e) => ({
        title: e.title,
        date: e.date ? new Date(e.date) : undefined,
        maxGrade: e.maxGrade ?? 10,
        disciplineId,
      })),
    });
    insertedEvaluations = result.count;
  }

  // Update schedules (append to existing)
  if (schedules.length > 0) {
    const current = (discipline.schedules as unknown[]) ?? [];
    const merged = JSON.parse(JSON.stringify([...(Array.isArray(current) ? current : []), ...schedules]));
    await prisma.discipline.update({
      where: { id: disciplineId },
      data: { schedules: merged },
    });
    insertedSchedules = schedules.length;
  }

  // Patch description and references if provided
  const patchData: Record<string, string> = {};
  if (description) patchData.description = description;
  if (references) patchData.references = references;

  if (Object.keys(patchData).length > 0) {
    await prisma.discipline.update({
      where: { id: disciplineId },
      data: patchData,
    });
  }

  return reply.send({
    inserted: {
      topics: insertedTopics,
      evaluations: insertedEvaluations,
      schedules: insertedSchedules,
    },
  });
}
