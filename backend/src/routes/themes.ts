import type { FastifyInstance } from "fastify";
import * as themes from "../services/themes.js";
import { authMiddleware } from "../middlewares/auth.js";
import { requirePermission } from "../middlewares/permissions.js";

export async function themeRoutes(app: FastifyInstance) {
  // Lista a biblioteca de temas (embutidos + personalizados)
  app.get("/themes", async (_req, reply) => {
    try {
      const list = await themes.listThemes();
      return reply.send({ data: list, error: null, meta: { total: list.length } });
    } catch (err) {
      return reply.status(500).send({
        data: null,
        error: { message: err instanceof Error ? err.message : "Erro ao listar temas." },
        meta: null,
      });
    }
  });

  // Define os tokens padrão (usado pelo editor para montar o painel)
  app.get("/themes/defaults", async (_req, reply) => {
    return reply.send({
      data: { tokens: themes.DEFAULT_THEME_TOKENS, defaultThemeId: themes.DEFAULT_THEME_ID },
      error: null,
      meta: null,
    });
  });

  // Cria um tema ("Personalizado N" ou com nome informado)
  app.post("/themes", { preHandler: requirePermission("criar") }, async (req, reply) => {
    const body = (req.body as themes.CreateThemeInput | undefined) || {};
    try {
      const theme = await themes.createTheme(body);
      return reply.status(201).send({ data: theme, error: null, meta: null });
    } catch (err) {
      return reply.status(400).send({
        data: null,
        error: { message: err instanceof Error ? err.message : "Erro ao criar tema." },
        meta: null,
      });
    }
  });

  // Duplica um tema existente
  app.post("/themes/:id/duplicate", { preHandler: requirePermission("criar") }, async (req, reply) => {
    const { id } = req.params as { id: string };
    try {
      const theme = await themes.duplicateTheme(id);
      return reply.status(201).send({ data: theme, error: null, meta: null });
    } catch (err) {
      return reply.status(400).send({
        data: null,
        error: { message: err instanceof Error ? err.message : "Erro ao duplicar tema." },
        meta: null,
      });
    }
  });

  // Atualiza nome, tokens ou CSS de um tema personalizado
  app.put("/themes/:id", { preHandler: requirePermission("editar") }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = (req.body as themes.UpdateThemeInput | undefined) || {};
    try {
      const theme = await themes.updateTheme(id, body);
      return reply.send({ data: theme, error: null, meta: null });
    } catch (err) {
      return reply.status(400).send({
        data: null,
        error: { message: err instanceof Error ? err.message : "Erro ao atualizar tema." },
        meta: null,
      });
    }
  });

  // Exclui um tema personalizado
  app.delete("/themes/:id", { preHandler: requirePermission("excluir") }, async (req, reply) => {
    const { id } = req.params as { id: string };
    try {
      await themes.deleteTheme(id);
      return reply.send({ data: { success: true }, error: null, meta: null });
    } catch (err) {
      return reply.status(400).send({
        data: null,
        error: { message: err instanceof Error ? err.message : "Erro ao excluir tema." },
        meta: null,
      });
    }
  });
}
