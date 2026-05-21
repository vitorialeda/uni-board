# Dashboard Universitário

Aplicação full-stack para organizar a rotina acadêmica: disciplinas, tópicos, avaliações, horários, referências e tarefas.

## Stack

- Frontend: React + Vite + TypeScript
- Backend: Fastify + TypeScript
- Banco: PostgreSQL + Prisma
- IA (importação de documentos): Groq API

## Estrutura do projeto

```text
dashboard-universitario/
  backend/      # API Fastify + Prisma
  frontend/     # App React (Vite)
```

## Pré-requisitos

- Node.js 20+
- npm 10+
- PostgreSQL

## Rodando localmente

### 1) Backend

Entre em `backend/`, instale dependências e configure variáveis de ambiente:

```bash
cd backend
npm install
```

Crie um `.env` em `backend/.env`:

```env
JWT_SECRET="troque-por-um-segredo-forte"
DATABASE_URL="postgresql://usuario:senha@localhost:5432/db_uni"
GROQ_API_KEY="sua_chave_groq"
```

Execute migrações e inicie:

```bash
npx prisma generate
npx prisma migrate dev
npm run dev
```

API padrão: `http://localhost:3000`

### 2) Frontend

Em outro terminal:

```bash
cd frontend
npm install
```

Crie `frontend/.env`:

```env
VITE_API_URL="http://localhost:3000"
```

Inicie:

```bash
npm run dev
```

Frontend padrão: `http://localhost:5173`

## Scripts úteis

### Backend (`backend/`)

- `npm run dev`: desenvolvimento
- `npm run build`: build TypeScript
- `npm run start`: roda build de produção
- `npm test`: testes

### Frontend (`frontend/`)

- `npm run dev`: desenvolvimento
- `npm run build`: build de produção
- `npm test`: testes

## Deploy (produção)

Fluxo recomendado:

1. Subir PostgreSQL gerenciado (Neon, Supabase, Railway ou Render)
2. Publicar backend
3. Publicar frontend

### Backend

- Root: `backend`
- Build:

```bash
npm ci && npm run build && npx prisma generate && npx prisma migrate deploy
```

- Start:

```bash
npm run start
```

Variáveis obrigatórias:

- `DATABASE_URL`
- `JWT_SECRET`
- `GROQ_API_KEY`

### Frontend

- Root: `frontend`
- Build:

```bash
npm ci && npm run build
```

- Output: `dist`

Variável obrigatória:

- `VITE_API_URL=https://URL_DO_BACKEND`

## Segurança

- Nunca comite `.env`
- Gere novos segredos para produção
- Revogue chaves expostas

