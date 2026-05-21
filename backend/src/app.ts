import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import { authRoutes } from "./routes/auth.routes.js";
import { disciplinesRoutes } from "./routes/disciplines.routes.js";
import { topicsRoutes } from "./routes/topics.routes.js";
import { evaluationsRoutes } from "./routes/evaluations.routes.js";
import { schedulesRoutes } from "./routes/schedules.routes.js";
import { todosRoutes } from "./routes/todos.routes.js";
import { progressRoutes } from "./routes/progress.routes.js";
import { ragRoutes } from "./routes/rag.routes.js";
import { notesRoutes } from "./routes/notes.routes.js";
import { env } from "./config/env.js";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { userId: string; email: string };
    user: { userId: string; email: string };
  }
}

export function build() {
  const app = Fastify({ logger: false });

  app.register(cors, {
    origin(origin, callback) {
      if (!origin || !env.corsOriginPatterns) {
        callback(null, true);
        return;
      }

      const isAllowed = env.corsOriginPatterns.some((allowedOrigin) => {
        if (typeof allowedOrigin === "string") {
          return allowedOrigin === origin;
        }

        return allowedOrigin.test(origin);
      });

      callback(null, isAllowed);
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });

  app.register(jwt, {
    secret: env.jwtSecret,
  });

  app.get("/health", async () => {
    return {
      status: "ok",
      env: env.nodeEnv,
      uptime: process.uptime(),
    };
  });

  app.register(authRoutes, { prefix: "/auth" });
  app.register(disciplinesRoutes, { prefix: "/disciplines" });
  app.register(topicsRoutes, { prefix: "/disciplines/:id/topics" });
  app.register(evaluationsRoutes, { prefix: "/disciplines/:id/evaluations" });
  app.register(notesRoutes, { prefix: "/disciplines/:id/notes" });
  app.register(schedulesRoutes, { prefix: "/disciplines/:id/schedules" });
  app.register(todosRoutes, { prefix: "/todos" });
  app.register(progressRoutes, { prefix: "/progress" });
  app.register(ragRoutes, { prefix: "/rag" });

  return app;
}
