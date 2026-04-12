import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import dotenv from "dotenv";
import { authRoutes } from "./routes/auth.routes.js";
import { disciplinesRoutes } from "./routes/disciplines.routes.js";
import { topicsRoutes } from "./routes/topics.routes.js";
import { evaluationsRoutes } from "./routes/evaluations.routes.js";
import { schedulesRoutes } from "./routes/schedules.routes.js";
import { todosRoutes } from "./routes/todos.routes.js";
import { progressRoutes } from "./routes/progress.routes.js";
dotenv.config();
export function build() {
    const app = Fastify({ logger: false });
    app.register(cors, { origin: true });
    app.register(jwt, {
        secret: process.env.JWT_SECRET ?? "secret-dev",
    });
    app.register(authRoutes, { prefix: "/auth" });
    app.register(disciplinesRoutes, { prefix: "/disciplines" });
    app.register(topicsRoutes, { prefix: "/disciplines/:id/topics" });
    app.register(evaluationsRoutes, { prefix: "/disciplines/:id/evaluations" });
    app.register(schedulesRoutes, { prefix: "/disciplines/:id/schedules" });
    app.register(todosRoutes, { prefix: "/todos" });
    app.register(progressRoutes, { prefix: "/progress" });
    return app;
}
