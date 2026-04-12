import { loginController, registerController, } from "../controllers/auth.controller.js";
export async function authRoutes(app) {
    app.post("/register", async (request, reply) => {
        return registerController(app, request, reply);
    });
    app.post("/login", async (request, reply) => {
        return loginController(app, request, reply);
    });
}
