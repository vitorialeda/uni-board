import { authenticate } from "../middlewares/auth.js";
import { listTopicsController, createTopicController, updateTopicController, deleteTopicController, toggleTopicController, } from "../controllers/topics.controller.js";
export async function topicsRoutes(app) {
    app.addHook("onRequest", authenticate);
    app.get("/", async (request, reply) => {
        return listTopicsController(app, request, reply);
    });
    app.post("/", async (request, reply) => {
        return createTopicController(app, request, reply);
    });
    app.put("/:topicId", async (request, reply) => {
        return updateTopicController(app, request, reply);
    });
    app.delete("/:topicId", async (request, reply) => {
        return deleteTopicController(app, request, reply);
    });
    app.patch("/:topicId/toggle", async (request, reply) => {
        return toggleTopicController(app, request, reply);
    });
}
