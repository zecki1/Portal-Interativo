import type { FastifyInstance } from "fastify";
import { login, register } from "../services/authService.js";
import { authMiddleware } from "../middlewares/auth.js";
import { z } from "zod";

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(6) });
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
  surname: z.string().max(120).optional(),
});

export async function authRoutes(app: FastifyInstance) {
  app.post("/auth/register", {
    schema: {
      tags: ["auth"],
      summary: "Registrar usuário",
      description: "Cria um novo usuário com email/senha e retorna os dados.",
      body: {
        type: "object",
        required: ["email", "password", "name"],
        properties: {
          email: { type: "string", format: "email" },
          password: { type: "string", minLength: 6 },
          name: { type: "string", minLength: 1 },
          surname: { type: "string" },
        },
      },
    },
  }, async (req, reply) => {
    const body = registerSchema.parse(req.body);
    try {
      const user = await register(body.email, body.password, body.name, body.surname);
      return reply.send({ data: user, error: null, meta: null });
    } catch (err) {
      return reply.status(409).send({
        data: null,
        error: { message: err instanceof Error ? err.message : "Não foi possível cadastrar." },
        meta: null,
      });
    }
  });
  app.post("/auth/login", {
    schema: {
      tags: ["auth"],
      summary: "Login",
      description: "Autentica com email/senha e retorna access/refresh tokens.",
      body: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email" },
          password: { type: "string", minLength: 6 },
        },
      },
    },
  }, async (req, reply) => {
    const body = loginSchema.parse(req.body);
    try {
      const result = await login(body.email, body.password);
      const isProd = process.env.NODE_ENV === "production";
      reply.setCookie("access_token", result.accessToken, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: isProd,
        maxAge: 15 * 60,
      });
      reply.setCookie("refresh_token", result.refreshToken, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: isProd,
        maxAge: 7 * 24 * 60 * 60,
      });
      return reply.send({ data: result, error: null, meta: null });
    } catch (err) {
      return reply.status(401).send({
        data: null,
        error: { message: err instanceof Error ? err.message : "Credenciais inválidas." },
        meta: null,
      });
    }
  });

  // Listar usuários (página de permissões).
  app.get("/auth/users", { preHandler: authMiddleware }, async (_req, reply) => {
    const { listarUsuarios } = await import("../services/authService.js");
    const data = await listarUsuarios();
    return reply.send({ data, error: null, meta: null });
  });

  // Atualizar papel do usuário.
  app.patch("/auth/users/:id/role", { preHandler: authMiddleware }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = req.body as { role?: string };
    if (!body?.role) return reply.code(400).send({ data: null, error: { message: "role obrigatório" }, meta: null });
    try {
      const { atualizarPapel } = await import("../services/authService.js");
      const data = await atualizarPapel(id, body.role);
      return reply.send({ data, error: null, meta: null });
    } catch (err) {
      return reply.code(404).send({ data: null, error: { message: err instanceof Error ? err.message : "erro" }, meta: null });
    }
  });
}