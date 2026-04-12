// backend/src/routes/progress.routes.test.ts
//
// Testes para as rotas de progresso:
// - GET /disciplines/:id/progress
// - GET /progress
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { build } from "../app";
let app;
beforeEach(async () => {
    app = build();
    await app.ready();
});
afterEach(async () => {
    await app.close();
});
// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------
async function registerAndLogin(app, suffix) {
    const email = `progress-user-${suffix}-${Date.now()}@test.com`;
    await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: { name: `User ${suffix}`, email, password: "123456" },
    });
    const login = await app.inject({
        method: "POST",
        url: "/auth/login",
        payload: { email, password: "123456" },
    });
    return login.json().token;
}
async function createDiscipline(app, token, name = "Disciplina") {
    const res = await app.inject({
        method: "POST",
        url: "/disciplines",
        headers: { authorization: `Bearer ${token}` },
        payload: { name, description: "Conteúdo da disciplina" },
    });
    return res.json().id;
}
async function createTopic(app, token, disciplineId, title) {
    return app.inject({
        method: "POST",
        url: `/disciplines/${disciplineId}/topics`,
        headers: { authorization: `Bearer ${token}` },
        payload: { title },
    });
}
async function createEvaluation(app, token, disciplineId, title) {
    return app.inject({
        method: "POST",
        url: `/disciplines/${disciplineId}/evaluations`,
        headers: { authorization: `Bearer ${token}` },
        payload: { title, maxGrade: 10 },
    });
}
async function toggleTopic(app, token, disciplineId, topicId) {
    return app.inject({
        method: "PATCH",
        url: `/disciplines/${disciplineId}/topics/${topicId}/toggle`,
        headers: { authorization: `Bearer ${token}` },
    });
}
async function toggleEvaluation(app, token, disciplineId, evalId) {
    return app.inject({
        method: "PATCH",
        url: `/disciplines/${disciplineId}/evaluations/${evalId}/toggle`,
        headers: { authorization: `Bearer ${token}` },
    });
}
// ----------------------------------------------------------------
// Autenticação nas rotas protegidas
// ----------------------------------------------------------------
describe("Rotas de progress — sem token", () => {
    it("GET /progress retorna 401 sem token", async () => {
        const res = await app.inject({ method: "GET", url: "/progress" });
        expect(res.statusCode).toBe(401);
    });
    it("GET /disciplines/:id/progress retorna 401 sem token", async () => {
        const res = await app.inject({
            method: "GET",
            url: "/disciplines/id-fake/progress",
        });
        expect(res.statusCode).toBe(401);
    });
});
// ----------------------------------------------------------------
// GET /disciplines/:id/progress
// ----------------------------------------------------------------
describe("GET /disciplines/:id/progress", () => {
    it("retorna o progresso da disciplina", async () => {
        const token = await registerAndLogin(app, "disc-progress");
        const disciplineId = await createDiscipline(app, token, "Algoritmos");
        const topic1 = await createTopic(app, token, disciplineId, "Lista 1");
        await createTopic(app, token, disciplineId, "Lista 2");
        await createEvaluation(app, token, disciplineId, "Prova 1");
        const eval2 = await createEvaluation(app, token, disciplineId, "Prova 2");
        await toggleTopic(app, token, disciplineId, topic1.json().id);
        await toggleEvaluation(app, token, disciplineId, eval2.json().id);
        const res = await app.inject({
            method: "GET",
            url: `/disciplines/${disciplineId}/progress`,
            headers: { authorization: `Bearer ${token}` },
        });
        expect(res.statusCode).toBe(200);
        expect(res.json().progress).toBe(0.5);
    });
    it("retorna 404 quando a disciplina não existe", async () => {
        const token = await registerAndLogin(app, "disc-progress-404");
        const res = await app.inject({
            method: "GET",
            url: "/disciplines/id-inexistente/progress",
            headers: { authorization: `Bearer ${token}` },
        });
        expect(res.statusCode).toBe(404);
        expect(res.json()).toEqual({ error: "Disciplina não encontrada" });
    });
    it("retorna 403 quando a disciplina pertence a outro usuário", async () => {
        const tokenA = await registerAndLogin(app, "disc-progress-a");
        const tokenB = await registerAndLogin(app, "disc-progress-b");
        const disciplineId = await createDiscipline(app, tokenA, "Cálculo I");
        const res = await app.inject({
            method: "GET",
            url: `/disciplines/${disciplineId}/progress`,
            headers: { authorization: `Bearer ${tokenB}` },
        });
        expect(res.statusCode).toBe(403);
        expect(res.json()).toEqual({ error: "Recurso pertence a outro usuário" });
    });
});
// ----------------------------------------------------------------
// GET /progress
// ----------------------------------------------------------------
describe("GET /progress", () => {
    it("retorna overall e progresso por disciplina do usuário autenticado", async () => {
        const tokenA = await registerAndLogin(app, "overall-a");
        const tokenB = await registerAndLogin(app, "overall-b");
        const disciplineA1 = await createDiscipline(app, tokenA, "Estruturas de Dados");
        const disciplineA2 = await createDiscipline(app, tokenA, "Banco de Dados");
        // Disciplina A1: topics = 1/2 (0.5), evals = 1/1 (1.0) => progress = 0.75
        const topicA1 = await createTopic(app, tokenA, disciplineA1, "Lista 1");
        await createTopic(app, tokenA, disciplineA1, "Lista 2");
        const evalA1 = await createEvaluation(app, tokenA, disciplineA1, "Prova 1");
        await toggleTopic(app, tokenA, disciplineA1, topicA1.json().id);
        await toggleEvaluation(app, tokenA, disciplineA1, evalA1.json().id);
        // Disciplina A2: topics = 0/2, sem avaliações => progress = 0
        await createTopic(app, tokenA, disciplineA2, "Projeto 1");
        await createTopic(app, tokenA, disciplineA2, "Projeto 2");
        // Usuário B não deve entrar no cálculo do A
        const disciplineB = await createDiscipline(app, tokenB, "Química");
        const topicB = await createTopic(app, tokenB, disciplineB, "Relatório");
        await toggleTopic(app, tokenB, disciplineB, topicB.json().id);
        const res = await app.inject({
            method: "GET",
            url: "/progress",
            headers: { authorization: `Bearer ${tokenA}` },
        });
        expect(res.statusCode).toBe(200);
        const body = res.json();
        expect(body.byDiscipline).toHaveLength(2);
        expect(body.overall).toBeCloseTo(0.375, 10);
        const ids = body.byDiscipline.map((item) => item.id);
        expect(ids).toContain(disciplineA1);
        expect(ids).toContain(disciplineA2);
        const a1 = body.byDiscipline.find((item) => item.id === disciplineA1);
        const a2 = body.byDiscipline.find((item) => item.id === disciplineA2);
        expect(a1?.progress).toBe(0.75);
        expect(a2?.progress).toBe(0);
    });
    it("retorna overall 0 e lista vazia quando usuário não tem disciplinas", async () => {
        const token = await registerAndLogin(app, "overall-empty");
        const res = await app.inject({
            method: "GET",
            url: "/progress",
            headers: { authorization: `Bearer ${token}` },
        });
        expect(res.statusCode).toBe(200);
        expect(res.json()).toEqual({ overall: 0, byDiscipline: [] });
    });
});
