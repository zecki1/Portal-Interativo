import { describe, expect, it } from "vitest";
import { assetUrl } from "./assetUrl";

describe("assetUrl", () => {
  const api = "/zecki/api/v1";

  it("prefixa caminhos relativos do preview", () => {
    expect(assetUrl(api, "abc", "assets/img_1_foto.png")).toBe(
      "/zecki/api/v1/projects/abc/preview/assets/img_1_foto.png"
    );
  });

  it("codifica nomes com espaço e acento", () => {
    expect(assetUrl(api, "abc", "assets/minha foto ç.png")).toBe(
      "/zecki/api/v1/projects/abc/preview/assets/minha%20foto%20%C3%A7.png"
    );
  });

  it("não prefixa URLs externas, data: ou blob:", () => {
    expect(assetUrl(api, "abc", "https://exemplo.com/a.png")).toBe("https://exemplo.com/a.png");
    expect(assetUrl(api, "abc", "data:image/png;base64,AAA")).toBe("data:image/png;base64,AAA");
    expect(assetUrl(api, "abc", "blob:http://x/y")).toBe("blob:http://x/y");
  });

  it("retorna vazio sem src", () => {
    expect(assetUrl(api, "abc")).toBe("");
  });
});
