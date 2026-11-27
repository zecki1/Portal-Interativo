/**
 * Importação de PDF em modo "página de referência" (Adobe Acrobat-like).
 *
 * Cada página do PDF vira uma página fixa do material: a imagem da página é o
 * fundo (aria-hidden) e o texto extraído fica numa camada posicionada por
 * coordenadas reais. Assim a paginação e a geometria do impresso são mantidas,
 * e cada texto pode ser editado no Portal ("refazer" visual cobre o original).
 */

import fsp from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { pdfToPng, VerbosityLevel } from "pdf-to-png-converter";
import type { ProjectAsset, ProjectPage } from "./converterService.js";

const escapeHtml = (valor: string): string =>
  valor
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

interface TextoPdf {
  str: string;
  x: number;
  y: number;
  w: number;
  h: number;
  size: number;
  font: string;
}

/** Junta fragmentos da mesma linha para não criar um bloco por palavra. */
function agruparLinhas(itens: TextoPdf[]): TextoPdf[] {
  const uteis = itens
    .filter((i) => i.str.trim().length > 0 && i.w > 0 && i.h > 0)
    .sort((a, b) => a.y - b.y || a.x - b.x);
  const linhas: TextoPdf[] = [];
  for (const item of uteis) {
    const anterior = linhas[linhas.length - 1];
    const mesmaLinha =
      anterior &&
      Math.abs(anterior.y - item.y) <= Math.max(2, Math.min(anterior.size, item.size) * 0.35) &&
      item.x >= anterior.x &&
      item.x - (anterior.x + anterior.w) < 28;
    if (mesmaLinha) {
      const fim = Math.max(anterior.x + anterior.w, item.x + item.w);
      anterior.str = `${anterior.str} ${item.str}`.replace(/\s+/g, " ").trim();
      anterior.w = fim - anterior.x;
      anterior.size = Math.max(anterior.size, item.size);
      anterior.h = Math.max(anterior.h, item.h);
    } else {
      linhas.push({ ...item });
    }
  }
  return linhas;
}

function urlPasta(pasta: string): string {
  return path.resolve(pasta).split(path.sep).join("/").replace(/\/?$/, "/");
}

function raizPdfjs(): string {
  const candidatos = [
    path.join(process.cwd(), "node_modules", "pdfjs-dist"),
    path.resolve(process.cwd(), "..", "node_modules", "pdfjs-dist"),
  ];
  return candidatos.find((pasta) => pasta.includes("pdfjs-dist")) || candidatos[0];
}

export async function extractFromPdfFidelity(
  filePath: string,
  assetsDir: string,
): Promise<{ pages: ProjectPage[]; assets: ProjectAsset[] }> {
  const pdfjs = (await import("pdfjs-dist/legacy/build/pdf.mjs")) as any;
  const raiz = raizPdfjs();
  const bytes = new Uint8Array(await fsp.readFile(filePath));
  const pdf = await pdfjs.getDocument({
    data: bytes,
    useSystemFonts: true,
    disableFontFace: true,
    isEvalSupported: false,
    cMapUrl: urlPasta(path.join(raiz, "cmaps")),
    cMapPacked: true,
    standardFontDataUrl: urlPasta(path.join(raiz, "standard_fonts")),
  }).promise;

  const total = pdf.numPages as number;
  const paginasRenderizadas = await pdfToPng(filePath, {
    viewportScale: 1.5,
    verbosityLevel: VerbosityLevel.ERRORS,
    returnPageContent: true,
    useSystemFonts: true,
  });

  const assets: ProjectAsset[] = [];
  const pages: ProjectPage[] = [];

  for (let numero = 1; numero <= total; numero++) {
    const page = await pdf.getPage(numero);
    const viewport = page.getViewport({ scale: 1 });
    const largura = viewport.width;
    const altura = viewport.height;
    const conteudo = await page.getTextContent();
    const linhas = agruparLinhas(
      (conteudo.items || []).map((item: any) => {
        const t = item.transform || [1, 0, 0, 1, 0, 0];
        const size = Math.max(1, Math.hypot(t[2], t[3]) || Math.abs(t[3]) || 12);
        const x = Math.max(0, Math.min(largura - 1, Number(t[4]) || 0));
        const y = Math.max(0, Math.min(altura - size, altura - (Number(t[5]) || 0) - size));
        return {
          str: String(item.str || ""),
          x,
          y,
          w: Math.max(1, Math.min(Number(item.width) || 0, largura - x)),
          h: Math.max(size * 1.15, Number(item.height) || size),
          size,
          font: String(item.fontName || "sans-serif"),
        };
      }),
    );

    const blocks = linhas.map((linha) => ({
      id: randomUUID(),
      type: "paragraph" as const,
      layout: {
        x: Number(linha.x.toFixed(2)),
        y: Number(linha.y.toFixed(2)),
        w: Number(linha.w.toFixed(2)),
        h: Number(linha.h.toFixed(2)),
        frameId: `pdf-pagina-${numero}`,
      },
      data: {
        html: escapeHtml(linha.str),
        pdfText: true,
        pdfPage: numero,
        pdfRegion: [linha.x, linha.y, linha.w, linha.h].map((v) => v.toFixed(1)).join(","),
        fontSize: Number(linha.size.toFixed(2)),
        fontName: linha.font,
        edited: false,
      },
    }));

    const nomeArquivo = `pagina_${String(numero).padStart(3, "0")}.png`;
    const png = paginasRenderizadas.find((p: any) => p.pageNumber === numero);
    if (png?.content) {
      await fsp.writeFile(path.join(assetsDir, nomeArquivo), png.content);
      assets.push({
        id: randomUUID(),
        fileName: nomeArquivo,
        path: `assets/${nomeArquivo}`,
        mimeType: "image/png",
        altText: `Página ${numero} do PDF original (fundo de referência)`,
      });
    }

    pages.push({
      id: randomUUID(),
      pageNumber: numero,
      title: linhas[0]?.str?.slice(0, 60) || `Página ${numero}`,
      width: Number(largura.toFixed(2)),
      height: Number(altura.toFixed(2)),
      backgroundImage: png?.content ? `assets/${nomeArquivo}` : undefined,
      blocks,
    });
  }

  return { pages, assets };
}
