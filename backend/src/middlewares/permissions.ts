import type { FastifyRequest, FastifyReply } from "fastify";
import { authMiddleware } from "./auth.js";
import { papelAtual } from "../services/authService.js";
import { hasPermission, type Permission } from "../services/permissions.js";
import { auditar } from "../services/audit.js";
import { ipDaRequisicao } from "../services/sessions.js";

/**
 * Exige autenticação + uma permissão da matriz. O papel é relido do arquivo
 * de usuários a cada requisição: rebaixar/alçar alguém na página de admin
 * vale imediatamente, sem esperar o JWT expirar.
 */
export function requirePermission(permission: Permission) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    await authMiddleware(req, reply);
    if (reply.sent) return;

    const payload = (req as any).user || {};
    const email = String(payload.email || "");
    const role = (await papelAtual(email)) || payload.role || "Convidado";

    if (!(await hasPermission(role, permission))) {
      await auditar({
        ator: String(payload.email || "anonimo"),
        acao: "negado:" + permission,
        recurso: String((req as any).url || ""),
        ip: ipDaRequisicao(req),
        detalhe: "cargo " + role,
      });
      return reply.status(403).send({
        data: null,
        error: { message: "Sem permissão para esta operação." },
        meta: null,
      });
    }
  };
}

/** Exige acesso à área administrativa (Administrador ou Gestor). */
export async function requireAdmin(req: FastifyRequest, reply: FastifyReply) {
  await authMiddleware(req, reply);
  if (reply.sent) return;

  const payload = (req as any).user || {};
  const email = String(payload.email || "");
  const role = (await papelAtual(email)) || payload.role || "Convidado";

  const { canAdministrate } = await import("../services/permissions.js");
  if (!(await canAdministrate(role))) {
    return reply.status(403).send({
      data: null,
      error: { message: "Acesso restrito a Administrador e Gestor." },
      meta: null,
    });
  }
}
