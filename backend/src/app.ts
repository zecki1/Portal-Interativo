import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import cookie from "@fastify/cookie";
import multipart from "@fastify/multipart";
import { errorHandler } from "./middlewares/errorHandler.js";

import { registerRoutes } from "./routes/index.js";

import { registerSwagger } from "./plugins/swagger.js";

export async function buildApp() {
  const app = Fastify({
    logger: true,
    bodyLimit: 200 * 1024 * 1024,
  });
  await app.register(cookie);
  await app.register(cors, { origin: ["http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:5173"], credentials: true });
  await app.register(multipart, {
    limits: {
      fileSize: 500 * 1024 * 1024,
      files: 20,
    },
  });
  await app.register(helmet, {
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false,
    // O preview do projeto é exibido dentro de um iframe no frontend (:5173),
    // que é outra origem. O bloqueio por iframe é feito rota a rota com
    // `Content-Security-Policy: frame-ancestors` na rota de preview.
    frameguard: false,
  });
  app.setErrorHandler(errorHandler);
  await registerSwagger(app);
  await registerRoutes(app);
  return app;
}
