import { afterEach, describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { validatePackage } from "./validate.js";

const temporarios: string[] = [];

async function pacoteBase(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "pnld-val-"));
  temporarios.push(dir);
  const html = `<!DOCTYPE html><html lang="pt-br"><head><meta charset="UTF-8"/>
    <meta name="robots" content="noindex, nofollow"/></head>
    <body lang="pt-br"><h1>Obra</h1><p role="doc-pagebreak" data-book="pagina"><span class="page-number">1</span></p>
    <nav id="toc" role="doc-toc" data-book="sumario"><a href="#p1">página 1</a></nav></body></html>`;
  const seg = `<!DOCTYPE html><html lang="pt-br"><head><meta charset="UTF-8"/></head><body lang="pt-br"><main><h2>Segmento</h2><p role="doc-pagebreak" data-book="pagina"><span class="page-number">1</span></p></main></body></html>`;
  const opf = `<?xml version="1.0" encoding="UTF-8"?><package version="3.0" xmlns="http://www.idpf.org/2007/opf">
    <metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>Obra</dc:title><dc:language>pt-br</dc:language>
    <dc:publisher>SESI</dc:publisher><dc:date>2026</dc:date><dc:creator>SESI</dc:creator>
    <dc:description>Obra</dc:description><dc:identifier>urn:uuid:teste</dc:identifier>
    <meta property="schema:accessibilityFeature">structuredNavigation</meta></metadata>
    <manifest><item id="p1" href="content/01-segmento.html" media-type="application/xhtml+xml"/></manifest>
    <spine toc="ncx"><itemref idref="p1"/></spine></package>`;
  const ncx = `<?xml version="1.0"?><ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
    <navMap><navPoint id="np1" playOrder="1"><navLabel><text>Segmento</text></navLabel>
    <content src="content/01-segmento.html"/></navPoint></navMap></ncx>`;
  await Promise.all(
    ["content", "resources/styles", "resources/scripts", "resources/audios"].map((p) =>
      fs.mkdir(path.join(dir, p), { recursive: true }),
    ),
  );
  await Promise.all([
    fs.writeFile(path.join(dir, "index.html"), html),
    fs.writeFile(path.join(dir, "cover.jpg"), "x".repeat(2000)),
    fs.writeFile(path.join(dir, "content.opf"), opf),
    fs.writeFile(path.join(dir, "toc.ncx"), ncx),
    fs.writeFile(path.join(dir, "content/01-segmento.html"), seg),
    fs.writeFile(path.join(dir, "resources/styles/styles.css"), ""),
    fs.writeFile(path.join(dir, "resources/scripts/script.js"), ""),
  ]);
  return dir;
}

afterEach(async () => {
  await Promise.all(temporarios.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

describe("Validador PNLD — nomenclatura e estrutura do edital", () => {
  it("aceita cover.jpg, interactivities na raiz e pastas sem acento", async () => {
    const dir = await pacoteBase();
    await fs.mkdir(path.join(dir, "interactivities/carrossel/content"), { recursive: true });
    await fs.mkdir(path.join(dir, "interactivities/carrossel/resources"), { recursive: true });
    const result = await validatePackage(dir);
    expect(result.issues).toEqual([]);
  });

  it("reprova contente/, contente.opf, resources/interactivities e pastas acentuadas", async () => {
    const dir = await pacoteBase();
    await fs.mkdir(path.join(dir, "contente"), { recursive: true });
    await fs.writeFile(path.join(dir, "contente.opf"), "<package/>");
    await fs.mkdir(path.join(dir, "resources/interactivities"), { recursive: true });
    await fs.mkdir(path.join(dir, "resources/áudios"), { recursive: true });
    const texto = (await validatePackage(dir)).issues.join("\n");
    expect(texto).toContain("contente/");
    expect(texto).toContain("contente.opf");
    expect(texto).toContain("resources/interactivities");
    expect(texto).toContain("resources/áudios");
  });

  it("reprova HTML sem <body lang> e OD com arquivo fora de content/resources", async () => {
    const dir = await pacoteBase();
    await fs.writeFile(
      path.join(dir, "content/pagina_001.html"),
      '<!DOCTYPE html><html lang="pt-br"><body><main><p>oi</p></main></body></html>',
    );
    await fs.mkdir(path.join(dir, "interactivities/quiz"), { recursive: true });
    await fs.writeFile(path.join(dir, "interactivities/quiz/quiz.html"), "<p>quiz</p>");
    const texto = (await validatePackage(dir)).issues.join("\n");
    expect(texto).toContain("<body lang> ausente em content/pagina_001.html");
    expect(texto).toContain("quiz.html deve estar em content/ ou resources/");
  });
});
