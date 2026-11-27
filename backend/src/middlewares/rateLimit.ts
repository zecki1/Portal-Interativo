import type { FastifyRequest, FastifyReply } from "fastify";

interface Bucket { count: number; resetAt: number; }
const buckets = new Map<string, Bucket>();

/** Limita requisições por IP em uma janela de tempo. */
export function rateLimit(max: number, windowMs: number) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || "unknown";
    const key = ip + ":" + req.url;
    const now = Date.now();
    let b = buckets.get(key);
    if (!b || b.resetAt < now) {
      b = { count: 0, resetAt: now + windowMs };
      buckets.set(key, b);
    }
    b.count++;
    if (b.count > max) {
      reply.header("Retry-After", Math.ceil((b.resetAt - now) / 1000));
      return reply.status(429).send({ data: null, error: { message: "Muitas tentativas. Tente novamente em instantes." }, meta: null });
    }
  };
}
