/** Dashboard de recursos produzidos no Portal, lido dos projetos locais. */

import fsp from "node:fs/promises";
import path from "node:path";
import type { ProjectDocument } from "./converterService.js";

export interface RecursosDashboard {
  totals: {
    projetos: number;
    paginas: number;
    blocos: number;
    imagens: number;
    videos: number;
    audios: number;
    documentos: number;
    fontes: number;
    scripts: number;
    interatividades: number;
    bytes: number;
  };
  porProjeto: Array<{
    id: string;
    titulo: string;
    paginas: number;
    blocos: number;
    imagens: number;
    videos: number;
    audios: number;
    interatividades: number;
  }>;
}

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const PROJECTS_DIR = path.join(DATA_DIR, "projects");

function tipoArquivo(nome: string): "imagens" | "videos" | "audios" | "documentos" | "fontes" | "scripts" | null {
  const ext = path.extname(nome).toLowerCase();
  if ([".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".bmp", ".avif"].includes(ext)) return "imagens";
  if ([".mp4", ".webm", ".mov", ".mkv", ".ogv"].includes(ext)) return "videos";
  if ([".mp3", ".wav", ".ogg", ".m4a", ".aac", ".flac"].includes(ext)) return "audios";
  if ([".pdf", ".doc", ".docx", ".txt", ".xls", ".xlsx", ".ppt", ".pptx"].includes(ext)) return "documentos";
  if ([".woff", ".woff2", ".ttf", ".otf", ".eot"].includes(ext)) return "fontes";
  if ([".js", ".css", ".html", ".json"].includes(ext)) return "scripts";
  return null;
}

async function contarArquivos(dir: string): Promise<{ contadores: Record<string, number>; bytes: number }> {
  const contadores: Record<string, number> = {
    imagens: 0, videos: 0, audios: 0, documentos: 0, fontes: 0, scripts: 0,
  };
  let bytes = 0;
  const entradas = await fsp.readdir(dir, { withFileTypes: true, recursive: true }).catch(() => [] as Array<import("node:fs").Dirent>);
  for (const entrada of entradas) {
    if (!entrada.isFile()) continue;
    const tipo = tipoArquivo(entrada.name);
    if (!tipo) continue;
    contadores[tipo]++;
    const completo = path.join((entrada as any).parentPath || dir, entrada.name);
    const info = await fsp.stat(completo).catch(() => null);
    bytes += info?.size || 0;
  }
  return { contadores, bytes };
}

export async function gerarDashboardRecursos(): Promise<RecursosDashboard> {
  const entries = await fsp.readdir(PROJECTS_DIR, { withFileTypes: true }).catch(() => []);
  const totals: RecursosDashboard["totals"] = {
    projetos: 0, paginas: 0, blocos: 0, imagens: 0, videos: 0, audios: 0,
    documentos: 0, fontes: 0, scripts: 0, interatividades: 0, bytes: 0,
  };
  const porProjeto: RecursosDashboard["porProjeto"] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const dir = path.join(PROJECTS_DIR, entry.name);
    const doc = await fsp
      .readFile(path.join(dir, "project.json"), "utf8")
      .then((texto) => JSON.parse(texto) as ProjectDocument)
      .catch(() => null);
    if (!doc) continue;

    const { contadores, bytes } = await contarArquivos(dir);
    const interativas = (doc.pages || []).reduce(
      (soma, pagina) => soma + (pagina.blocks || []).filter((b) =>
        ["quiz", "accordion", "tabs", "hotspot", "glossary", "footnotes", "audio", "video", "math"].includes(b.type),
      ).length,
      0,
    );
    const blocos = (doc.pages || []).reduce((soma, pagina) => soma + (pagina.blocks || []).length, 0);

    totals.projetos++;
    totals.paginas += doc.pages?.length || 0;
    totals.blocos += blocos;
    totals.imagens += contadores.imagens;
    totals.videos += contadores.videos;
    totals.audios += contadores.audios;
    totals.documentos += contadores.documentos;
    totals.fontes += contadores.fontes;
    totals.scripts += contadores.scripts;
    totals.interatividades += interativas;
    totals.bytes += bytes;

    porProjeto.push({
      id: doc.id || entry.name,
      titulo: doc.title || entry.name,
      paginas: doc.pages?.length || 0,
      blocos,
      imagens: contadores.imagens,
      videos: contadores.videos,
      audios: contadores.audios,
      interatividades: interativas,
    });
  }

  porProjeto.sort((a, b) => b.paginas - a.paginas);
  return { totals, porProjeto };
}
