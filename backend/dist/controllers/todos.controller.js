import { z } from "zod";
import { prisma } from "../database/prisma.js";
const createTodoSchema = z.object({
    title: z.string().min(1),
});
// GET /todos
export async function listTodosController(_app, request, reply) {
    const { userId } = request.user;
    const todos = await prisma.todo.findMany({
        where: { userId },
    });
    return reply.send(todos);
}
// POST /todos
export async function createTodoController(_app, request, reply) {
    const parsed = createTodoSchema.safeParse(request.body);
    if (!parsed.success) {
        return reply.status(400).send({ error: "Body inválido" });
    }
    const { userId } = request.user;
    const { title } = parsed.data;
    const todo = await prisma.todo.create({
        data: { title, userId },
    });
    return reply.status(201).send(todo);
}
// PATCH /todos/:id/toggle
export async function toggleTodoController(_app, request, reply) {
    const { id } = request.params;
    const { userId } = request.user;
    const todo = await prisma.todo.findUnique({ where: { id } });
    if (!todo) {
        return reply.status(404).send({ error: "Todo não encontrado" });
    }
    if (todo.userId !== userId) {
        return reply.status(403).send({ error: "Recurso pertence a outro usuário" });
    }
    const updated = await prisma.todo.update({
        where: { id },
        data: { completed: !todo.completed },
    });
    return reply.send(updated);
}
// DELETE /todos/:id
export async function deleteTodoController(_app, request, reply) {
    const { id } = request.params;
    const { userId } = request.user;
    const todo = await prisma.todo.findUnique({ where: { id } });
    if (!todo) {
        return reply.status(404).send({ error: "Todo não encontrado" });
    }
    if (todo.userId !== userId) {
        return reply.status(403).send({ error: "Recurso pertence a outro usuário" });
    }
    await prisma.todo.delete({ where: { id } });
    return reply.status(204).send();
}
