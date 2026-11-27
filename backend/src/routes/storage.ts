import type { FastifyInstance } from "fastify";
import { requirePermission } from "../middlewares/permissions.js";
import { auditar } from "../services/audit.js";
import {
  atualizarMetadados,
  baixar,
  buscarRecurso,
  listarRecursos,
  remover,
  restaurar,
  storageConfigured,
  storageDriver,
  upload,
  urlAssinada,
} from "../services/storageService.js";
import {
  ResourceAssetInputSchema,
  ResourceAssetListQuerySchema,
  ResourceAssetUpdateSchema,
} from "../schemas/directory.js";

const ip = (req: any) => String(req.ip || req.headers?.["x-forwarded-for"] || "");

export async function storageRoutes(app: FastifyInstance) {
  app.get(
    "/blob/resources",
    {
      preHandler: requirePermission("visualizar"),
      schema: { tags: ["storage"], summary: "Listar arquivos com filtros e paginação" },
    },
    async (req, reply) => {
      const query = ResourceAssetListQuerySchema.parse(req.query || {});
      const data = await listarRecursos(query);
      return reply.send({
        data: data.items,
        error: null,
        meta: { ...data, driver: storageDriver(), configurado: storageConfigured() },
      });
    },
  );

  app.get(
    "/blob/resources/:id",
    { preHandler: requirePermission("visualizar"), schema: { tags: ["storage"], summary: "Obter metadados do arquivo" } },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const asset = await buscarRecurso(id);
      if (!asset) return reply.status(404).send({ data: null, error: { message: "Arquivo não encontrado." }, meta: null });
      return reply.send({ data: asset, error: null, meta: null });
    },
  );

  app.patch(
    "/blob/resources/:id",
    { preHandler: requirePermission("editar"), schema: { tags: ["storage"], summary: "Atualizar metadados/auditoria do arquivo" } },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const patch = ResourceAssetUpdateSchema.parse(req.body || {});
      const asset = await atualizarMetadados(id, patch, (req as any).user?.email);
      if (!asset) return reply.status(404).send({ data: null, error: { message: "Arquivo não encontrado." }, meta: null });
      await auditar({ ator: String((req as any).user?.email || "anonimo"), acao: "storage-update", recurso: id, ip: ip(req), detalhe: JSON.stringify(patch) });
      return reply.send({ data: asset, error: null, meta: null });
    },
  );

  app.post(
    "/blob/resources/:id/restore",
    { preHandler: requirePermission("editar"), schema: { tags: ["storage"], summary: "Restaurar arquivo com soft-delete" } },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const asset = await restaurar(id, (req as any).user?.email);
      if (!asset) return reply.status(404).send({ data: null, error: { message: "Arquivo não encontrado." }, meta: null });
      await auditar({ ator: String((req as any).user?.email || "anonimo"), acao: "storage-restore", recurso: id, ip: ip(req) });
      return reply.send({ data: asset, error: null, meta: null });
    },
  );

  app.post(
    "/blob/resources",
    { preHandler: requirePermission("criar"), schema: { tags: ["storage"], summary: "Enviar arquivo" } },
    async (req, reply) => {
      if (!storageConfigured()) {
        return reply
          .status(503)
          .send({ data: null, error: { message: "Armazenamento não configurado." }, meta: null });
      }
      const parte = await (req as any).file();
      if (!parte) {
        return reply.status(400).send({ data: null, error: { message: "Arquivo obrigatório." }, meta: null });
      }
      const buffer = await parte.toBuffer();
      const fields = (parte.fields || {}) as Record<string, any>;
      const field = (k: string) => {
        const v = fields[k];
        return typeof v?.value === "string" ? v.value : typeof v === "string" ? v : undefined;
      };
      const input = ResourceAssetInputSchema.parse({
        name: parte.filename,
        contentType: parte.mimetype || "application/octet-stream",
        size: buffer.length,
        workgroup: field("workgroup"),
        team: field("team"),
        uploadedBy: (req as any).user?.email,
        category: field("category"),
        kind: field("kind"),
        projectId: field("projectId"),
      });
      const { asset, url } = await upload(buffer, input);
      await auditar({ ator: String((req as any).user?.email || "anonimo"), acao: "storage-upload", recurso: asset.id, ip: ip(req), detalhe: asset.blobName });
      return reply.status(201).send({ data: { asset, url, driver: storageDriver() }, error: null, meta: null });
    },
  );

  app.get(
    "/blob/resources/:id/content",
    { preHandler: requirePermission("visualizar"), schema: { tags: ["storage"], summary: "Baixar arquivo" } },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const arquivo = await baixar(id);
      if (!arquivo) {
        return reply.status(404).send({ data: null, error: { message: "Arquivo não encontrado." }, meta: null });
      }
      reply.header("Content-Type", arquivo.asset.contentType || "application/octet-stream");
      reply.header("Content-Disposition", `inline; filename="${encodeURIComponent(arquivo.asset.name)}"`);
      return reply.send(arquivo.buffer);
    },
  );

  app.get(
    "/blob/resources/:id/url",
    { preHandler: requirePermission("visualizar"), schema: { tags: ["storage"], summary: "URL de acesso" } },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const horas = Number((req.query as any)?.horas || 24);
      try {
        const url = await urlAssinada(id, horas);
        if (!url) {
          return reply.status(404).send({ data: null, error: { message: "Arquivo não encontrado." }, meta: null });
        }
        return reply.send({ data: { url, expiresInHours: horas }, error: null, meta: null });
      } catch (err) {
        return reply.status(400).send({
          data: null,
          error: { message: err instanceof Error ? err.message : "Não foi possível gerar URL assinada." },
          meta: null,
        });
      }
    },
  );

  app.delete(
    "/blob/resources/:id",
    { preHandler: requirePermission("excluir"), schema: { tags: ["storage"], summary: "Excluir arquivo" } },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const ok = await remover(id, (req as any).user?.email);
      if (ok) await auditar({ ator: String((req as any).user?.email || "anonimo"), acao: "storage-delete", recurso: id, ip: ip(req) });
      return reply.send({ data: { removed: ok }, error: null, meta: null });
    },
  );
}
