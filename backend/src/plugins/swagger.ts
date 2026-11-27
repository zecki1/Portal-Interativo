import type { FastifyInstance } from "fastify";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";

export async function registerSwagger(app: FastifyInstance) {
  await app.register(swagger, {
    openapi: {
      info: {
        title: "Catálogo de Recursos API",
        description: "API REST do catálogo de recursos (imagens/arquivos).",
        version: "1.0.0",
      },
      tags: [
        { name: "auth", description: "Autenticação (JWT)" },
        { name: "resources", description: "Recursos do catálogo" },
        { name: "health", description: "Saúde da API" },
      ],
    },
  });
  await app.register(swaggerUi, { routePrefix: "/docs" });
}
