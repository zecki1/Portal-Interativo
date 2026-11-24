import type { FastifyInstance } from "fastify";
import { authMiddleware } from "../middlewares/auth.js";
import { analyticsService } from "../services/analyticsService.js";
import { activityRepository } from "../repositories/activityRepository.js";

export async function analyticsRoutes(app: FastifyInstance) {
  app.get(
    "/analytics/summary",
    {
      preHandler: authMiddleware,
      schema: {
        tags: ["analytics"],
        summary: "Resumo do acervo",
        description: "Contagens de tags, histórias, poses, prontidão para animação e tipos.",
      },
    },
    async (_req, reply) => {
      const data = await analyticsService.summary();
      return reply.send({ data, error: null, meta: null });
    }
  );

  app.get(
    "/analytics/logs",
    {
      preHandler: authMiddleware,
      schema: {
        tags: ["analytics"],
        summary: "Histórico de atividades",
        description: "Quem enviou, editou ou comentou cada recurso.",
      },
    },
    async (req, reply) => {
      const { limit } = req.query as { limit?: string };
      const data = await analyticsService.logs(Number(limit ?? 100));
      return reply.send({ data, error: null, meta: null });
    }
  );

  app.get(
    "/resources/:id/activity",
    {
      preHandler: authMiddleware,
      schema: { tags: ["resources"], summary: "Histórico do recurso" },
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const data = await activityRepository.byResource(id);
      return reply.send({ data, error: null, meta: null });
    }
  );
}
