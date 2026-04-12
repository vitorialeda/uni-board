import { authenticate } from "../middlewares/auth.js";
import { prisma } from "../database/prisma.js";
function buildScheduleId(disciplineId, item) {
    return `${disciplineId}-${item.dayOfWeek}-${item.startTime}-${item.endTime}`;
}
export async function schedulesRoutes(app) {
    app.addHook("onRequest", authenticate);
    app.get("/", async (request, reply) => {
        const { id } = request.params;
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
            ? discipline.schedules.map((item) => ({
                id: buildScheduleId(discipline.id, item),
                disciplineId: discipline.id,
                ...item,
            }))
            : [];
        return reply.send(schedules);
    });
}
