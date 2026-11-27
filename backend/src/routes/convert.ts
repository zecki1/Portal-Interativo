import type { FastifyInstance } from "fastify";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { randomUUID } from "node:crypto";
import { authMiddleware } from "../middlewares/auth.js";
import { requirePermission } from "../middlewares/permissions.js";
import * as converter from "../services/converterService.js";
import { registrarAtividade } from "../services/activityLog.js";

const ator = (req: any): string => String(req.user?.email || req.user?.username || "anonimo");

export async function convertRoutes(app: FastifyInstance) {
  // Upload e conversão do arquivo (.pdf, .idml)
  app.post("/convert", { preHandler: requirePermission("criar") }, async (req, reply) => {
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
      const doc = await converter.getProjectDocument(meta.id).catch(() => undefined);
      await registrarAtividade({
        ator: ator(req), acao: "criar", recurso: meta.id, projetoId: meta.id,
        titulo: doc?.title || meta.name, detalhe: `origem: ${file.filename}`, snapshot: doc, assetDir: await converter.getProjectDir(meta.id).catch(() => ""),
      });
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
  app.post("/convert/batch", { preHandler: requirePermission("criar") }, async (req, reply) => {
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
          const doc = await converter.getProjectDocument(meta.id).catch(() => undefined);
          await registrarAtividade({
            ator: ator(req), acao: "criar", recurso: meta.id, projetoId: meta.id,
            titulo: doc?.title || meta.name, detalhe: `lote: ${file.filename}`, snapshot: doc, assetDir: await converter.getProjectDir(meta.id).catch(() => ""),
          });
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
  app.get("/projects", { preHandler: requirePermission("visualizar") }, async (_req, reply) => {
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
  app.get("/projects/:id", { preHandler: requirePermission("visualizar") }, async (req, reply) => {
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
  app.put("/projects/:id", { preHandler: requirePermission("editar") }, async (req, reply) => {
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
      const anterior = await converter.getProjectDocument(id).catch(() => undefined);
      await converter.saveProjectDocument(doc);
      await registrarAtividade({
        ator: ator(req), acao: "editar", recurso: id, projetoId: id,
        titulo: doc.title, detalhe: "edição salva", snapshot: anterior || doc, assetDir: await converter.getProjectDir(id).catch(() => ""),
      });
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

  // Renomear projeto
  app.patch("/projects/:id/name", { preHandler: requirePermission("editar") }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { name } = (req.body as { name?: string }) || {};
    if (!name || !name.trim()) {
      return reply.status(400).send({ data: null, error: { message: "Nome inválido." }, meta: null });
    }
    try {
      const anterior = await converter.getProjectDocument(id).catch(() => undefined);
      const meta = await converter.renameProject(id, name.trim());
      await registrarAtividade({
        ator: ator(req), acao: "renomear", recurso: id, projetoId: id,
        titulo: anterior?.title || meta.name, detalhe: `novo nome: ${name.trim()}`, snapshot: anterior, assetDir: await converter.getProjectDir(id).catch(() => ""),
      });
      return reply.send({ data: meta, error: null, meta: null });
    } catch (err) {
      return reply.status(500).send({ data: null, error: { message: err instanceof Error ? err.message : "Erro ao renomear." }, meta: null });
    }
  });
  app.get("/projects/:id/versions", { preHandler: requirePermission("visualizar") }, async (req, reply) => {
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
  app.post("/projects/:id/versions", { preHandler: requirePermission("editar") }, async (req, reply) => {
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
  app.post("/projects/:id/versions/:versionId/restore", { preHandler: requirePermission("reverter") }, async (req, reply) => {
    const { id, versionId } = req.params as { id: string; versionId: string };
    try {
      const restored = await converter.restoreProjectVersion(id, versionId);
      await registrarAtividade({
        ator: ator(req), acao: "reverter", recurso: id, projetoId: id,
        titulo: restored.title, detalhe: `versão ${versionId.slice(0, 8)}`, snapshot: restored, assetDir: await converter.getProjectDir(id).catch(() => ""),
      });
      return reply.send({ data: restored, error: null, meta: null });
    } catch (err) {
      return reply.status(400).send({
        data: null,
        error: { message: err instanceof Error ? err.message : "Erro ao restaurar versão." },
        meta: null,
      });
    }
  });

  // Cria o documento-modelo com todos os blocos (onboarding/demonstração).
  // Aceita { themeId?, showNav?, showTopbar?, name? } para variantes.
  app.post("/projects/exemplo", { preHandler: requirePermission("criar") }, async (req, reply) => {
    const body = (req.body as { themeId?: string; showNav?: boolean; showTopbar?: boolean; name?: string } | undefined) || {};
    try {
      const meta = await converter.createExemploProject(body);
      return reply.status(201).send({ data: meta, error: null, meta: null });
    } catch (err) {
      return reply.status(500).send({
        data: null,
        error: { message: err instanceof Error ? err.message : "Erro ao criar o material de exemplo." },
        meta: null,
      });
    }
  });

  // Cria um conjunto de materiais demonstrativos: um por tema, com e sem navegação.
  // Aceita { reset?: boolean, mode?: "light"|"dark" } — com `reset`, apaga os
  // demonstrativos antigos antes de gerar os novos.
  app.post("/projects/exemplo/todos", { preHandler: requirePermission("criar") }, async (req, reply) => {
    const body = (req.body as { reset?: boolean; mode?: "light" | "dark" } | undefined) || {};
    const themes: Array<{ id: string; name: string }> = [
      { id: "sesi", name: "Sesi" },
      { id: "editora", name: "Editora" },
      { id: "noturno", name: "Noturno" },
      { id: "alto-contraste", name: "Alto contraste" },
      { id: "ludico", name: "Lúdico" },
      { id: "oceano", name: "Oceano" },
      { id: "floresta", name: "Floresta" },
    ];
    const created: any[] = [];
    try {
      if (body.reset) await converter.deleteExemploProjects();
      for (const theme of themes) {
        for (const showNav of [true, false]) {
          const meta = await converter.createExemploProject({
            themeId: theme.id,
            mode: body.mode === "dark" ? "dark" : "light",
            showNav,
            showTopbar: true,
            name: `Demonstrativo — ${theme.name}${showNav ? " (com menu)" : " (sem menu)"}`,
          });
          created.push(meta);
        }
      }
      return reply.status(201).send({ data: created, error: null, meta: { total: created.length } });
    } catch (err) {
      return reply.status(500).send({
        data: null,
        error: { message: err instanceof Error ? err.message : "Erro ao criar os materiais demonstrativos." },
        meta: null,
      });
    }
  });

  // Apaga todos os materiais demonstrativos (mantém os projetos reais).
  app.delete("/projects/exemplo", { preHandler: requirePermission("excluir") }, async (_req, reply) => {
    try {
      const removed = await converter.deleteExemploProjects();
      return reply.send({ data: { removed }, error: null, meta: null });
    } catch (err) {
      return reply.status(500).send({
        data: null,
        error: { message: err instanceof Error ? err.message : "Erro ao apagar os materiais demonstrativos." },
        meta: null,
      });
    }
  });

  // Exclui um projeto
  app.delete("/projects/:id", { preHandler: requirePermission("excluir") }, async (req, reply) => {
    const { id } = req.params as { id: string };
    try {
      const anterior = await converter.getProjectDocument(id).catch(() => undefined);
      const assetDir = await converter.getProjectDir(id).catch(() => "");
      await converter.deleteProject(id);
      await registrarAtividade({
        ator: ator(req), acao: "excluir", recurso: id, projetoId: id,
        titulo: anterior?.title || id, detalhe: "projeto excluído — pode ser refeito na aba Logs",
        snapshot: anterior, assetDir,
      });
      return reply.send({ data: { success: true }, error: null, meta: null });
    } catch (err) {
      return reply.status(500).send({
        data: null,
        error: { message: err instanceof Error ? err.message : "Erro ao excluir projeto." },
        meta: null,
      });
    }
  });

  // Atualização atômica de um bloco (F04)
  app.patch("/projects/:id/blocks/:blockId", { preHandler: requirePermission("editar") }, async (req, reply) => {
    const { id, blockId } = req.params as { id: string; blockId: string };
    const patch = (req.body || {}) as Record<string, unknown>;
    try {
      const doc = await converter.getProjectDocument(id);
      let found = false;
      for (const page of doc.pages) {
        const idx = page.blocks.findIndex((b) => b.id === blockId);
        if (idx === -1) continue;
        const current = page.blocks[idx] as any;
        page.blocks[idx] = {
          ...current,
          ...patch,
          id: current.id,
          type: (patch.type as any) || current.type,
          data: patch.data ? { ...(current.data || {}), ...(patch.data as any) } : current.data,
          layout: patch.layout ? { ...(current.layout || {}), ...(patch.layout as any) } : current.layout,
          style: patch.style ? { ...(current.style || {}), ...(patch.style as any) } : current.style,
        };
        found = true;
        break;
      }
      if (!found) {
        return reply.status(404).send({ data: null, error: { message: "Bloco não encontrado." }, meta: null });
      }
      doc.updatedAt = new Date().toISOString();
      await converter.saveProjectDocument(doc);
      return reply.send({ data: { id: blockId, updated: true }, error: null, meta: null });
    } catch (err) {
      return reply.status(500).send({
        data: null,
        error: { message: err instanceof Error ? err.message : "Erro ao atualizar bloco." },
        meta: null,
      });
    }
  });

  // Upload manual de uma nova mídia/imagem para a biblioteca do projeto
  app.post("/projects/:id/assets", { preHandler: requirePermission("editar") }, async (req, reply) => {
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
      // HTML/CSS/JS são regenerados pelo backend; assets podem ficar em cache.
      const rebuildable = wildcard === "index.html" || wildcard === "styles.css" || wildcard === "script.js";
      reply.header("Cache-Control", rebuildable ? "no-cache" : "public, max-age=86400");
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
  app.get("/projects/:id/download", { preHandler: requirePermission("exportar") }, async (req, reply) => {
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
