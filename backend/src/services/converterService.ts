import AdmZip from "adm-zip";
import { XMLParser } from "fast-xml-parser";
import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";

const DATA_DIR = path.join(process.cwd(), "data");
const PROJECTS_DIR = path.join(DATA_DIR, "projects");

export interface ProjectMeta {
  id: string;
  name: string;
  sourceFormat: string;
  createdAt: string;
  fileCount: number;
}

async function ensureDirs() {
  await fs.mkdir(PROJECTS_DIR, { recursive: true });
}

function slugify(s: string) {
  return s.replace(/[^a-zA-Z0-9-_\.]/g, "_").slice(0, 60) || "projeto";
}

export async function convertFile(filePath: string, originalName: string): Promise<ProjectMeta> {
  await ensureDirs();
  const id = randomUUID();
  const projectDir = path.join(PROJECTS_DIR, id);
  await fs.mkdir(projectDir, { recursive: true });
  await fs.mkdir(path.join(projectDir, "assets"), { recursive: true });

  const ext = path.extname(originalName).toLowerCase();
  let title = path.basename(originalName, ext);
  let sections: { heading: string; content: string }[] = [];
  let images: { src: string; alt: string }[] = [];

  if (ext === ".pdf") {
    const outTxt = path.join(projectDir, "extracted.txt");
    const res = spawnSync("pdftotext", ["-layout", filePath, outTxt], { encoding: "utf8" });
    if (res.status !== 0) throw new Error("Falha ao extrair texto do PDF: " + (res.stderr || ""));
    const text = await fs.readFile(outTxt, "utf8").catch(() => "");
    await fs.unlink(outTxt).catch(() => {});
    const pages = text.split(/\f/).map((p) => p.trim()).filter(Boolean);
    pages.forEach((p, i) => {
      sections.push({ heading: `Página ${i + 1}`, content: escapeHtml(p).replace(/\n/g, "<br/>") });
    });
    if (sections.length === 0) sections.push({ heading: "Conteúdo", content: "Nenhum texto extraído." });
  } else if (ext === ".idml") {
    const zip = new AdmZip(filePath);
    const entries = zip.getEntries();
    // extract images
    let imgIndex = 0;
    for (const e of entries) {
      if (e.isDirectory) continue;
      const name = e.entryName.toLowerCase();
      if (/\.(png|jpg|jpeg|gif|svg)$/.test(name)) {
        const base = path.basename(e.entryName);
        const target = path.join(projectDir, "assets", `${imgIndex}_${base}`);
        await fs.writeFile(target, e.getData());
        images.push({ src: `assets/${imgIndex}_${base}`, alt: base });
        imgIndex++;
      }
    }
    // extract text from stories
    const parser = new XMLParser({ ignoreAttributes: false, cdataPropName: "__cdata" });
    const storyEntries = entries.filter((e) => /stories\/story_/i.test(e.entryName) && e.entryName.endsWith(".xml"));
    const texts: string[] = [];
    for (const e of storyEntries) {
      try {
        const xml = e.getData().toString("utf8");
        const obj = parser.parse(xml);
        collectContent(obj, texts);
      } catch {}
    }
    if (texts.length === 0) {
      // fallback: any Content tags
      for (const e of entries) {
        if (e.entryName.endsWith(".xml")) {
          try {
            const xml = e.getData().toString("utf8");
            const obj = parser.parse(xml);
            collectContent(obj, texts);
          } catch {}
        }
      }
    }
    // group into paragraphs
    const paras = texts.map((t) => t.trim()).filter(Boolean);
    if (paras.length === 0) {
      sections.push({ heading: "Conteúdo", content: "Nenhum texto extraído do IDML." });
    } else {
      // chunk into sections of ~8 paragraphs
      const chunkSize = 8;
      for (let i = 0; i < paras.length; i += chunkSize) {
        const chunk = paras.slice(i, i + chunkSize);
        sections.push({ heading: `Seção ${Math.floor(i / chunkSize) + 1}`, content: chunk.map((p) => `<p>${escapeHtml(p)}</p>`).join("") });
      }
    }
  } else if (ext === ".indd") {
    throw new Error("Arquivos .indd não são suportados diretamente. Exporte o documento para IDML ou PDF no InDesign e tente novamente.");
  } else {
    throw new Error("Formato não suportado: " + ext);
  }

  // write project files
  const html = buildHtml(title, sections, images);
  const css = buildCss();
  const js = buildJs();
  await fs.writeFile(path.join(projectDir, "index.html"), html, "utf8");
  await fs.writeFile(path.join(projectDir, "styles.css"), css, "utf8");
  await fs.writeFile(path.join(projectDir, "script.js"), js, "utf8");

  const fileCount = (await fs.readdir(projectDir, { recursive: true })).length;
  const meta: ProjectMeta = { id, name: title, sourceFormat: ext.replace(".", "").toUpperCase(), createdAt: new Date().toISOString(), fileCount };
  await fs.writeFile(path.join(projectDir, "meta.json"), JSON.stringify(meta, null, 2), "utf8");
  return meta;
}

function collectContent(obj: any, out: string[]) {
  if (!obj || typeof obj !== "object") return;
  if (Array.isArray(obj)) {
    for (const item of obj) collectContent(item, out);
    return;
  }
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (key === "Content" || key.endsWith(":Content")) {
      if (typeof val === "string") out.push(val);
      else if (val && typeof val === "object" && val["#text"]) out.push(String(val["#text"]));
      else if (Array.isArray(val)) for (const v of val) collectContent({ Content: v }, out);
    } else {
      collectContent(val, out);
    }
  }
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function buildHtml(title: string, sections: { heading: string; content: string }[], images: { src: string; alt: string }[]) {
  const sectionsHtml = sections.map((s, i) => `
    <section class="accordion">
      <button class="accordion-header" aria-expanded="false">${escapeHtml(s.heading)}</button>
      <div class="accordion-body">${s.content}</div>
    </section>`).join("\n");
  const imagesHtml = images.length
    ? `<div class="gallery">${images.map((im) => `<img src="${im.src}" alt="${escapeHtml(im.alt)}" loading="lazy"/>`).join("")}</div>`
    : "";
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>${escapeHtml(title)}</title>
<link rel="stylesheet" href="styles.css"/>
</head>
<body>
<header><h1>${escapeHtml(title)}</h1></header>
<main>
${imagesHtml}
${sectionsHtml}
</main>
<script src="script.js"></script>
</body>
</html>`;
}

function buildCss() {
  return `*{box-sizing:border-box}body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;margin:0;background:#f7f7f9;color:#222;line-height:1.6}
header{background:#1e3a8a;color:#fff;padding:24px;text-align:center}
header h1{margin:0;font-size:1.8rem}
main{max-width:900px;margin:24px auto;padding:0 16px}
.gallery{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px;margin-bottom:24px}
.gallery img{width:100%;height:auto;border-radius:8px;box-shadow:0 2px 6px rgba(0,0,0,.1)}
.accordion{background:#fff;border:1px solid #e5e7eb;border-radius:8px;margin-bottom:12px;overflow:hidden}
.accordion-header{width:100%;text-align:left;padding:14px 18px;font-size:1.05rem;font-weight:600;border:none;background:#fff;cursor:pointer}
.accordion-header:hover{background:#f3f4f6}
.accordion-body{display:none;padding:0 18px 18px;white-space:pre-wrap}
.accordion.open .accordion-body{display:block}
.accordion.open .accordion-header{background:#eef2ff}
`;
}

function buildJs() {
  return `document.querySelectorAll('.accordion-header').forEach(btn => {
  btn.addEventListener('click', () => {
    const sec = btn.parentElement;
    const open = sec.classList.toggle('open');
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
});`;
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
    } catch {}
  }
  metas.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return metas;
}

export async function getProjectDir(id: string) {
  const dir = path.join(PROJECTS_DIR, id);
  await fs.access(path.join(dir, "index.html"));
  return dir;
}

export async function zipProject(id: string): Promise<string> {
  const dir = await getProjectDir(id);
  const zipPath = path.join(PROJECTS_DIR, `${id}.zip`);
  const zip = new AdmZip();
  zip.addLocalFolder(dir);
  zip.writeZip(zipPath);
  return zipPath;
}