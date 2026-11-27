import type { FastifyInstance } from "fastify";
import fsp from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { requireAdmin, requirePermission } from "../middlewares/permissions.js";
import { backupDir, buscarAtividade, listarAtividades, registrarAtividade } from "../services/activityLog.js";
import { gerarDashboardRecursos } from "../services/resourcesDashboard.js";
import * as converter from "../services/converterService.js";

const ator = (req: any): string => String(req.user?.email || req.user?.username || "anonimo");

export async function adminRoutes(app: FastifyInstance) {
  app.get("/admin/activity", { preHandler: requireAdmin }, async (req, reply) => {
    const { limit, acao, projetoId } = (req.query || {}) as Record<string, string | undefined>;
    const data = await listarAtividades({ limit: Number(limit) || 100, acao, projetoId });
    return reply.send({ data, error: null, meta: { total: data.length } });
  });

  // Recria um projeto a partir do snapshot registrado. Nunca sobrescreve o original.
  app.post(
    "/admin/activity/:id/restore",
    { preHandler: requirePermission("reverter") },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const entry = await buscarAtividade(id);
      if (!entry?.snapshot) {
        return reply.status(404).send({
          data: null,
          error: { message: "Atividade sem estado restaurável." },
          meta: null,
        });
      }
      try {
        const agora = new Date().toISOString();
        const restaurado = {
          ...entry.snapshot,
          id: randomUUID(),
          title: `${entry.snapshot.title || entry.titulo || "Projeto"} (restaurado)`,
          createdAt: agora,
          updatedAt: agora,
        };
        await converter.saveProjectDocument(restaurado);
        // Binários (inclusive as páginas do PDF) acompanham o snapshot.
        await fsp
          .cp(path.join(backupDir(entry.id), "assets"), path.join(await converter.getProjectDir(restaurado.id), "assets"), {
            recursive: true,
            force: true,
          })
          .catch(() => {});
        await converter.createProjectVersion(
          restaurado.id,
          `Restaurado de ${entry.acao} (${entry.id.slice(0, 8)})`,
          "rollback",
        ).catch(() => {});
        await registrarAtividade({
          ator: ator(req),
          acao: "criar",
          recurso: restaurado.id,
          projetoId: restaurado.id,
          titulo: restaurado.title,
          detalhe: `restaurado da atividade ${entry.id}`,
          snapshot: restaurado,
        });
        return reply.send({
          data: converter.getProjectMeta(restaurado),
          error: null,
          meta: null,
        });
      } catch (err) {
        return reply.status(500).send({
          data: null,
          error: { message: err instanceof Error ? err.message : "Falha ao restaurar." },
          meta: null,
        });
      }
    },
  );

  app.get("/admin/resources", { preHandler: requireAdmin }, async (_req, reply) => {
    try {
      const data = await gerarDashboardRecursos();
      return reply.send({ data, error: null, meta: null });
    } catch (err) {
      return reply.status(500).send({
        data: null,
        error: { message: err instanceof Error ? err.message : "Falha ao consolidar recursos." },
        meta: null,
      });
    }
  });
}
