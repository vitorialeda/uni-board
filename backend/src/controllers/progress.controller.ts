import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../database/prisma.js";
import { calculateProgress } from "../services/progress.service.js";

// GET /progress
export async function getOverallProgressController(
  _app: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { userId } = request.user;

  const disciplines = await prisma.discipline.findMany({
    where: { userId },
    include: {
      topics: { select: { completed: true } },
      evaluations: { select: { completed: true } },
    },
  });

  const byDiscipline = disciplines.map((discipline) => ({
    id: discipline.id,
    name: discipline.name,
    progress: calculateProgress(discipline.topics, discipline.evaluations),
  }));

  const overall =
    byDiscipline.length === 0
      ? 0
      : byDiscipline.reduce((acc, item) => acc + item.progress, 0) /
        byDiscipline.length;

  return reply.send({ overall, byDiscipline });
}
