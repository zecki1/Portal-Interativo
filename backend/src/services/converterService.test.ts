import { describe, it, expect } from "vitest";
import AdmZip from "adm-zip";
import * as converter from "./converterService.js";
import { buildExemploDocument } from "./blocks/exemploDocument.js";
import { buildApp } from "../app.js";

describe("Converter Service & Block Architecture", () => {
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
    try {
      const createRes = await app.inject({ method: "POST", url: "/api/v1/projects/exemplo" });
      expect(createRes.statusCode).toBe(201);
      createdId = createRes.json().data.id;

      const noSlash = await app.inject({ method: "GET", url: `/api/v1/projects/${createdId}/preview` });
      expect(noSlash.statusCode).toBe(302);
      expect(noSlash.headers.location).toBe(`/api/v1/projects/${createdId}/preview/`);

      const withSlash = await app.inject({ method: "GET", url: `/api/v1/projects/${createdId}/preview/` });
      expect(withSlash.statusCode).toBe(200);
      expect(withSlash.headers["content-security-policy"]).toContain("frame-ancestors");
      expect(withSlash.body).toContain('id="page-content"');

      const css = await app.inject({ method: "GET", url: `/api/v1/projects/${createdId}/preview/styles.css` });
      expect(css.statusCode).toBe(200);

      const js = await app.inject({ method: "GET", url: `/api/v1/projects/${createdId}/preview/script.js` });
      expect(js.statusCode).toBe(200);

      const svg = await app.inject({
        method: "GET",
        url: `/api/v1/projects/${createdId}/preview/assets/exemplo-galeria-2.svg`,
      });
      expect(svg.statusCode).toBe(200);
      expect(svg.headers["content-type"]).toContain("image/svg+xml");

      const dl = await app.inject({ method: "GET", url: `/api/v1/projects/${createdId}/download` });
      expect(dl.statusCode).toBe(200);
      expect(dl.headers["content-type"]).toContain("application/zip");

      const zip = new AdmZip(dl.rawPayload);
      const entryNames = zip.getEntries().map((e) => e.entryName);
      expect(entryNames).toContain("index.html");
      expect(entryNames).toContain("styles.css");
      expect(entryNames).toContain("script.js");
      expect(entryNames).toContain("assets/exemplo-galeria-2.svg");
    } finally {
      if (createdId) await converter.deleteProject(createdId);
      await app.close();
    }
  });
});
