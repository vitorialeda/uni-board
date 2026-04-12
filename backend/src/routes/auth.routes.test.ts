// backend/src/routes/auth.routes.test.ts
//
// Pré-requisito: seu app.ts deve exportar uma função build() que retorna a instância do Fastify.
// Exemplo mínimo:
//
//   export function build() {
//     const app = Fastify()
//     app.register(authRoutes)
//     // ... outros plugins
//     return app
//   }

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { build } from '../app'
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
// Registro
// ----------------------------------------------------------------

describe('POST /auth/register', () => {
  it('cria usuário e retorna 201 com token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        name: 'João',
        email: `joao+${Date.now()}@test.com`, // email único por execução
        password: '123456',
      },
    })

    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body).toHaveProperty('token')
    expect(body.user).toMatchObject({ name: 'João' })
  })

  it('retorna 400 se faltar campo obrigatório', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { email: 'sem-nome@test.com', password: '123456' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('retorna 409 se email já estiver cadastrado', async () => {
    const payload = { name: 'Ana', email: 'ana@test.com', password: '123456' }

    await app.inject({ method: 'POST', url: '/auth/register', payload })
    const res = await app.inject({ method: 'POST', url: '/auth/register', payload })

    expect(res.statusCode).toBe(409)
  })
})

// ----------------------------------------------------------------
// Login
// ----------------------------------------------------------------

describe('POST /auth/login', () => {
  const email = `login+${Date.now()}@test.com`
  const password = 'senha123'

  it('retorna token com credenciais corretas', async () => {
    // garante que o usuário existe
    await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { name: 'Teste', email, password },
    })

    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email, password },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toHaveProperty('token')
  })

  it('retorna 401 com senha errada', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email, password: 'errada' },
    })
    expect(res.statusCode).toBe(401)
  })

  it('retorna 401 com email inexistente', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'naoexiste@test.com', password: '123' },
    })
    expect(res.statusCode).toBe(401)
  })
})
