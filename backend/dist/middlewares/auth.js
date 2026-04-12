export async function authenticate(request, reply) {
    try {
        await request.jwtVerify();
    }
    catch {
        reply.status(401).send({ error: "Token ausente ou inválido" });
    }
}
