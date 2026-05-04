// backend/src/routes/evaluations.routes.test.ts
//
// Testes para as rotas de Evaluations (CRUD + toggle).
// As evaluations pertencem a uma disciplina, que pertence a um usuário.

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { build } from '../../src/app'
import type { FastifyInstance } from 'fastify'

let app: FastifyInstance

beforeEach(async () => {
  app = build()
  await app.ready()
})

afterEach(async () => {
  await app.close()
})

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

async function registerAndLogin(app: FastifyInstance, suffix: string) {
  const email = `eval-user-${suffix}-${Date.now()}@test.com`

  await app.inject({
    method: 'POST',
    url: '/auth/register',
    payload: { name: `User ${suffix}`, email, password: '123456' },
  })

  const login = await app.inject({
    method: 'POST',
    url: '/auth/login',
    payload: { email, password: '123456' },
  })

  return login.json().token as string
}

async function createDiscipline(app: FastifyInstance, token: string) {
  const res = await app.inject({
    method: 'POST',
    url: '/disciplines',
    headers: { authorization: `Bearer ${token}` },
    payload: { name: 'Física II', description: 'Eletromagnetismo' },
  })
  return res.json().id as string
}

async function createEvaluation(
  app: FastifyInstance,
  token: string,
  disciplineId: string,
  payload: Record<string, unknown> = { title: 'Prova 1', maxGrade: 10 },
) {
  return app.inject({
    method: 'POST',
    url: `/disciplines/${disciplineId}/evaluations`,
    headers: { authorization: `Bearer ${token}` },
    payload,
  })
}

// ----------------------------------------------------------------
// Autenticação nas rotas protegidas
// ----------------------------------------------------------------

describe('Rotas de evaluations — sem token', () => {
  it('GET /disciplines/:id/evaluations retorna 401 sem token', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/disciplines/fake-id/evaluations',
    })
    expect(res.statusCode).toBe(401)
  })

  it('POST /disciplines/:id/evaluations retorna 401 sem token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/disciplines/fake-id/evaluations',
      payload: { title: 'Prova' },
    })
    expect(res.statusCode).toBe(401)
  })

  it('PUT /disciplines/:id/evaluations/:evalId retorna 401 sem token', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/disciplines/fake-id/evaluations/fake-eval-id',
      payload: { title: 'Updated' },
    })
    expect(res.statusCode).toBe(401)
  })

  it('DELETE /disciplines/:id/evaluations/:evalId retorna 401 sem token', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: '/disciplines/fake-id/evaluations/fake-eval-id',
    })
    expect(res.statusCode).toBe(401)
  })

  it('PATCH /disciplines/:id/evaluations/:evalId/toggle retorna 401 sem token', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/disciplines/fake-id/evaluations/fake-eval-id/toggle',
    })
    expect(res.statusCode).toBe(401)
  })
})

// ----------------------------------------------------------------
// CRUD de evaluations
// ----------------------------------------------------------------

describe('POST /disciplines/:id/evaluations', () => {
  it('cria evaluation e retorna 201', async () => {
    const token = await registerAndLogin(app, 'create-eval')
    const disciplineId = await createDiscipline(app, token)

    const res = await createEvaluation(app, token, disciplineId)

    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body).toHaveProperty('id')
    expect(body.title).toBe('Prova 1')
    expect(body.maxGrade).toBe(10)
    expect(body.completed).toBe(false)
    expect(body.grade).toBeNull()
  })

  it('cria evaluation com data e maxGrade customizado', async () => {
    const token = await registerAndLogin(app, 'eval-custom')
    const disciplineId = await createDiscipline(app, token)

    const date = '2026-05-20T14:00:00.000Z'
    const res = await createEvaluation(app, token, disciplineId, {
      title: 'Trabalho Final',
      date,
      maxGrade: 100,
    })

    expect(res.statusCode).toBe(201)
    expect(res.json().date).toBe(date)
    expect(res.json().maxGrade).toBe(100)
  })

  it('retorna 400 sem título', async () => {
    const token = await registerAndLogin(app, 'eval-no-title')
    const disciplineId = await createDiscipline(app, token)

    const res = await createEvaluation(app, token, disciplineId, { maxGrade: 10 })

    expect(res.statusCode).toBe(400)
  })

  it('retorna 404 se disciplina não existe', async () => {
    const token = await registerAndLogin(app, 'eval-no-disc')

    const res = await createEvaluation(app, token, 'id-inexistente')

    expect(res.statusCode).toBe(404)
  })
})

describe('GET /disciplines/:id/evaluations', () => {
  it('retorna lista vazia quando não há evaluations', async () => {
    const token = await registerAndLogin(app, 'list-eval-empty')
    const disciplineId = await createDiscipline(app, token)

    const res = await app.inject({
      method: 'GET',
      url: `/disciplines/${disciplineId}/evaluations`,
      headers: { authorization: `Bearer ${token}` },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toHaveLength(0)
  })

  it('retorna evaluations criadas na disciplina', async () => {
    const token = await registerAndLogin(app, 'list-evals')
    const disciplineId = await createDiscipline(app, token)

    await createEvaluation(app, token, disciplineId, { title: 'Prova 1', maxGrade: 10 })
    await createEvaluation(app, token, disciplineId, { title: 'Prova 2', maxGrade: 10 })
    await createEvaluation(app, token, disciplineId, { title: 'Trabalho', maxGrade: 5 })

    const res = await app.inject({
      method: 'GET',
      url: `/disciplines/${disciplineId}/evaluations`,
      headers: { authorization: `Bearer ${token}` },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toHaveLength(3)
  })
})

describe('PUT /disciplines/:id/evaluations/:evalId', () => {
  it('edita evaluation existente', async () => {
    const token = await registerAndLogin(app, 'edit-eval')
    const disciplineId = await createDiscipline(app, token)

    const createRes = await createEvaluation(app, token, disciplineId)
    const evalId = createRes.json().id

    const res = await app.inject({
      method: 'PUT',
      url: `/disciplines/${disciplineId}/evaluations/${evalId}`,
      headers: { authorization: `Bearer ${token}` },
      payload: { title: 'Prova 1 - Remarcada', grade: 8.5 },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().title).toBe('Prova 1 - Remarcada')
    expect(res.json().grade).toBe(8.5)
  })

  it('retorna 404 se evaluation não existe', async () => {
    const token = await registerAndLogin(app, 'edit-eval-404')
    const disciplineId = await createDiscipline(app, token)

    const res = await app.inject({
      method: 'PUT',
      url: `/disciplines/${disciplineId}/evaluations/id-inexistente`,
      headers: { authorization: `Bearer ${token}` },
      payload: { title: 'Nada' },
    })

    expect(res.statusCode).toBe(404)
  })
})

describe('DELETE /disciplines/:id/evaluations/:evalId', () => {
  it('deleta evaluation existente', async () => {
    const token = await registerAndLogin(app, 'del-eval')
    const disciplineId = await createDiscipline(app, token)

    const createRes = await createEvaluation(app, token, disciplineId)
    const evalId = createRes.json().id

    const del = await app.inject({
      method: 'DELETE',
      url: `/disciplines/${disciplineId}/evaluations/${evalId}`,
      headers: { authorization: `Bearer ${token}` },
    })

    expect(del.statusCode).toBe(204)

    // Confirma que a evaluation sumiu
    const list = await app.inject({
      method: 'GET',
      url: `/disciplines/${disciplineId}/evaluations`,
      headers: { authorization: `Bearer ${token}` },
    })

    expect(list.json()).toHaveLength(0)
  })

  it('retorna 404 se evaluation não existe', async () => {
    const token = await registerAndLogin(app, 'del-eval-404')
    const disciplineId = await createDiscipline(app, token)

    const res = await app.inject({
      method: 'DELETE',
      url: `/disciplines/${disciplineId}/evaluations/id-inexistente`,
      headers: { authorization: `Bearer ${token}` },
    })

    expect(res.statusCode).toBe(404)
  })
})

describe('PATCH /disciplines/:id/evaluations/:evalId/toggle', () => {
  it('alterna completed de false para true', async () => {
    const token = await registerAndLogin(app, 'toggle-eval')
    const disciplineId = await createDiscipline(app, token)

    const createRes = await createEvaluation(app, token, disciplineId)
    const evalId = createRes.json().id
    expect(createRes.json().completed).toBe(false)

    const toggle = await app.inject({
      method: 'PATCH',
      url: `/disciplines/${disciplineId}/evaluations/${evalId}/toggle`,
      headers: { authorization: `Bearer ${token}` },
    })

    expect(toggle.statusCode).toBe(200)
    expect(toggle.json().completed).toBe(true)
  })

  it('alterna completed de true para false', async () => {
    const token = await registerAndLogin(app, 'toggle-eval-back')
    const disciplineId = await createDiscipline(app, token)

    const createRes = await createEvaluation(app, token, disciplineId)
    const evalId = createRes.json().id

    // toggle para true
    await app.inject({
      method: 'PATCH',
      url: `/disciplines/${disciplineId}/evaluations/${evalId}/toggle`,
      headers: { authorization: `Bearer ${token}` },
    })

    // toggle de volta para false
    const toggle2 = await app.inject({
      method: 'PATCH',
      url: `/disciplines/${disciplineId}/evaluations/${evalId}/toggle`,
      headers: { authorization: `Bearer ${token}` },
    })

    expect(toggle2.statusCode).toBe(200)
    expect(toggle2.json().completed).toBe(false)
  })
})

// ----------------------------------------------------------------
// Isolamento entre usuários
// ----------------------------------------------------------------

describe('Isolamento de evaluations entre usuários', () => {
  it('usuário B não lista evaluations da disciplina do usuário A', async () => {
    const tokenA = await registerAndLogin(app, 'iso-eval-list-a')
    const tokenB = await registerAndLogin(app, 'iso-eval-list-b')

    const disciplineId = await createDiscipline(app, tokenA)
    await createEvaluation(app, tokenA, disciplineId)

    const res = await app.inject({
      method: 'GET',
      url: `/disciplines/${disciplineId}/evaluations`,
      headers: { authorization: `Bearer ${tokenB}` },
    })

    expect(res.statusCode).toBe(403)
  })

  it('usuário B não cria evaluation na disciplina do usuário A', async () => {
    const tokenA = await registerAndLogin(app, 'iso-eval-create-a')
    const tokenB = await registerAndLogin(app, 'iso-eval-create-b')

    const disciplineId = await createDiscipline(app, tokenA)

    const res = await app.inject({
      method: 'POST',
      url: `/disciplines/${disciplineId}/evaluations`,
      headers: { authorization: `Bearer ${tokenB}` },
      payload: { title: 'Invasão', maxGrade: 10 },
    })

    expect(res.statusCode).toBe(403)
  })

  it('usuário B não edita evaluation da disciplina do usuário A', async () => {
    const tokenA = await registerAndLogin(app, 'iso-eval-edit-a')
    const tokenB = await registerAndLogin(app, 'iso-eval-edit-b')

    const disciplineId = await createDiscipline(app, tokenA)
    const createRes = await createEvaluation(app, tokenA, disciplineId)
    const evalId = createRes.json().id

    const res = await app.inject({
      method: 'PUT',
      url: `/disciplines/${disciplineId}/evaluations/${evalId}`,
      headers: { authorization: `Bearer ${tokenB}` },
      payload: { title: 'Hackeado' },
    })

    expect(res.statusCode).toBe(403)
  })

  it('usuário B não deleta evaluation da disciplina do usuário A', async () => {
    const tokenA = await registerAndLogin(app, 'iso-eval-del-a')
    const tokenB = await registerAndLogin(app, 'iso-eval-del-b')

    const disciplineId = await createDiscipline(app, tokenA)
    const createRes = await createEvaluation(app, tokenA, disciplineId)
    const evalId = createRes.json().id

    const res = await app.inject({
      method: 'DELETE',
      url: `/disciplines/${disciplineId}/evaluations/${evalId}`,
      headers: { authorization: `Bearer ${tokenB}` },
    })

    expect(res.statusCode).toBe(403)
  })

  it('usuário B não faz toggle em evaluation da disciplina do usuário A', async () => {
    const tokenA = await registerAndLogin(app, 'iso-eval-toggle-a')
    const tokenB = await registerAndLogin(app, 'iso-eval-toggle-b')

    const disciplineId = await createDiscipline(app, tokenA)
    const createRes = await createEvaluation(app, tokenA, disciplineId)
    const evalId = createRes.json().id

    const res = await app.inject({
      method: 'PATCH',
      url: `/disciplines/${disciplineId}/evaluations/${evalId}/toggle`,
      headers: { authorization: `Bearer ${tokenB}` },
    })

    expect(res.statusCode).toBe(403)
  })
})
