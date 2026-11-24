import type { FastifyInstance } from "fastify";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { randomUUID } from "node:crypto";
import * as converter from "../services/converterService.js";

export async function convertRoutes(app: FastifyInstance) {
  // Upload e conversão do arquivo (.pdf, .idml)
  app.post("/convert", async (req, reply) => {
    const file = await req.file();
    if (!file) {
      return reply.status(400).send({
        data: null,
        error: { message: "Nenhum arquivo enviado. Selecione um arquivo .pdf ou .idml." },
        meta: null,
      });
    }

    const tmpPath = path.join(os.tmpdir(), `upload-${Date.now()}-${file.filename}`);
    const buf = await file.toBuffer();
    await fs.writeFile(tmpPath, buf);

    try {
      const meta = await converter.convertFile(tmpPath, file.filename);
      return reply.send({ data: meta, error: null, meta: null });
    } catch (err) {
      return reply.status(400).send({
        data: null,
        error: { message: err instanceof Error ? err.message : "Falha na conversão do arquivo." },
        meta: null,
      });
    } finally {
      await fs.unlink(tmpPath).catch(() => { });
    }
  });

  // Lista todos os projetos
  app.get("/projects", async (_req, reply) => {
    try {
      const list = await converter.listProjects();
      return reply.send({ data: list, error: null, meta: null });
    } catch (err) {
      return reply.status(500).send({
        data: null,
        error: { message: err instanceof Error ? err.message : "Erro ao listar projetos." },
        meta: null,
      });
    }
  });

  // Retorna os dados completos do projeto (páginas, blocos e assets)
  app.get("/projects/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    try {
      const doc = await converter.getProjectDocument(id);
      return reply.send({ data: doc, error: null, meta: null });
    } catch {
      return reply.status(404).send({
        data: null,
        error: { message: "Projeto não encontrado ou dados corrompidos." },
        meta: null,
      });
    }
  });

  // Salva edições no projeto (atualiza páginas, blocos, assets e regera o build)
  app.put("/projects/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const doc = req.body as converter.ProjectDocument;
    if (!doc || doc.id !== id) {
      return reply.status(400).send({
        data: null,
        error: { message: "Dados do projeto inválidos ou ID divergente." },
        meta: null,
      });
    }

    try {
      await converter.saveProjectDocument(doc);
      const meta = converter.getProjectMeta(doc);
      return reply.send({ data: meta, error: null, meta: null });
    } catch (err) {
      return reply.status(500).send({
        data: null,
        error: { message: err instanceof Error ? err.message : "Erro ao salvar alterações no projeto." },
        meta: null,
      });
    }
  });

  // Exclui um projeto
  app.delete("/projects/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    try {
      await converter.deleteProject(id);
      return reply.send({ data: { success: true }, error: null, meta: null });
    } catch (err) {
      return reply.status(500).send({
        data: null,
        error: { message: err instanceof Error ? err.message : "Erro ao excluir projeto." },
        meta: null,
      });
    }
  });

  // Upload manual de uma nova mídia/imagem para a biblioteca do projeto
  app.post("/projects/:id/assets", async (req, reply) => {
    const { id } = req.params as { id: string };
    const file = await req.file();
    if (!file) {
      return reply.status(400).send({
        data: null,
        error: { message: "Nenhum arquivo enviado." },
        meta: null,
      });
    }

    try {
      const doc = await converter.getProjectDocument(id);
      const projectDir = await converter.getProjectDir(id);
      const assetsDir = path.join(projectDir, "assets");
      await fs.mkdir(assetsDir, { recursive: true });

      const assetId = randomUUID();
      const ext = path.extname(file.filename) || ".png";
      const fileName = `custom_${Date.now()}_${path.basename(file.filename, ext)}${ext}`;
      const targetPath = path.join(assetsDir, fileName);

      const buf = await file.toBuffer();
      await fs.writeFile(targetPath, buf);

      const newAsset: converter.ProjectAsset = {
        id: assetId,
        fileName,
        path: `assets/${fileName}`,
        mimeType: file.mimetype || "image/png",
        altText: file.filename,
      };

      doc.assets.push(newAsset);
      await converter.saveProjectDocument(doc);

      return reply.send({ data: newAsset, error: null, meta: null });
    } catch (err) {
      return reply.status(500).send({
        data: null,
        error: { message: err instanceof Error ? err.message : "Erro ao salvar asset." },
        meta: null,
      });
    }
  });

  // Serve arquivos estáticos do projeto (preview de assets e estilos)
  app.get("/projects/:id/preview/*", async (req, reply) => {
    const { id } = req.params as { id: string };
    const wildcard = (req.params as any)["*"] || "index.html";
    const dir = await converter.getProjectDir(id).catch(() => null);
    if (!dir) return reply.status(404).send();

    const target = path.join(dir, wildcard);
    if (!target.startsWith(dir)) return reply.status(403).send();

    try {
      const buf = await fs.readFile(target);
      const mime = guessMime(target);
      reply.header("Content-Type", mime);
      return reply.send(buf);
    } catch {
      return reply.status(404).send();
    }
  });

  // Serve o HTML principal do projeto no preview
  app.get("/projects/:id/preview", async (req, reply) => {
    const { id } = req.params as { id: string };
    const dir = await converter.getProjectDir(id).catch(() => null);
    if (!dir) return reply.status(404).send({ error: "Projeto não encontrado" });
    const buf = await fs.readFile(path.join(dir, "index.html"));
    reply.header("Content-Type", "text/html; charset=utf-8");
    return reply.send(buf);
  });

  // Download do arquivo .zip completo (build estático)
  app.get("/projects/:id/download", async (req, reply) => {
    const { id } = req.params as { id: string };
    try {
      const zipPath = await converter.zipProject(id);
      const buf = await fs.readFile(zipPath);
      reply.header("Content-Type", "application/zip");
      reply.header("Content-Disposition", `attachment; filename="${id}.zip"`);
      return reply.send(buf);
    } catch {
      return reply.status(404).send({
        data: null,
        error: { message: "Projeto não encontrado para download." },
        meta: null,
      });
    }
  });
}

function guessMime(p: string): string {
  if (p.endsWith(".html")) return "text/html; charset=utf-8";
  if (p.endsWith(".css")) return "text/css; charset=utf-8";
  if (p.endsWith(".js")) return "application/javascript; charset=utf-8";
  if (p.endsWith(".png")) return "image/png";
  if (p.endsWith(".jpg") || p.endsWith(".jpeg")) return "image/jpeg";
  if (p.endsWith(".svg")) return "image/svg+xml";
  if (p.endsWith(".json")) return "application/json";
  return "application/octet-stream";
}
