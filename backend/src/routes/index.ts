import type { FastifyInstance } from "fastify";

import { authRoutes } from "./auth.js";
import { resourceRoutes } from "./resources.js";
import { analyticsRoutes } from "./analytics.js";
import { supportRoutes } from "./support.js";
import { convertRoutes } from "./convert.js";

export async function registerRoutes(app: FastifyInstance) {
  app.get("/health", async () => ({ status: "ok" }));
  await app.register(authRoutes, { prefix: "/api/v1" });
  await app.register(resourceRoutes, { prefix: "/api/v1" });
  await app.register(analyticsRoutes, { prefix: "/api/v1" });
  await app.register(supportRoutes, { prefix: "/api/v1" });
  await app.register(convertRoutes, { prefix: "/api/v1" });
}
