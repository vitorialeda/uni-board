import { authenticate } from "../middlewares/auth.js";
import { listTodosController, createTodoController, toggleTodoController, deleteTodoController, } from "../controllers/todos.controller.js";
export async function todosRoutes(app) {
    app.addHook("onRequest", authenticate);
    app.get("/", async (request, reply) => {
        return listTodosController(app, request, reply);
    });
    app.post("/", async (request, reply) => {
        return createTodoController(app, request, reply);
    });
    app.patch("/:id/toggle", async (request, reply) => {
        return toggleTodoController(app, request, reply);
    });
    app.delete("/:id", async (request, reply) => {
        return deleteTodoController(app, request, reply);
    });
}
