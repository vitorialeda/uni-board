# SPEC — Dashboard Universitário

## Visão Geral

Aplicação web para universitários centralizarem disciplinas, tarefas, avaliações, horários e progresso do semestre. Cada usuário tem seus próprios dados (autenticação obrigatória).

---

## Stack

| Camada   | Tecnologia           |
|----------|----------------------|
| Frontend | React + Vite         |
| Backend  | Node.js + TypeScript + Fastify |
| ORM      | Prisma               |
| Banco    | PostgreSQL           |
| Auth     | JWT                  |
| Validator| Zod                  |
| Deploy   | Heroku               |

---

## Estrutura de Pastas

```
/
├── prisma/
│   └── schema.prisma
├── src/
│   ├── controllers/
│   ├── database/
│   │   └── prisma.ts
│   ├── middlewares/
│   │   └── auth.ts
│   ├── routes/
│   ├── services/
│   └── app.ts
├── .env
└── package.json
```

---

## Schema do Banco (Prisma)

```prisma
model User {
  id        String   @id @default(uuid())
  name      String
  email     String   @unique
  password  String   // bcrypt hash
  createdAt DateTime @default(now())

  disciplines Discipline[]
  todos       Todo[]
}

model Discipline {
  id          String   @id @default(uuid())
  name        String
  description String?  // ementa/objetivos
  references  String?  // referências bibliográficas (texto livre ou markdown)
  createdAt   DateTime @default(now())

  userId   String
  user     User     @relation(fields: [userId], references: [id])

  tasks       Task[]
  evaluations Evaluation[]
  schedules   Schedule[]
}

model Task {
  id           String   @id @default(uuid())
  title        String
  description  String?
  dueDate      DateTime?
  completed    Boolean  @default(false)
  createdAt    DateTime @default(now())

  disciplineId String
  discipline   Discipline @relation(fields: [disciplineId], references: [id])
}

model Evaluation {
  id           String   @id @default(uuid())
  title        String   // ex: "Prova 1", "Trabalho Final"
  date         DateTime?
  grade        Float?   // nota obtida (opcional, preenchida após realização)
  maxGrade     Float    @default(10)
  completed    Boolean  @default(false)
  createdAt    DateTime @default(now())

  disciplineId String
  discipline   Discipline @relation(fields: [disciplineId], references: [id])
}

model Schedule {
  id           String  @id @default(uuid())
  dayOfWeek    Int     // 0 = domingo, 1 = segunda, ..., 6 = sábado
  startTime    String  // "08:00"
  endTime      String  // "10:00"

  disciplineId String
  discipline   Discipline @relation(fields: [disciplineId], references: [id])
}

model Todo {
  id        String   @id @default(uuid())
  title     String
  completed Boolean  @default(false)
  createdAt DateTime @default(now())

  userId String
  user   User   @relation(fields: [userId], references: [id])
}
```

---

## Regras de Negócio

### Autenticação
- Registro com `name`, `email`, `password`
- Senha armazenada com hash bcrypt (salt rounds: 10)
- Login retorna JWT com payload `{ userId, email }`
- Token expira em 7 dias
- Todas as rotas exceto `/auth/*` exigem token no header: `Authorization: Bearer <token>`

### Disciplinas
- Pertencem ao usuário autenticado — um usuário nunca acessa disciplinas de outro
- `references` é texto livre (pode ser markdown)
- Uma disciplina pode ter zero ou mais: tasks, evaluations, schedules

### Progresso
- Calculado por disciplina
- Fórmula: `progresso = (tasks_concluídas / total_tasks * 0.5) + (evaluations_concluídas / total_evaluations * 0.5)`
- Se não houver tasks, o peso vai 100% para evaluations e vice-versa
- Retornado como float entre 0 e 1 (ex: `0.75` = 75%)
- O endpoint de progresso geral retorna a média do progresso de todas as disciplinas do usuário

### Todo
- Todo pertence ao usuário, não a uma disciplina
- Lista global de tarefas avulsas

---

## API — Endpoints

### Auth

| Método | Rota             | Descrição       | Auth |
|--------|------------------|-----------------|------|
| POST   | /auth/register   | Criar conta     | ❌   |
| POST   | /auth/login      | Login, retorna JWT | ❌ |

**POST /auth/register — body:**
```json
{ "name": "string", "email": "string", "password": "string" }
```

**POST /auth/login — body:**
```json
{ "email": "string", "password": "string" }
```
**Resposta:**
```json
{ "token": "jwt_string", "user": { "id": "uuid", "name": "string", "email": "string" } }
```

---

### Disciplines

| Método | Rota                    | Descrição                  | Auth |
|--------|-------------------------|----------------------------|------|
| GET    | /disciplines            | Listar disciplinas do user | ✅   |
| POST   | /disciplines            | Criar disciplina           | ✅   |
| GET    | /disciplines/:id        | Detalhe da disciplina      | ✅   |
| PUT    | /disciplines/:id        | Editar disciplina          | ✅   |
| DELETE | /disciplines/:id        | Deletar disciplina         | ✅   |
| GET    | /disciplines/:id/progress | Progresso da disciplina  | ✅   |

**GET /disciplines — resposta:**
```json
[
  {
    "id": "uuid",
    "name": "string",
    "description": "string|null",
    "progress": 0.75
  }
]
```

**GET /disciplines/:id — resposta:**
```json
{
  "id": "uuid",
  "name": "string",
  "description": "string|null",
  "references": "string|null",
  "tasks": [...],
  "evaluations": [...],
  "schedules": [...]
}
```

---

### Tasks

| Método | Rota                              | Descrição       | Auth |
|--------|-----------------------------------|-----------------|------|
| GET    | /disciplines/:id/tasks            | Listar tasks    | ✅   |
| POST   | /disciplines/:id/tasks            | Criar task      | ✅   |
| PUT    | /disciplines/:id/tasks/:taskId    | Editar task     | ✅   |
| DELETE | /disciplines/:id/tasks/:taskId    | Deletar task    | ✅   |
| PATCH  | /disciplines/:id/tasks/:taskId/toggle | Marcar como concluída/pendente | ✅ |

**POST /disciplines/:id/tasks — body:**
```json
{ "title": "string", "description": "string?", "dueDate": "ISO8601?" }
```

---

### Evaluations

| Método | Rota                                        | Descrição          | Auth |
|--------|---------------------------------------------|--------------------|------|
| GET    | /disciplines/:id/evaluations                | Listar avaliações  | ✅   |
| POST   | /disciplines/:id/evaluations                | Criar avaliação    | ✅   |
| PUT    | /disciplines/:id/evaluations/:evalId        | Editar avaliação   | ✅   |
| DELETE | /disciplines/:id/evaluations/:evalId        | Deletar avaliação  | ✅   |
| PATCH  | /disciplines/:id/evaluations/:evalId/toggle | Marcar como feita  | ✅   |

**POST /disciplines/:id/evaluations — body:**
```json
{ "title": "string", "date": "ISO8601?", "maxGrade": 10 }
```

---

### Schedules

| Método | Rota                                  | Descrição       | Auth |
|--------|---------------------------------------|-----------------|------|
| GET    | /disciplines/:id/schedules            | Listar horários | ✅   |
| POST   | /disciplines/:id/schedules            | Criar horário   | ✅   |
| DELETE | /disciplines/:id/schedules/:schedId   | Deletar horário | ✅   |

**POST /disciplines/:id/schedules — body:**
```json
{ "dayOfWeek": 1, "startTime": "08:00", "endTime": "10:00" }
```

---

### Todos

| Método | Rota                  | Descrição           | Auth |
|--------|-----------------------|---------------------|------|
| GET    | /todos                | Listar todos        | ✅   |
| POST   | /todos                | Criar todo          | ✅   |
| PATCH  | /todos/:id/toggle     | Marcar concluído    | ✅   |
| DELETE | /todos/:id            | Deletar todo        | ✅   |

---

### Progress

| Método | Rota       | Descrição                              | Auth |
|--------|------------|----------------------------------------|------|
| GET    | /progress  | Progresso geral (média de disciplinas) | ✅   |

**Resposta:**
```json
{
  "overall": 0.6,
  "byDiscipline": [
    { "id": "uuid", "name": "string", "progress": 0.75 }
  ]
}
```

---

## Tratamento de Erros

Todos os erros seguem o formato:
```json
{ "error": "mensagem legível" }
```

| Status | Situação                              |
|--------|---------------------------------------|
| 400    | Body inválido (falha no Zod)          |
| 401    | Token ausente ou inválido             |
| 403    | Recurso pertence a outro usuário      |
| 404    | Recurso não encontrado                |
| 409    | Conflito (ex: email já cadastrado)    |
| 500    | Erro interno                          |

---

## O que NÃO implementar

- Não implementar OAuth / login social
- Não implementar upload de arquivos
- Não implementar notificações / e-mail
- Não implementar refresh token (JWT simples por enquanto)
- Não criar lógica de semestres — as disciplinas são gerenciadas manualmente pelo usuário
