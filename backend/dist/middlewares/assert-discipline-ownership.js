import { prisma } from "../database/prisma.js";
/**
 * Verifica se a disciplina existe e pertence ao usuário autenticado.
 * Retorna a disciplina se válida, ou null (já enviando 404/403 na reply).
 */
export async function assertDisciplineOwnership(disciplineId, userId, reply) {
    const discipline = await prisma.discipline.findUnique({
        where: { id: disciplineId },
    });
    if (!discipline) {
        reply.status(404).send({ error: "Disciplina não encontrada" });
        return null;
    }
    if (discipline.userId !== userId) {
        reply.status(403).send({ error: "Recurso pertence a outro usuário" });
        return null;
    }
    return discipline;
}
