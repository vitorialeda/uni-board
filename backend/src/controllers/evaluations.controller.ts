import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { prisma } from "../database/prisma.js";
import { assertDisciplineOwnership } from "../middlewares/assert-discipline-ownership.js";

const createEvaluationSchema = z.object({
  title: z.string().min(1).max(200),
  date: z.iso.datetime().optional(),
  maxGrade: z.number().positive().default(10),
});

const updateEvaluationSchema = createEvaluationSchema.partial().extend({
  grade: z.number().optional(),
});

// GET /disciplines/:id/evaluations
export async function listEvaluationsController(
  _app: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { id } = request.params as { id: string };
  const { userId } = request.user;

  const discipline = await assertDisciplineOwnership(id, userId, reply);
  if (!discipline) return;

  const evaluations = await prisma.evaluation.findMany({
    where: { disciplineId: id },
    orderBy: { date: { sort: 'asc', nulls: 'last' } },
  });

  return reply.send(evaluations);
}

// POST /disciplines/:id/evaluations
export async function createEvaluationController(
  _app: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { id } = request.params as { id: string };
  const { userId } = request.user;

  const discipline = await assertDisciplineOwnership(id, userId, reply);
  if (!discipline) return;

  const parsed = createEvaluationSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({ error: "Body inválido" });
  }

  const { title, date, maxGrade } = parsed.data;

  const evaluation = await prisma.evaluation.create({
    data: {
      title,
      date: date ? new Date(date) : undefined,
      maxGrade,
      disciplineId: id,
    },
  });

  return reply.status(201).send(evaluation);
}

// PUT /disciplines/:id/evaluations/:evalId
export async function updateEvaluationController(
  _app: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { id, evalId } = request.params as { id: string; evalId: string };
  const { userId } = request.user;

  const discipline = await assertDisciplineOwnership(id, userId, reply);
  if (!discipline) return;

  const parsed = updateEvaluationSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({ error: "Body inválido" });
  }

  const evaluation = await prisma.evaluation.findFirst({
    where: { id: evalId, disciplineId: id },
  });

  if (!evaluation) {
    return reply.status(404).send({ error: "Avaliação não encontrada" });
  }

  const { title, date, grade, maxGrade } = parsed.data;

  const updated = await prisma.evaluation.update({
    where: { id: evalId },
    data: {
      title,
      date: date ? new Date(date) : undefined,
      grade,
      maxGrade,
    },
  });

  return reply.send(updated);
}

// DELETE /disciplines/:id/evaluations/:evalId
export async function deleteEvaluationController(
  _app: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { id, evalId } = request.params as { id: string; evalId: string };
  const { userId } = request.user;

  const discipline = await assertDisciplineOwnership(id, userId, reply);
  if (!discipline) return;

  const evaluation = await prisma.evaluation.findFirst({
    where: { id: evalId, disciplineId: id },
  });

  if (!evaluation) {
    return reply.status(404).send({ error: "Avaliação não encontrada" });
  }

  await prisma.evaluation.delete({ where: { id: evalId } });

  return reply.status(204).send();
}

// PATCH /disciplines/:id/evaluations/:evalId/toggle
export async function toggleEvaluationController(
  _app: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { id, evalId } = request.params as { id: string; evalId: string };
  const { userId } = request.user;

  const discipline = await assertDisciplineOwnership(id, userId, reply);
  if (!discipline) return;

  const evaluation = await prisma.evaluation.findFirst({
    where: { id: evalId, disciplineId: id },
  });

  if (!evaluation) {
    return reply.status(404).send({ error: "Avaliação não encontrada" });
  }

  const updated = await prisma.evaluation.update({
    where: { id: evalId },
    data: { completed: !evaluation.completed },
  });

  return reply.send(updated);
}
