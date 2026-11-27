import { describe, it, expect } from "vitest";
import path from "node:path";
import os from "node:os";
import fs from "node:fs/promises";
import AdmZip from "adm-zip";
import * as converter from "./converterService.js";
import { buildExemploDocument } from "./blocks/exemploDocument.js";
import { PROJX_JS, renderProjxBlock } from "./blocks/projxBlocks.js";
import { buildApp } from "../app.js";
import { contrastRatio, shortenUrl } from "./pnld/semantics.js";
import { buildContentOpf, buildPageFileHtml, buildTocNcx, writeCover } from "./pnld/package.js";
import { validatePackage } from "./pnld/validate.js";
import { auditAllThemes } from "./pnld/contrast.js";

const exemploPath = (name: string) => path.resolve(__dirname, "../../../exemplos", name);

describe("Converter Service & Block Architecture", () => {
  it("deve exibir um aviso para imagens de quebra-cabeça indisponíveis sem exigir CORS no canvas", () => {
    const html = renderProjxBlock({
      id: "puzzle-test",
      type: "puzzle",
      data: {
        title: "Quebra-cabeça",
        image: "https://example.com/image.webp",
        size: 4,
      },
    });

    expect(html).toContain('class="px-pz-error" role="status" hidden');
    expect(html).toContain("Verifique se o link aponta para uma imagem acessível.");
    expect(PROJX_JS).not.toContain('img.crossOrigin = "anonymous"');
    expect(PROJX_JS).toContain('error.hidden = false');
    expect(PROJX_JS).toContain("canvas.width / rect.width");
    expect(PROJX_JS).toContain("var lx = p0.x - p.x, ly = p0.y - p.y;");
    expect(PROJX_JS).toContain("var m=inv ? 1-e.pos : e.pos");
    expect(PROJX_JS).toContain("ctx.drawImage(p.canvas, p.x - p.pad, p.y - p.pad)");
  });

  it("deve gerar HTML5 com metadados, TOC, paginação e data-book (Anexo 03 PNLD)", async () => {
    const doc: converter.ProjectDocument = {
      id: "pnld-doc",
      title: "Livro PNLD",
      description: "Descrição da obra",
      author: "Editora SESI",
      fonts: [{ family: "Fonte Local", url: "resources/fontes/FonteLocal.woff2", format: "woff2" }],
      sourceFormat: "MANUAL",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      theme: {
        primaryColor: "#d42731",
        fontFamily: "system-ui, sans-serif",
        mode: "light",
      },
      assets: [],
      pages: [
        {
          id: "p1",
          pageNumber: 1,
          role: "capa",
          title: "Capa",
          blocks: [{ id: "b1", type: "heading", data: { level: 1, text: "Título" } }],
        },
        {
          id: "p2",
          pageNumber: 2,
          role: "conteudo",
          title: "Capítulo 1",
          blocks: [
            { id: "b2", type: "quiz", data: { question: "Pergunta?", options: [] } },
            {
              id: "b3",
              type: "glossary",
              data: {
                title: "Glossário",
                items: [{ term: "Erosão", definition: "Desgaste do solo.", refId: "gl-1" }],
              },
            },
            {
              id: "b4",
              type: "footnotes",
              data: { items: [{ contentHtml: "Nota explicativa.", refId: "ft-1" }] },
            },
            {
              id: "b5",
              type: "table",
              data: { caption: "Tabela de exemplos", headers: ["A", "B"], rows: [["1", "2"]] },
            },
            {
              id: "b6",
              type: "image",
              data: {
                src: "assets/qr.png",
                alt: "QR Code",
                decorative: true,
                textAlternative: "https://exemplo.sesi.org.br/conteudo",
              },
            },
            {
              id: "b7",
              type: "math",
              data: {
                mathml: "<math><mrow><mi>x</mi><mo>+</mo><mn>1</mn></mrow></math>",
                description: "x mais um",
              },
            },
            {
              id: "b8",
              type: "video",
              data: { source: "youtube", url: "https://www.youtube.com/watch?v=abc", title: "Vídeo" },
            },
            {
              id: "b9",
              type: "external-embed",
              data: { embedUrl: "https://terceiro.exemplo/od", title: "OD externo" },
            },
          ],
        },
        {
          id: "p3",
          pageNumber: 3,
          role: "atividade",
          title: "Atividade",
          pageLabel: "XXIV",
          pageLabelSpelled: "vinte e quatro",
          isProfessorPage: true,
          isEmpty: true,
          blocks: [],
        },
      ],
    };

    const html = await converter.buildHtmlFromDoc(doc);

    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain('lang="pt-BR"');
    expect(html).toContain('<body lang="pt-BR">');
    expect(html).toContain('<meta name="description" content="Descrição da obra"/>');
    expect(html).toContain('<meta name="author" content="Editora SESI"/>');
    expect(html).toContain('<meta name="robots" content="noindex, nofollow"/>');
    expect(html).toContain('<nav id="toc" role="doc-toc" class="nav-list" aria-label="Sumário" data-book="sumario">');
    expect(html).toContain('<h1 class="sr-only">Livro PNLD</h1>');
    expect(html).toContain('role="doc-pagebreak" data-book="pagina"');
    expect(html).toContain('<span class="sr-only">página </span>');
    expect(html).toContain('<span class="page-number">1</span>');
    expect(html).toContain('aria-label="vinte e quatro"');
    expect(html).toContain(">XXIV</span>");
    expect(html).toContain('<span class="sr-only"> MP</span>');
    expect(html).toContain('data-book="capa"');
    expect(html).toContain('data-book="titulo-capitulo"');
    expect(html).toContain('data-book="interatividade"');
    expect(html).toContain('class="nav-od"');
    expect(html).toContain('data-book="glossario"');
    expect(html).toContain('data-book="glossario-retorno"');
    expect(html).toContain('data-book="notas-rodape"');
    expect(html).toContain('data-book="nota-retorno"');
    expect(html).toContain("<caption>Tabela de exemplos</caption>");
    expect(html).not.toContain("<figcaption>Tabela de exemplos</figcaption>");
    expect(html).toContain('alt="" class="" data-caption="" loading="lazy" role="presentation"');
    expect(html).toContain('data-book="texto-alternativo"');
    expect(html).toContain("https://exemplo.sesi.org.br/conteudo");
    expect(html).toContain('role="math" aria-label="x mais um"');
    expect(html).toContain("<math>");
    expect(html).toContain('class="resource-warning"');
    expect(html).toContain('<script src="resources/scripts/script.js"></script>');
    expect(html).not.toContain("youtube-nocookie");
    expect(html).not.toContain("https://terceiro.exemplo/od");
    expect(html).toContain('<section id="page-');
    expect(html).not.toContain('<article id="page-');
    expect(html).not.toContain('class="page-badge"');

    const css = await converter.buildCssFromDoc(doc);
    expect(css).toContain('font-family: "Fonte Local"');
    expect(css).toContain('url("resources/fontes/FonteLocal.woff2")');
  });

  it("deve calcular contraste WCAG das paletas forçadas (Anexo 03, 7.5.2)", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 1);
    expect(contrastRatio("#0033cc", "#ffffff")).toBeGreaterThan(4.5);
    expect(contrastRatio("#767676", "#ffffff")).toBeGreaterThanOrEqual(4.5);
  });

  it("deve aprovar o contraste dos 7 temas embutidos nos modos claro e escuro", () => {
    expect(auditAllThemes()).toEqual([]);
  });

  it("deve encurtar URLs de forma determinística para o apêndice PNLD", () => {
    const url = "https://exemplo.sesi.org.br/material/completo";
    expect(shortenUrl(url)).toBe(shortenUrl(url));
    expect(shortenUrl(url)).toMatch(/^https:\/\/go\.sesi\.org\.br\/[0-9a-z]+$/);
    expect(shortenUrl(url)).not.toBe(shortenUrl(url + "?outro"));
  });

  it("deve criar e salvar um documento estruturado por blocos", async () => {
    const doc: converter.ProjectDocument = {
      id: "test-doc-123",
      title: "Livro de Teste Interativo",
      sourceFormat: "PDF",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      theme: {
        primaryColor: "#d42731",
        fontFamily: "system-ui, sans-serif",
        mode: "light",
      },
      assets: [
        {
          id: "ast-1",
          fileName: "test_img.jpg",
          path: "assets/test_img.jpg",
          mimeType: "image/jpeg",
          altText: "Imagem de teste",
        },
      ],
      pages: [
        {
          id: "page-1",
          pageNumber: 1,
          title: "Capítulo 1",
          blocks: [
            {
              id: "blk-1",
              type: "heading",
              data: { level: 1, text: "Introdução à Robótica" },
            },
            {
              id: "blk-2",
              type: "paragraph",
              data: { html: "Robótica é uma área interdisciplinar..." },
            },
            {
              id: "blk-3",
              type: "accordion",
              data: {
                title: "Conceitos Básicos",
                items: [
                  {
                    id: "it-1",
                    title: "Sensores",
                    contentHtml: "Dispositivos que captam estímulos.",
                    defaultOpen: true,
                  },
                ],
              },
            },
            {
              id: "blk-4",
              type: "quiz",
              data: {
                question: "O que é um atuador?",
                options: [
                  { id: "opt-1", text: "Dispositivo que realiza movimento", isCorrect: true },
                  { id: "opt-2", text: "Uma bateria", isCorrect: false },
                ],
                explanation: "Atuadores transformam energia em movimento mecânico.",
              },
            },
          ],
        },
      ],
    };

    await converter.saveProjectDocument(doc);

    // Valida que o documento persistido é recuperado com fidelidade
    const loaded = await converter.getProjectDocument("test-doc-123");
    expect(loaded.id).toBe("test-doc-123");
    expect(loaded.title).toBe("Livro de Teste Interativo");
    expect(loaded.pages.length).toBe(1);
    expect(loaded.pages[0].blocks.length).toBe(4);
    expect(loaded.pages[0].blocks[3].type).toBe("quiz");

    // Valida metadados
    const meta = converter.getProjectMeta(loaded);
    expect(meta.pageCount).toBe(1);
    expect(meta.blockCount).toBe(4);
    expect(meta.assetCount).toBe(1);

    // Pacote PNLD completo gravado em disco
    const projectDir = await converter.getProjectDir("test-doc-123");
    for (const file of [
      "index.html",
      "cover.jpg",
      "content.opf",
      "toc.ncx",
      "content",
      "interactivities",
      "resources/styles/styles.css",
      "resources/scripts/script.js",
    ]) {
      await expect(fs.stat(path.join(projectDir, file))).resolves.toBeTruthy();
    }
    const validation = await validatePackage(projectDir);
    expect(validation.issues).toEqual([]);
    expect(validation.ok).toBe(true);

    // Limpeza
    await converter.deleteProject("test-doc-123");
  });

  it("deve gerar o material de exemplo com todos os blocos e servir preview e export zip", async () => {
    const doc = buildExemploDocument("exemplo-check");
    const types = new Set(doc.pages.flatMap((p) => p.blocks.map((b) => b.type)));
    const expectedTypes: converter.BlockType[] = [
      "heading",
      "paragraph",
      "image",
      "accordion",
      "tabs",
      "callout",
      "video",
      "quiz",
      "external-embed",
      "flipcard",
      "timeline",
      "table",
      "cover",
      "parallax",
      "gallery",
      "image-text-card",
      "highlight",
      "code",
      "multiple-choice",
      "true-false",
      "fill-blanks",
      "ordering",
      "matching",
      "memory-game",
      "word-search",
      "crossword",
    ];
    for (const t of expectedTypes) {
      expect(types.has(t)).toBe(true);
    }

    const callouts = new Set(
      doc.pages.flatMap((p) =>
        p.blocks.filter((b) => b.type === "callout").map((b) => (b as Extract<converter.Block, { type: "callout" }>).data.variant)
      )
    );
    expect(callouts.size).toBe(11);

    const app = await buildApp();
    let createdId = "";
    // autentica para as rotas protegidas
    const loginRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: "zecki1@hotmail.com", password: "Mudar123@-" },
    });
    const token = loginRes.json().data.accessToken as string;
    const authHeaders = { authorization: `Bearer ${token}` };
    try {
      const createRes = await app.inject({ method: "POST", url: "/api/v1/projects/exemplo", headers: authHeaders });
      expect(createRes.statusCode).toBe(201);
      createdId = createRes.json().data.id;

      const noSlash = await app.inject({ method: "GET", url: `/api/v1/projects/${createdId}/preview` });
      expect(noSlash.statusCode).toBe(302);

      const withSlash = await app.inject({ method: "GET", url: `/api/v1/projects/${createdId}/preview/` });
      expect(withSlash.statusCode).toBe(200);

      const dl = await app.inject({ method: "GET", url: `/api/v1/projects/${createdId}/download`, headers: authHeaders });
      expect(dl.statusCode).toBe(200);
      expect(dl.headers["content-type"]).toContain("application/zip");

      const zip = new AdmZip(dl.rawPayload);
      const entryNames = zip.getEntries().map((e) => e.entryName);
      expect(entryNames).toContain("index.html");
      expect(entryNames).toContain("styles.css");
      expect(entryNames).toContain("script.js");
      expect(entryNames).toContain("assets/exemplo-galeria-2.svg");
      expect(entryNames.some((n) => n.startsWith("versions/"))).toBe(false);

      // Valida ausência de gradientes no HTML/CSS/SVG gerado
      const html = zip.readAsText("index.html");
      const cssText = zip.readAsText("styles.css");
      const capaSvg = zip.readAsText("assets/exemplo-capa.svg");
      const faixaSvg = zip.readAsText("assets/exemplo-faixa.svg");
      expect(html + cssText + capaSvg + faixaSvg).not.toMatch(/linear-gradient|radial-gradient|linearGradient/i);
    } finally {
      if (createdId) await converter.deleteProject(createdId);
      await app.close();
    }
  });

  it("deve importar ET_EF1_OD_ID386.idml com tabelas, links e MasterSpread em C2 (layout flow)", async () => {
    const app = await buildApp();
    let id386 = "";
    let idC2 = "";
    try {
      const meta386 = await converter.convertFile(exemploPath("ET_EF1_OD_ID386.idml"), "ET_EF1_OD_ID386.idml");
      id386 = meta386.id;
      const doc386 = await converter.getProjectDocument(id386);
      // Padrão atual: flow (empilha os blocos, evita cartões fora de visualização).
      expect(doc386.layoutMode ?? "flow").toBe("flow");
      expect(doc386.pages.length).toBe(10);
      expect(doc386.pages.some((p) => p.blocks.some((b) => b.type === "table"))).toBe(true);
      const htmlRes = await app.inject({ method: "GET", url: `/api/v1/projects/${id386}/preview/` });
      expect(htmlRes.statusCode).toBe(200);
      expect(htmlRes.body).toContain("book-page");
      expect(htmlRes.body).toContain("btn-nav-toggle");

      const metaC2 = await converter.convertFile(exemploPath("ET_EF1_ME_C2.idml"), "ET_EF1_ME_C2.idml");
      idC2 = metaC2.id;
      const docC2 = await converter.getProjectDocument(idC2);
      expect(docC2.pages.some((p) => p.blocks.length > 0)).toBe(true);
    } finally {
      if (id386) await converter.deleteProject(id386);
      if (idC2) await converter.deleteProject(idC2);
      await app.close();
    }
  });

  it("deve versionar projeto e restaurar estado anterior via rollback", async () => {
    const meta = await converter.createExemploProject();
    const id = meta.id;
    try {
      const v1 = await converter.createProjectVersion(id, "Antes de editar titulo", "manual");
      const doc = await converter.getProjectDocument(id);
      const originalTitle = doc.title;
      doc.title = "Titulo alterado temporariamente";
      await converter.saveProjectDocument(doc);

      const edited = await converter.getProjectDocument(id);
      expect(edited.title).toBe("Titulo alterado temporariamente");

      const restored = await converter.restoreProjectVersion(id, v1.id);
      expect(restored.title).toBe(originalTitle);

      const versions = await converter.listProjectVersions(id);
      expect(versions.some((v) => v.id === v1.id)).toBe(true);
      expect(versions.some((v) => v.kind === "rollback")).toBe(true);
    } finally {
      await converter.deleteProject(id);
    }
  });

  it("deve gerar OPF, NCX e capa do pacote PNLD (Anexo 03, seção 5)", async () => {
    const doc: converter.ProjectDocument = {
      id: "pnld-pacote",
      title: "Livro do Pacote",
      description: "Descrição",
      author: "Autor",
      publisher: "Editora SESI",
      sourceFormat: "MANUAL",
      createdAt: "2026-03-01T00:00:00.000Z",
      updatedAt: "2026-03-02T00:00:00.000Z",
      theme: { mode: "light" },
      assets: [],
      pages: [
        { id: "p1", pageNumber: 1, role: "capa", title: "Capa", blocks: [] },
        { id: "p2", pageNumber: 2, role: "conteudo", title: "Capítulo 1", blocks: [] },
      ],
    };
    const pageFiles = ["content/01-segmento.html", "content/02-segmento.html"];

    const opf = buildContentOpf(doc, { images: ["resources/images/a.jpg"], pageFiles });
    expect(opf).toContain("<dc:title>Livro do Pacote</dc:title>");
    expect(opf).toContain("<dc:publisher>Editora SESI</dc:publisher>");
    expect(opf).toContain("urn:uuid:pnld-pacote");
    expect(opf).toContain('property="schema:accessibilityFeature"');
    expect(opf).toContain('property="schema:accessibilityHazard"');
    expect(opf).toContain('spine toc="ncx"');
    expect(opf).toContain('href="content/02-segmento.html"');

    const ncx = buildTocNcx(doc, pageFiles);
    expect(ncx).toContain("página 1 — Capa");
    expect(ncx).toContain('src="content/02-segmento.html"');

    const pageHtml = buildPageFileHtml(doc, doc.pages[1], 1, ["<p>Conteúdo</p>"]);
    expect(pageHtml).toContain('<h2 data-book="titulo-unidade">Capítulo 1</h2>');
    expect(pageHtml).toContain('<body lang="pt-BR">');
    expect(pageHtml).toContain('href="../resources/styles/styles.css"');
    expect(pageHtml).toContain('src="../resources/scripts/script.js"');

    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "pnld-cover-"));
    try {
      await writeCover(tmp, doc);
      const stat = await fs.stat(path.join(tmp, "cover.jpg"));
      expect(stat.size).toBeGreaterThan(1000);
    } finally {
      await fs.rm(tmp, { recursive: true, force: true });
    }
  });
});
