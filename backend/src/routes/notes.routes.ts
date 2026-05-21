import type { FastifyInstance } from "fastify";
import { authenticate } from "../middlewares/auth.js";
import {
  listNotesController,
  createNoteController,
  updateNoteController,
  deleteNoteController,
} from "../controllers/notes.controller.js";

export async function notesRoutes(app: FastifyInstance) {
  app.addHook("onRequest", authenticate);

  app.get("/", async (request, reply) => {
    return listNotesController(app, request, reply);
  });

  app.post("/", async (request, reply) => {
    return createNoteController(app, request, reply);
  });

  app.put("/:noteId", async (request, reply) => {
    return updateNoteController(app, request, reply);
  });

  app.delete("/:noteId", async (request, reply) => {
    return deleteNoteController(app, request, reply);
  });
}
