import AdmZip from "adm-zip";
import { XMLParser } from "fast-xml-parser";
import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { renderVectorToPng } from "../render/vectorRender.js";
import type { Block, BlockLayout, ProjectAsset, ProjectPage } from "../converterService.js";

/**
 * Importador de IDML (InDesign Markup Language).
 *
 * Diferente do extrator antigo (que agrupava parágrafos em páginas artificiais),
 * este importador respeita a geometria real do arquivo:
 *  - 1 <Page> do InDesign = 1 página do projeto;
 *  - cada moldura (TextFrame, Rectangle com <Image>, Group) é posicionada pela
 *    sua ItemTransform + PathGeometry, então a ordem de leitura e a posição
 *    original são preservadas;
 *  - links .ai (vetores com compatibilidade PDF) são rasterizados para PNG;
 *  - ícones de interação (vídeo, podcast, link, lupa) viram blocos interativos.
 */

const XML_OPTS = {
  ignoreAttributes: false,
  attributeNamePrefix: "",
  preserveOrder: true,
  trimValues: false,
  parseTagValue: false,
  parseAttributeValue: false,
  allowBooleanAttributes: true,
  processEntities: true,
} as const;

const xml = new XMLParser(XML_OPTS);

type Matrix = [number, number, number, number, number, number];

interface Bounds {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface PageRect extends Bounds {
  self: string;
  name: string;
}

interface PageItem {
  tag: string;
  self: string;
  story?: string;
  link?: string;
  bounds: Bounds;
}

type ParagraphRole = "body" | "heading2" | "heading3" | "caption" | "credit" | "alt" | "skip";

interface StoryParagraph {
  html: string;
  text: string;
  styleKey: string;
  role: ParagraphRole;
}

/* -------------------------------------------------------------------------- */
/* Helpers de XML (preserveOrder)                                              */
/* -------------------------------------------------------------------------- */

function tagOf(node: any): string | null {
  for (const key of Object.keys(node || {})) {
    if (key !== ":@" && key !== "#text") return key;
  }
  return null;
}

function attrsOf(node: any): Record<string, string> {
  return node?.[":@"] || {};
}

function kidsOf(node: any): any[] {
  const tag = tagOf(node);
  if (!tag) return [];
  const value = node[tag];
  return Array.isArray(value) ? value : [];
}

function textOf(node: any): string {
  if (typeof node?.["#text"] === "string") return node["#text"];
  const tag = tagOf(node);
  if (!tag) return "";
  const children = node[tag];
  if (!Array.isArray(children)) return typeof children === "string" ? children : "";
  return children.map((child: any) => textOf(child)).join("");
}

const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];

function parseMatrix(raw?: string | null): Matrix {
  if (!raw) return IDENTITY;
  const parts = raw.trim().split(/\s+/).map(Number);
  if (parts.length !== 6 || parts.some((n) => Number.isNaN(n))) return IDENTITY;
  return parts as Matrix;
}

/** outer ∘ inner: aplica `inner` e depois `outer`. */
function multiply(outer: Matrix, inner: Matrix): Matrix {
  const [a1, b1, c1, d1, e1, f1] = outer;
  const [a2, b2, c2, d2, e2, f2] = inner;
  return [
    a1 * a2 + c1 * b2,
    b1 * a2 + d1 * b2,
    a1 * c2 + c1 * d2,
    b1 * c2 + d1 * d2,
    a1 * e2 + c1 * f2 + e1,
    b1 * e2 + d1 * f2 + f1,
  ];
}

function applyMatrix(m: Matrix, x: number, y: number): [number, number] {
  const [a, b, c, d, e, f] = m;
  return [a * x + c * y + e, b * x + d * y + f];
}

function mergeBounds(all: Bounds[], m: Matrix): Bounds | null {
  if (all.length === 0) return null;
  let x1 = Infinity;
  let y1 = Infinity;
  let x2 = -Infinity;
  let y2 = -Infinity;
  for (const b of all) {
    for (const [px, py] of [
      [b.x1, b.y1],
      [b.x2, b.y1],
      [b.x1, b.y2],
      [b.x2, b.y2],
    ]) {
      const [tx, ty] = applyMatrix(m, px, py);
      x1 = Math.min(x1, tx);
      y1 = Math.min(y1, ty);
      x2 = Math.max(x2, tx);
      y2 = Math.max(y2, ty);
    }
  }
  return { x1, y1, x2, y2 };
}

/** Âncoras do PathGeometry do item (ignora geometria de filhos/items aninhados). */
function pathAnchors(node: any, out: Bounds[] = [], depth = 0): Bounds[] {
  if (depth > 12) return out;
  for (const child of kidsOf(node)) {
    const tag = tagOf(child);
    if (!tag) continue;
    if (tag === "PathGeometry") {
      for (const point of collectTag(child, "PathPointType")) {
        const raw = attrsOf(point).Anchor;
        if (!raw) continue;
        const [px, py] = raw.trim().split(/\s+/).map(Number);
        if (Number.isNaN(px) || Number.isNaN(py)) continue;
        out.push({ x1: px, y1: py, x2: px, y2: py });
      }
      continue;
    }
    if (["TextFrame", "Rectangle", "Oval", "Polygon", "Group", "Image"].includes(tag)) continue;
    pathAnchors(child, out, depth + 1);
  }
  return out;
}

function collectTag(node: any, tagName: string, out: any[] = [], depth = 0): any[] {
  if (depth > 12) return out;
  const tag = tagOf(node);
  if (tag === tagName) {
    out.push(node);
    return out;
  }
  for (const child of kidsOf(node)) collectTag(child, tagName, out, depth + 1);
  return out;
}

/** Primeiro link de mídia (LinkResourceURI) dentro da moldura. */
function findImageLink(node: any): string | undefined {
  const links: string[] = [];
  const collect = (current: any, depth = 0) => {
    if (depth > 8) return;
    for (const child of kidsOf(current)) {
      const tag = tagOf(child);
      if (!tag) continue;
      if (tag === "Group") continue;
      if (tag === "Link") {
        const uri = attrsOf(child).LinkResourceURI;
        if (uri && uri !== "$ID/") links.push(uri);
        continue;
      }
      if (tag === "Image") {
        const uri = attrsOf(child).LinkResourceURI;
        if (uri && uri !== "$ID/") links.push(uri);
      }
      collect(child, depth + 1);
    }
  };
  collect(node);
  return links.find((uri) => !/^cclibraries:/i.test(uri)) ?? links[0];
}

/* -------------------------------------------------------------------------- */
/* Estilos                                                                     */
/* -------------------------------------------------------------------------- */

function styleKeyOf(appliedStyle?: string): string {
  if (!appliedStyle) return "";
  const tail = appliedStyle.split(/[\\/]/).pop() || appliedStyle;
  try {
    return decodeURIComponent(tail).toLowerCase();
  } catch {
    return tail.toLowerCase();
  }
}

function classifyParagraph(styleKey: string, text: string): ParagraphRole {
  const key = styleKey;
  if (/orientacao_arte|arte_orientacao|briefing/.test(key)) return "skip";
  if (/alt_text|alttext/.test(key)) return "alt";
  if (/img_credito|img_origem|credito/.test(key)) return "credit";
  if (/img_legenda|legenda/.test(key)) return "caption";
  if (/rodape|folio|numero_pagina/.test(key)) return "skip";
  if (/h00|titulo_abertura|titulo_capa|abertura/.test(key)) return "heading2";
  if (/h1|h4|h3|h2|vinheta|titulo_boxe|titulo_terceiros|titulo_secao|titulo/.test(key)) return "heading3";
  if (/icone|icon/.test(key)) return "skip";

  const trimmed = text.trim();
  if (trimmed.length >= 3 && trimmed.length <= 64 && trimmed === trimmed.toUpperCase() && /[A-ZÁÉÍÓÚÂÊÔÃÕÇ]/.test(trimmed)) {
    if (!/[.;]$/.test(trimmed)) return "heading3";
  }
  return "body";
}

/* -------------------------------------------------------------------------- */
/* Stories → parágrafos                                                        */
/* -------------------------------------------------------------------------- */

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

interface InlineResult {
  text: string;
  html: string;
}

function renderInline(nodes: any[], depth = 0): InlineResult {
  let text = "";
  let html = "";
  for (const node of nodes) {
    const tag = tagOf(node);
    if (!tag || tag === "#text") continue;

    if (tag === "Content") {
      const value = textOf(node);
      text += value;
      html += escapeHtml(value);
      continue;
    }
    if (tag === "Br") {
      text += "\n";
      html += "<br/>";
      continue;
    }
    if (tag === "CharacterStyleRange") {
      const a = attrsOf(node);
      const bold =
        /bold|black|semibold|heavy/i.test(a.FontStyle || "") ||
        /negrito|bold|peso/i.test(styleKeyOf(a.AppliedCharacterStyle));
      const italic =
        /italic|oblique/i.test(a.FontStyle || "") || /italico|italic/i.test(styleKeyOf(a.AppliedCharacterStyle));
      const inner = renderInline(kidsOf(node), depth + 1);
      text += inner.text;
      html += bold ? `<strong>${inner.html}</strong>` : italic ? `<em>${inner.html}</em>` : inner.html;
      continue;
    }
    if (tag === "Table") continue;
    if (depth > 6) continue;
    const inner = renderInline(kidsOf(node), depth + 1);
    text += inner.text;
    html += inner.html;
  }
  return { text, html };
}

function parseStoryXML(storyXml: string): StoryParagraph[] {
  const doc = xml.parse(storyXml);
  const paragraphs: any[] = [];
  const walk = (nodes: any[], depth = 0) => {
    if (depth > 8) return;
    for (const node of nodes) {
      const tag = tagOf(node);
      if (!tag) continue;
      if (tag === "ParagraphStyleRange") {
        paragraphs.push(node);
        continue;
      }
      walk(kidsOf(node), depth + 1);
    }
  };
  walk(doc);

  const result: StoryParagraph[] = [];
  for (const p of paragraphs) {
    const styleKey = styleKeyOf(attrsOf(p).AppliedParagraphStyle);
    const inline = renderInline(kidsOf(p));
    const text = inline.text
      .replace(/<\?ACE\s*\d+\?>/g, "\u0000")
      .replace(/[\u0000]+/g, "")
      .replace(/[ \t]+/g, " ")
      .trim();
    if (!text) continue;
    const role = classifyParagraph(styleKey, text);
    if (role === "skip") continue;
    result.push({
      text,
      html: inline.html.replace(/<\?ACE\s*\d+\?>/g, "").trim(),
      styleKey,
      role,
    });
  }
  return result;
}

/* -------------------------------------------------------------------------- */
/* Leitura de páginas e itens                                                  */
/* -------------------------------------------------------------------------- */

function readPages(spreadXml: string): PageRect[] {
  const doc = xml.parse(spreadXml);
  const pages: PageRect[] = [];
  const walk = (nodes: any[], depth = 0) => {
    if (depth > 6) return;
    for (const node of nodes) {
      const tag = tagOf(node);
      if (!tag || tag === "#text") continue;
      if (tag === "Page") {
        const a = attrsOf(node);
        const gb = (a.GeometricBounds || "").trim().split(/\s+/).map(Number);
        if (gb.length === 4 && gb.every((n) => !Number.isNaN(n))) {
          const corners = mergeBounds([{ x1: gb[1], y1: gb[0], x2: gb[3], y2: gb[2] }], parseMatrix(a.ItemTransform));
          if (corners) {
            pages.push({ ...corners, self: a.Self || "", name: a.Name || "" });
          }
        }
        continue;
      }
      walk(kidsOf(node), depth + 1);
    }
  };
  walk(doc);
  return pages;
}

const FRAME_TAGS = new Set(["TextFrame", "Rectangle", "Oval", "Polygon", "GraphicLine", "Button", "FormField", "EPS", "PDF", "Movie", "Sound", "Group"]);

function readItems(spreadXml: string): PageItem[] {
  const doc = xml.parse(spreadXml);
  const items: PageItem[] = [];

  const walk = (nodes: any[], matrix: Matrix, depth = 0) => {
    if (depth > 10) return;
    for (const node of nodes) {
      const tag = tagOf(node);
      if (!tag || tag === "#text") continue;
      if (tag === "Page") continue;

      if (!FRAME_TAGS.has(tag)) {
        // Contêineres genéricos (idPkg:Spread, Spread, ...): desce mantendo a matriz.
        walk(kidsOf(node), matrix, depth + 1);
        continue;
      }

      const a = attrsOf(node);
      const local = multiply(matrix, parseMatrix(a.ItemTransform));

      if (tag === "Group") {
        walk(kidsOf(node), local, depth + 1);
        continue;
      }

      const anchors = pathAnchors(node);
      const bounds = anchors.length > 0 ? mergeBounds(anchors, local) : null;
      if (!bounds) continue;

      items.push({
        tag,
        self: a.Self || "",
        story: a.ParentStory && a.ParentStory !== "n" ? a.ParentStory : undefined,
        link: findImageLink(node),
        bounds,
      });
    }
  };

  walk(doc, IDENTITY);
  return items;
}

/* -------------------------------------------------------------------------- */
/* Resolução de mídias                                                         */
/* -------------------------------------------------------------------------- */

const RASTER = /\.(jpe?g|png|gif|svg|webp)$/i;
const VECTOR = /\.(ai|pdf)$/i;

function slugFileName(name: string): string {
  const ext = path.extname(name);
  const base = path.basename(name, ext);
  const slug = base
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
  return `${slug || "midia"}${ext.toLowerCase()}`;
}

function searchDirs(filePath: string): string[] {
  const fileDir = path.dirname(filePath);
  return [
    fileDir,
    path.join(fileDir, "Links"),
    path.join(fileDir, "..", "Links"),
    path.join(fileDir, "..", "..", "Links"),
    process.env.INTERATIVO_LINKS_DIR || "",
    path.join(process.cwd(), "data", "links"),
    path.join(process.cwd(), "exemplos"),
    path.join(process.cwd(), "exemplos", "Links"),
  ].filter(Boolean);
}

interface MediaResolver {
  resolve(cleanName: string): Promise<string | null>;
  known: Set<string>;
}

function createResolver(filePath: string, assetsDir: string): MediaResolver {
  const dirs = searchDirs(filePath);
  const cache = new Map<string, string | null>();
  const known = new Set<string>();
  let index = 1;

  async function findFile(cleanName: string): Promise<string | null> {
    for (const dir of dirs) {
      const candidate = path.join(dir, cleanName);
      try {
        const stat = await fs.stat(candidate);
        if (stat.isFile() && stat.size > 0 && stat.size <= 40 * 1024 * 1024) return candidate;
      } catch {
        /* não existe nesse diretório */
      }
    }
    return null;
  }

  return {
    known,
    async resolve(cleanName: string): Promise<string | null> {
      if (cache.has(cleanName)) return cache.get(cleanName)!;

      const source = await findFile(cleanName);
      if (!source) {
        cache.set(cleanName, null);
        return null;
      }

      try {
        if (RASTER.test(cleanName)) {
          const target = `img_${index++}_${slugFileName(cleanName)}`;
          await fs.copyFile(source, path.join(assetsDir, target));
          cache.set(cleanName, `assets/${target}`);
          known.add(cleanName);
          return `assets/${target}`;
        }

        if (VECTOR.test(cleanName)) {
          const png = await renderVectorToPng(source);
          if (!png) {
            cache.set(cleanName, null);
            return null;
          }
          const target = `img_${index++}_${slugFileName(path.basename(cleanName, path.extname(cleanName)) + ".png")}`;
          await fs.writeFile(path.join(assetsDir, target), png);
          cache.set(cleanName, `assets/${target}`);
          known.add(cleanName);
          return `assets/${target}`;
        }
      } catch {
        /* segue para o placeholder */
      }

      cache.set(cleanName, null);
      return null;
    },
  };
}

function cleanLinkName(rawUri: string): string {
  if (!rawUri) return "";
  try {
    return path.basename(decodeURIComponent(rawUri));
  } catch {
    return path.basename(rawUri);
  }
}

type InteractionKind = "video" | "audio" | "link" | "zoom" | "activity" | null;

function detectInteraction(cleanName: string): InteractionKind {
  const n = cleanName.toLowerCase();
  if (/video|filme|movie/.test(n)) return "video";
  if (/podcast|audio|som_|_som|musica/.test(n)) return "audio";
  if (/link|clique|clicavel|hiperlink/.test(n)) return "link";
  if (/lupa|zoom/.test(n)) return "zoom";
  if (/jogar|game|quiz|atividade/.test(n)) return "activity";
  return null;
}

/* -------------------------------------------------------------------------- */
/* Ordenação de leitura                                                        */
/* -------------------------------------------------------------------------- */

function sortReadingOrder(items: PageItem[]): PageItem[] {
  const sorted = [...items].sort((a, b) => a.bounds.y1 - b.bounds.y1 || a.bounds.x1 - b.bounds.x1);
  const rows: PageItem[][] = [];
  for (const item of sorted) {
    const row = rows[rows.length - 1];
    if (row && Math.abs(item.bounds.y1 - row[0].bounds.y1) < 24) {
      row.push(item);
    } else {
      rows.push([item]);
    }
  }
  return rows.flatMap((row) => row.sort((a, b) => a.bounds.x1 - b.bounds.x1));
}

/* -------------------------------------------------------------------------- */
/* Importação                                                                  */
/* -------------------------------------------------------------------------- */

export interface IdmlImportResult {
  pages: ProjectPage[];
  assets: ProjectAsset[];
}

const DEBUG = process.env.INTERATIVO_DEBUG_IDML === "1";

export async function importIdml(filePath: string, assetsDir: string): Promise<IdmlImportResult> {
  const zip = new AdmZip(filePath);
  const entryMap = new Map<string, string>();
  for (const entry of zip.getEntries()) {
    if (!entry.isDirectory) entryMap.set(entry.entryName, entry.entryName);
  }

  const readText = (name: string): string | null => {
    const entry = zip.getEntry(name);
    return entry ? entry.getData().toString("utf8") : null;
  };

  // Ordem real dos spreads/capítulos vem do designmap.
  const designMap = readText("designmap.xml") || "";
  const spreadSrcs = Array.from(designMap.matchAll(/<idPkg:Spread[^>]*\bsrc="([^"]+)"/g)).map((m) => m[1]);
  if (spreadSrcs.length === 0) {
    for (const name of entryMap.keys()) {
      if (/^Spreads\/Spread_.*\.xml$/i.test(name)) spreadSrcs.push(name);
    }
    spreadSrcs.sort();
  }

  // Stories disponíveis no pacote.
  const storyIds = new Set<string>();
  for (const name of entryMap.keys()) {
    const match = name.match(/^Stories\/Story_(.+)\.xml$/i);
    if (match) storyIds.add(match[1]);
  }

  const resolver = createResolver(filePath, assetsDir);
  const assets: ProjectAsset[] = [];
  const assetPaths = new Set<string>();
  const usedStories = new Set<string>();
  const pages: ProjectPage[] = [];

  const pushAsset = (asset: ProjectAsset) => {
    if (assetPaths.has(asset.path)) return;
    assetPaths.add(asset.path);
    assets.push(asset);
  };

  let pageNumber = 0;

  for (const src of spreadSrcs) {
    const spreadXml = readText(src);
    if (!spreadXml) continue;

    const pageRects = readPages(spreadXml);
    const items = readItems(spreadXml);
    if (pageRects.length === 0) continue;

    // Agrupa itens por página real (centro dentro da página).
    const perPage = new Map<string, PageItem[]>();
    for (const rect of pageRects) perPage.set(rect.self, []);

    for (const item of items) {
      const cx = (item.bounds.x1 + item.bounds.x2) / 2;
      const cy = (item.bounds.y1 + item.bounds.y2) / 2;
      const page =
        pageRects.find((p) => cx >= p.x1 - 2 && cx <= p.x2 + 2 && cy >= p.y1 - 2 && cy <= p.y2 + 2) ??
        pageRects
          .map((p) => ({ p, area: overlapArea(p, item.bounds) }))
          .sort((a, b) => b.area - a.area)[0]?.p;
      if (!page) continue;
      perPage.get(page.self)!.push(item);
    }

    for (const rect of pageRects) {
      pageNumber += 1;
      const pageItems = sortReadingOrder(perPage.get(rect.self) || []);
      const width = rect.x2 - rect.x1;
      const height = rect.y2 - rect.y1;
      const blocks: Block[] = [];
      const pendingAlt: string[] = [];
      const pendingCaption: string[] = [];
      const dbg = DEBUG ? { items: pageItems.length, text: 0, images: 0, skippedStories: 0, missingLinks: 0 } : null;

      for (const item of pageItems) {
        const local = (b: Bounds): BlockLayout => ({
          x: round(b.x1 - rect.x1),
          y: round(b.y1 - rect.y1),
          w: round(Math.max(1, b.x2 - b.x1)),
          h: round(Math.max(1, b.y2 - b.y1)),
        });

        if (item.story && storyIds.has(item.story)) {
          if (usedStories.has(item.story)) {
            if (dbg) dbg.skippedStories += 1;
            continue;
          }
          const storyXml = readText(`Stories/Story_${item.story}.xml`);
          if (!storyXml) continue;
          usedStories.add(item.story);

          const paragraphs = parseStoryXML(storyXml);
          let firstBlock = true;
          for (const para of paragraphs) {
            if (para.role === "alt") {
              pendingAlt.push(para.text);
              continue;
            }
            if (para.role === "caption" || para.role === "credit") {
              const lastImage = [...blocks].reverse().find((b) => b.type === "image");
              if (lastImage && lastImage.type === "image") {
                lastImage.data.caption = lastImage.data.caption
                  ? `${lastImage.data.caption} — ${para.text}`
                  : para.text;
                continue;
              }
              pendingCaption.push(para.text);
              continue;
            }

            const text = para.text.replace(/\u0000/g, String(pageNumber));
            const html = para.html.replace(/\u0000/g, String(pageNumber));

            if (para.role === "heading2" || para.role === "heading3") {
              blocks.push({
                id: randomUUID(),
                type: "heading",
                data: { level: para.role === "heading2" ? 2 : 3, text },
                ...(firstBlock ? { layout: local(item.bounds) } : {}),
              } as Block);
            } else {
              blocks.push({
                id: randomUUID(),
                type: "paragraph",
                data: { html },
                ...(firstBlock ? { layout: local(item.bounds) } : {}),
              } as Block);
            }
            firstBlock = false;
          }
          continue;
        }

        if (item.link) {
          const cleanName = cleanLinkName(item.link);
          if (!cleanName) continue;
          const interaction = detectInteraction(cleanName);

          if (interaction && /\.(ai|png|svg|pdf)$/i.test(cleanName)) {
            const label = INTERACTION_LABEL[interaction];
            blocks.push({
              id: randomUUID(),
              type: "callout",
              data: {
                variant: interaction === "activity" ? "tip" : "info",
                title: label.title,
                contentHtml: `${label.description} <em>(${escapeHtml(cleanName)})</em>`,
              },
              layout: local(item.bounds),
            } as Block);
            continue;
          }

          const resolved = await resolver.resolve(cleanName);
          if (resolved) {
            if (dbg) dbg.images += 1;
            const alt = pendingAlt.shift();
            const caption = pendingCaption.shift();
            const isRaster = RASTER.test(cleanName);
            pushAsset({
              id: randomUUID(),
              fileName: cleanName,
              path: resolved,
              mimeType: isRaster ? (cleanName.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg") : "image/png",
              altText: alt || cleanName,
            });
            blocks.push({
              id: randomUUID(),
              type: "image",
              data: {
                src: resolved,
                alt: alt || cleanName,
                caption,
                enableZoom: true,
              },
              layout: local(item.bounds),
            } as Block);
          } else if (/\.(ai|pdf|psd|eps|indd)$/i.test(cleanName)) {
            if (dbg) dbg.missingLinks += 1;
            blocks.push({
              id: randomUUID(),
              type: "callout",
              data: {
                variant: "warning",
                title: "Arte vetorial não convertida",
                contentHtml: `O arquivo <strong>${escapeHtml(cleanName)}</strong> é um vetor que não pôde ser rasterizado automaticamente. Exporte-o como PNG no InDesign e converta novamente.`,
              },
              layout: local(item.bounds),
            } as Block);
          } else if (!/^cclibraries:/i.test(item.link)) {
            if (dbg) dbg.missingLinks += 1;
            // Referência sem arquivo disponível (ex.: links do Creative Cloud).
            pushAsset({
              id: randomUUID(),
              fileName: cleanName,
              path: `assets/${cleanName}`,
              mimeType: "image/placeholder",
              altText: cleanName,
            });
          }
        }
      }

      pages.push({
        id: randomUUID(),
        pageNumber,
        title: `Página ${pageNumber}`,
        width: round(width),
        height: round(height),
        blocks,
      } as ProjectPage);
      if (DEBUG && dbg) console.log(`[idml] página ${pageNumber}: ${JSON.stringify(dbg)}`);
    }
  }

  return { pages, assets };
}

const INTERACTION_LABEL: Record<Exclude<InteractionKind, null>, { title: string; description: string }> = {
  video: { title: "🎬 Vídeo", description: "Espaço reservado para um vídeo. Configure a URL no editor." },
  audio: { title: "🎧 Áudio / Podcast", description: "Espaço reservado para um podcast ou áudio." },
  link: { title: "🔗 Link externo", description: "Espaço reservado para um link clicável." },
  zoom: { title: "🔍 Imagem ampliável", description: "Espaço reservado para uma imagem com zoom." },
  activity: { title: "🎯 Atividade interativa", description: "Espaço reservado para uma atividade (quiz)." },
};

function overlapArea(a: Bounds, b: Bounds): number {
  const w = Math.min(a.x2, b.x2) - Math.max(a.x1, b.x1);
  const h = Math.min(a.y2, b.y2) - Math.max(a.y1, b.y1);
  if (w <= 0 || h <= 0) return 0;
  return w * h;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
