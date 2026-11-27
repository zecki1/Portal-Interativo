import "dotenv/config";
import dotenv from "dotenv";
import path from "node:path";
import { buildApp } from "./app.js";

// A base externa de login/usuários fica no .env da raiz do projeto.
// O backend deve ser iniciado a partir de backend/ (process.cwd()).
dotenv.config({ path: path.resolve(process.cwd(), "../.env") });

const start = async () => {
  const app = await buildApp();
  const port = Number(process.env.PORT || 3001);
  await app.listen({ port, host: process.env.HOST || "127.0.0.1" });
  const mode = process.env.NODE_ENV === "production" ? "produção" : "dev";
  console.log(`\x1b[36m[backend]\x1b[0m API em http://localhost:${port}/api/v1 (${mode})`);
};

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
