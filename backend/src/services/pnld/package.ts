/**
 * Geração do pacote PNLD (Anexo 03, seção 5): pastas content/resources,
 * capa, content.opf e toc.ncx. Mantido fora de converterService.ts para
 * manter o gerador de HTML enxuto — ver docs/ARCHITECTURE.md.
 */

import fs from "node:fs/promises";
import path from "node:path";

import type { ProjectDocument, ProjectPage } from "../converterService.js";
import { escapeAttr, pageBookRole, pageBreakHtml, titleBookRole } from "./semantics.js";

const MAX_SEGMENT_BYTES = 500 * 1024;

type Segment = {
  id: string;
  title: string;
  file: string;
  pages: Array<{ page: ProjectPage; index: number; html: string }>;
};

function slugSegment(value: string): string {
  return String(value || "segmento")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "segmento";
}

function isPreTextual(role?: string): boolean {
  return ["capa", "segunda-capa", "terceira-capa", "quarta-capa", "sumario", "apresentacao", "ficha-catalografica", "creditos", "lista-ods", "lista-urls"].includes(role || "");
}

function segmentKey(page: ProjectPage): string {
  if (isPreTextual(page.role)) return `pre:${page.role || "pre-textual"}`;
  if (page.role === "subcapa") return `unit:${page.id}`;
  return page.segmentId ? `seg:${page.segmentId}` : "body:principal";
}

function segmentTitle(page: ProjectPage): string {
  if (page.role === "subcapa") return page.title || "Unidade";
  if (isPreTextual(page.role)) return page.title || "Pré-textuais";
  return page.segmentTitle || "Conteúdo";
}

export function buildSegments(doc: ProjectDocument, rendered: string[]): Segment[] {
  const segments: Segment[] = [];
  let current: Segment | null = null;
  let currentKey = "";
  let seq = 0;
  const pushCurrent = () => { if (current && current.pages.length) segments.push(current); };
  for (let i = 0; i < doc.pages.length; i++) {
    const page = doc.pages[i];
    const html = rendered[i] || "";
    const key = segmentKey(page);
    const startsNew = !current || key !== currentKey || (page.role === "subcapa" && current.pages.length > 0);
    const tentativeSize = Buffer.byteLength((current?.pages || []).map((p) => p.html).join("") + html, "utf8");
    const splitBySize: boolean = Boolean(current && !startsNew && tentativeSize > MAX_SEGMENT_BYTES);
    if (startsNew || splitBySize) {
      pushCurrent();
      seq += 1;
      const base: string = splitBySize ? (current?.title || segmentTitle(page)) : segmentTitle(page);
      const name = `${String(seq).padStart(2, "0")}-${slugSegment(base)}.html`;
      current = { id: `seg-${seq}`, title: base, file: `content/${name}`, pages: [] };
      currentKey = splitBySize ? `${key}:part:${seq}` : key;
    }
    current!.pages.push({ page, index: i, html });
  }
  pushCurrent();
  if (segments.length === 0) {
    segments.push({ id: "seg-1", title: doc.title || "Conteúdo", file: "content/segmento-01.html", pages: [] });
  }
  return segments;
}

const xml = (value: unknown): string =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

/** Cria a estrutura de diretórios exigida pelo item 5.1/5.4. */
export async function ensurePackageDirs(projectDir: string): Promise<void> {
  const dirs = [
    "content",
    "resources/audios",
    "resources/fonts",
    "resources/images",
    // Item 5.10: ODs ficam na RAIZ, cada um com content/ e resources/ próprios.
    "interactivities",
    "resources/scripts",
    "resources/styles",
    "resources/videos",
  ];
  await Promise.all(dirs.map((d) => fs.mkdir(path.join(projectDir, d), { recursive: true })));
}

/**
 * Capa JPEG vertical 1600×2560 (item 5.5). Gerada a partir do título da obra;
 * a editora pode substituir por arte própria mantendo as dimensões.
 */
export async function writeCover(projectDir: string, doc: ProjectDocument): Promise<void> {
  const width = 1600;
  const height = 2560;
  // Carregamento sob demanda: um módulo nativo ausente não pode impedir a
  // inicialização da API inteira; a falha aparece só ao gerar a capa.
  let createCanvas: (w: number, h: number) => import("@napi-rs/canvas").Canvas;
  try {
    ({ createCanvas } = await import("@napi-rs/canvas"));
  } catch (erro) {
    throw new Error(
      "Não foi possível carregar @napi-rs/canvas para gerar cover.jpg. " +
        "Rode `npm install` no backend e reinicie o servidor. " +
        (erro instanceof Error ? erro.message : String(erro)),
    );
  }
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#d42731";
  ctx.fillRect(0, 0, width, 28);

  ctx.fillStyle = "#1e293b";
  ctx.textAlign = "center";
  ctx.font = "bold 120px sans-serif";
  const words = String(doc.title || "Livro Digital").split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width > width - 160 && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  const startY = height / 2 - (lines.length - 1) * 75;
  lines.forEach((line, i) => ctx.fillText(line, width / 2, startY + i * 150));

  ctx.fillStyle = "#64748b";
  ctx.font = "52px sans-serif";
  ctx.fillText(doc.publisher || "SESI", width / 2, height - 220);

  await fs.writeFile(path.join(projectDir, "cover.jpg"), canvas.toBuffer("image/jpeg", 92));
}

/** Copia os assets do projeto para resources/images (item 5.4). */
export async function copyAssets(projectDir: string, doc: ProjectDocument): Promise<string[]> {
  const names: string[] = [];
  for (const asset of doc.assets || []) {
    const source = path.join(projectDir, asset.path);
    const target = path.join(projectDir, "resources", "images", path.basename(asset.path));
    try {
      await fs.copyFile(source, target);
      names.push(`resources/images/${path.basename(asset.path)}`);
    } catch {
      // Asset ausente no disco: não entra no manifest.
    }
  }
  return names;
}

/**
 * Garante que as fontes estejam em resources/fonts e registra o modelo de
 * documentação de direitos de uso exigido pelo item 4.3.8.2.
 */
export async function ensureFonts(projectDir: string, doc: ProjectDocument): Promise<void> {
  const fontsDir = path.join(projectDir, "resources", "fonts");
  await fs.mkdir(fontsDir, { recursive: true });
  const rows: string[] = [];
  for (const font of doc.fonts || []) {
    const fileName = path.basename(font.url);
    const target = path.join(fontsDir, fileName);
    try {
      await fs.access(target);
    } catch {
      for (const candidate of [path.join(projectDir, font.url), path.join(projectDir, "assets", fileName)]) {
        try {
          await fs.copyFile(candidate, target);
          break;
        } catch {
          // Sem arquivo: a editora deve incluir a fonte no pacote.
        }
      }
    }
    rows.push(`| ${font.family} | ${fileName} | (preencher licença) |`);
  }
  const content = `# Fontes incluídas\n\n> Anexo 03, item 4.3.8.2 — fontes que não sejam de uso livre ou aberto\n> exigem documento que comprove os direitos de uso no momento da inscrição.\n\n| Família | Arquivo | Direitos de uso |\n|---|---|---|\n${rows.join("\n") || "| — | — | — |"}\n`;
  await fs.writeFile(path.join(fontsDir, "FONT-LICENSES.md"), content, "utf8");
}

/** Arquivo HTML por segmento lógico (W04), com um <h2> único. */
export function buildSegmentFileHtml(doc: ProjectDocument, segment: Segment, nav?: { prev?: Segment; next?: Segment }): string {
  const locale = xml(doc.locale || "pt-BR");
  const title = xml(segment.title || doc.title || "Conteúdo");
  const body = segment.pages
    .map(({ page, index, html }) => {
      const role = pageBookRole(page.role);
      const bookAttr = role ? ` data-book="${role}"` : "";
      const anchor = `page-${escapeAttr(page.id)}`;
      return `<section id="${anchor}" class="book-page role-${escapeAttr(page.role || "conteudo")}"${bookAttr} data-page-number="${page.pageNumber}" data-page-index="${index}">
      ${pageBreakHtml({
        number: page.pageNumber,
        label: page.pageLabel,
        spelled: page.pageLabelSpelled,
        isProfessor: page.isProfessorPage,
        isEmpty: page.isEmpty,
      })}
      <h3 class="page-title" id="title-${escapeAttr(page.id)}">${xml(page.title || `Página ${page.pageNumber}`)}</h3>
      ${html}
    </section>`;
    })
    .join("\n");

  const segmentNav = `<nav class="segment-nav" aria-label="Navegação entre segmentos">
      ${nav?.prev ? `<a class="segment-prev" href="${escapeAttr(path.basename(nav.prev.file))}">Segmento anterior: ${xml(nav.prev.title)}</a>` : `<span></span>`}
      <a class="segment-index" href="../index.html">Sumário</a>
      ${nav?.next ? `<a class="segment-next" href="${escapeAttr(path.basename(nav.next.file))}">Próximo segmento: ${xml(nav.next.title)}</a>` : `<span></span>`}
    </nav>`;

  return `<!DOCTYPE html>
<html lang="${locale}" data-theme="${escapeAttr(doc.theme?.mode || "light")}">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${title}</title>
  <meta name="description" content="${xml(doc.description || doc.title || "")}"/>
  <meta name="robots" content="noindex, nofollow"/>
  <link rel="stylesheet" href="../resources/styles/styles.css"/>
</head>
<body lang="${locale}">
  <main id="segment-${escapeAttr(segment.id)}" data-segment-id="${escapeAttr(segment.id)}">
    <h2 data-book="titulo-unidade">${title}</h2>
    ${body}
    ${segmentNav}
  </main>
  <script src="../resources/scripts/script.js"></script>
</body>
</html>`;
}

export function buildPageFileHtml(
  doc: ProjectDocument,
  page: ProjectPage,
  index: number,
  renderedBlocks: string[],
): string {
  const segment = buildSegments(doc, [renderedBlocks.join("\n")])[0];
  segment.title = page.title || `Página ${page.pageNumber}`;
  segment.file = `content/pagina_${String(index + 1).padStart(3, "0")}.html`;
  segment.pages = [{ page, index, html: renderedBlocks.map((b) => `<div class="block-od">${b}</div>`).join("\n") }];
  return buildSegmentFileHtml(doc, segment);
}

/** content.opf com metadados obrigatórios e manifesto completo (item 5.7). */
export function buildContentOpf(
  doc: ProjectDocument,
  options: { images: string[]; pageFiles?: string[]; segments?: Segment[] },
): string {
  const identifier = `urn:uuid:${doc.id}`;
  const language = xml(doc.locale || "pt-BR");
  const modified = xml(new Date(doc.updatedAt || Date.now()).toISOString());
  const pageFiles = options.segments?.map((s) => s.file) || options.pageFiles || [];
  const manifestItems = [
    `<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>`,
    `<item id="index" href="index.html" media-type="application/xhtml+xml"/>`,
    `<item id="cover" href="cover.jpg" media-type="image/jpeg" properties="cover-image"/>`,
    ...pageFiles.map(
      (file, i) => `<item id="seg-${i}" href="${xml(file)}" media-type="application/xhtml+xml"/>`,
    ),
    `<item id="styles" href="resources/styles/styles.css" media-type="text/css"/>`,
    `<item id="script" href="resources/scripts/script.js" media-type="text/javascript"/>`,
    ...options.images.map(
      (file, i) => `<item id="img-${i}" href="${xml(file)}" media-type="image/jpeg"/>`,
    ),
    ...(doc.fonts || []).map(
      (font, i) => `<item id="font-${i}" href="${xml(font.url)}" media-type="font/woff2"/>`,
    ),
  ].join("\n    ");
  const spine = pageFiles.map((_, i) => `<itemref idref="seg-${i}"/>`).join("\n    ");

  return `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid" xml:lang="${language}">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>${xml(doc.title)}</dc:title>
    <dc:language>${language}</dc:language>
    <dc:publisher>${xml(doc.publisher || "SESI")}</dc:publisher>
    <dc:date>${xml((doc.createdAt || "").slice(0, 10))}</dc:date>
    <dc:creator>${xml(doc.author || "SESI")}</dc:creator>
    <dc:description>${xml(doc.description || doc.title || "")}</dc:description>
    <dc:identifier id="bookid">${identifier}</dc:identifier>
    <meta property="schema:accessibilityFeature">structuredNavigation</meta>
    <meta property="schema:accessibilityFeature">alternativeText</meta>
    <meta property="schema:accessibilityHazard">none</meta>
    <meta property="schema:accessibilitySummary">Obra navegável por teclado e leitores de tela, com paginação e sumário semânticos.</meta>
    <meta property="dcterms:modified">${modified}</meta>
  </metadata>
  <manifest>
    ${manifestItems}
  </manifest>
  <spine toc="ncx">
    ${spine}
  </spine>
</package>`;
}

/** toc.ncx com a mesma ordem do spine (itens 5.6 e 4.3.4). */
export function buildTocNcx(doc: ProjectDocument, pageFilesOrSegments: string[] | Segment[]): string {
  const segments: Array<{ file: string; label: string }> =
    Array.isArray(pageFilesOrSegments) && pageFilesOrSegments[0] && typeof pageFilesOrSegments[0] !== "string"
      ? (pageFilesOrSegments as Segment[]).flatMap((seg, si) => {
          const base = seg.title || `Segmento ${si + 1}`;
          if (!seg.pages.length) return [{ file: seg.file, label: base }];
          return seg.pages.map((p) => ({
            file: `${seg.file}#page-${p.page.id}`,
            label: `página ${p.page.pageNumber} — ${p.page.title || base}`.trim(),
          }));
        })
      : (pageFilesOrSegments as string[]).map((file, i) => {
          const page = doc.pages[i];
          return { file, label: `página ${page?.pageNumber ?? i + 1} — ${page?.title || ""}`.trim() };
        });
  const points = segments
    .map((seg, i) => `<navPoint id="np-${i + 1}" playOrder="${i + 1}">
      <navLabel><text>${xml(seg.label)}</text></navLabel>
      <content src="${xml(seg.file)}"/>
    </navPoint>`)
    .join("\n    ");
  return `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1" xml:lang="${xml(doc.locale || "pt-BR")}">
  <head>
    <meta name="dtb:uid" content="urn:uuid:${xml(doc.id)}"/>
    <meta name="dtb:depth" content="1"/>
  </head>
  <docTitle><text>${xml(doc.title)}</text></docTitle>
  <navMap>
    ${points}
  </navMap>
</ncx>`;
}
