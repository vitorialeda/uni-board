import { z } from "zod";
import { prisma } from "../database/prisma.js";
import { calculateProgress } from "../services/progress.service.js";
const scheduleItemSchema = z.object({
    dayOfWeek: z.number().int().min(0).max(6),
    startTime: z.string().min(1),
    endTime: z.string().min(1),
});
const createDisciplineSchema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    references: z.string().optional(),
    schedules: z.array(scheduleItemSchema).optional(),
});
const updateDisciplineSchema = createDisciplineSchema.partial();
// GET /disciplines
export async function listDisciplinesController(_app, request, reply) {
    const { userId } = request.user;
    const disciplines = await prisma.discipline.findMany({
        where: { userId },
        include: { topics: true, evaluations: true },
    });
    const result = disciplines.map((d) => ({
        id: d.id,
        name: d.name,
        description: d.description,
        schedules: d.schedules,
        progress: calculateProgress(d.topics, d.evaluations),
    }));
    return reply.send(result);
}
// POST /disciplines
export async function createDisciplineController(_app, request, reply) {
    const parsed = createDisciplineSchema.safeParse(request.body);
    if (!parsed.success) {
        return reply.status(400).send({ error: "Body inválido" });
    }
    const { userId } = request.user;
    const { name, description, references, schedules } = parsed.data;
    const discipline = await prisma.discipline.create({
        data: {
            name,
            description,
            references,
            schedules: schedules ?? [],
            userId,
        },
    });
    return reply.status(201).send(discipline);
}
// GET /disciplines/:id
export async function getDisciplineController(_app, request, reply) {
    const { id } = request.params;
    const { userId } = request.user;
    const discipline = await prisma.discipline.findUnique({
        where: { id },
        include: { topics: true, evaluations: true },
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
export async function getDisciplineProgressController(_app, request, reply) {
    const { id } = request.params;
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
export async function updateDisciplineController(_app, request, reply) {
    const { id } = request.params;
    const { userId } = request.user;
    const parsed = updateDisciplineSchema.safeParse(request.body);
    if (!parsed.success) {
        return reply.status(400).send({ error: "Body inválido" });
    }
    const discipline = await prisma.discipline.findUnique({ where: { id } });
    if (!discipline) {
        return reply.status(404).send({ error: "Disciplina não encontrada" });
    }
    if (discipline.userId !== userId) {
        return reply
            .status(403)
            .send({ error: "Recurso pertence a outro usuário" });
    }
    const updated = await prisma.discipline.update({
        where: { id },
        data: parsed.data,
    });
    return reply.send(updated);
}
// DELETE /disciplines/:id
export async function deleteDisciplineController(_app, request, reply) {
    const { id } = request.params;
    const { userId } = request.user;
    const discipline = await prisma.discipline.findUnique({ where: { id } });
    if (!discipline) {
        return reply.status(404).send({ error: "Disciplina não encontrada" });
    }
    if (discipline.userId !== userId) {
        return reply
            .status(403)
            .send({ error: "Recurso pertence a outro usuário" });
    }
    await prisma.discipline.delete({ where: { id } });
    return reply.status(204).send();
}
