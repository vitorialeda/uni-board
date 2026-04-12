import type { FastifyInstance } from "fastify";
import {
  loginController,
  registerController,
} from "../controllers/auth.controller.js";

export async function authRoutes(app: FastifyInstance) {
  app.post("/register", async (request, reply) => {
    return registerController(app, request, reply);
  });

  app.post("/login", async (request, reply) => {
    return loginController(app, request, reply);
  });
}
