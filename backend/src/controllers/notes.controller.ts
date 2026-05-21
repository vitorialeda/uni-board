import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { prisma } from "../database/prisma.js";
import { assertDisciplineOwnership } from "../middlewares/assert-discipline-ownership.js";

const createNoteSchema = z.object({
  content: z.string().min(1).max(10000),
});

const updateNoteSchema = createNoteSchema.partial();

// GET /disciplines/:id/notes
export async function listNotesController(
  _app: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { id } = request.params as { id: string };
  const { userId } = request.user;

  const discipline = await assertDisciplineOwnership(id, userId, reply);
  if (!discipline) return;

  const notes = await prisma.note.findMany({
    where: { disciplineId: id },
    orderBy: { createdAt: "desc" },
  });

  return reply.send(notes);
}

// POST /disciplines/:id/notes
export async function createNoteController(
  _app: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { id } = request.params as { id: string };
  const { userId } = request.user;

  const discipline = await assertDisciplineOwnership(id, userId, reply);
  if (!discipline) return;

  const parsed = createNoteSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({ error: "Body inválido" });
  }

  const note = await prisma.note.create({
    data: {
      content: parsed.data.content,
      disciplineId: id,
    },
  });

  return reply.status(201).send(note);
}

// PUT /disciplines/:id/notes/:noteId
export async function updateNoteController(
  _app: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { id, noteId } = request.params as { id: string; noteId: string };
  const { userId } = request.user;

  const discipline = await assertDisciplineOwnership(id, userId, reply);
  if (!discipline) return;

  const parsed = updateNoteSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({ error: "Body inválido" });
  }

  const note = await prisma.note.findFirst({
    where: { id: noteId, disciplineId: id },
  });

  if (!note) {
    return reply.status(404).send({ error: "Nota não encontrada" });
  }

  const updated = await prisma.note.update({
    where: { id: noteId },
    data: parsed.data,
  });

  return reply.send(updated);
}

// DELETE /disciplines/:id/notes/:noteId
export async function deleteNoteController(
  _app: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { id, noteId } = request.params as { id: string; noteId: string };
  const { userId } = request.user;

  const discipline = await assertDisciplineOwnership(id, userId, reply);
  if (!discipline) return;

  const note = await prisma.note.findFirst({
    where: { id: noteId, disciplineId: id },
  });

  if (!note) {
    return reply.status(404).send({ error: "Nota não encontrada" });
  }

  await prisma.note.delete({ where: { id: noteId } });

  return reply.status(204).send();
}
