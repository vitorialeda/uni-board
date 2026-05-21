import { build } from "./app.js";
import { env } from "./config/env.js";

const app = build();

app.listen({ port: env.port, host: env.host }, (err, address) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  console.log(`Servidor rodando em ${address}`);
});
