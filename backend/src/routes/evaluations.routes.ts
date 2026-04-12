import type { FastifyInstance } from "fastify";
import { authenticate } from "../middlewares/auth.js";
import {
  listEvaluationsController,
  createEvaluationController,
  updateEvaluationController,
  deleteEvaluationController,
  toggleEvaluationController,
} from "../controllers/evaluations.controller.js";

export async function evaluationsRoutes(app: FastifyInstance) {
  app.addHook("onRequest", authenticate);

  app.get("/", async (request, reply) => {
    return listEvaluationsController(app, request, reply);
  });

  app.post("/", async (request, reply) => {
    return createEvaluationController(app, request, reply);
  });

  app.put("/:evalId", async (request, reply) => {
    return updateEvaluationController(app, request, reply);
  });

  app.delete("/:evalId", async (request, reply) => {
    return deleteEvaluationController(app, request, reply);
  });

  app.patch("/:evalId/toggle", async (request, reply) => {
    return toggleEvaluationController(app, request, reply);
  });
}
