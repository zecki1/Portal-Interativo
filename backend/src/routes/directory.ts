import type { FastifyInstance } from "fastify";
import { requirePermission, requireAdmin } from "../middlewares/permissions.js";
import {
  listarDiretorio,
  definirOverride,
  criarConvidado,
  listarConvidados,
  removerConvidado,
} from "../services/directoryService.js";
import {
  GuestAccountInputSchema,
  UserOverrideInputSchema,
} from "../schemas/directory.js";
import { enviarConvite } from "../services/mailService.js";

export async function directoryRoutes(app: FastifyInstance) {
  app.get(
    "/directory/users",
    { preHandler: requirePermission("visualizar"), schema: { tags: ["directory"], summary: "Diretório unificado" } },
    async (_req, reply) => {
      const data = await listarDiretorio();
      return reply.send({ data, error: null, meta: { total: data.length } });
    },
  );

  app.patch(
    "/directory/users/:username/override",
    { preHandler: requireAdmin, schema: { tags: ["directory"], summary: "Ajustar cargo/estado de usuário externo" } },
    async (req, reply) => {
      const { username } = req.params as { username: string };
      const patch = UserOverrideInputSchema.parse(req.body ?? {});
      const data = await definirOverride(username, patch);
      return reply.send({ data, error: null, meta: null });
    },
  );

  app.get(
    "/directory/guests",
    { preHandler: requirePermission("visualizar"), schema: { tags: ["directory"], summary: "Contas convidadas" } },
    async (_req, reply) => {
      const convidados = await listarConvidados();
      const data = convidados.map((conta) => {
        const { passwordHash: _senha, ...publico } = conta.toJSON();
        return publico;
      });
      return reply.send({ data, error: null, meta: { total: data.length } });
    },
  );

  app.post(
    "/directory/guests",
    { preHandler: requireAdmin, schema: { tags: ["directory"], summary: "Criar conta convidada" } },
    async (req, reply) => {
      const input = GuestAccountInputSchema.parse(req.body);
      const senha = Math.random().toString(36).slice(2, 12);
      const criado = await criarConvidado(input, senha);
      await enviarConvite(input.email, `${input.firstName} ${input.lastName}`, input.workgroup, senha).catch(() => {});
      const { passwordHash: _senha, ...data } = criado.toJSON();
      return reply.status(201).send({ data, error: null, meta: null });
    },
  );

  app.delete(
    "/directory/guests/:id",
    { preHandler: requireAdmin, schema: { tags: ["directory"], summary: "Remover conta convidada" } },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const ok = await removerConvidado(id);
      return reply.send({ data: { removed: ok }, error: null, meta: null });
    },
  );

  app.get(
    "/directory/status",
    { preHandler: requireAdmin, schema: { tags: ["directory"], summary: "Status das conexões" } },
    async (_req, reply) => {
      const { testarConexoes, temBancoLocal, temBancoExterno } = await import("../lib/sequelize.js");
      const conexoes = await testarConexoes();
      return reply.send({
        data: {
          ...conexoes,
          configurado: {
            local: temBancoLocal(),
            externo: temBancoExterno(),
            storage: (await import("../services/storageService.js")).storageConfigured(),
            driver: (await import("../services/storageService.js")).storageDriver(),
          },
        },
        error: null,
        meta: null,
      });
    },
  );
}
