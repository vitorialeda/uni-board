import { authenticate } from "../middlewares/auth.js";
import { getOverallProgressController } from "../controllers/progress.controller.js";
export async function progressRoutes(app) {
    app.addHook("onRequest", authenticate);
    app.get("/", async (request, reply) => {
        return getOverallProgressController(app, request, reply);
    });
}
