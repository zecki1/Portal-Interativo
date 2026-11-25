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

  // Upload em lote: cada arquivo vira um projeto independente (vinculado na lista).
  // Falha em um arquivo não derruba os demais.
  app.post("/convert/batch", async (req, reply) => {
    const results: { file: string; ok: boolean; project?: converter.ProjectMeta; error?: string }[] = [];
    let count = 0;
    try {
      for await (const file of req.files()) {
        if (count >= 20) {
          results.push({ file: file.filename, ok: false, error: "Limite de 20 arquivos por lote." });
          await file.toBuffer().catch(() => {});
          continue;
        }
        count++;
        const tmpPath = path.join(os.tmpdir(), `upload-${randomUUID()}${path.extname(file.filename)}`);
        try {
          const buf = await file.toBuffer();
          await fs.writeFile(tmpPath, buf);
          const meta = await converter.convertFile(tmpPath, file.filename);
          results.push({ file: file.filename, ok: true, project: meta });
        } catch (err) {
          results.push({
            file: file.filename,
            ok: false,
            error: err instanceof Error ? err.message : "Falha na conversão do arquivo.",
          });
        } finally {
          await fs.unlink(tmpPath).catch(() => {});
        }
      }
    } catch (err) {
      return reply.status(400).send({
        data: null,
        error: { message: err instanceof Error ? err.message : "Upload inválido." },
        meta: null,
      });
    }
    if (results.length === 0) {
      return reply.status(400).send({ data: null, error: { message: "Nenhum arquivo enviado." }, meta: null });
    }
    return reply.send({
      data: results,
      error: null,
      meta: { total: results.length, ok: results.filter((r) => r.ok).length },
    });
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

  // Lista versões salvas de um projeto
  app.get("/projects/:id/versions", async (req, reply) => {
    const { id } = req.params as { id: string };
    try {
      const versions = await converter.listProjectVersions(id);
      return reply.send({ data: versions, error: null, meta: null });
    } catch {
      return reply.status(404).send({
        data: null,
        error: { message: "Projeto não encontrado." },
        meta: null,
      });
    }
  });

  // Cria uma versão/marco manual do projeto
  app.post("/projects/:id/versions", async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = (req.body as { label?: string } | undefined) || {};
    try {
      const version = await converter.createProjectVersion(id, body.label, "manual");
      return reply.status(201).send({ data: version, error: null, meta: null });
    } catch (err) {
      return reply.status(400).send({
        data: null,
        error: { message: err instanceof Error ? err.message : "Erro ao criar versão." },
        meta: null,
      });
    }
  });

  // Restaura (rollback) o projeto para uma versão anterior
  app.post("/projects/:id/versions/:versionId/restore", async (req, reply) => {
    const { id, versionId } = req.params as { id: string; versionId: string };
    try {
      const restored = await converter.restoreProjectVersion(id, versionId);
      return reply.send({ data: restored, error: null, meta: null });
    } catch (err) {
      return reply.status(400).send({
        data: null,
        error: { message: err instanceof Error ? err.message : "Erro ao restaurar versão." },
        meta: null,
      });
    }
  });

  // Cria o documento-modelo com todos os blocos (onboarding/demonstração)
  app.post("/projects/exemplo", async (_req, reply) => {
    try {
      const meta = await converter.createExemploProject();
      return reply.status(201).send({ data: meta, error: null, meta: null });
    } catch (err) {
      return reply.status(500).send({
        data: null,
        error: { message: err instanceof Error ? err.message : "Erro ao criar o material de exemplo." },
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

    if (wildcard === "index.html" || wildcard === "styles.css" || wildcard === "script.js") {
      await converter.refreshProjectBuild(id).catch(() => {});
    }

    const target = path.resolve(dir, wildcard);
    if (!target.startsWith(path.resolve(dir))) return reply.status(403).send();

    try {
      const buf = await fs.readFile(target);
      const mime = guessMime(target);
      reply.header("Content-Type", mime);
      if (target.endsWith(".html")) {
        reply.header("Content-Security-Policy", previewFrameAncestors());
      }
      return reply.send(buf);
    } catch {
      return reply.status(404).send();
    }
  });

  // Redireciona /preview (sem barra final) para /preview/ para que caminhos
  // relativos no index.html (styles.css, script.js, assets/*) resolvam certo.
  app.get("/projects/:id/preview", async (req, reply) => {
    const { id } = req.params as { id: string };
    const dir = await converter.getProjectDir(id).catch(() => null);
    if (!dir) return reply.status(404).send({ error: "Projeto não encontrado" });
    const basePath = req.url.split("?")[0];
    return reply.redirect(`${basePath}/`, 302);
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

/**
 * Origens autorizadas a exibir o preview dentro de iframe.
 * O padrão cobre o editor em desenvolvimento; `PREVIEW_FRAME_ANCESTORS`
 * (separado por vírgulas) adiciona domínios publicados.
 */
function previewFrameAncestors(): string {
  const extra = (process.env.PREVIEW_FRAME_ANCESTORS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return `frame-ancestors ${["'self'", "http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:5173", ...extra].join(" ")}`;
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
