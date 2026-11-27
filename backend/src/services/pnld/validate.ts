/**
 * Validação automatizada do pacote PNLD (Anexo 03, item 7.10).
 * Complementa — não substitui — o Valide Desktop e o W3C Validator.
 */

import type { Dirent } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";

const REQUIRED_FILES = [
  "index.html",
  "cover.jpg",
  "content.opf",
  "toc.ncx",
  "resources/styles/styles.css",
  "resources/scripts/script.js",
];

const REQUIRED_DC = [
  "dc:title",
  "dc:language",
  "dc:publisher",
  "dc:date",
  "dc:creator",
  "dc:description",
  "dc:identifier",
];

async function readIfExists(file: string): Promise<string> {
  try {
    return await fs.readFile(file, "utf8");
  } catch {
    return "";
  }
}

export interface ValidationResult {
  ok: boolean;
  issues: string[];
}

/** Lista caminhos relativos do pacote para checar nomenclatura (itens 5.2/5.10). */
async function scanTree(dir: string, base = ""): Promise<{ files: string[]; dirs: string[] }> {
  const files: string[] = [];
  const dirs: string[] = [];
  let entries: Dirent[] = [];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return { files, dirs };
  }
  for (const entry of entries) {
    const rel = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      dirs.push(rel);
      const nested = await scanTree(path.join(dir, entry.name), rel);
      files.push(...nested.files);
      dirs.push(...nested.dirs);
    } else if (entry.isFile()) {
      files.push(rel);
    }
  }
  return { files, dirs };
}

/** Verifica a integridade estrutural do pacote gerado. */
export async function validatePackage(projectDir: string): Promise<ValidationResult> {
  const issues: string[] = [];

  for (const file of REQUIRED_FILES) {
    try {
      await fs.access(path.join(projectDir, file));
    } catch {
      issues.push(`Arquivo obrigatório ausente: ${file}`);
    }
  }

  const html = await readIfExists(path.join(projectDir, "index.html"));
  const css = await readIfExists(path.join(projectDir, "resources/styles/styles.css"));
  const js = await readIfExists(path.join(projectDir, "resources/scripts/script.js"));
  const opf = await readIfExists(path.join(projectDir, "content.opf"));
  const ncx = await readIfExists(path.join(projectDir, "toc.ncx"));

  const external = /(?:src|href|url)\s*=\s*["'(]?\s*https?:\/\//gi;
  if (external.test(html) || external.test(css) || external.test(js)) {
    issues.push("Recurso externo (http/https) encontrado em HTML/CSS/JS — o pacote deve ser autocontido.");
  }

  const h1Count = (html.match(/<h1\b/gi) || []).length;
  if (h1Count !== 1) issues.push(`Deve haver exatamente um <h1> no index.html (encontrados: ${h1Count}).`);

  if (!/role="doc-pagebreak"/.test(html)) {
    issues.push('Paginação ausente: usar <p role="doc-pagebreak"> (item 4.3.12).');
  }
  for (const value of ["sumario", "pagina"]) {
    if (!html.includes(`data-book="${value}"`)) {
      issues.push(`Atributo data-book="${value}" ausente (item 4.3.5).`);
    }
  }
  if (!html.includes("noindex")) {
    issues.push('Metadado robots="noindex" ausente (item 5.8.2).');
  }

  for (const tag of REQUIRED_DC) {
    if (!opf.includes(`<${tag}`)) issues.push(`Metadado <${tag}> ausente no content.opf.`);
  }
  if (!opf.includes("schema:accessibilityFeature")) {
    issues.push("Metadados de acessibilidade obrigatórios ausentes no content.opf (item 5.7).");
  }

  const spineCount = (opf.match(/<itemref\b/g) || []).length;
  const navCount = (ncx.match(/<navPoint\b/g) || []).length;
  if (!spineCount || spineCount !== navCount) {
    issues.push(`Spine (${spineCount}) e navMap (${navCount}) divergem (item 4.3.4).`);
  }

  // Anexo 03, 4.3.3.2/W04 — HTMLs segmentados, <=500 KB e com <h2> único.
  const contentDir = path.join(projectDir, "content");
  try {
    const contentFiles = (await fs.readdir(contentDir)).filter((f) => f.endsWith(".html")).sort();
    if (contentFiles.length === 0) issues.push("Nenhum HTML segmentado encontrado em content/.");
    for (const file of contentFiles) {
      const full = path.join(contentDir, file);
      const stat = await fs.stat(full);
      if (stat.size > 500 * 1024) {
        issues.push(`Arquivo HTML acima de 500 KB: content/${file} (${Math.round(stat.size / 1024)} KB).`);
      }
      const source = await readIfExists(full);
      const h2 = (source.match(/<h2\b/gi) || []).length;
      if (h2 !== 1) issues.push(`content/${file} deve ter exatamente 1 <h2> (encontrados: ${h2}).`);
    }
  } catch {
    issues.push("Diretório content/ ausente ou ilegível.");
  }

  // Anexo 03, 7.7.2 — toda imagem deve ter atributo alt.
  const imgTags = html.match(/<img\b[^>]*>/gi) || [];
  const missingAlt = imgTags.filter((tag) => !/\balt\s*=/.test(tag)).length;
  if (missingAlt) issues.push(`${missingAlt} imagem(ns) sem atributo alt (item 7.7.2).`);

  // Anexo 03, 7.4 — tabelas com caption e escopo.
  const tables = html.match(/<table\b[^>]*>[\s\S]*?<\/table>/gi) || [];
  const tablesWithoutCaption = tables.filter((t) => !/<caption\b/i.test(t)).length;
  if (tablesWithoutCaption) issues.push(`${tablesWithoutCaption} tabela(s) sem <caption> (item 7.4.1).`);

  // Anexo 03, 7.4.2 — link para versão textual deve existir.
  for (const match of html.matchAll(/class="table-text-link"[^>]*href="([^"]+)"/gi)) {
    try {
      await fs.access(path.join(projectDir, match[1]));
    } catch {
      issues.push(`Versão textual da tabela ausente: ${match[1]}.`);
    }
  }

  try {
    const cover = await fs.stat(path.join(projectDir, "cover.jpg"));
    if (cover.size < 1000) issues.push("cover.jpg inválido ou muito pequeno (item 5.5).");
  } catch {
    // Já reportado em REQUIRED_FILES.
  }

  // Itens 5.2/5.10 — nomes ASCII, pastas minúsculas, ODs na raiz.
  const { files, dirs } = await scanTree(projectDir);
  const forbidden = [
    /^contente(\/|$)/,
    /^contente\.opf$/,
    /^resources\/interactivities(\/|$)/,
    /^resources\/[áàâãéêíóôõúç]/i,
    /^infográfico(\/|$)/i,
  ];
  for (const name of [...dirs.map((d) => `${d}/`), ...files]) {
    if (forbidden.some((re) => re.test(name))) {
      issues.push(`Nome proibido pela nomenclatura do edital (itens 5.2/5.10): ${name}.`);
    }
    if (/[^\x00-\x7F]/.test(name)) {
      issues.push(`Nome com acento ou caractere especial (item 5.2): ${name}.`);
    }
  }
  for (const dir of dirs) {
    if (/[A-Z]/.test(dir)) issues.push(`Pasta deve usar letras minúsculas (item 5.2.1): ${dir}.`);
  }
  const odRoot = path.join(projectDir, "interactivities");
  for (const od of (await fs.readdir(odRoot, { withFileTypes: true }).catch(() => []))) {
    if (!od.isDirectory()) continue;
    const sub = await fs.readdir(path.join(odRoot, od.name), { withFileTypes: true });
    for (const entry of sub.filter((e) => e.isFile() || !["content", "resources"].includes(e.name))) {
      issues.push(`OD ${od.name}: ${entry.name} deve estar em content/ ou resources/ (item 5.10.3.2).`);
    }
  }

  // Itens 5.8.4/5.9.4 — <body> também declara o idioma.
  const contentHtml = files.filter((file) => /^content\/.*\.html$/i.test(file));
  for (const file of ["index.html", ...contentHtml]) {
    const source = file === "index.html" ? html : await readIfExists(path.join(projectDir, file));
    if (!/<body\b[^>]*\blang\s*=/.test(source)) {
      issues.push(`<body lang> ausente em ${file} (itens 5.8.4/5.9.4).`);
    }
  }

  // Item 4.3.6 — sumário nunca abre nova aba/janela.
  const nav = html.match(/<nav\b[^>]*data-book="sumario"[^>]*>[\s\S]*?<\/nav>/i)?.[0] || "";
  if (/(^|\s)target\s*=/i.test(nav)) issues.push("Sumário com target (item 4.3.6): proibido abrir nova aba/janela.");

  return { ok: issues.length === 0, issues };
}
