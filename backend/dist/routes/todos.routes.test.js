// backend/src/routes/todos.routes.test.ts
//
// Testes para as rotas de Todos (CRUD + toggle).
// Todos pertencem diretamente ao usuário, não a uma disciplina.
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
    const email = `todo-user-${suffix}-${Date.now()}@test.com`;
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
async function createTodo(app, token, payload = { title: 'Comprar café' }) {
    return app.inject({
        method: 'POST',
        url: '/todos',
        headers: { authorization: `Bearer ${token}` },
        payload,
    });
}
// ----------------------------------------------------------------
// Autenticação nas rotas protegidas
// ----------------------------------------------------------------
describe('Rotas de todos — sem token', () => {
    it('GET /todos retorna 401 sem token', async () => {
        const res = await app.inject({ method: 'GET', url: '/todos' });
        expect(res.statusCode).toBe(401);
    });
    it('POST /todos retorna 401 sem token', async () => {
        const res = await app.inject({
            method: 'POST',
            url: '/todos',
            payload: { title: 'Item' },
        });
        expect(res.statusCode).toBe(401);
    });
    it('PATCH /todos/:id/toggle retorna 401 sem token', async () => {
        const res = await app.inject({
            method: 'PATCH',
            url: '/todos/fake-id/toggle',
        });
        expect(res.statusCode).toBe(401);
    });
    it('DELETE /todos/:id retorna 401 sem token', async () => {
        const res = await app.inject({
            method: 'DELETE',
            url: '/todos/fake-id',
        });
        expect(res.statusCode).toBe(401);
    });
});
// ----------------------------------------------------------------
// CRUD de todos
// ----------------------------------------------------------------
describe('POST /todos', () => {
    it('cria todo e retorna 201', async () => {
        const token = await registerAndLogin(app, 'create-todo');
        const res = await createTodo(app, token);
        expect(res.statusCode).toBe(201);
        const body = res.json();
        expect(body).toHaveProperty('id');
        expect(body.title).toBe('Comprar café');
        expect(body.completed).toBe(false);
    });
    it('retorna 400 sem título', async () => {
        const token = await registerAndLogin(app, 'todo-no-title');
        const res = await createTodo(app, token, {});
        expect(res.statusCode).toBe(400);
    });
});
describe('GET /todos', () => {
    it('retorna lista vazia quando não há todos', async () => {
        const token = await registerAndLogin(app, 'list-todo-empty');
        const res = await app.inject({
            method: 'GET',
            url: '/todos',
            headers: { authorization: `Bearer ${token}` },
        });
        expect(res.statusCode).toBe(200);
        expect(res.json()).toHaveLength(0);
    });
    it('retorna todos criados pelo usuário', async () => {
        const token = await registerAndLogin(app, 'list-todos');
        await createTodo(app, token, { title: 'Item 1' });
        await createTodo(app, token, { title: 'Item 2' });
        await createTodo(app, token, { title: 'Item 3' });
        const res = await app.inject({
            method: 'GET',
            url: '/todos',
            headers: { authorization: `Bearer ${token}` },
        });
        expect(res.statusCode).toBe(200);
        expect(res.json()).toHaveLength(3);
    });
});
describe('PATCH /todos/:id/toggle', () => {
    it('alterna completed de false para true', async () => {
        const token = await registerAndLogin(app, 'toggle-todo');
        const createRes = await createTodo(app, token);
        const todoId = createRes.json().id;
        expect(createRes.json().completed).toBe(false);
        const toggle = await app.inject({
            method: 'PATCH',
            url: `/todos/${todoId}/toggle`,
            headers: { authorization: `Bearer ${token}` },
        });
        expect(toggle.statusCode).toBe(200);
        expect(toggle.json().completed).toBe(true);
    });
    it('alterna completed de true para false', async () => {
        const token = await registerAndLogin(app, 'toggle-todo-back');
        const createRes = await createTodo(app, token);
        const todoId = createRes.json().id;
        // toggle para true
        await app.inject({
            method: 'PATCH',
            url: `/todos/${todoId}/toggle`,
            headers: { authorization: `Bearer ${token}` },
        });
        // toggle de volta para false
        const toggle2 = await app.inject({
            method: 'PATCH',
            url: `/todos/${todoId}/toggle`,
            headers: { authorization: `Bearer ${token}` },
        });
        expect(toggle2.statusCode).toBe(200);
        expect(toggle2.json().completed).toBe(false);
    });
    it('retorna 404 se todo não existe', async () => {
        const token = await registerAndLogin(app, 'toggle-todo-404');
        const res = await app.inject({
            method: 'PATCH',
            url: '/todos/id-inexistente/toggle',
            headers: { authorization: `Bearer ${token}` },
        });
        expect(res.statusCode).toBe(404);
    });
});
describe('DELETE /todos/:id', () => {
    it('deleta todo existente', async () => {
        const token = await registerAndLogin(app, 'del-todo');
        const createRes = await createTodo(app, token);
        const todoId = createRes.json().id;
        const del = await app.inject({
            method: 'DELETE',
            url: `/todos/${todoId}`,
            headers: { authorization: `Bearer ${token}` },
        });
        expect(del.statusCode).toBe(204);
        // Confirma que o todo sumiu
        const list = await app.inject({
            method: 'GET',
            url: '/todos',
            headers: { authorization: `Bearer ${token}` },
        });
        expect(list.json()).toHaveLength(0);
    });
    it('retorna 404 se todo não existe', async () => {
        const token = await registerAndLogin(app, 'del-todo-404');
        const res = await app.inject({
            method: 'DELETE',
            url: '/todos/id-inexistente',
            headers: { authorization: `Bearer ${token}` },
        });
        expect(res.statusCode).toBe(404);
    });
});
// ----------------------------------------------------------------
// Isolamento entre usuários
// ----------------------------------------------------------------
describe('Isolamento de todos entre usuários', () => {
    it('GET /todos retorna apenas todos do próprio usuário', async () => {
        const tokenA = await registerAndLogin(app, 'iso-todo-a');
        const tokenB = await registerAndLogin(app, 'iso-todo-b');
        await createTodo(app, tokenA, { title: 'Todo do A' });
        await createTodo(app, tokenA, { title: 'Outro do A' });
        await createTodo(app, tokenB, { title: 'Todo do B' });
        const resB = await app.inject({
            method: 'GET',
            url: '/todos',
            headers: { authorization: `Bearer ${tokenB}` },
        });
        expect(resB.statusCode).toBe(200);
        expect(resB.json()).toHaveLength(1);
        expect(resB.json()[0].title).toBe('Todo do B');
    });
    it('usuário B não faz toggle em todo do usuário A', async () => {
        const tokenA = await registerAndLogin(app, 'iso-toggle-a');
        const tokenB = await registerAndLogin(app, 'iso-toggle-b');
        const createRes = await createTodo(app, tokenA);
        const todoId = createRes.json().id;
        const res = await app.inject({
            method: 'PATCH',
            url: `/todos/${todoId}/toggle`,
            headers: { authorization: `Bearer ${tokenB}` },
        });
        expect(res.statusCode).toBe(403);
    });
    it('usuário B não deleta todo do usuário A', async () => {
        const tokenA = await registerAndLogin(app, 'iso-del-a');
        const tokenB = await registerAndLogin(app, 'iso-del-b');
        const createRes = await createTodo(app, tokenA);
        const todoId = createRes.json().id;
        const res = await app.inject({
            method: 'DELETE',
            url: `/todos/${todoId}`,
            headers: { authorization: `Bearer ${tokenB}` },
        });
        expect(res.statusCode).toBe(403);
    });
});
