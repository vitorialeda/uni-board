import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../database/prisma.js";

const registerSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.email(),
  password: z.string().min(6).max(128),
});

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1).max(128),
});

function signAuthToken(app: FastifyInstance, userId: string, email: string) {
  return app.jwt.sign({ userId, email }, { expiresIn: "7d" });
}

export async function registerController(
  app: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const result = registerSchema.safeParse(request.body);
  if (!result.success) {
    return reply.status(400).send({ error: "Body inválido" });
  }

  const { name, email, password } = result.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return reply.status(409).send({ error: "Email já cadastrado" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: { name, email, password: hashedPassword },
  });

  const token = signAuthToken(app, user.id, user.email);

  return reply.status(201).send({
    token,
    user: { id: user.id, name: user.name, email: user.email },
  });
}

export async function loginController(
  app: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const result = loginSchema.safeParse(request.body);
  if (!result.success) {
    return reply.status(400).send({ error: "Body inválido" });
  }

  const { email, password } = result.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return reply.status(401).send({ error: "Credenciais inválidas" });
  }

  const passwordMatch = await bcrypt.compare(password, user.password);
  if (!passwordMatch) {
    return reply.status(401).send({ error: "Credenciais inválidas" });
  }

  const token = signAuthToken(app, user.id, user.email);

  return reply.send({
    token,
    user: { id: user.id, name: user.name, email: user.email },
  });
}
