import type { FastifyInstance } from "fastify";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import * as converter from "../services/converterService.js";

export async function convertRoutes(app: FastifyInstance) {
  app.post("/convert", async (req, reply) => {
    const file = await req.file();
    if (!file) return reply.status(400).send({ data: null, error: { message: "Arquivo não enviado." }, meta: null });
    const tmpPath = path.join(os.tmpdir(), `upload-${Date.now()}-${file.filename}`);
    const buf = await file.toBuffer();
    await fs.writeFile(tmpPath, buf);
    try {
      const meta = await converter.convertFile(tmpPath, file.filename);
      return reply.send({ data: meta, error: null, meta: null });
    } catch (err) {
      return reply.status(400).send({ data: null, error: { message: err instanceof Error ? err.message : "Falha na conversão." }, meta: null });
    } finally {
      await fs.unlink(tmpPath).catch(() => {});
    }
  });

  app.get("/projects", async (_req, reply) => {
    const list = await converter.listProjects();
    return reply.send({ data: list, error: null, meta: null });
  });

  app.get("/projects/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    try {
      const dir = await converter.getProjectDir(id);
      const raw = await fs.readFile(path.join(dir, "meta.json"), "utf8");
      return reply.send({ data: JSON.parse(raw), error: null, meta: null });
    } catch {
      return reply.status(404).send({ data: null, error: { message: "Projeto não encontrado." }, meta: null });
    }
  });

  // serve static files of a project (preview)
  app.get("/projects/:id/preview/*", async (req, reply) => {
    const { id } = req.params as { id: string };
    const wildcard = (req.params as any)["*"] || "index.html";
    const dir = await converter.getProjectDir(id).catch(() => null);
    if (!dir) return reply.status(404).send();
    const target = path.join(dir, wildcard);
    // security: ensure within dir
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

  app.get("/projects/:id/preview", async (req, reply) => {
    const { id } = req.params as { id: string };
    const dir = await converter.getProjectDir(id).catch(() => null);
    if (!dir) return reply.status(404).send();
    const buf = await fs.readFile(path.join(dir, "index.html"));
    reply.header("Content-Type", "text/html");
    return reply.send(buf);
  });

  app.get("/projects/:id/download", async (req, reply) => {
    const { id } = req.params as { id: string };
    try {
      const zipPath = await converter.zipProject(id);
      const buf = await fs.readFile(zipPath);
      reply.header("Content-Type", "application/zip");
      reply.header("Content-Disposition", `attachment; filename="${id}.zip"`);
      return reply.send(buf);
    } catch {
      return reply.status(404).send({ data: null, error: { message: "Projeto não encontrado." }, meta: null });
    }
  });
}

function guessMime(p: string) {
  if (p.endsWith(".html")) return "text/html";
  if (p.endsWith(".css")) return "text/css";
  if (p.endsWith(".js")) return "application/javascript";
  if (p.endsWith(".png")) return "image/png";
  if (p.endsWith(".jpg") || p.endsWith(".jpeg")) return "image/jpeg";
  if (p.endsWith(".svg")) return "image/svg+xml";
  if (p.endsWith(".json")) return "application/json";
  return "application/octet-stream";
}