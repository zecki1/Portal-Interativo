import type { ZodSchema } from "zod";
import type { FastifyRequest, FastifyReply } from "fastify";

export function validate(schema: ZodSchema) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return reply.status(400).send({ data: null, error: { message: "Validation error", details: result.error.flatten() }, meta: null });
    }
    (req as any).validated = result.data;
  };
}
