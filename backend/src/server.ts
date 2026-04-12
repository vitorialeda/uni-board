import { build } from "./app.js";

const PORT = Number(process.env.PORT) || 3000;

const app = build();

app.listen({ port: PORT, host: "0.0.0.0" }, (err, address) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  console.log(`Servidor rodando em ${address}`);
});
