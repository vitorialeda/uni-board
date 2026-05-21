import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { prisma } from "../database/prisma.js";
import { calculateProgress } from "../services/progress.service.js";
import { assertDisciplineOwnership } from "../middlewares/assert-discipline-ownership.js";

const scheduleItemSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
});

const createDisciplineSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  references: z.string().max(10000).optional(),
  professor: z.string().max(200).optional(),
  schedules: z.array(scheduleItemSchema).optional(),
});

const updateDisciplineSchema = createDisciplineSchema.partial();

// GET /disciplines
export async function listDisciplinesController(
  _app: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { userId } = request.user;

  const disciplines = await prisma.discipline.findMany({
    where: { userId },
    include: { topics: true, evaluations: true },
    orderBy: { createdAt: 'desc' },
  });

  const result = disciplines.map((d) => ({
    id: d.id,
    name: d.name,
    description: d.description,
    professor: d.professor,
    schedules: d.schedules,
    evaluations: d.evaluations,
    progress: calculateProgress(d.topics, d.evaluations),
  }));

  return reply.send(result);
}

// POST /disciplines
export async function createDisciplineController(
  _app: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const parsed = createDisciplineSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({ error: "Body inválido" });
  }

  const { userId } = request.user;
  const { name, description, references, professor, schedules } = parsed.data;

  const discipline = await prisma.discipline.create({
    data: {
      name,
      description,
      references,
      professor,
      schedules: schedules ?? [],
      userId,
    },
  });

  return reply.status(201).send(discipline);
}

// GET /disciplines/:id
export async function getDisciplineController(
  _app: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { id } = request.params as { id: string };
  const { userId } = request.user;

  const discipline = await prisma.discipline.findUnique({
    where: { id },
    include: { topics: true, evaluations: true, notes: true },
  });

  if (!discipline) {
    return reply.status(404).send({ error: "Disciplina não encontrada" });
  }

  if (discipline.userId !== userId) {
    return reply
      .status(403)
      .send({ error: "Recurso pertence a outro usuário" });
  }

  return reply.send(discipline);
}

// GET /disciplines/:id/progress
export async function getDisciplineProgressController(
  _app: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { id } = request.params as { id: string };
  const { userId } = request.user;

  const discipline = await prisma.discipline.findUnique({
    where: { id },
    include: {
      topics: { select: { completed: true } },
      evaluations: { select: { completed: true } },
    },
  });

  if (!discipline) {
    return reply.status(404).send({ error: "Disciplina não encontrada" });
  }

  if (discipline.userId !== userId) {
    return reply
      .status(403)
      .send({ error: "Recurso pertence a outro usuário" });
  }

  return reply.send({
    progress: calculateProgress(discipline.topics, discipline.evaluations),
  });
}

// PUT /disciplines/:id
export async function updateDisciplineController(
  _app: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { id } = request.params as { id: string };
  const { userId } = request.user;

  const parsed = updateDisciplineSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({ error: "Body inválido" });
  }

  const discipline = await assertDisciplineOwnership(id, userId, reply);
  if (!discipline) return;

  const updated = await prisma.discipline.update({
    where: { id },
    data: parsed.data,
  });

  return reply.send(updated);
}

// DELETE /disciplines/:id
export async function deleteDisciplineController(
  _app: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { id } = request.params as { id: string };
  const { userId } = request.user;

  const discipline = await assertDisciplineOwnership(id, userId, reply);
  if (!discipline) return;

  await prisma.discipline.delete({ where: { id } });

  return reply.status(204).send();
}
