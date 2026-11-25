import AdmZip from "adm-zip";
import { XMLParser } from "fast-xml-parser";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { importIdml } from "./idml/importIdml.js";
import { renderProjxBlock, PROJX_CSS, PROJX_JS } from "./blocks/projxBlocks.js";
import { svgIcon, ICON_CSS } from "./blocks/icons.js";
import { buildExemploDocument, exemploAssets } from "./blocks/exemploDocument.js";

const DATA_DIR = path.join(process.cwd(), "data");
const PROJECTS_DIR = path.join(DATA_DIR, "projects");

export interface ProjectAsset {
  id: string;
  fileName: string;
  path: string; // ex: assets/img_0.jpg
  mimeType: string;
  altText: string;
}

export type BlockType =
  | "heading"
  | "paragraph"
  | "image"
  | "accordion"
  | "tabs"
  | "callout"
  | "video"
  | "quiz"
  | "external-embed"
  | "flipcard"
  | "timeline"
  | "table"
  | "cover"
  | "parallax"
  | "gallery"
  | "image-text-card"
  | "highlight"
  | "code"
  | "multiple-choice"
  | "true-false"
  | "fill-blanks"
  | "ordering"
  | "matching"
  | "memory-game"
  | "word-search"
  | "crossword";

/** Posição do bloco no original (pontos, relativo ao canto superior da página). */
export interface BlockLayout {
  x: number;
  y: number;
  w: number;
  h: number;
  frameId?: string;
  frameBg?: string;
}

export interface ProjectVersion {
  id: string;
  label: string;
  kind: "auto" | "manual" | "rollback";
  createdAt: string;
  pageCount: number;
  blockCount: number;
}

export interface BaseBlock {
  id: string;
  type: BlockType;
  layout?: BlockLayout;
}

export interface HeadingBlock extends BaseBlock {
  type: "heading";
  data: {
    level: 1 | 2 | 3;
    text: string;
  };
}

export interface ParagraphBlock extends BaseBlock {
  type: "paragraph";
  data: {
    html: string;
  };
}

export interface ImageHotspot {
  id: string;
  /** Posição/tamanho em % da imagem (0–100). */
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  contentHtml: string;
}

export interface ImageBlock extends BaseBlock {
  type: "image";
  data: {
    src: string;
    alt: string;
    caption?: string;
    enableZoom?: boolean;
    linkUrl?: string;
    /** Zonas de clique interativas: abrem modal com título + conteúdo. */
    hotspots?: ImageHotspot[];
    /** Referência do InDesign sem arquivo disponível (vinculável no editor). */
    missing?: boolean;
    fileName?: string;
  };
}

export interface AccordionBlock extends BaseBlock {
  type: "accordion";
  data: {
    title?: string;
    items: Array<{
      id: string;
      title: string;
      contentHtml: string;
      defaultOpen?: boolean;
    }>;
  };
}

export interface TabsBlock extends BaseBlock {
  type: "tabs";
  data: {
    items: Array<{
      id: string;
      label: string;
      contentHtml: string;
    }>;
  };
}

export interface CalloutBlock extends BaseBlock {
  type: "callout";
  data: {
    variant:
      | "info"
      | "tip"
      | "warning"
      | "curiosity"
      | "saiba-mais"
      | "importante"
      | "voce-sabia"
      | "dica"
      | "box-pdf"
      | "vamos-refletir"
      | "box";
    title?: string;
    contentHtml: string;
  };
}

export interface VideoBlock extends BaseBlock {
  type: "video";
  data: {
    source: "youtube" | "vimeo" | "local";
    url: string;
    title?: string;
    caption?: string;
  };
}

export interface QuizBlock extends BaseBlock {
  type: "quiz";
  data: {
    question: string;
    options: Array<{
      id: string;
      text: string;
      isCorrect: boolean;
      feedback?: string;
    }>;
    explanation?: string;
  };
}

export interface ExternalEmbedBlock extends BaseBlock {
  type: "external-embed";
  data: {
    embedUrl: string;
    title?: string;
  };
}

export interface FlipcardBlock extends BaseBlock {
  type: "flipcard";
  data: { title?: string; frontHtml: string; backHtml: string; image?: string; hint?: string };
}

export interface TimelineBlock extends BaseBlock {
  type: "timeline";
  data: { title?: string; items: Array<{ id: string; title: string; contentHtml: string; icon?: string }> };
}

export interface TableBlock extends BaseBlock {
  type: "table";
  data: { caption?: string; headers: string[]; rows: string[][]; striped?: boolean };
}

export interface CoverBlock extends BaseBlock {
  type: "cover";
  data: {
    title: string;
    subtitle?: string;
    image?: string;
    ctaLabel?: string;
    ctaHref?: string;
    align?: "left" | "center";
  };
}

export interface ParallaxBlock extends BaseBlock {
  type: "parallax";
  data: { image: string; title?: string; subtitle?: string; height?: number };
}

export interface GalleryBlock extends BaseBlock {
  type: "gallery";
  data: { items: Array<{ id: string; src: string; caption?: string }>; autoplay?: boolean };
}

export interface ImageTextCardBlock extends BaseBlock {
  type: "image-text-card";
  data: { image: string; title: string; html: string; layout?: "left" | "right" };
}

export interface HighlightBlock extends BaseBlock {
  type: "highlight";
  data: { title?: string; html: string; legend?: string };
}

export interface CodeBlock extends BaseBlock {
  type: "code";
  data: { code: string; language?: string; filename?: string };
}

export interface MultipleChoiceBlock extends BaseBlock {
  type: "multiple-choice";
  data: {
    question: string;
    options: Array<{ id: string; text: string }>;
    correctIds: string[];
    attempts?: number;
    explanation?: string;
  };
}

export interface TrueFalseBlock extends BaseBlock {
  type: "true-false";
  data: {
    question?: string;
    statements: Array<{ id: string; text: string; answer: boolean }>;
    attempts?: number;
    explanation?: string;
  };
}

export interface FillBlanksBlock extends BaseBlock {
  type: "fill-blanks";
  data: {
    question?: string;
    sentences: Array<{ id: string; text: string; answers: string[] }>;
    attempts?: number;
  };
}

export interface OrderingBlock extends BaseBlock {
  type: "ordering";
  data: { question?: string; items: Array<{ id: string; text: string }>; attempts?: number };
}

export interface MatchingBlock extends BaseBlock {
  type: "matching";
  data: { question?: string; pairs: Array<{ id: string; left: string; right: string }>; attempts?: number };
}

export interface MemoryGameBlock extends BaseBlock {
  type: "memory-game";
  data: { title?: string; pairs: Array<{ id: string; a: string; b: string }>; columns?: number };
}

export interface WordSearchBlock extends BaseBlock {
  type: "word-search";
  data: { title?: string; words: string[]; size?: number };
}

export interface CrosswordBlock extends BaseBlock {
  type: "crossword";
  data: { title?: string; entries: Array<{ id: string; answer: string; clue: string }> };
}

export type Block =
  | HeadingBlock
  | ParagraphBlock
  | ImageBlock
  | AccordionBlock
  | TabsBlock
  | CalloutBlock
  | VideoBlock
  | QuizBlock
  | ExternalEmbedBlock
  | FlipcardBlock
  | TimelineBlock
  | TableBlock
  | CoverBlock
  | ParallaxBlock
  | GalleryBlock
  | ImageTextCardBlock
  | HighlightBlock
  | CodeBlock
  | MultipleChoiceBlock
  | TrueFalseBlock
  | FillBlanksBlock
  | OrderingBlock
  | MatchingBlock
  | MemoryGameBlock
  | WordSearchBlock
  | CrosswordBlock;

export interface ProjectPage {
  id: string;
  pageNumber: number;
  title: string;
  width?: number;
  height?: number;
  blocks: Block[];
}

export interface ProjectDocument {
  id: string;
  title: string;
  sourceFormat: "PDF" | "IDML" | "MANUAL";
  createdAt: string;
  updatedAt: string;
  theme: {
    primaryColor: string;
    fontFamily: string;
    mode: "light" | "dark" | "high-contrast";
  };
  assets: ProjectAsset[];
  pages: ProjectPage[];
  /** Idioma do conteúdo publicado (atributo `lang` do HTML). Padrão: pt-BR. */
  locale?: string;
  /** "idml" preserva a composição em colunas/frames do IDML no desktop; "flow" empilha linearmente. */
  layoutMode?: "flow" | "idml";
}

export interface ProjectMeta {
  id: string;
  name: string;
  sourceFormat: string;
  createdAt: string;
  updatedAt: string;
  pageCount: number;
  blockCount: number;
  assetCount: number;
}

async function ensureDirs() {
  await fs.mkdir(PROJECTS_DIR, { recursive: true });
}

export async function convertFile(filePath: string, originalName: string): Promise<ProjectMeta> {
  const ext = path.extname(originalName).toLowerCase();

  // Pacote editorial .zip: contém o .idml (ou .pdf) + pasta Links/ com as imagens.
  // Extrai para um diretório temporário para que o resolvedor de mídias ache os Links/.
  if (ext === ".zip") {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "interativo-pacote-"));
    try {
      new AdmZip(filePath).extractAllTo(tmpDir, true);
      const inner = await findInnerSource(tmpDir);
      if (!inner) {
        throw new Error("O pacote .zip não contém nenhum arquivo .idml ou .pdf. Envie o IDML junto da pasta Links/ compactados.");
      }
      return await convertFile(inner, path.basename(inner));
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  }

  await ensureDirs();
  const id = randomUUID();
  const projectDir = path.join(PROJECTS_DIR, id);
  const assetsDir = path.join(projectDir, "assets");
  await fs.mkdir(projectDir, { recursive: true });
  await fs.mkdir(assetsDir, { recursive: true });

  const title = path.basename(originalName, ext).replace(/[-_]/g, " ");

  let pages: ProjectPage[] = [];
  let assets: ProjectAsset[] = [];

  if (ext === ".pdf") {
    const extracted = await extractFromPdf(filePath, assetsDir);
    pages = extracted.pages;
    assets = extracted.assets;
  } else if (ext === ".idml") {
    const extracted = await extractFromIdml(filePath, assetsDir);
    pages = extracted.pages;
    assets = extracted.assets;
  } else if (ext === ".indd") {
    throw new Error(
      "Arquivos .indd não são suportados diretamente. No InDesign, clique em 'Arquivo > Exportar' e selecione 'InDesign Markup (IDML)' ou 'Adobe PDF' para importar no Interativo."
    );
  } else {
    throw new Error("Formato não suportado: " + ext + " (use .pdf, .idml ou .zip com IDML + Links/)");
  }

  // Garantir pelo menos uma página se vazio
  if (pages.length === 0) {
    pages.push({
      id: randomUUID(),
      pageNumber: 1,
      title: "Página 1",
      blocks: [
        {
          id: randomUUID(),
          type: "heading",
          data: { level: 1, text: title },
        },
        {
          id: randomUUID(),
          type: "paragraph",
          data: { html: "Conteúdo importado com sucesso. Use os blocos ao lado para adicionar interações." },
        },
      ],
    });
  }

  const doc: ProjectDocument = {
    id,
    title,
    sourceFormat: ext.replace(".", "").toUpperCase() as any,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    theme: {
      primaryColor: "#d42731",
      fontFamily: "system-ui, -apple-system, sans-serif",
      mode: "light",
    },
    assets,
    pages,
    ...(ext === ".idml" ? { layoutMode: "idml" as const } : {}),
  };

  // Salvar project.json, gerar arquivos web e registrar versão inicial
  await saveProjectDocument(doc);
  await createProjectVersion(doc.id, "Importação inicial", "auto").catch(() => {});
  return getProjectMeta(doc);
}

// ============================================================================
// EXTRATOR NATIVO DE PDF
// ============================================================================

/** Acha o arquivo-fonte (.idml preferencialmente) dentro de um pacote extraído. */
async function findInnerSource(dir: string, depth = 0): Promise<string | null> {
  if (depth > 4) return null;
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = entries.filter((e) => e.isFile() && !e.name.startsWith("."));
  const idml = files.find((e) => /\.idml$/i.test(e.name));
  if (idml) return path.join(dir, idml.name);
  const pdf = files.find((e) => /\.pdf$/i.test(e.name));
  if (pdf) return path.join(dir, pdf.name);
  for (const e of entries) {
    if (e.isDirectory() && !e.name.startsWith("__MACOSX") && !e.name.startsWith(".")) {
      const found = await findInnerSource(path.join(dir, e.name), depth + 1);
      if (found) return found;
    }
  }
  return null;
}

async function extractPdfImages(filePath: string, assetsDir: string): Promise<ProjectAsset[]> {
  const buf = await fs.readFile(filePath);
  const content = buf.toString("latin1");
  const assets: ProjectAsset[] = [];
  let imgIndex = 1;
  const imgRegex = /\/Type\s*\/XObject[\s\S]*?\/Subtype\s*\/Image[\s\S]*?\/Filter\s*\/DCTDecode[\s\S]*?stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let match: RegExpExecArray | null;
  while ((match = imgRegex.exec(content)) !== null) {
    const imgBuf = Buffer.from(match[1], "latin1");
    if (imgBuf[0] === 0xff && imgBuf[1] === 0xd8) {
      const fileName = `img_${imgIndex}.jpg`;
      await fs.writeFile(path.join(assetsDir, fileName), imgBuf);
      assets.push({
        id: randomUUID(),
        fileName,
        path: `assets/${fileName}`,
        mimeType: "image/jpeg",
        altText: `Imagem ${imgIndex} extraída do documento`,
      });
      imgIndex++;
    }
  }
  return assets;
}

function isPdfHeading(text: string): boolean {
  return (
    text.length < 75 &&
    (text === text.toUpperCase() ||
      text.endsWith(":") ||
      /^(cap[ií]tulo|unidade|caderno|habilidades|atividade|para ampliar|meu repert[oó]rio|introdu[cç][aã]o)/i.test(text))
  );
}

function buildPdfPageBlocks(rawPage: string): Block[] {
  const blocks: Block[] = [];
  const groups: string[][] = [];
  let current: string[] = [];

  for (const line of rawPage.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (current.length > 0) {
        groups.push(current);
        current = [];
      }
      continue;
    }
    current.push(trimmed);
  }
  if (current.length > 0) groups.push(current);

  for (const group of groups) {
    const text = group.join(" ").replace(/\s+/g, " ").trim();
    if (!text) continue;
    if (group.length === 1 && isPdfHeading(text)) {
      blocks.push({
        id: randomUUID(),
        type: "heading",
        data: { level: text.length < 35 ? 2 : 3, text },
      });
    } else {
      blocks.push({
        id: randomUUID(),
        type: "paragraph",
        data: { html: escapeHtml(text) },
      });
    }
  }
  return blocks;
}

async function extractFromPdf(
  filePath: string,
  assetsDir: string
): Promise<{ pages: ProjectPage[]; assets: ProjectAsset[] }> {
  // Extração primária: pdftotext preserva a divisão real de páginas (\f).
  const result = spawnSync("pdftotext", ["-layout", "-enc", "UTF-8", filePath, "-"], {
    maxBuffer: 512 * 1024 * 1024,
    encoding: "buffer",
  });

  if (result.status !== 0 || !result.stdout || result.stdout.length === 0) {
    return extractFromPdfFallback(filePath, assetsDir);
  }

  const text = result.stdout.toString("utf8");
  const rawPages = text.split("\f");
  // O pdftotext termina o último stream com \f; remove a página vazia final.
  if (rawPages.length > 0 && rawPages[rawPages.length - 1].trim() === "") {
    rawPages.pop();
  }
  if (rawPages.length === 0) {
    return extractFromPdfFallback(filePath, assetsDir);
  }

  const assets = await extractPdfImages(filePath, assetsDir);
  const pages: ProjectPage[] = rawPages.map((rawPage, index) => ({
    id: randomUUID(),
    pageNumber: index + 1,
    title: `Página ${index + 1}`,
    blocks: buildPdfPageBlocks(rawPage),
  }));

  return { pages, assets };
}

function decodePdfOctal(str: string): string {
  return str
    .replace(/\\([0-7]{1,3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)))
    .replace(/\\x1f|\\u001f|\x1f/g, "fi")
    .replace(/\\x1e|\\u001e|\x1e/g, "fl")
    .replace(/\\x1d|\\u001d|\x1d/g, "ff")
    .replace(/\\([()\\\\])/g, "$1")
    .trim();
}

async function extractFromPdfFallback(
  filePath: string,
  assetsDir: string
): Promise<{ pages: ProjectPage[]; assets: ProjectAsset[] }> {
  const buf = await fs.readFile(filePath);
  const content = buf.toString("latin1");

  const assets: ProjectAsset[] = [];
  let imgIndex = 1;

  // 1. Extração de imagens JPEG nativas (/DCTDecode)
  const imgRegex = /\/Type\s*\/XObject[\s\S]*?\/Subtype\s*\/Image[\s\S]*?\/Filter\s*\/DCTDecode[\s\S]*?stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let match: RegExpExecArray | null;
  while ((match = imgRegex.exec(content)) !== null) {
    const imgBuf = Buffer.from(match[1], "latin1");
    if (imgBuf[0] === 0xff && imgBuf[1] === 0xd8) {
      const fileName = `img_${imgIndex}.jpg`;
      const targetPath = path.join(assetsDir, fileName);
      await fs.writeFile(targetPath, imgBuf);
      assets.push({
        id: randomUUID(),
        fileName,
        path: `assets/${fileName}`,
        mimeType: "image/jpeg",
        altText: `Imagem ${imgIndex} extraída do documento`,
      });
      imgIndex++;
    }
  }

  // 2. Extração de texto por streams descompactados
  const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  const rawTextLines: string[] = [];
  while ((match = streamRegex.exec(content)) !== null) {
    try {
      const raw = Buffer.from(match[1], "latin1");
      const uncompressed = zlib.inflateSync(raw).toString("latin1");
      if (uncompressed.includes("Tj") || uncompressed.includes("TJ")) {
        const lines = uncompressed.split("\n");
        for (const line of lines) {
          if (line.includes("Tj")) {
            const mTj = line.match(/\((.*?)\)\s*Tj/);
            if (mTj && mTj[1]) {
              const decoded = decodePdfOctal(mTj[1]);
              if (decoded) rawTextLines.push(decoded);
            }
          } else if (line.includes("TJ")) {
            const parts: string[] = [];
            const regexParts = /\((.*?)\)/g;
            let p: RegExpExecArray | null;
            while ((p = regexParts.exec(line)) !== null) {
              if (p[1]) parts.push(p[1]);
            }
            if (parts.length > 0) {
              const decoded = decodePdfOctal(parts.join(""));
              if (decoded) rawTextLines.push(decoded);
            }
          }
        }
      }
    } catch { }
  }

  // 3. Limpar e estruturar linhas em parágrafos e títulos
  const cleanedLines: string[] = [];
  for (const l of rawTextLines) {
    const trimmed = l.trim();
    if (!trimmed) continue;
    // Evita duplicatas consecutivas idênticas comuns em sombras de texto do InDesign
    if (cleanedLines.length > 0 && cleanedLines[cleanedLines.length - 1] === trimmed) {
      continue;
    }
    cleanedLines.push(trimmed);
  }

  // 4. Distribuir em páginas e blocos lógicos
  const pages: ProjectPage[] = [];
  const linesPerPage = 35; // agrupamento médio por página
  const totalPages = Math.max(1, Math.ceil(cleanedLines.length / linesPerPage));

  for (let i = 0; i < totalPages; i++) {
    const pageNumber = i + 1;
    const pageLines = cleanedLines.slice(i * linesPerPage, (i + 1) * linesPerPage);
    const blocks: Block[] = [];

    // Se temos imagem para esta página, adiciona no topo ou centro
    const assetForPage = assets[i % (assets.length || 1)];

    let currentParagraph: string[] = [];

    for (let j = 0; j < pageLines.length; j++) {
      const line = pageLines[j];
      const isHeading =
        line.length < 75 &&
        (line === line.toUpperCase() ||
          line.endsWith(":") ||
          /^(cap[ií]tulo|unidade|habilidades|reconhecendo|introdução|atividade)/i.test(line));

      if (isHeading) {
        if (currentParagraph.length > 0) {
          blocks.push({
            id: randomUUID(),
            type: "paragraph",
            data: { html: escapeHtml(currentParagraph.join(" ")) },
          });
          currentParagraph = [];
        }
        blocks.push({
          id: randomUUID(),
          type: "heading",
          data: { level: line.length < 35 ? 2 : 3, text: line },
        });
      } else {
        currentParagraph.push(line);
        if (currentParagraph.length >= 4) {
          blocks.push({
            id: randomUUID(),
            type: "paragraph",
            data: { html: escapeHtml(currentParagraph.join(" ")) },
          });
          currentParagraph = [];
        }
      }
    }

    if (currentParagraph.length > 0) {
      blocks.push({
        id: randomUUID(),
        type: "paragraph",
        data: { html: escapeHtml(currentParagraph.join(" ")) },
      });
    }

    // Inserir imagem representativa na página se existir
    if (assetForPage && assets.length > 0) {
      blocks.splice(Math.min(1, blocks.length), 0, {
        id: randomUUID(),
        type: "image",
        data: {
          src: assetForPage.path,
          alt: assetForPage.altText,
          caption: "Imagem extraída do material original",
          enableZoom: true,
        },
      });
    }

    // Na primeira página com conteúdo pedagógico, adiciona um exemplo interativo de apoio
    if (pageNumber === 1 && blocks.length > 1) {
      blocks.push({
        id: randomUUID(),
        type: "callout",
        data: {
          variant: "tip",
          title: "Dica de Mediação Pedagógica",
          contentHtml: "Explore os conceitos com os alunos promovendo a identificação de padrões no cotidiano.",
        },
      });
      blocks.push({
        id: randomUUID(),
        type: "accordion",
        data: {
          title: "Tópicos de Aprofundamento",
          items: [
            {
              id: randomUUID(),
              title: "Habilidades Desenvolvidas",
              contentHtml: "Compreensão da situação que gera o problema e justificativa da metodologia adequada.",
              defaultOpen: false,
            },
            {
              id: randomUUID(),
              title: "Atividades Práticas Sugeridas",
              contentHtml: "Exercícios em duplas para decomposição de desafios e elaboração de passos sequenciais.",
              defaultOpen: false,
            },
          ],
        },
      });
      blocks.push({
        id: randomUUID(),
        type: "quiz",
        data: {
          question: "Qual é o primeiro passo para resolver um problema com reconhecimento de padrões?",
          options: [
            { id: randomUUID(), text: "Identificar semelhanças e características comuns", isCorrect: true },
            { id: randomUUID(), text: "Pular direto para a conclusão sem análise", isCorrect: false },
            { id: randomUUID(), text: "Ignorar os dados anteriores", isCorrect: false },
          ],
          explanation: "Identificar padrões e regularidades permite formular soluções mais eficazes e reaproveitáveis.",
        },
      });
    }

    pages.push({
      id: randomUUID(),
      pageNumber,
      title: `Página ${pageNumber}`,
      blocks,
    });
  }

  return { pages, assets };
}

// ============================================================================
// EXTRATOR NATIVO DE IDML
// ============================================================================
// A implementação vive em ./idml/importIdml.ts: respeita a geometria real das
// páginas do InDesign, a ordem de leitura e rasteriza links vetoriais (.ai).
async function extractFromIdml(
  filePath: string,
  assetsDir: string
): Promise<{ pages: ProjectPage[]; assets: ProjectAsset[] }> {
  return importIdml(filePath, assetsDir);
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ============================================================================
// PERSISTÊNCIA E GERAÇÃO WEB ESTÁTICA
// ============================================================================
export async function saveProjectDocument(doc: ProjectDocument): Promise<void> {
  await ensureDirs();
  const projectDir = path.join(PROJECTS_DIR, doc.id);
  await fs.mkdir(projectDir, { recursive: true });
  await fs.mkdir(path.join(projectDir, "assets"), { recursive: true });

  doc.updatedAt = new Date().toISOString();

  // Salvar project.json
  await fs.writeFile(path.join(projectDir, "project.json"), JSON.stringify(doc, null, 2), "utf8");

  // Salvar meta.json
  const meta = getProjectMeta(doc);
  await fs.writeFile(path.join(projectDir, "meta.json"), JSON.stringify(meta, null, 2), "utf8");

  // Gerar arquivos estáticos web (index.html, styles.css, script.js)
  const html = buildHtmlFromDoc(doc);
  const css = buildCssFromDoc(doc);
  const js = buildJsFromDoc();

  await fs.writeFile(path.join(projectDir, "index.html"), html, "utf8");
  await fs.writeFile(path.join(projectDir, "styles.css"), css, "utf8");
  await fs.writeFile(path.join(projectDir, "script.js"), js, "utf8");

  await maybeCreateAutoVersion(doc).catch(() => {});
}

/* -------------------------------------------------------------------------- */
/* Versionamento por projeto + Rollback                                        */
/* -------------------------------------------------------------------------- */

const MAX_VERSIONS = 30;
const AUTO_VERSION_INTERVAL_MS = 2 * 60 * 1000;

function versionsDirOf(id: string): string {
  return path.join(PROJECTS_DIR, id, "versions");
}

async function readVersionIndex(id: string): Promise<ProjectVersion[]> {
  const dir = versionsDirOf(id);
  try {
    const raw = await fs.readFile(path.join(dir, "index.json"), "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeVersionIndex(id: string, list: ProjectVersion[]): Promise<void> {
  const dir = versionsDirOf(id);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, "index.json"), JSON.stringify(list, null, 2), "utf8");
}

async function maybeCreateAutoVersion(doc: ProjectDocument): Promise<void> {
  const list = await readVersionIndex(doc.id);
  const lastAuto = list.find((v) => v.kind === "auto");
  if (lastAuto) {
    const elapsed = Date.now() - new Date(lastAuto.createdAt).getTime();
    if (!Number.isNaN(elapsed) && elapsed < AUTO_VERSION_INTERVAL_MS) return;
  }
  await createProjectVersion(doc.id, "Salvamento automático", "auto", doc);
}

export async function listProjectVersions(id: string): Promise<ProjectVersion[]> {
  await getProjectDocument(id);
  return readVersionIndex(id);
}

export async function createProjectVersion(
  id: string,
  label?: string,
  kind: ProjectVersion["kind"] = "manual",
  docOverride?: ProjectDocument
): Promise<ProjectVersion> {
  const doc = docOverride ?? (await getProjectDocument(id));
  const dir = versionsDirOf(id);
  await fs.mkdir(dir, { recursive: true });

  const versionId = `v_${Date.now()}_${randomUUID().slice(0, 8)}`;
  const meta = getProjectMeta(doc);
  const entry: ProjectVersion = {
    id: versionId,
    label: (label || "").trim() || (kind === "manual" ? "Marco manual" : "Versão automática"),
    kind,
    createdAt: new Date().toISOString(),
    pageCount: meta.pageCount,
    blockCount: meta.blockCount,
  };

  await fs.writeFile(path.join(dir, `${versionId}.json`), JSON.stringify(doc, null, 2), "utf8");
  const current = await readVersionIndex(id);
  const updated = [entry, ...current];

  // Mantém versões recentes dentro do limite (preservando sempre a mais antiga/inicial se possível)
  while (updated.length > MAX_VERSIONS) {
    const removeIdx = updated.findIndex((v, i) => i > 0 && i < updated.length - 1 && v.kind === "auto");
    const idx = removeIdx !== -1 ? removeIdx : updated.length - 2;
    const [removed] = updated.splice(idx, 1);
    if (removed) {
      await fs.unlink(path.join(dir, `${removed.id}.json`)).catch(() => {});
    }
  }

  await writeVersionIndex(id, updated);
  return entry;
}

export async function restoreProjectVersion(id: string, versionId: string): Promise<ProjectDocument> {
  const dir = versionsDirOf(id);
  const snapRaw = await fs.readFile(path.join(dir, `${versionId}.json`), "utf8");
  const snapshot = JSON.parse(snapRaw) as ProjectDocument;
  if (!snapshot || snapshot.id !== id) {
    throw new Error("Versão inválida ou incompatível com este projeto.");
  }

  // Salva backup do estado atual antes de restaurar
  await createProjectVersion(id, "Backup antes do rollback", "rollback").catch(() => {});

  const restored: ProjectDocument = {
    ...snapshot,
    updatedAt: new Date().toISOString(),
  };

  const projectDir = path.join(PROJECTS_DIR, id);
  await fs.writeFile(path.join(projectDir, "project.json"), JSON.stringify(restored, null, 2), "utf8");
  const meta = getProjectMeta(restored);
  await fs.writeFile(path.join(projectDir, "meta.json"), JSON.stringify(meta, null, 2), "utf8");
  await fs.writeFile(path.join(projectDir, "index.html"), buildHtmlFromDoc(restored), "utf8");
  await fs.writeFile(path.join(projectDir, "styles.css"), buildCssFromDoc(restored), "utf8");
  await fs.writeFile(path.join(projectDir, "script.js"), buildJsFromDoc(), "utf8");

  return restored;
}

/**
 * Cria o documento-modelo demonstrativo (todas as páginas/blocos + mídias SVG).
 * Usado pelo botão "Criar material de exemplo" da tela de conversão.
 */
export async function createExemploProject(): Promise<ProjectMeta> {
  const id = randomUUID();
  const projectDir = path.join(PROJECTS_DIR, id);
  const assetsDir = path.join(projectDir, "assets");
  await fs.mkdir(assetsDir, { recursive: true });

  for (const asset of exemploAssets()) {
    await fs.writeFile(path.join(assetsDir, asset.fileName), asset.content, "utf8");
  }

  const doc = buildExemploDocument(id);
  await saveProjectDocument(doc);
  await createProjectVersion(doc.id, "Criação do material de exemplo", "auto").catch(() => {});
  return getProjectMeta(doc);
}

export async function getProjectDocument(id: string): Promise<ProjectDocument> {
  const projectDir = path.join(PROJECTS_DIR, id);
  const raw = await fs.readFile(path.join(projectDir, "project.json"), "utf8");
  return JSON.parse(raw) as ProjectDocument;
}

export function getProjectMeta(doc: ProjectDocument): ProjectMeta {
  let blockCount = 0;
  for (const p of doc.pages) {
    blockCount += p.blocks?.length || 0;
  }
  return {
    id: doc.id,
    name: doc.title,
    sourceFormat: doc.sourceFormat,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    pageCount: doc.pages.length,
    blockCount,
    assetCount: doc.assets.length,
  };
}

export async function listProjects(): Promise<ProjectMeta[]> {
  await ensureDirs();
  const entries = await fs.readdir(PROJECTS_DIR, { withFileTypes: true });
  const metas: ProjectMeta[] = [];
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    try {
      const raw = await fs.readFile(path.join(PROJECTS_DIR, e.name, "meta.json"), "utf8");
      metas.push(JSON.parse(raw));
    } catch { }
  }
  metas.sort((a, b) => {
    const timeB = b?.updatedAt || b?.createdAt || "";
    const timeA = a?.updatedAt || a?.createdAt || "";
    return timeB.localeCompare(timeA);
  });
  return metas;
}

export async function getProjectDir(id: string): Promise<string> {
  const dir = path.join(PROJECTS_DIR, id);
  await fs.access(path.join(dir, "index.html"));
  return dir;
}

export async function deleteProject(id: string): Promise<void> {
  const dir = path.join(PROJECTS_DIR, id);
  await fs.rm(dir, { recursive: true, force: true });
  const zipFile = path.join(PROJECTS_DIR, `${id}.zip`);
  await fs.unlink(zipFile).catch(() => { });
}

export async function refreshProjectBuild(id: string): Promise<void> {
  const doc = await getProjectDocument(id);
  const projectDir = path.join(PROJECTS_DIR, id);
  await fs.writeFile(path.join(projectDir, "index.html"), buildHtmlFromDoc(doc), "utf8");
  await fs.writeFile(path.join(projectDir, "styles.css"), buildCssFromDoc(doc), "utf8");
  await fs.writeFile(path.join(projectDir, "script.js"), buildJsFromDoc(), "utf8");
}

export async function zipProject(id: string): Promise<string> {
  await refreshProjectBuild(id).catch(() => {});
  const dir = await getProjectDir(id);
  const zipPath = path.join(PROJECTS_DIR, `${id}.zip`);
  const zip = new AdmZip();
  zip.addLocalFolder(dir, "", (entryName) => !/^versions(?:[\\/]|$)/i.test(entryName));
  zip.writeZip(zipPath);
  return zipPath;
}

// ============================================================================
// BUILD WEB FINAL (HTML5 + CSS + VANILLA JS)
// ============================================================================
function renderPageContentHtml(doc: ProjectDocument, p: ProjectPage): string {
  const useIdmlLayout =
    doc.layoutMode === "idml" &&
    typeof p.width === "number" &&
    p.width > 0 &&
    typeof p.height === "number" &&
    p.height > 0 &&
    p.blocks.some((b) => b.layout);

  if (!useIdmlLayout) {
    return `<div class="page-content">
        ${p.blocks.map((b) => renderBlockHtml(b)).join("\n")}
      </div>`;
  }

  const pageW = p.width!;
  const pageH = p.height!;
  const groups: Array<{ layout: BlockLayout; blocks: Block[] }> = [];
  const unpositioned: Block[] = [];

  for (const b of p.blocks) {
    if (!b.layout) {
      unpositioned.push(b);
      continue;
    }
    const prev = groups[groups.length - 1];
    if (b.layout.frameId && prev && prev.layout.frameId === b.layout.frameId) {
      prev.blocks.push(b);
    } else {
      groups.push({ layout: b.layout, blocks: [b] });
    }
  }

  const pct = (val: number, total: number) => `${Math.max(0, Math.min(100, (val / total) * 100)).toFixed(2)}%`;
  const ratio = (pageH / pageW).toFixed(4);
  const framesHtml = groups
    .map((g) => {
      const l = g.layout;
      const bgStyle = l.frameBg ? `background:${l.frameBg};padding:12px;border-radius:10px;` : "";
      const style = `left:${pct(l.x, pageW)};top:${pct(l.y, pageH)};width:${pct(Math.max(12, l.w), pageW)};min-height:${pct(l.h, pageH)};${bgStyle}`;
      const isImg = g.blocks.length === 1 && g.blocks[0].type === "image";
      return `<div class="idml-frame${isImg ? " is-image" : ""}" style="${style}">
        ${g.blocks.map((b) => renderBlockHtml(b)).join("\n")}
      </div>`;
    })
    .join("\n");

  const extraHtml = unpositioned.length
    ? `<div class="page-content idml-extra">${unpositioned.map((b) => renderBlockHtml(b)).join("\n")}</div>`
    : "";

  return `<div class="idml-canvas" style="--idml-ratio:${ratio};aspect-ratio:${pageW} / ${pageH}">
        ${framesHtml}
      </div>
      ${extraHtml}`;
}

function buildHtmlFromDoc(doc: ProjectDocument): string {
  const navItems = doc.pages
    .map(
      (p, i) =>
        `<a href="#page-${p.id}" class="nav-item ${i === 0 ? "active" : ""}" data-page-target="page-${p.id}">
          <span class="nav-num">${p.pageNumber}</span>
          <span class="nav-title">${escapeHtml(p.title || `Página ${p.pageNumber}`)}</span>
        </a>`
    )
    .join("\n");

  const pagesHtml = doc.pages
    .map(
      (p) => `
    <article id="page-${p.id}" class="book-page${doc.layoutMode === "idml" && p.width ? " is-idml" : ""}">
      <header class="page-header">
        <span class="page-badge">Página ${p.pageNumber}</span>
        <h2 class="page-title">${escapeHtml(p.title || "")}</h2>
      </header>
      ${renderPageContentHtml(doc, p)}
    </article>`
    )
    .join("\n");

  return `<!DOCTYPE html>
<html lang="${escapeHtml(doc.locale || "pt-BR")}" data-theme="${doc.theme.mode || "light"}">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${escapeHtml(doc.title)}</title>
  <link rel="stylesheet" href="styles.css"/>
</head>
<body>
  <div class="app-layout">
    <!-- Barra Superior -->
    <header class="top-bar">
      <div class="top-brand">
        <button id="btn-nav-toggle" class="btn-ctrl btn-nav-mobile" type="button" aria-expanded="false" aria-controls="sidebar-nav">Páginas</button>
        <span class="brand-badge">SESI</span>
        <h1 class="book-heading">${escapeHtml(doc.title)}</h1>
      </div>
      <div class="top-controls">
        <button id="btn-theme-toggle" class="btn-ctrl" title="Alternar tema claro/escuro">${svgIcon("theme")} Tema</button>
        <button id="btn-print" class="btn-ctrl" title="Imprimir / Salvar PDF">${svgIcon("printer")} Imprimir</button>
      </div>
    </header>

    <div class="main-container">
      <!-- Navegação lateral por páginas -->
      <aside id="sidebar-nav" class="sidebar-nav" aria-label="Navegação de páginas">
        <div class="nav-header">
          <h3>Sumário de Páginas</h3>
          <span class="badge-count">${doc.pages.length} páginas</span>
        </div>
        <nav class="nav-list">
          ${navItems}
        </nav>
      </aside>

      <!-- Conteúdo principal -->
      <main id="page-content" class="content-area">
        ${pagesHtml}
      </main>
    </div>
  </div>

  <!-- Modal de Zoom para Imagens -->
  <div id="image-modal" class="modal-overlay" aria-hidden="true" role="dialog">
    <div class="modal-content">
      <button class="modal-close" id="modal-close-btn" aria-label="Fechar zoom">&times;</button>
      <img id="modal-image" src="" alt="" />
      <p id="modal-caption" class="modal-caption"></p>
    </div>
  </div>

  <!-- Modal das zonas de clique (imagem interativa) -->
  <div id="hotspot-modal" class="modal-overlay" aria-hidden="true" role="dialog" aria-modal="true" aria-labelledby="hotspot-modal-title">
    <div class="modal-content">
      <button class="modal-close" id="hotspot-close-btn" aria-label="Fechar">&times;</button>
      <h3 id="hotspot-modal-title"></h3>
      <div id="hotspot-modal-body" class="hotspot-body"></div>
    </div>
  </div>

  <!-- Botão flutuante: voltar ao topo -->
  <button id="btn-top" class="btn-top" type="button" aria-label="Voltar ao topo" hidden>↑</button>

  <script src="script.js"></script>
</body>
</html>`;
}

function renderBlockHtml(block: Block): string {
  switch (block.type) {
    case "heading": {
      const tag = `h${block.data.level || 2}`;
      return `<${tag} class="block-heading block-heading-${block.data.level}">${escapeHtml(block.data.text)}</${tag}>`;
    }
    case "paragraph": {
      const html = block.data.html || "";
      // Listas e outros blocos não podem viver dentro de <p> (o navegador quebra o HTML).
      if (/^\s*<(ul|ol|div|table|blockquote)[\s>]/i.test(html)) {
        return `<div class="block-paragraph">${html}</div>`;
      }
      return `<div class="block-paragraph"><p>${html}</p></div>`;
    }
    case "image": {
      // Referência do InDesign sem arquivo: skeleton preserva a área para adicionar imagem.
      if (block.data.missing || !block.data.src) {
        const aspect =
          block.layout && block.layout.w > 0 && block.layout.h > 0
            ? ` style="aspect-ratio:${block.layout.w} / ${block.layout.h};min-height:140px;max-height:440px"`
            : "";
        return `
          <figure class="block-image block-image-missing">
            <div class="img-placeholder img-skeleton" role="img" aria-label="${escapeHtml(block.data.alt || block.data.fileName || "Área reservada para imagem")}"${aspect}>
              <span class="img-placeholder-icon" aria-hidden="true">${svgIcon("image")}</span>
              <strong>${escapeHtml(block.data.fileName || block.data.alt || "Imagem")}</strong>
              <span>Área reservada para imagem · vincule ou converta no editor (Parallax, Imagem Interativa, Flipcard, Galeria)</span>
            </div>
            ${block.data.caption ? `<figcaption>${escapeHtml(block.data.caption)}</figcaption>` : ""}
          </figure>`;
      }
      const zoomClass = block.data.enableZoom ? "can-zoom" : "";
      const imgTag = `<img src="${block.data.src}" alt="${escapeHtml(block.data.alt || "")}" class="${zoomClass}" data-caption="${escapeHtml(block.data.caption || "")}" loading="lazy"/>`;
      const linkedImg = block.data.linkUrl
        ? `<a href="${escapeHtml(block.data.linkUrl)}" target="_blank" rel="noopener noreferrer" class="img-link">${imgTag}<span class="link-hint">${svgIcon("link")} Abrir link externo</span></a>`
        : imgTag;
      // Zonas de clique: botões posicionados em % sobre a imagem; abrem modal.
      const hotspots = block.data.hotspots || [];
      const hotspotHtml = hotspots.length
        ? `<div class="hotspot-layer">${hotspots
            .map(
              (h) =>
                `<button type="button" class="hotspot" style="left:${h.x}%;top:${h.y}%;width:${h.w}%;height:${h.h}%" data-hotspot-title="${escapeHtml(h.title)}" data-hotspot-content="${escapeHtml(h.contentHtml)}" aria-label="${escapeHtml(h.title || "Zona interativa")}"><span class="hotspot-dot" aria-hidden="true">+</span></button>`
            )
            .join("")}</div>`
        : "";
      return `
        <figure class="block-image">
          <div class="hotspot-wrap">${linkedImg}${hotspotHtml}</div>
          ${block.data.caption ? `<figcaption>${escapeHtml(block.data.caption)}</figcaption>` : ""}
        </figure>`;
    }
    case "accordion": {
      const items = (block.data.items || [])
        .map(
          (item) => `
        <div class="acc-item ${item.defaultOpen ? "open" : ""}">
          <button class="acc-header" aria-expanded="${item.defaultOpen ? "true" : "false"}">
            <span class="acc-title">${escapeHtml(item.title)}</span>
            <span class="acc-icon" aria-hidden="true">▾</span>
          </button>
          <div class="acc-body">
            <div class="acc-inner">${item.contentHtml}</div>
          </div>
        </div>`
        )
        .join("\n");
      return `
        <div class="block-accordion">
          ${block.data.title ? `<h3 class="acc-main-title">${escapeHtml(block.data.title)}</h3>` : ""}
          <div class="acc-group">${items}</div>
        </div>`;
    }
    case "tabs": {
      const tabHeaders = (block.data.items || [])
        .map(
          (tab, idx) =>
            `<button class="tab-btn ${idx === 0 ? "active" : ""}" data-tab-target="tab-${tab.id}">${escapeHtml(tab.label)}</button>`
        )
        .join("");
      const tabContents = (block.data.items || [])
        .map(
          (tab, idx) =>
            `<div id="tab-${tab.id}" class="tab-pane ${idx === 0 ? "active" : ""}">${tab.contentHtml}</div>`
        )
        .join("");
      return `
        <div class="block-tabs">
          <div class="tabs-header" role="tablist">${tabHeaders}</div>
          <div class="tabs-body">${tabContents}</div>
        </div>`;
    }
    case "callout": {
      // Boxes no padrão ProjetoX (SENAI): Importante, Saiba Mais, Dica,
      // Você Sabia, PDF, Vamos Refletir + variantes legadas.
      const BOXES: Record<string, { title: string; icon: string }> = {
        importante: { title: "IMPORTANTE!", icon: svgIcon("alert") },
        "saiba-mais": { title: "SAIBA MAIS...", icon: svgIcon("search") },
        dica: { title: "DICA!", icon: svgIcon("bulb") },
        "voce-sabia": { title: "VOCÊ SABIA?", icon: svgIcon("help") },
        "box-pdf": { title: "PDF", icon: svgIcon("file") },
        "vamos-refletir": { title: "VAMOS REFLETIR", icon: svgIcon("message") },
        box: { title: "", icon: "" },
        info: { title: "Informação", icon: svgIcon("info") },
        tip: { title: "Dica", icon: svgIcon("bulb") },
        warning: { title: "Atenção", icon: svgIcon("alert") },
        curiosity: { title: "Curiosidade", icon: svgIcon("search") },
      };
      const preset = BOXES[block.data.variant] || BOXES.info;
      const title = block.data.title ?? preset.title;
      return `
        <aside class="pbox pbox-${block.data.variant || "info"}" role="note"${title ? ` aria-label="${escapeHtml(title)}"` : ""}>
          <div class="pbox-body">
            ${title ? `<h3 class="pbox-title">${escapeHtml(title)}</h3>` : ""}
            <div class="pbox-content">${block.data.contentHtml}</div>
          </div>
          ${preset.icon ? `<div class="pbox-icon" aria-hidden="true">${preset.icon}</div>` : ""}
        </aside>`;
    }
    case "video": {
      let embedHtml = "";
      if (block.data.source === "youtube") {
        const videoId = extractYoutubeId(block.data.url);
        embedHtml = `<iframe src="https://www.youtube-nocookie.com/embed/${videoId}" title="${escapeHtml(block.data.title || "Vídeo")}" frameborder="0" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
      } else {
        embedHtml = `<video controls src="${escapeHtml(block.data.url)}"></video>`;
      }
      return `
        <div class="block-video">
          <div class="video-container">${embedHtml}</div>
          ${block.data.caption ? `<p class="video-caption">${escapeHtml(block.data.caption)}</p>` : ""}
        </div>`;
    }
    case "quiz": {
      const opts = (block.data.options || [])
        .map(
          (opt) => `
        <button class="quiz-opt" data-correct="${opt.isCorrect}">
          <span class="opt-bullet"></span>
          <span class="opt-text">${escapeHtml(opt.text)}</span>
        </button>`
        )
        .join("\n");
      return `
        <div class="block-quiz">
          <div class="quiz-badge">Atividade Interativa</div>
          <h4 class="quiz-question">${escapeHtml(block.data.question)}</h4>
          <div class="quiz-options">${opts}</div>
          <div class="quiz-feedback" aria-live="polite"></div>
          ${block.data.explanation ? `<p class="quiz-explanation hidden">${escapeHtml(block.data.explanation)}</p>` : ""}
        </div>`;
    }
    case "external-embed": {
      return `
        <div class="block-embed">
          <iframe src="${escapeHtml(block.data.embedUrl)}" title="${escapeHtml(block.data.title || "Recurso Interativo")}" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
        </div>`;
    }
    default:
      return renderProjxBlock(block) || "";
  }
}

function extractYoutubeId(url: string): string {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  return m ? m[1] : url;
}

function buildCssFromDoc(doc: ProjectDocument): string {
  const brandRed = doc.theme.primaryColor || "#d42731";
  return `/* CSS Estático e Responsivo — Build Interativo */
:root {
  --brand-red: ${brandRed};
  --brand-red-hover: #b51c24;
  --bg-page: #f8fafc;
  --bg-surface: #ffffff;
  --bg-sidebar: #0f172a;
  --text-main: #1e293b;
  --text-muted: #64748b;
  --border-color: #e2e8f0;
  --radius-md: 10px;
  --radius-lg: 16px;
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.06);
  --shadow-md: 0 4px 14px rgba(0,0,0,0.08);
}

[data-theme="dark"] {
  --bg-page: #0b0f19;
  --bg-surface: #1e293b;
  --bg-sidebar: #020617;
  --text-main: #f8fafc;
  --text-muted: #94a3b8;
  --border-color: #334155;
}

* { box-sizing: border-box; margin: 0; padding: 0; }
html, body {
  max-width: 100%;
  overflow-x: clip;
}
body {
  font-family: ${doc.theme.fontFamily || "system-ui, -apple-system, sans-serif"};
  background-color: var(--bg-page);
  color: var(--text-main);
  line-height: 1.65;
  font-size: 16px;
}
a { overflow-wrap: anywhere; word-break: break-word; }

/* Layout Geral */
.app-layout { display: flex; flex-direction: column; min-height: 100vh; max-width: 100%; }
.top-bar {
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border-color);
  padding: 14px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: sticky;
  top: 0;
  z-index: 40;
  box-shadow: var(--shadow-sm);
}
.top-brand { display: flex; align-items: center; gap: 12px; }
.brand-badge {
  background: var(--brand-red);
  color: #fff;
  font-weight: 800;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 0.85rem;
  letter-spacing: 1px;
}
.book-heading { font-size: 1.25rem; font-weight: 700; color: var(--text-main); }
.top-controls { display: flex; gap: 8px; }
.btn-ctrl {
  background: transparent;
  border: 1px solid var(--border-color);
  color: var(--text-main);
  padding: 6px 14px;
  border-radius: 8px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-ctrl:hover { background: rgba(0,0,0,0.05); }

.main-container { display: flex; flex: 1; min-width: 0; max-width: 100%; }

/* Sidebar */
.sidebar-nav {
  width: 280px;
  background: var(--bg-surface);
  border-right: 1px solid var(--border-color);
  padding: 20px 14px;
  position: sticky;
  top: 61px;
  height: calc(100vh - 61px);
  overflow-y: auto;
}
.nav-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.nav-header h3 { font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-muted); }
.badge-count { font-size: 0.75rem; background: var(--border-color); padding: 2px 8px; border-radius: 12px; }
.nav-list { display: flex; flex-direction: column; gap: 6px; }
.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 8px;
  color: var(--text-main);
  text-decoration: none;
  font-size: 0.92rem;
  transition: all 0.15s;
}
.nav-item:hover { background: rgba(0,0,0,0.04); }
.nav-item.active { background: var(--brand-red); color: #fff; font-weight: 600; }
.nav-num {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgba(0,0,0,0.08);
  display: grid;
  place-items: center;
  font-size: 0.8rem;
}
.nav-item.active .nav-num { background: rgba(255,255,255,0.25); color: #fff; }

/* Content Area */
.content-area {
  flex: 1;
  min-width: 0;
  width: 100%;
  max-width: 960px;
  margin: 0 auto;
  padding: 36px 24px 80px;
  overflow-x: hidden;
}
.book-page {
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: 36px;
  margin-bottom: 40px;
  box-shadow: var(--shadow-sm);
  width: 100%;
  min-width: 0;
  max-width: 100%;
  overflow-x: hidden;
}
.page-header {
  border-bottom: 2px solid var(--border-color);
  padding-bottom: 16px;
  margin-bottom: 28px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
}
.page-badge {
  background: var(--brand-red);
  color: #fff;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  padding: 4px 10px;
  border-radius: 20px;
}
.page-title { font-size: 1.5rem; font-weight: 700; color: var(--text-main); overflow-wrap: anywhere; }
.page-content { display: flex; flex-direction: column; gap: 24px; min-width: 0; max-width: 100%; }
.page-content > * { min-width: 0; max-width: 100%; }
.block-heading-1, .block-heading-2, .block-heading-3 { overflow-wrap: anywhere; }

/* Layout fiel ao IDML (desktop preserva colunas/posições; mobile empilha) */
.idml-canvas {
  position: relative;
  width: 100%;
  overflow: hidden;
}
.idml-frame {
  position: absolute;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow: auto;
  overflow-wrap: anywhere;
  font-size: 0.92rem;
}
.idml-frame .block-heading-2 { font-size: 1.18rem; margin-top: 0; }
.idml-frame .block-heading-3 { font-size: 1rem; }
.idml-frame .block-paragraph p,
.idml-frame .block-paragraph ul,
.idml-frame .block-paragraph ol { font-size: 0.9rem; line-height: 1.5; }
.idml-frame.is-image { overflow: hidden; }
.idml-frame.is-image .block-image { margin: 0; height: 100%; }
.idml-frame.is-image .block-image img { width: 100%; height: 100%; object-fit: contain; }
.idml-extra { margin-top: 24px; }
.btn-nav-mobile { display: none; }

/* Blocos */
.block-heading-1 { font-size: 1.85rem; font-weight: 800; color: var(--brand-red); margin-top: 12px; }
.block-heading-2 { font-size: 1.45rem; font-weight: 700; color: var(--text-main); margin-top: 8px; border-left: 4px solid var(--brand-red); padding-left: 12px; }
.block-heading-3 { font-size: 1.2rem; font-weight: 600; color: var(--text-main); }
.block-paragraph { overflow-wrap: anywhere; word-break: normal; }
.block-paragraph p { font-size: 1.05rem; line-height: 1.65; color: var(--text-main); overflow-wrap: anywhere; }
.block-paragraph ul, .block-paragraph ol { font-size: 1.05rem; line-height: 1.65; color: var(--text-main); padding-left: 1.4em; margin: 8px 0; display: flex; flex-direction: column; gap: 6px; }
.block-paragraph ul { list-style: disc; }
.block-paragraph ol { list-style: decimal; }
.block-paragraph li { overflow-wrap: anywhere; }

/* Imagens */
.block-image { text-align: center; margin: 12px 0; }
.block-image img {
  max-width: 100%;
  height: auto;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  transition: transform 0.2s;
}
.block-image img.can-zoom { cursor: zoom-in; }
.block-image img.can-zoom:hover { transform: scale(1.015); box-shadow: var(--shadow-md); }
.block-image figcaption { margin-top: 8px; font-size: 0.85rem; color: var(--text-muted); font-style: italic; }
.img-link { text-decoration: none; display: block; position: relative; }
.link-hint {
  display: inline-block;
  margin-top: 6px;
  font-size: 0.8rem;
  color: var(--brand-red);
  font-weight: 600;
}

/* Accordion */
.block-accordion { margin: 16px 0; }
.acc-main-title { font-size: 1.15rem; margin-bottom: 12px; }
.acc-group { border: 1px solid var(--border-color); border-radius: var(--radius-md); overflow: hidden; }
.acc-item { border-bottom: 1px solid var(--border-color); }
.acc-item:last-child { border-bottom: none; }
.acc-header {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: var(--bg-surface);
  border: none;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-main);
  cursor: pointer;
  text-align: left;
}
.acc-header:hover { background: rgba(0,0,0,0.03); }
.acc-icon { transition: transform 0.2s; }
.acc-item.open .acc-icon { transform: rotate(180deg); }
.acc-body { display: none; padding: 0 20px 20px; background: var(--bg-surface); }
.acc-item.open .acc-body { display: block; }

/* Tabs */
.block-tabs { border: 1px solid var(--border-color); border-radius: var(--radius-md); overflow: hidden; margin: 16px 0; }
.tabs-header { display: flex; flex-wrap: wrap; background: rgba(0,0,0,0.03); border-bottom: 1px solid var(--border-color); }
.tab-btn {
  padding: 12px 20px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-weight: 600;
  color: var(--text-muted);
  font-size: 0.95rem;
  border-bottom: 3px solid transparent;
}
.tab-btn.active { color: var(--brand-red); border-bottom-color: var(--brand-red); background: var(--bg-surface); }
.tabs-body { padding: 20px; background: var(--bg-surface); }
.tab-pane { display: none; }
.tab-pane.active { display: block; }

/* Callout Box */
.block-callout {
  padding: 18px 22px;
  border-radius: var(--radius-md);
  border-left: 5px solid;
  margin: 16px 0;
}
.callout-header { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.callout-title { font-size: 1.05rem; }
.callout-info { background: #eff6ff; border-color: #3b82f6; color: #1e3a8a; }
.callout-tip { background: #f0fdf4; border-color: #22c55e; color: #14532d; }
.callout-warning { background: #fefce8; border-color: #eab308; color: #713f12; }
.callout-curiosity { background: #faf5ff; border-color: #a855f7; color: #581c87; }

/* Boxes padrão ProjetoX (SENAI) */
.pbox {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 16px;
  align-items: center;
  padding: 20px 24px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
  border-left: 6px solid;
  margin: 20px 0;
  min-width: 0;
  max-width: 100%;
}
.pbox-body { min-width: 0; }
.pbox-title { font-size: 1.3rem; font-weight: 800; margin-bottom: 8px; text-transform: uppercase; letter-spacing: .02em; }
.pbox-content { font-size: 1.02rem; line-height: 1.65; overflow-wrap: anywhere; }
.pbox-content p { margin: 6px 0; }
.pbox-icon { font-size: 2.6rem; line-height: 1; padding: 0 8px; color: var(--brand-red); display: flex; align-items: flex-start; }
${ICON_CSS}
.pbox-importante { background: #fef2f2; border-left-color: #ef4444; }
.pbox-importante .pbox-title { color: #b91c1c; }
.pbox-saiba-mais { background: #f0fdf4; border-left-color: #22c55e; }
.pbox-saiba-mais .pbox-title { color: #15803d; }
.pbox-dica { background: #fff7ed; border-left-color: #f97316; }
.pbox-dica .pbox-title { color: #c2410c; }
.pbox-voce-sabia { background: #faf5ff; border-left-color: #a855f7; }
.pbox-voce-sabia .pbox-title { color: #7e22ce; }
.pbox-box-pdf { background: #f8fafc; border-left-color: #475569; }
.pbox-box-pdf .pbox-title { color: #334155; }
.pbox-vamos-refletir { background: #ecfeff; border-left-color: #06b6d4; }
.pbox-vamos-refletir .pbox-title { color: #0e7490; }
.pbox-box { background: var(--surface-2, #f8fafc); border-left-color: var(--brand-red, #d42731); }
.pbox-info { background: #eff6ff; border-left-color: #3b82f6; }
.pbox-tip { background: #f0fdf4; border-left-color: #22c55e; }
.pbox-warning { background: #fefce8; border-left-color: #eab308; }
.pbox-curiosity { background: #faf5ff; border-left-color: #a855f7; }
[data-theme="dark"] .pbox { background: rgba(255,255,255,.05); }
[data-theme="dark"] .pbox-title { color: inherit; filter: brightness(1.5); }
@media (max-width: 640px) { .pbox { grid-template-columns: minmax(0, 1fr); padding: 16px; } .pbox-icon { display: none; } }

/* Imagem interativa com zonas de clique */
.hotspot-wrap { position: relative; display: inline-block; max-width: 100%; }
.hotspot-wrap img { display: block; max-width: 100%; height: auto; }
.hotspot-layer { position: absolute; inset: 0; }
.hotspot {
  position: absolute;
  border: 2px dashed rgba(212, 39, 49, .85);
  background: rgba(212, 39, 49, .14);
  border-radius: 8px;
  cursor: pointer;
  display: grid;
  place-items: center;
  padding: 0;
  transition: background .15s;
}
.hotspot:hover, .hotspot:focus-visible { background: rgba(212, 39, 49, .32); outline: 3px solid var(--brand-red, #d42731); }
.hotspot-dot {
  width: 26px; height: 26px;
  border-radius: 50%;
  background: var(--brand-red, #d42731);
  color: #fff;
  font-weight: 800;
  display: grid; place-items: center;
  box-shadow: 0 2px 8px rgba(0,0,0,.35);
  animation: hotspot-pulse 1.6s ease-in-out infinite;
}
@keyframes hotspot-pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.15); } }
@media (prefers-reduced-motion: reduce) { .hotspot-dot { animation: none; } }
#hotspot-modal .modal-content { background: var(--surface-1, #fff); color: var(--text-main, #1e293b); padding: 28px; border-radius: 14px; max-width: 560px; width: calc(100vw - 48px); max-height: 80vh; overflow: auto; text-align: left; }
#hotspot-modal h3 { margin-bottom: 10px; font-size: 1.2rem; }
#hotspot-modal .hotspot-body { line-height: 1.65; overflow-wrap: anywhere; }

/* Skeleton de imagem vinculada (preserva área e sugere interações) */
.block-image-missing .img-placeholder {
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;
  width: 100%;
  padding: 24px 18px;
  border: 2px dashed var(--border-color, #cbd5e1);
  border-radius: var(--radius-md);
  color: var(--text-muted, #64748b);
  font-size: .85rem;
  background: var(--surface-2, #f8fafc);
  text-align: center;
  overflow-wrap: anywhere;
}
.img-placeholder-icon { font-size: 2rem; }
.img-placeholder strong { color: var(--text-main, #1e293b); font-size: .95rem; }

/* Quiz Interativo */
.block-quiz {
  background: var(--bg-page);
  border: 2px dashed #cbd5e1;
  border-radius: var(--radius-lg);
  padding: 24px;
  margin: 20px 0;
}
[data-theme="dark"] .block-quiz { background: #1e293b; border-color: #475569; }
.quiz-badge {
  display: inline-block;
  background: #3b82f6;
  color: #fff;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  padding: 3px 8px;
  border-radius: 4px;
  margin-bottom: 12px;
}
.quiz-question { font-size: 1.15rem; font-weight: 700; margin-bottom: 16px; color: var(--text-main); }
.quiz-options { display: flex; flex-direction: column; gap: 10px; }
.quiz-opt {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 18px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-surface);
  color: var(--text-main);
  font-size: 0.95rem;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s;
}
.quiz-opt:hover { border-color: var(--brand-red); background: rgba(0,0,0,0.02); }
.opt-bullet { width: 14px; height: 14px; border-radius: 50%; border: 2px solid #94a3b8; }
.quiz-opt.selected-correct {
  background: #dcfce7 !important;
  border-color: #22c55e !important;
  color: #15803d !important;
  font-weight: 600;
}
.quiz-opt.selected-wrong {
  background: #fee2e2 !important;
  border-color: #ef4444 !important;
  color: #b91c1c !important;
}
.quiz-feedback { margin-top: 14px; font-weight: 600; font-size: 0.95rem; }
.quiz-explanation {
  margin-top: 8px;
  font-size: 0.9rem;
  background: rgba(0,0,0,0.04);
  padding: 10px 14px;
  border-radius: 6px;
}
.hidden { display: none; }

/* Vídeo */
.block-video { margin: 16px 0; }
.video-container {
  position: relative;
  padding-bottom: 56.25%;
  height: 0;
  overflow: hidden;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
}
.video-container iframe, .video-container video {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
}

/* Recurso externo (embed) */
.block-embed {
  margin: 16px 0;
  border-radius: var(--radius-md);
  overflow: hidden;
  border: 1px solid var(--border-color);
  box-shadow: var(--shadow-sm);
  background: var(--bg-surface);
}
.block-embed iframe {
  display: block;
  width: 100%;
  min-height: 460px;
  border: 0;
}

/* Modal de Zoom */
.modal-overlay {
  display: none;
  position: fixed;
  top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(0,0,0,0.85);
  z-index: 999;
  justify-content: center;
  align-items: center;
  padding: 20px;
}
.modal-overlay.active { display: flex; }
.modal-content { position: relative; max-width: 90vw; max-height: 90vh; text-align: center; }
.modal-content img { max-width: 100%; max-height: 80vh; border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
.modal-close {
  position: absolute;
  top: -40px; right: 0;
  background: transparent;
  border: none;
  color: #fff;
  font-size: 2.2rem;
  cursor: pointer;
}
.modal-caption { color: #e2e8f0; margin-top: 10px; font-size: 0.95rem; }

/* Responsividade */
@media (max-width: 768px) {
  .top-bar { padding: 10px 14px; flex-wrap: wrap; gap: 8px; }
  .top-brand { min-width: 0; flex: 1 1 auto; }
  .book-heading { font-size: 1rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .top-controls { gap: 6px; }
  .btn-ctrl { padding: 6px 10px; font-size: 0.8rem; }
  .btn-nav-mobile { display: inline-flex; align-items: center; gap: 4px; }
  .sidebar-nav {
    display: none;
    position: fixed;
    left: 0;
    right: 0;
    top: 56px;
    bottom: 0;
    width: 100%;
    height: auto;
    z-index: 50;
    border-right: none;
  }
  .sidebar-nav.open { display: block; }
  .content-area { max-width: 100%; padding: 16px 12px 72px; }
  .book-page { max-width: 100%; padding: 18px 14px; margin-bottom: 24px; }
  .page-title { font-size: 1.2rem; }
  .idml-canvas {
    position: static;
    aspect-ratio: auto !important;
    display: flex;
    flex-direction: column;
    gap: 18px;
  }
  .idml-frame {
    position: static !important;
    left: auto !important;
    top: auto !important;
    width: 100% !important;
    min-height: 0 !important;
    overflow: visible;
    font-size: 1rem;
  }
  .idml-frame .block-paragraph p,
  .idml-frame .block-paragraph ul,
  .idml-frame .block-paragraph ol { font-size: 1.02rem; line-height: 1.65; }
}
${PROJX_CSS}
`;
}

function buildJsFromDoc(): string {
  return `// Script Interativo Vanilla JS (Sem dependências, offline-ready)
function initBook() {
  // 1. Accordion
  document.querySelectorAll(".acc-header").forEach(btn => {
    btn.addEventListener("click", () => {
      const item = btn.parentElement;
      const isOpen = item.classList.toggle("open");
      btn.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });
  });

  // 2. Tabs
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const parent = btn.closest(".block-tabs");
      const targetId = btn.getAttribute("data-tab-target");
      parent.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      parent.querySelectorAll(".tab-pane").forEach(p => p.classList.remove("active"));
      btn.classList.add("active");
      const targetPane = parent.querySelector("#" + targetId);
      if (targetPane) targetPane.classList.add("active");
    });
  });

  // 3. Quiz Interativo
  document.querySelectorAll(".block-quiz").forEach(quiz => {
    const opts = quiz.querySelectorAll(".quiz-opt");
    const feedback = quiz.querySelector(".quiz-feedback");
    const explanation = quiz.querySelector(".quiz-explanation");

    opts.forEach(btn => {
      btn.addEventListener("click", () => {
        opts.forEach(b => b.classList.remove("selected-correct", "selected-wrong"));
        const isCorrect = btn.getAttribute("data-correct") === "true";
        if (isCorrect) {
          btn.classList.add("selected-correct");
          feedback.textContent = "Parabéns, resposta correta!";
          feedback.style.color = "#15803d";
        } else {
          btn.classList.add("selected-wrong");
          feedback.textContent = "Resposta incorreta. Tente novamente!";
          feedback.style.color = "#b91c1c";
        }
        if (explanation) explanation.classList.remove("hidden");
      });
    });
  });

  // 4. Modal de Zoom de Imagens
  const modal = document.getElementById("image-modal");
  const modalImg = document.getElementById("modal-image");
  const modalCaption = document.getElementById("modal-caption");
  const closeBtn = document.getElementById("modal-close-btn");

  document.querySelectorAll(".block-image img.can-zoom").forEach(img => {
    img.addEventListener("click", () => {
      if (modal && modalImg) {
        modalImg.src = img.src;
        if (modalCaption) modalCaption.textContent = img.getAttribute("data-caption") || img.alt || "";
        modal.classList.add("active");
      }
    });
  });

  if (closeBtn && modal) {
    closeBtn.addEventListener("click", () => modal.classList.remove("active"));
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.classList.remove("active");
    });
  }

  // 4b. Zonas de clique em imagens interativas (abre modal com conteúdo)
  const hModal = document.getElementById("hotspot-modal");
  const hTitle = document.getElementById("hotspot-modal-title");
  const hBody = document.getElementById("hotspot-modal-body");
  const hClose = document.getElementById("hotspot-close-btn");
  let lastHotspot = null;
  document.querySelectorAll(".hotspot").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (!hModal) return;
      lastHotspot = btn;
      if (hTitle) hTitle.textContent = btn.getAttribute("data-hotspot-title") || "Detalhe";
      if (hBody) hBody.innerHTML = btn.getAttribute("data-hotspot-content") || "";
      hModal.classList.add("active");
      hModal.setAttribute("aria-hidden", "false");
      if (hClose) hClose.focus();
    });
  });
  function fecharHotspot() {
    if (!hModal) return;
    hModal.classList.remove("active");
    hModal.setAttribute("aria-hidden", "true");
    if (lastHotspot) lastHotspot.focus();
  }
  if (hClose) hClose.addEventListener("click", fecharHotspot);
  if (hModal) hModal.addEventListener("click", (e) => { if (e.target === hModal) fecharHotspot(); });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && hModal && hModal.classList.contains("active")) fecharHotspot();
  });

  // 5. Alternar Tema Claro/Escuro
  const themeBtn = document.getElementById("btn-theme-toggle");
  if (themeBtn) {
    themeBtn.addEventListener("click", () => {
      const current = document.documentElement.getAttribute("data-theme") || "light";
      const next = current === "light" ? "dark" : "light";
      document.documentElement.setAttribute("data-theme", next);
    });
  }

  // 6. Imprimir
  const printBtn = document.getElementById("btn-print");
  if (printBtn) {
    printBtn.addEventListener("click", () => window.print());
  }

  // 7. Voltar ao topo
  const topBtn = document.getElementById("btn-top");
  if (topBtn) {
    const updateTop = () => { topBtn.hidden = window.scrollY < 400; };
    window.addEventListener("scroll", updateTop, { passive: true });
    updateTop();
    topBtn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  }

  // 8. Navegação mobile e item ativo
  const navToggle = document.getElementById("btn-nav-toggle");
  const sidebarNav = document.getElementById("sidebar-nav");
  const navItems = document.querySelectorAll(".nav-item");
  if (navToggle && sidebarNav) {
    navToggle.addEventListener("click", () => {
      const open = sidebarNav.classList.toggle("open");
      navToggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }
  navItems.forEach(item => {
    item.addEventListener("click", () => {
      navItems.forEach(n => n.classList.remove("active"));
      item.classList.add("active");
      if (sidebarNav && sidebarNav.classList.contains("open")) {
        sidebarNav.classList.remove("open");
        if (navToggle) navToggle.setAttribute("aria-expanded", "false");
      }
    });
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initBook);
} else {
  initBook();
}
${PROJX_JS}
`;
}
