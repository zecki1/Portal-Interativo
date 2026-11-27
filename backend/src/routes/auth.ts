import type { FastifyInstance } from "fastify";
import { login, register } from "../services/authService.js";
import { authMiddleware } from "../middlewares/auth.js";
import { requireAdmin } from "../middlewares/permissions.js";
import { ROLES, PERMISSIONS, getMatrix, saveMatrix, matrixSchema, getHistory, rollbackMatrix } from "../services/permissions.js";
import { lerAuditoria } from "../services/audit.js";
import { solicitar, listar, aprovar, recusar, validar, consumir } from "../services/passwordReset.js";
import { usuarioPorEmail, salvarSenha } from "../services/authService.js";
import { rateLimit } from "../middlewares/rateLimit.js";
import {
  criarSessao,
  ipDaRequisicao,
  revogarSessao,
  sessaoValida,
  vincularSessaoEmail,
} from "../services/sessions.js";
import { auditar } from "../services/audit.js";
import { z } from "zod";
import crypto from "node:crypto";

function fingerprintFromReq(req: any): string {
  const ua = String(req.headers?.["user-agent"] || "");
  const lang = String(req.headers?.["accept-language"] || "");
  const ip = ipDaRequisicao(req);
  return crypto.createHash("sha256").update(ua + "|" + lang + "|" + ip).digest("hex").slice(0, 16);
}

const loginSchema = z
  .object({
    email: z.string().min(1).optional(),
    username: z.string().min(1).optional(),
    password: z.string().min(1),
  })
  .refine((value) => Boolean(value.email || value.username), {
    message: "Informe usuário ou e-mail.",
  });
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).regex(/[A-Za-z]/, "Senha deve conter letra").regex(/[0-9]/, "Senha deve conter número"),
  name: z.string().min(1),
  surname: z.string().max(120).optional(),
});

export async function authRoutes(app: FastifyInstance) {
  app.post("/auth/register", {
    preHandler: rateLimit(5, 60_000),
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
    preHandler: rateLimit(10, 60_000),
    schema: {
      tags: ["auth"],
      summary: "Login",
      description: "Autentica com usuário ou e-mail + senha e retorna access/refresh tokens.",
      body: {
        type: "object",
        required: ["password"],
        properties: {
          email: { type: "string", minLength: 1 },
          username: { type: "string", minLength: 1 },
          password: { type: "string", minLength: 1 },
        },
      },
    },
  }, async (req, reply) => {
    try {
      const body = loginSchema.parse(req.body);
      const identificador = body.email || body.username || "";
      const ip = ipDaRequisicao(req);
      const sid = await criarSessao(identificador, ip);
      const result = await login(identificador, body.password, fingerprintFromReq(req), ip, sid);
      // A sessão foi criada com o identificador digitado; o token carrega o
      // e-mail real. Alinha os dois para não invalidar as próximas requisições.
      await vincularSessaoEmail(sid, result.user.email);
      await auditar({ ator: identificador, acao: "login", recurso: "auth", ip, detalhe: "sessao " + sid.slice(0, 8) });
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
      return reply.status(err instanceof z.ZodError ? 400 : 401).send({
        data: null,
        error: { message: err instanceof Error ? err.message : "Credenciais inválidas." },
        meta: null,
      });
    }
  });

  // Renova o access token a partir do refresh token (cookie httpOnly).
  app.post("/auth/refresh", { preHandler: rateLimit(20, 60_000) }, async (req, reply) => {
    let token: string | undefined;
    const cookies = (req as any).cookies || {};
    token = cookies.refresh_token || cookies.refreshToken;
    if (!token && req.headers.cookie) {
      const m = req.headers.cookie.match(/(?:^|;\s*)refresh_token=([^;]+)/);
      if (m) token = decodeURIComponent(m[1]);
    }
    if (!token) return reply.status(401).send({ data: null, error: { message: "Refresh token ausente." }, meta: null });
    try {
      const { refreshAccessToken } = await import("../services/authService.js");
      const result = await refreshAccessToken(token, fingerprintFromReq(req), ipDaRequisicao(req));
      const isProd = process.env.NODE_ENV === "production";
      reply.setCookie("access_token", result.accessToken, {
        httpOnly: true, sameSite: "lax", path: "/", secure: isProd, maxAge: 15 * 60,
      });
      return reply.send({ data: result, error: null, meta: null });
    } catch (err) {
      return reply.status(401).send({ data: null, error: { message: err instanceof Error ? err.message : "Refresh inválido." }, meta: null });
    }
  });

  // Listar usuários (página de permissões) — só Admin/Gestor.
  app.get("/auth/users", { preHandler: requireAdmin }, async (_req, reply) => {
    const { listarUsuarios } = await import("../services/authService.js");
    const data = await listarUsuarios();
    return reply.send({ data, error: null, meta: null });
  });

  // Atualizar papel do usuário — só Admin/Gestor.
  app.patch("/auth/users/:id/role", { preHandler: requireAdmin }, async (req, reply) => {
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

  // Metadados da matriz (roles e permissões) para qualquer usuário autenticado.
  app.get("/auth/permissions/meta", { preHandler: authMiddleware }, async (_req, reply) => {
    return reply.send({ data: { roles: ROLES, permissions: PERMISSIONS }, error: null, meta: null });
  });

  // Matriz completa — só Admin/Gestor.
  app.get("/auth/permissions", { preHandler: requireAdmin }, async (_req, reply) => {
    return reply.send({ data: await getMatrix(), error: null, meta: null });
  });

  // Salvar matriz — validado com Zod, só Admin/Gestor.
  app.put("/auth/permissions", { preHandler: requireAdmin }, async (req, reply) => {
    const parsed = matrixSchema.safeParse(req.body);
    if (!parsed.success) {
      const detalhes = parsed.error.issues.map((i) => i.path.join(".") + ": " + i.message).join("; ");
      return reply.code(400).send({ data: null, error: { message: "Matriz inválida: " + detalhes }, meta: null });
    }
    const ator = String((req as any).user?.email || "sistema");
    const data = await saveMatrix(parsed.data, ator);
    await auditar({ ator, acao: "salvar-matriz", recurso: "permissoes", ip: ipDaRequisicao(req) });
    return reply.send({ data, error: null, meta: null });
  });

  // Histórico e rollback da matriz — só Admin/Gestor.
  app.get("/auth/permissions/history", { preHandler: requireAdmin }, async (_req, reply) => {
    return reply.send({ data: await getHistory(), error: null, meta: null });
  });
  app.post("/auth/permissions/rollback", { preHandler: requireAdmin }, async (req, reply) => {
    const ator = String((req as any).user?.email || "sistema");
    const data = await rollbackMatrix(ator);
    if (!data) return reply.code(404).send({ data: null, error: { message: "Sem versão anterior." }, meta: null });
    await auditar({ ator, acao: "rollback-matriz", recurso: "permissoes", ip: ipDaRequisicao(req) });
    return reply.send({ data, error: null, meta: null });
  });

  // Logs de auditoria — só Admin/Gestor.
  app.get("/auth/audit", { preHandler: requireAdmin }, async (req, reply) => {
    const { limit } = req.query as { limit?: string };
    return reply.send({ data: await lerAuditoria(Number(limit ?? 200)), error: null, meta: null });
  });

  // --- Redefinição de senha -------------------------------------------------

  // Solicitação pública ("esqueci minha senha") — cria pedido pendente.
  app.post("/auth/password-request", { preHandler: rateLimit(5, 60_000) }, async (req, reply) => {
    const body = req.body as { email?: string; nome?: string };
    if (!body?.email) return reply.code(400).send({ data: null, error: { message: "E-mail obrigatório." }, meta: null });
    try {
      const data = await solicitar(body.email, body.nome);
      await auditar({ ator: body.email, acao: "solicitar-redefinicao", recurso: "auth", ip: ipDaRequisicao(req) });
      return reply.send({ data, error: null, meta: null });
    } catch (err) {
      return reply.code(409).send({ data: null, error: { message: err instanceof Error ? err.message : "Falha." }, meta: null });
    }
  });

  // Gestor/admin decide os pedidos.
  app.get("/auth/password-requests", { preHandler: requireAdmin }, async (_req, reply) => {
    return reply.send({ data: await listar(), error: null, meta: null });
  });
  app.post("/auth/password-requests/:id/aprovar", { preHandler: requireAdmin }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const ator = String((req as any).user?.email || "sistema");
    try {
      const data = await aprovar(id, ator);
      await auditar({ ator, acao: "aprovar-redefinicao", recurso: id, ip: ipDaRequisicao(req) });
      return reply.send({ data, error: null, meta: null });
    } catch (err) {
      return reply.code(400).send({ data: null, error: { message: err instanceof Error ? err.message : "Falha." }, meta: null });
    }
  });
  app.post("/auth/password-requests/:id/recusar", { preHandler: requireAdmin }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const ator = String((req as any).user?.email || "sistema");
    try {
      await recusar(id, ator, String((req.body as any)?.motivo || ""));
      await auditar({ ator, acao: "recusar-redefinicao", recurso: id, ip: ipDaRequisicao(req) });
      return reply.send({ data: { ok: true }, error: null, meta: null });
    } catch (err) {
      return reply.code(400).send({ data: null, error: { message: err instanceof Error ? err.message : "Falha." }, meta: null });
    }
  });

  // Página oculta: valida o token sem consumir (pode recarregar).
  app.get("/auth/reset/:token", { preHandler: rateLimit(20, 60_000) }, async (req, reply) => {
    const { token } = req.params as { token: string };
    try {
      const { email } = await validar(token);
      return reply.send({ data: { email, token }, error: null, meta: null });
    } catch (err) {
      return reply.code(400).send({ data: null, error: { message: err instanceof Error ? err.message : "Link inválido." }, meta: null });
    }
  });

  // Redefinição final. O token já foi consumido pelo GET; aqui basta o e-mail.
  app.post("/auth/reset", { preHandler: rateLimit(10, 60_000) }, async (req, reply) => {
    const body = req.body as { email?: string; password?: string };
    const schema = (await import("zod")).z.object({ token: (await import("zod")).z.string().min(1), password: (await import("zod")).z.string().min(8) });
    const parsed = schema.safeParse(body);
    if (!parsed.success) return reply.code(400).send({ data: null, error: { message: "Link ou senha inválida (mín. 8 caracteres)." }, meta: null });
    let email: string;
    try {
      ({ email } = await consumir(parsed.data.token));
    } catch (err) {
      return reply.code(400).send({ data: null, error: { message: err instanceof Error ? err.message : "Link inválido." }, meta: null });
    }
    const usuario = await usuarioPorEmail(email);
    if (!usuario) return reply.code(404).send({ data: null, error: { message: "Usuário não encontrado." }, meta: null });
    await salvarSenha(usuario, parsed.data.password);
    await auditar({ ator: usuario.email, acao: "senha-redefinida", recurso: "auth", ip: ipDaRequisicao(req) });
    return reply.send({ data: { ok: true }, error: null, meta: null });
  });

  // Logout: revoga a sessão vinculada ao token.
  app.post("/auth/logout", { preHandler: authMiddleware }, async (req, reply) => {
    const user = (req as any).user || {};
    await revogarSessao(String(user.sid || ""));
    await auditar({ ator: String(user.email || "anonimo"), acao: "logout", recurso: "auth", ip: ipDaRequisicao(req) });
    reply.clearCookie("access_token", { path: "/" });
    reply.clearCookie("refresh_token", { path: "/" });
    return reply.send({ data: { ok: true }, error: null, meta: null });
  });
}