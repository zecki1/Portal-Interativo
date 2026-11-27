import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import cookie from "@fastify/cookie";
import compress from "@fastify/compress";
import multipart from "@fastify/multipart";
import { errorHandler } from "./middlewares/errorHandler.js";

import { registerRoutes } from "./routes/index.js";

import { registerSwagger } from "./plugins/swagger.js";

const isDev = process.env.NODE_ENV !== "production";

export async function buildApp() {
  const app = Fastify({
    // Em dev usamos o hook de log compacto abaixo; em produção mantemos o
    // logger JSON padrão do Pino (consumido por `pino-pretty` no terminal).
    logger: isDev ? false : true,
    bodyLimit: 200 * 1024 * 1024,
  });

  if (isDev) {
    app.addHook("onResponse", async (request, reply) => {
      // Ignora assets estáticos do preview para não poluir o terminal.
      if (/\.(css|js|map|png|jpe?g|webp|svg|ico|woff2?)(\?.*)?$/i.test(request.url)) {
        return;
      }

      const status = reply.statusCode;
      const ms = reply.elapsedTime.toFixed(1);
      const method = request.method.padEnd(6);
      const compactUrl = request.url.replace(
        /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
        (uuid) => uuid.slice(0, 8)
      );

      const green = "\x1b[32m";
      const yellow = "\x1b[33m";
      const red = "\x1b[31m";
      const cyan = "\x1b[36m";
      const dim = "\x1b[2m";
      const reset = "\x1b[0m";

      const statusColor = status >= 500 ? red : status >= 400 ? yellow : green;
      const hora = new Date().toLocaleTimeString("pt-BR", { hour12: false });

      console.log(
        `${dim}${hora}${reset} ${cyan}${method}${reset} ${statusColor}${status}${reset} ${compactUrl} ${dim}(${ms}ms)${reset}`
      );
    });
  }
  await app.register(cookie);
  await app.register(compress, {
    global: true,
    threshold: 1024,
    encodings: ["br", "gzip", "deflate"],
  });
  const corsOrigins = (process.env.CORS_ORIGINS || "http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173")
    .split(",").map((s) => s.trim()).filter(Boolean);
  await app.register(cors, { origin: corsOrigins, credentials: true });
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
