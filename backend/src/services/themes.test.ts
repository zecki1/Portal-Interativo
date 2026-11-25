import { describe, expect, it } from "vitest";
import {
  buildThemeCss,
  createTheme,
  deleteTheme,
  listThemes,
  resolveThemeForProject,
  sanitizeCss,
} from "./themes.js";

describe("biblioteca de temas", () => {
  it("lista os cinco presets embutidos", async () => {
    const list = await listThemes();
    const ids = list.filter((t) => t.builtin).map((t) => t.id);
    expect(ids).toEqual(
      expect.arrayContaining(["sesi", "editora", "noturno", "alto-contraste", "ludico"])
    );
  });

  it("resolve projeto antigo (primaryColor) para o preset Sesi", async () => {
    const theme = await resolveThemeForProject({
      primaryColor: "#123456",
      fontFamily: "Georgia, serif",
      mode: "light",
    });
    expect(theme.id).toBe("sesi");
    expect(theme.tokens.primary).toBe("#123456");
    expect(theme.tokens.fontBody).toBe("Georgia, serif");
  });

  it("aplica overrides do projeto sem alterar a biblioteca", async () => {
    const theme = await resolveThemeForProject({
      themeId: "sesi",
      overrides: { paragraphSpacing: 30, primary: "#0055ff" },
    });
    expect(theme.tokens.paragraphSpacing).toBe(30);
    expect(theme.tokens.primary).toBe("#0055ff");
    expect(theme.name).toBe("Sesi");
  });

  it("cria, atualiza e exclui um tema personalizado", async () => {
    const created = await createTheme({ basedOn: "editora" });
    expect(created.builtin).toBe(false);
    expect(created.name).toMatch(/Personalizado/);

    const withCss = { ...created, customCss: ".x { color: red; }" };
    const css = buildThemeCss({ ...withCss, mode: "light" });
    expect(css).toContain("Tema: ");
    expect(css).toContain(".x { color: red; }");
    expect(css).toContain("--font-size-base:");

    await deleteTheme(created.id);
    const list = await listThemes();
    expect(list.some((t) => t.id === created.id)).toBe(false);
  });

  it("bloqueia injeção em tokens e CSS", async () => {
    const theme = await createTheme({
      basedOn: "sesi",
      tokens: { primary: "red;} body{display:none", baseSize: 900 },
    });
    expect(theme.tokens.primary).toBe("#d42731");
    expect(theme.tokens.baseSize).toBe(32);
    await deleteTheme(theme.id);

    const sanitized = sanitizeCss(
      "@import url(https://x.test/a.css); .a{background:url(javascript:alert(1))}"
    );
    expect(sanitized.css).not.toContain("@import url");
    expect(sanitized.css).not.toContain("javascript:");
    expect(sanitized.warnings.length).toBeGreaterThan(0);
  });
});
