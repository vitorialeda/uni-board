import type { FastifyInstance } from "fastify";
import { authenticate } from "../middlewares/auth.js";
import {
  extractController,
  confirmController,
} from "../controllers/rag.controller.js";

export async function ragRoutes(app: FastifyInstance) {
  app.addHook("onRequest", authenticate);

  app.post("/extract", async (request, reply) => {
    return extractController(app, request, reply);
  });

  app.post("/confirm/:disciplineId", async (request, reply) => {
    return confirmController(app, request, reply);
  });
}
