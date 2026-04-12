// backend/src/routes/disciplines.routes.test.ts
//
// Testa a regra mais crítica de segurança:
// usuário A não pode ver, editar ou deletar disciplinas do usuário B.
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
    const email = `user-${suffix}-${Date.now()}@test.com`;
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
async function createDiscipline(app, token) {
    const res = await app.inject({
        method: 'POST',
        url: '/disciplines',
        headers: { authorization: `Bearer ${token}` },
        payload: { name: 'Cálculo I', description: 'Limites e derivadas' },
    });
    return res.json().id;
}
// ----------------------------------------------------------------
// Autenticação nas rotas protegidas
// ----------------------------------------------------------------
describe('Rotas protegidas — sem token', () => {
    it('GET /disciplines retorna 401 sem token', async () => {
        const res = await app.inject({ method: 'GET', url: '/disciplines' });
        expect(res.statusCode).toBe(401);
    });
    it('POST /disciplines retorna 401 sem token', async () => {
        const res = await app.inject({
            method: 'POST',
            url: '/disciplines',
            payload: { name: 'Física' },
        });
        expect(res.statusCode).toBe(401);
    });
});
// ----------------------------------------------------------------
// Isolamento entre usuários
// ----------------------------------------------------------------
describe('Isolamento de dados entre usuários', () => {
    it('usuário B não acessa disciplina do usuário A', async () => {
        const tokenA = await registerAndLogin(app, 'a');
        const tokenB = await registerAndLogin(app, 'b');
        const disciplineId = await createDiscipline(app, tokenA);
        const res = await app.inject({
            method: 'GET',
            url: `/disciplines/${disciplineId}`,
            headers: { authorization: `Bearer ${tokenB}` },
        });
        expect(res.statusCode).toBe(403);
    });
    it('usuário B não edita disciplina do usuário A', async () => {
        const tokenA = await registerAndLogin(app, 'c');
        const tokenB = await registerAndLogin(app, 'd');
        const disciplineId = await createDiscipline(app, tokenA);
        const res = await app.inject({
            method: 'PUT',
            url: `/disciplines/${disciplineId}`,
            headers: { authorization: `Bearer ${tokenB}` },
            payload: { name: 'Invasão' },
        });
        expect(res.statusCode).toBe(403);
    });
    it('usuário B não deleta disciplina do usuário A', async () => {
        const tokenA = await registerAndLogin(app, 'e');
        const tokenB = await registerAndLogin(app, 'f');
        const disciplineId = await createDiscipline(app, tokenA);
        const res = await app.inject({
            method: 'DELETE',
            url: `/disciplines/${disciplineId}`,
            headers: { authorization: `Bearer ${tokenB}` },
        });
        expect(res.statusCode).toBe(403);
    });
    it('GET /disciplines retorna apenas disciplinas do próprio usuário', async () => {
        const tokenA = await registerAndLogin(app, 'g');
        const tokenB = await registerAndLogin(app, 'h');
        await createDiscipline(app, tokenA);
        await createDiscipline(app, tokenA);
        const res = await app.inject({
            method: 'GET',
            url: '/disciplines',
            headers: { authorization: `Bearer ${tokenB}` },
        });
        expect(res.statusCode).toBe(200);
        expect(res.json()).toHaveLength(0); // B não vê nada de A
    });
});
