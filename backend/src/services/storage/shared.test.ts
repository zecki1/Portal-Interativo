import { describe, expect, it } from "vitest";
import { buildStorageObject, kindFromMime, safeSegment } from "./shared.js";

describe("storage/shared", () => {
  it("gera caminho mapeável por tipo/categoria/data/projeto", () => {
    const meta = buildStorageObject(
      { name: "Minha Imagem.PNG", contentType: "image/png", size: 10, category: "Capas", projectId: "Proj 1" },
      Buffer.from("abc"),
      new Date("2026-11-27T15:00:00.000Z"),
    );
    expect(meta.kind).toBe("image");
    expect(meta.category).toBe("Capas");
    expect(meta.projectId).toBe("Proj_1");
    expect(meta.blobName).toMatch(/^image\/Capas\/y=2026\/m=11\/d=27\/Proj_1\/2026-11-27T15-00-00-000Z_Minha_Imagem\.PNG$/);
    expect(meta.checksumSha256).toHaveLength(64);
  });

  it("infere kind por mime/extensão e sanitiza segmento", () => {
    expect(kindFromMime("application/pdf", "x.bin")).toBe("document");
    expect(kindFromMime("application/octet-stream", "audio.mp3")).toBe("audio");
    expect(safeSegment("  Áção/Projeto #1  ")).toBe("Acao_Projeto_1");
  });
});
