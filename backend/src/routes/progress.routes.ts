import type { FastifyInstance } from "fastify";
import { authenticate } from "../middlewares/auth.js";
import { getOverallProgressController } from "../controllers/progress.controller.js";

export async function progressRoutes(app: FastifyInstance) {
  app.addHook("onRequest", authenticate);

  app.get("/", async (request, reply) => {
    return getOverallProgressController(app, request, reply);
  });
}
