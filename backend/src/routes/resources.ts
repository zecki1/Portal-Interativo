import type { FastifyInstance } from "fastify";
import { authMiddleware } from "../middlewares/auth.js";
import { resourceService } from "../services/resourceService.js";
import { z } from "zod";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream/promises";

const createSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  type: z.string(),
  tags: z.array(z.string()).default([]),
  story: z.string().max(8000).optional(),
  notes: z.string().max(8000).optional(),
  prompt: z.string().max(8000).optional(),
  poses: z.number().int().min(0).optional(),
  animationReady: z.boolean().optional(),
  animationFiles: z.number().int().min(0).optional(),
  fileName: z.string().max(300).optional(),
  mimeType: z.string().max(200).optional(),
  sizeBytes: z.number().int().min(0).optional(),
  dimensions: z.string().max(120).optional(),
  thumbnailUrl: z.string().max(2000).optional(),
});

function atorDaRequisicao(req: any) {
  return {
    id: req.user?.sub as string | undefined,
    nome: String(req.user?.email ?? req.user?.sub ?? "sistema"),
  };
}

export async function resourceRoutes(app: FastifyInstance) {
  app.get("/resources", { preHandler: authMiddleware, schema: { tags: ["resources"], summary: "Listar recursos", description: "Retorna lista de recursos não deletados." } }, async (_req, reply) => {
    const data = await resourceService.list();
    return reply.send({ data, error: null, meta: null });
  });

  app.get("/resources/:id", { preHandler: authMiddleware, schema: { tags: ["resources"], summary: "Detalhe do recurso", description: "Retorna um recurso por ID." } }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const data = await resourceService.get(id);
    return reply.send({ data, error: null, meta: null });
  });

  app.post("/resources", { preHandler: authMiddleware, schema: { tags: ["resources"], summary: "Criar recurso", description: "Cria um novo recurso (status draft)." } }, async (req, reply) => {
    const body = createSchema.parse(req.body);
    const data = await resourceService.create(body, atorDaRequisicao(req));
    return reply.status(201).send({ data, error: null, meta: null });
  });

  app.patch("/resources/:id", { preHandler: authMiddleware, schema: { tags: ["resources"], summary: "Atualizar recurso", description: "Atualiza metadados (optimistic locking)." } }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = req.body as any;
    const data = await resourceService.update(id, body, atorDaRequisicao(req));
    return reply.send({ data, error: null, meta: null });
  });

  app.delete("/resources/:id", { preHandler: authMiddleware, schema: { tags: ["resources"], summary: "Excluir recurso", description: "Soft delete do recurso." } }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const data = await resourceService.remove(id, atorDaRequisicao(req));
    return reply.send({ data, error: null, meta: null });
  });

  app.post("/resources/:id/publish", { preHandler: authMiddleware, schema: { tags: ["resources"], summary: "Publicar recurso", description: "Muda status para published." } }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const data = await resourceService.publish(id, atorDaRequisicao(req));
    return reply.send({ data, error: null, meta: null });
  });

  // Upload de arquivo para pasta do recurso (simulação de produção).
  app.post("/resources/:id/files", { preHandler: authMiddleware }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const safeId = path.basename(id);
    const dir = path.join(process.cwd(), "uploads", safeId);
    await fsp.mkdir(dir, { recursive: true });
    const base = `${req.protocol}://${req.headers.host}`;

    // Preferencial: multipart (streaming, suporta arquivos grandes).
    if (req.isMultipart()) {
      const parte = await req.file();
      if (!parte) {
        return reply.code(400).send({ data: null, error: { message: "Arquivo inválido." }, meta: null });
      }
      const safeName = path.basename(parte.filename || "arquivo");
      const destino = path.join(dir, safeName);

      try {
        await pipeline(parte.file, fs.createWriteStream(destino));
      } catch {
        await fsp.unlink(destino).catch(() => undefined);
        return reply.code(400).send({ data: null, error: { message: "Falha ao salvar o arquivo." }, meta: null });
      }

      if (parte.file.truncated) {
        await fsp.unlink(destino).catch(() => undefined);
        return reply.code(413).send({
          data: null,
          error: { message: "Arquivo maior que o limite de 500 MB." },
          meta: null,
        });
      }

      return reply.status(201).send({
        data: { url: `${base}/api/v1/files/${safeId}/${encodeURIComponent(safeName)}`, name: safeName },
        error: null,
        meta: null,
      });
    }

    // Compatibilidade: JSON com base64 (arquivos pequenos).
    const body = req.body as { name?: string; mime?: string; data?: string };
    if (!body?.name || !body?.data) {
      return reply.code(400).send({ data: null, error: { message: "Arquivo inválido." }, meta: null });
    }
    const safeName = path.basename(body.name);
    const buf = Buffer.from(body.data, "base64");
    await fsp.writeFile(path.join(dir, safeName), buf);
    return reply.status(201).send({
      data: { url: `${base}/api/v1/files/${safeId}/${encodeURIComponent(safeName)}`, name: safeName },
      error: null,
      meta: null,
    });
  });

  // Servir arquivo salvo.
  app.get("/files/:id/:name", async (req, reply) => {
    const { id, name } = req.params as { id: string; name: string };
    const safeId = path.basename(id);
    const safeName = path.basename(decodeURIComponent(name));
    const filePath = path.join(process.cwd(), "uploads", safeId, safeName);
    if (!fs.existsSync(filePath)) {
      return reply.code(404).send({ data: null, error: { message: "Arquivo não encontrado." }, meta: null });
    }
    const ext = path.extname(filePath).toLowerCase();
    const mime =
      ext === ".png" ? "image/png" :
      ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" :
      ext === ".svg" ? "image/svg+xml" :
      ext === ".pdf" ? "application/pdf" :
      ext === ".mp3" ? "audio/mpeg" :
      "application/octet-stream";
    reply.type(mime);

    const querystring = req.query as { download?: string };
    if (querystring.download) {
      reply.header(
        "Content-Disposition",
        `attachment; filename*=UTF-8''${encodeURIComponent(safeName)}`
      );
    }

    return reply.send(fs.createReadStream(filePath));
  });
}
