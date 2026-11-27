import type { FastifyInstance } from "fastify";

import { authRoutes } from "./auth.js";
import { resourceRoutes } from "./resources.js";
import { analyticsRoutes } from "./analytics.js";
import { supportRoutes } from "./support.js";
import { convertRoutes } from "./convert.js";
import { themeRoutes } from "./themes.js";
import { temBanco } from "../lib/db.js";
import { temBancoLocal } from "../lib/sequelize.js";
import { directoryRoutes } from "./directory.js";
import { storageRoutes } from "./storage.js";
import { adminRoutes } from "./admin.js";

export async function registerRoutes(app: FastifyInstance) {
  app.get("/health", async () => ({ status: "ok" }));
  // Alias com prefixo: é o que o Apache encaminha em /api/ e o que os
  // scripts de verificação do deploy chamam.
  app.get("/api/v1/health", async () => ({ status: "ok" }));
  await app.register(authRoutes, { prefix: "/api/v1" });
  await app.register(supportRoutes, { prefix: "/api/v1" });
  await app.register(convertRoutes, { prefix: "/api/v1" });
  await app.register(themeRoutes, { prefix: "/api/v1" });
  await app.register(adminRoutes, { prefix: "/api/v1" });

  // Catálogo e analytics dependem de SQL Server. Sem DATABASE_URL as rotas
  // do conversor continuam funcionando e essas nem são registradas.
  if (temBanco()) {
    await app.register(resourceRoutes, { prefix: "/api/v1" });
    await app.register(analyticsRoutes, { prefix: "/api/v1" });
  } else {
    app.log.warn("[db] DATABASE_URL ausente: rotas /resources e /analytics desativadas.");
  }

  // Diretório/convites/Blob usam Sequelize no mesmo SQL Server local.
  if (temBancoLocal()) {
    const { initModels } = await import("../models/index.js");
    const { sequelizeLocal } = await import("../lib/sequelize.js");
    initModels(sequelizeLocal());
    await app.register(directoryRoutes, { prefix: "/api/v1" });
    await app.register(storageRoutes, { prefix: "/api/v1" });
  }
}
