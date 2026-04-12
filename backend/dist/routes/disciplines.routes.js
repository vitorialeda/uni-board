import { authenticate } from "../middlewares/auth.js";
import { listDisciplinesController, createDisciplineController, getDisciplineController, getDisciplineProgressController, updateDisciplineController, deleteDisciplineController, } from "../controllers/disciplines.controller.js";
export async function disciplinesRoutes(app) {
    app.addHook("onRequest", authenticate);
    app.get("/", async (request, reply) => {
        return listDisciplinesController(app, request, reply);
    });
    app.post("/", async (request, reply) => {
        return createDisciplineController(app, request, reply);
    });
    app.get("/:id/progress", async (request, reply) => {
        return getDisciplineProgressController(app, request, reply);
    });
    app.get("/:id", async (request, reply) => {
        return getDisciplineController(app, request, reply);
    });
    app.put("/:id", async (request, reply) => {
        return updateDisciplineController(app, request, reply);
    });
    app.delete("/:id", async (request, reply) => {
        return deleteDisciplineController(app, request, reply);
    });
}
