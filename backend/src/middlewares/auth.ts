import type { FastifyRequest, FastifyReply } from "fastify";
import jwt from "jsonwebtoken";
import { getJwtSecret } from "../services/authService.js";
import { ipDaRequisicao, sessaoValida } from "../services/sessions.js";
import crypto from "node:crypto";

function fingerprintFromReq(req: any): string {
  const ua = String(req.headers?.["user-agent"] || "");
  const lang = String(req.headers?.["accept-language"] || "");
  const ip = ipDaRequisicao(req);
  return crypto.createHash("sha256").update(ua + "|" + lang + "|" + ip).digest("hex").slice(0, 16);
}

export async function authMiddleware(req: FastifyRequest, reply: FastifyReply) {
  let token: string | undefined;
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) token = header.slice(7);
  if (!token) {
    const cookies = (req as any).cookies || {};
    token = cookies.access_token || cookies.accessToken;
  }
  if (!token && req.headers.cookie) {
    const m = req.headers.cookie.match(/(?:^|;\s*)access_token=([^;]+)/);
    if (m) token = decodeURIComponent(m[1]);
  }
  if (!token)
    return reply.status(401).send({ data: null, error: { message: "Unauthorized" }, meta: null });

  try {
    const payload = jwt.verify(token, getJwtSecret(), {
      issuer: "portal-interativo",
      audience: "portal-interativo",
    }) as any;
    if (payload?.type !== "access") throw new Error("not access");
    if (payload?.fp) {
      const fp = fingerprintFromReq(req);
      if (fp && fp !== payload.fp) throw new Error("fingerprint mismatch");
    }
    // Token vinculado a uma sessão ativa e ao IP que a criou.
    if (payload?.sid) {
      const ip = ipDaRequisicao(req);
      if (!(await sessaoValida(payload.sid, String(payload.email || ""), ip))) {
        throw new Error("sessao invalida");
      }
    }
    (req as any).user = payload;
  } catch {
    return reply.status(401).send({ data: null, error: { message: "Invalid token" }, meta: null });
  }
}
