import type { FastifyRequest, FastifyReply } from "fastify";
import jwt from "jsonwebtoken";

export async function authMiddleware(req: FastifyRequest, reply: FastifyReply) {
  let token: string | undefined;
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) token = header.slice(7);
  if (!token) {
    const cookies = (req as any).cookies || {};
    token = cookies.access_token || cookies.accessToken;
  }
  // parse cookie header manually if not parsed
  if (!token && req.headers.cookie) {
    const m = req.headers.cookie.match(/(?:^|;\s*)access_token=([^;]+)/);
    if (m) token = decodeURIComponent(m[1]);
  }
  if (!token) {
    return reply.status(401).send({ data: null, error: { message: "Unauthorized" }, meta: null });
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || "dev-secret-change-me");
    (req as any).user = payload;
  } catch {
    return reply.status(401).send({ data: null, error: { message: "Invalid token" }, meta: null });
  }
}