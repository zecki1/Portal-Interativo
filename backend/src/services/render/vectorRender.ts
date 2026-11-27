import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { pdfToPng } from "pdf-to-png-converter";

/**
 * Rasterização de arquivos vetoriais do InDesign (.ai) e de páginas de PDF.
 *
 * Os links .ai exportados com compatibilidade PDF são PDFs válidos, então usamos o
 * mesmo rasterizador para ambos. O resultado é cacheado em disco por hash do arquivo,
 * evitando recomprimir a mesma arte a cada conversão.
 */

const CACHE_DIR = path.join(process.env.DATA_DIR || path.join(process.cwd(), "data"), "cache", "render");
const MAX_CONCURRENT = 2;
const DEFAULT_MAX_SIDE = 1600;

let active = 0;
const waiting: Array<() => void> = [];

async function acquire(): Promise<void> {
  if (active < MAX_CONCURRENT) {
    active++;
    return;
  }
  await new Promise<void>((resolve) => waiting.push(resolve));
  active++;
}

function release(): void {
  active--;
  const next = waiting.shift();
  if (next) next();
}

async function withSlot<T>(fn: () => Promise<T>): Promise<T> {
  await acquire();
  try {
    return await fn();
  } finally {
    release();
  }
}

async function cacheKey(filePath: string, maxSide: number): Promise<string> {
  const stat = await fs.stat(filePath);
  return crypto
    .createHash("sha1")
    .update(`${path.basename(filePath)}:${stat.size}:${stat.mtimeMs}:${maxSide}`)
    .digest("hex");
}

/** Renderiza a 1ª página de um vetor (.ai) em PNG, com cache em disco. */
export async function renderVectorToPng(
  filePath: string,
  maxSide: number = DEFAULT_MAX_SIDE
): Promise<Buffer | null> {
  let key: string;
  try {
    key = await cacheKey(filePath, maxSide);
  } catch {
    return null;
  }

  const cacheFile = path.join(CACHE_DIR, `${key}.png`);
  try {
    return await fs.readFile(cacheFile);
  } catch {
    /* cache miss */
  }

  return withSlot(async () => {
    try {
      const meta = await pdfToPng(filePath, {
        returnMetadataOnly: true,
        pagesToProcess: [1],
        viewportScale: 1,
      });
      const first = meta[0];
      if (!first || !first.width || !first.height) return null;

      const scale = Math.min(4, Math.max(0.5, maxSide / Math.max(first.width, first.height)));
      const rendered = await pdfToPng(filePath, {
        pagesToProcess: [1],
        viewportScale: scale,
        returnPageContent: true,
      });
      const png = rendered[0]?.content;
      if (!png) return null;

      await fs.mkdir(CACHE_DIR, { recursive: true });
      await fs.writeFile(cacheFile, png);
      return png;
    } catch {
      return null;
    }
  });
}

/** Renderiza todas as páginas de um PDF em PNG (usado para pré-visualização fiel). */
export async function renderPdfPages(
  pdfPath: string,
  outputDir: string,
  maxSide: number = DEFAULT_MAX_SIDE
): Promise<string[]> {
  return withSlot(async () => {
    try {
      const meta = await pdfToPng(pdfPath, {
        returnMetadataOnly: true,
        viewportScale: 1,
      });
      const widest = meta.reduce((acc, p) => Math.max(acc, p.width || 0, p.height || 0), 0) || 1;
      const scale = Math.min(4, Math.max(0.5, maxSide / widest));
      await fs.mkdir(outputDir, { recursive: true });
      const results = await pdfToPng(pdfPath, {
        outputFolder: outputDir,
        outputFileMaskFunc: (n) => `page_${n}.png`,
        viewportScale: scale,
        returnPageContent: false,
      });
      return results.map((r) => r.path).filter(Boolean);
    } catch {
      return [];
    }
  });
}
