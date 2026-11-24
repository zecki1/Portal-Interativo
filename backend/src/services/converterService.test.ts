import { describe, it, expect } from "vitest";
import * as converter from "./converterService.js";

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
});
