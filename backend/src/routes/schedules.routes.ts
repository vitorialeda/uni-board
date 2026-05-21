import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { authenticate } from "../middlewares/auth.js";
import { prisma } from "../database/prisma.js";

type ScheduleItem = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};

function buildScheduleId(disciplineId: string, item: ScheduleItem) {
  return `${disciplineId}-${item.dayOfWeek}-${item.startTime}-${item.endTime}`;
}

export async function schedulesRoutes(app: FastifyInstance) {
  app.addHook("onRequest", authenticate);

  app.get("/", async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const { userId } = request.user;

    const discipline = await prisma.discipline.findUnique({
      where: { id },
      select: { id: true, userId: true, schedules: true },
    });

    if (!discipline) {
      return reply.status(404).send({ error: "Disciplina não encontrada" });
    }

    if (discipline.userId !== userId) {
      return reply
        .status(403)
        .send({ error: "Recurso pertence a outro usuário" });
    }

    const schedules = Array.isArray(discipline.schedules)
      ? discipline.schedules.map((item: unknown) => ({
          id: buildScheduleId(discipline.id, item as ScheduleItem),
          disciplineId: discipline.id,
          ...(item as ScheduleItem),
        }))
      : [];

    return reply.send(schedules);
  });
}
