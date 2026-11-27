import type { FastifyInstance } from "fastify";
import { authMiddleware } from "../middlewares/auth.js";
import { z } from "zod";
import { criar, listar, atualizarStatus } from "../services/supportService.js";

const createSchema = z.object({
  descricao: z.string().min(1),
  tipo: z.enum(["bug", "duvida", "sugestao"]).default("bug"),
  urgencia: z.enum(["Baixa", "Média", "Alta", "Crítica"]).default("Média"),
  screenshot: z.string().optional(),
  autor: z.string().min(1),
  email: z.string().email(),
  pagina: z.string(),
  recurso: z.string().optional(),
  url: z.string(),
  userAgent: z.string(),
});

export async function supportRoutes(app: FastifyInstance) {
  app.post("/support/tickets", { preHandler: authMiddleware }, async (req, reply) => {
    const body = createSchema.parse(req.body);
    const data = await criar(body);
    return reply.status(201).send({ data, error: null, meta: null });
  });

  app.get("/support/tickets", { preHandler: authMiddleware }, async (_req, reply) => {
    const data = await listar();
    return reply.send({ data, error: null, meta: null });
  });

  app.patch("/support/tickets/:id", { preHandler: authMiddleware }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = req.body as { status?: "Aberta" | "Em Análise" | "Concluída" };
    if (!body?.status) return reply.code(400).send({ data: null, error: { message: "status obrigatório" }, meta: null });
    const data = await atualizarStatus(id, body.status);
    return reply.send({ data, error: null, meta: null });
  });
}
