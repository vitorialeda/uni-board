import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { prisma } from "../database/prisma.js";
import { assertDisciplineOwnership } from "../middlewares/assert-discipline-ownership.js";

const createTopicSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  dueDate: z.iso.datetime().optional(),
});

const updateTopicSchema = createTopicSchema.partial();

// GET /disciplines/:id/topics
export async function listTopicsController(
  _app: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { id } = request.params as { id: string };
  const { userId } = request.user;

  const discipline = await assertDisciplineOwnership(id, userId, reply);
  if (!discipline) return;

  const topics = await prisma.topic.findMany({
    where: { disciplineId: id },
    orderBy: { createdAt: 'desc' },
  });

  return reply.send(topics);
}

// POST /disciplines/:id/topics
export async function createTopicController(
  _app: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { id } = request.params as { id: string };
  const { userId } = request.user;

  const discipline = await assertDisciplineOwnership(id, userId, reply);
  if (!discipline) return;

  const parsed = createTopicSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({ error: "Body inválido" });
  }

  const { title, description, dueDate } = parsed.data;

  const topic = await prisma.topic.create({
    data: {
      title,
      description,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      disciplineId: id,
    },
  });

  return reply.status(201).send(topic);
}

// PUT /disciplines/:id/topics/:topicId
export async function updateTopicController(
  _app: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { id, topicId } = request.params as { id: string; topicId: string };
  const { userId } = request.user;

  const discipline = await assertDisciplineOwnership(id, userId, reply);
  if (!discipline) return;

  const parsed = updateTopicSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({ error: "Body inválido" });
  }

  const topic = await prisma.topic.findFirst({
    where: { id: topicId, disciplineId: id },
  });

  if (!topic) {
    return reply.status(404).send({ error: "Tópico não encontrado" });
  }

  const { title, description, dueDate } = parsed.data;

  const updated = await prisma.topic.update({
    where: { id: topicId },
    data: {
      title,
      description,
      dueDate: dueDate ? new Date(dueDate) : undefined,
    },
  });

  return reply.send(updated);
}

// DELETE /disciplines/:id/topics/:topicId
export async function deleteTopicController(
  _app: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { id, topicId } = request.params as { id: string; topicId: string };
  const { userId } = request.user;

  const discipline = await assertDisciplineOwnership(id, userId, reply);
  if (!discipline) return;

  const topic = await prisma.topic.findFirst({
    where: { id: topicId, disciplineId: id },
  });

  if (!topic) {
    return reply.status(404).send({ error: "Tópico não encontrado" });
  }

  await prisma.topic.delete({ where: { id: topicId } });

  return reply.status(204).send();
}

// PATCH /disciplines/:id/topics/:topicId/toggle
export async function toggleTopicController(
  _app: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { id, topicId } = request.params as { id: string; topicId: string };
  const { userId } = request.user;

  const discipline = await assertDisciplineOwnership(id, userId, reply);
  if (!discipline) return;

  const topic = await prisma.topic.findFirst({
    where: { id: topicId, disciplineId: id },
  });

  if (!topic) {
    return reply.status(404).send({ error: "Tópico não encontrado" });
  }

  const updated = await prisma.topic.update({
    where: { id: topicId },
    data: { completed: !topic.completed },
  });

  return reply.send(updated);
}
