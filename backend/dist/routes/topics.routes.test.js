// backend/src/routes/topics.routes.test.ts
//
// Testes para as rotas de Topics (CRUD + toggle).
// Os topics pertencem a uma disciplina, que pertence a um usuário.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { build } from '../app';
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
    const email = `topics-user-${suffix}-${Date.now()}@test.com`;
    await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: { name: `User ${suffix}`, email, password: '123456' },
    });
    const login = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { email, password: '123456' },
    });
    return login.json().token;
}
async function createDiscipline(app, token, name = 'Cálculo I') {
    const res = await app.inject({
        method: 'POST',
        url: '/disciplines',
        headers: { authorization: `Bearer ${token}` },
        payload: { name, description: 'Limites e derivadas' },
    });
    return res.json().id;
}
async function createTopic(app, token, disciplineId, payload = { title: 'Lista 1', description: 'Exercícios cap. 2' }) {
    const res = await app.inject({
        method: 'POST',
        url: `/disciplines/${disciplineId}/topics`,
        headers: { authorization: `Bearer ${token}` },
        payload,
    });
    return res;
}
// ----------------------------------------------------------------
// Autenticação nas rotas protegidas
// ----------------------------------------------------------------
describe('Rotas de topics — sem token', () => {
    it('GET /disciplines/:id/topics retorna 401 sem token', async () => {
        const res = await app.inject({
            method: 'GET',
            url: '/disciplines/fake-id/topics',
        });
        expect(res.statusCode).toBe(401);
    });
    it('POST /disciplines/:id/topics retorna 401 sem token', async () => {
        const res = await app.inject({
            method: 'POST',
            url: '/disciplines/fake-id/topics',
            payload: { title: 'Topic' },
        });
        expect(res.statusCode).toBe(401);
    });
    it('PUT /disciplines/:id/topics/:topicId retorna 401 sem token', async () => {
        const res = await app.inject({
            method: 'PUT',
            url: '/disciplines/fake-id/topics/fake-topic-id',
            payload: { title: 'Updated' },
        });
        expect(res.statusCode).toBe(401);
    });
    it('DELETE /disciplines/:id/topics/:topicId retorna 401 sem token', async () => {
        const res = await app.inject({
            method: 'DELETE',
            url: '/disciplines/fake-id/topics/fake-topic-id',
        });
        expect(res.statusCode).toBe(401);
    });
    it('PATCH /disciplines/:id/topics/:topicId/toggle retorna 401 sem token', async () => {
        const res = await app.inject({
            method: 'PATCH',
            url: '/disciplines/fake-id/topics/fake-topic-id/toggle',
        });
        expect(res.statusCode).toBe(401);
    });
});
// ----------------------------------------------------------------
// CRUD de topics
// ----------------------------------------------------------------
describe('POST /disciplines/:id/topics', () => {
    it('cria topic e retorna 201', async () => {
        const token = await registerAndLogin(app, 'create-topic');
        const disciplineId = await createDiscipline(app, token);
        const res = await createTopic(app, token, disciplineId);
        expect(res.statusCode).toBe(201);
        const body = res.json();
        expect(body).toHaveProperty('id');
        expect(body.title).toBe('Lista 1');
        expect(body.description).toBe('Exercícios cap. 2');
        expect(body.completed).toBe(false);
    });
    it('cria topic com dueDate', async () => {
        const token = await registerAndLogin(app, 'topic-duedate');
        const disciplineId = await createDiscipline(app, token);
        const dueDate = '2026-04-15T23:59:00.000Z';
        const res = await createTopic(app, token, disciplineId, {
            title: 'Trabalho Final',
            dueDate,
        });
        expect(res.statusCode).toBe(201);
        expect(res.json().dueDate).toBe(dueDate);
    });
    it('retorna 400 sem título', async () => {
        const token = await registerAndLogin(app, 'topic-no-title');
        const disciplineId = await createDiscipline(app, token);
        const res = await createTopic(app, token, disciplineId, { description: 'Sem título' });
        expect(res.statusCode).toBe(400);
    });
    it('retorna 404 se disciplina não existe', async () => {
        const token = await registerAndLogin(app, 'topic-no-disc');
        const res = await createTopic(app, token, 'id-inexistente');
        expect(res.statusCode).toBe(404);
    });
});
describe('GET /disciplines/:id/topics', () => {
    it('retorna lista vazia quando não há topics', async () => {
        const token = await registerAndLogin(app, 'list-empty');
        const disciplineId = await createDiscipline(app, token);
        const res = await app.inject({
            method: 'GET',
            url: `/disciplines/${disciplineId}/topics`,
            headers: { authorization: `Bearer ${token}` },
        });
        expect(res.statusCode).toBe(200);
        expect(res.json()).toHaveLength(0);
    });
    it('retorna topics criados na disciplina', async () => {
        const token = await registerAndLogin(app, 'list-topics');
        const disciplineId = await createDiscipline(app, token);
        await createTopic(app, token, disciplineId, { title: 'Topic 1' });
        await createTopic(app, token, disciplineId, { title: 'Topic 2' });
        const res = await app.inject({
            method: 'GET',
            url: `/disciplines/${disciplineId}/topics`,
            headers: { authorization: `Bearer ${token}` },
        });
        expect(res.statusCode).toBe(200);
        expect(res.json()).toHaveLength(2);
    });
});
describe('PUT /disciplines/:id/topics/:topicId', () => {
    it('edita topic existente', async () => {
        const token = await registerAndLogin(app, 'edit-topic');
        const disciplineId = await createDiscipline(app, token);
        const createRes = await createTopic(app, token, disciplineId);
        const topicId = createRes.json().id;
        const res = await app.inject({
            method: 'PUT',
            url: `/disciplines/${disciplineId}/topics/${topicId}`,
            headers: { authorization: `Bearer ${token}` },
            payload: { title: 'Lista 1 - Atualizada', description: 'Novo texto' },
        });
        expect(res.statusCode).toBe(200);
        expect(res.json().title).toBe('Lista 1 - Atualizada');
        expect(res.json().description).toBe('Novo texto');
    });
    it('retorna 404 se topic não existe', async () => {
        const token = await registerAndLogin(app, 'edit-404');
        const disciplineId = await createDiscipline(app, token);
        const res = await app.inject({
            method: 'PUT',
            url: `/disciplines/${disciplineId}/topics/id-inexistente`,
            headers: { authorization: `Bearer ${token}` },
            payload: { title: 'Nada' },
        });
        expect(res.statusCode).toBe(404);
    });
});
describe('DELETE /disciplines/:id/topics/:topicId', () => {
    it('deleta topic existente', async () => {
        const token = await registerAndLogin(app, 'del-topic');
        const disciplineId = await createDiscipline(app, token);
        const createRes = await createTopic(app, token, disciplineId);
        const topicId = createRes.json().id;
        const del = await app.inject({
            method: 'DELETE',
            url: `/disciplines/${disciplineId}/topics/${topicId}`,
            headers: { authorization: `Bearer ${token}` },
        });
        expect(del.statusCode).toBe(204);
        const list = await app.inject({
            method: 'GET',
            url: `/disciplines/${disciplineId}/topics`,
            headers: { authorization: `Bearer ${token}` },
        });
        expect(list.json()).toHaveLength(0);
    });
    it('retorna 404 se topic não existe', async () => {
        const token = await registerAndLogin(app, 'del-404');
        const disciplineId = await createDiscipline(app, token);
        const res = await app.inject({
            method: 'DELETE',
            url: `/disciplines/${disciplineId}/topics/id-inexistente`,
            headers: { authorization: `Bearer ${token}` },
        });
        expect(res.statusCode).toBe(404);
    });
});
describe('PATCH /disciplines/:id/topics/:topicId/toggle', () => {
    it('alterna completed de false para true', async () => {
        const token = await registerAndLogin(app, 'toggle-topic');
        const disciplineId = await createDiscipline(app, token);
        const createRes = await createTopic(app, token, disciplineId);
        const topicId = createRes.json().id;
        expect(createRes.json().completed).toBe(false);
        const toggle = await app.inject({
            method: 'PATCH',
            url: `/disciplines/${disciplineId}/topics/${topicId}/toggle`,
            headers: { authorization: `Bearer ${token}` },
        });
        expect(toggle.statusCode).toBe(200);
        expect(toggle.json().completed).toBe(true);
    });
    it('alterna completed de true para false', async () => {
        const token = await registerAndLogin(app, 'toggle-back');
        const disciplineId = await createDiscipline(app, token);
        const createRes = await createTopic(app, token, disciplineId);
        const topicId = createRes.json().id;
        await app.inject({
            method: 'PATCH',
            url: `/disciplines/${disciplineId}/topics/${topicId}/toggle`,
            headers: { authorization: `Bearer ${token}` },
        });
        const toggle2 = await app.inject({
            method: 'PATCH',
            url: `/disciplines/${disciplineId}/topics/${topicId}/toggle`,
            headers: { authorization: `Bearer ${token}` },
        });
        expect(toggle2.statusCode).toBe(200);
        expect(toggle2.json().completed).toBe(false);
    });
});
// ----------------------------------------------------------------
// Isolamento entre usuários
// ----------------------------------------------------------------
describe('Isolamento de topics entre usuários', () => {
    it('usuário B não lista topics da disciplina do usuário A', async () => {
        const tokenA = await registerAndLogin(app, 'iso-list-a');
        const tokenB = await registerAndLogin(app, 'iso-list-b');
        const disciplineId = await createDiscipline(app, tokenA);
        await createTopic(app, tokenA, disciplineId);
        const res = await app.inject({
            method: 'GET',
            url: `/disciplines/${disciplineId}/topics`,
            headers: { authorization: `Bearer ${tokenB}` },
        });
        expect(res.statusCode).toBe(403);
    });
    it('usuário B não cria topic na disciplina do usuário A', async () => {
        const tokenA = await registerAndLogin(app, 'iso-create-a');
        const tokenB = await registerAndLogin(app, 'iso-create-b');
        const disciplineId = await createDiscipline(app, tokenA);
        const res = await app.inject({
            method: 'POST',
            url: `/disciplines/${disciplineId}/topics`,
            headers: { authorization: `Bearer ${tokenB}` },
            payload: { title: 'Invasão' },
        });
        expect(res.statusCode).toBe(403);
    });
    it('usuário B não edita topic da disciplina do usuário A', async () => {
        const tokenA = await registerAndLogin(app, 'iso-edit-a');
        const tokenB = await registerAndLogin(app, 'iso-edit-b');
        const disciplineId = await createDiscipline(app, tokenA);
        const createRes = await createTopic(app, tokenA, disciplineId);
        const topicId = createRes.json().id;
        const res = await app.inject({
            method: 'PUT',
            url: `/disciplines/${disciplineId}/topics/${topicId}`,
            headers: { authorization: `Bearer ${tokenB}` },
            payload: { title: 'Hackeado' },
        });
        expect(res.statusCode).toBe(403);
    });
    it('usuário B não deleta topic da disciplina do usuário A', async () => {
        const tokenA = await registerAndLogin(app, 'iso-del-a');
        const tokenB = await registerAndLogin(app, 'iso-del-b');
        const disciplineId = await createDiscipline(app, tokenA);
        const createRes = await createTopic(app, tokenA, disciplineId);
        const topicId = createRes.json().id;
        const res = await app.inject({
            method: 'DELETE',
            url: `/disciplines/${disciplineId}/topics/${topicId}`,
            headers: { authorization: `Bearer ${tokenB}` },
        });
        expect(res.statusCode).toBe(403);
    });
    it('usuário B não faz toggle em topic da disciplina do usuário A', async () => {
        const tokenA = await registerAndLogin(app, 'iso-toggle-a');
        const tokenB = await registerAndLogin(app, 'iso-toggle-b');
        const disciplineId = await createDiscipline(app, tokenA);
        const createRes = await createTopic(app, tokenA, disciplineId);
        const topicId = createRes.json().id;
        const res = await app.inject({
            method: 'PATCH',
            url: `/disciplines/${disciplineId}/topics/${topicId}/toggle`,
            headers: { authorization: `Bearer ${tokenB}` },
        });
        expect(res.statusCode).toBe(403);
    });
});
