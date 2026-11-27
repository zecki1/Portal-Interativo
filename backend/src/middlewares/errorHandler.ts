import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";

export function errorHandler(err: FastifyError, _req: FastifyRequest, reply: FastifyReply) {
  const status = err.statusCode || 500;
  reply.status(status).send({
    data: null,
    error: { message: err.message || "Internal Server Error", code: err.code },
    meta: null,
  });
}
