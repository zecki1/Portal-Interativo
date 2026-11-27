import { describe, expect, it } from "vitest";
import {
  DEFAULT_THEME_TOKENS,
  FALLBACK_THEME,
  contrastRatio,
  resolveProjectTheme,
  shade,
  tokensForMode,
  withAlpha,
} from "./theme";

describe("utilitários de tema", () => {
  it("calcula contraste WCAG", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 0);
    expect(contrastRatio("#777777", "#777777")).toBeCloseTo(1, 5);
  });

  it("escurece e aplica alpha em hex", () => {
    expect(shade("#ffffff", -100)).toBe("#000000");
    expect(withAlpha("#ff0000", 0.5)).toBe("rgba(255, 0, 0, 0.5)");
  });

  it("resolve tema da biblioteca com overrides", () => {
    const { tokens, theme } = resolveProjectTheme(
      { themeId: "sesi", overrides: { primary: "#0055ff", lineHeight: 2 } },
      [FALLBACK_THEME]
    );
    expect(theme.id).toBe("sesi");
    expect(tokens.primary).toBe("#0055ff");
    expect(tokens.lineHeight).toBe(2);
    expect(tokens.paragraphSpacing).toBe(DEFAULT_THEME_TOKENS.paragraphSpacing);
  });

  it("cai no Sesi quando o tema não existe mais", () => {
    const { theme } = resolveProjectTheme({ themeId: "apagado" }, [FALLBACK_THEME]);
    expect(theme.id).toBe("sesi");
  });

  it("resolve paletas por modo com ajustes próprios", () => {
    const themeOverrides = {
      dark: { primary: "#22c55e", bgPage: "#000000" },
      "high-contrast": { primary: "#ff0000" },
    } as const;

    const { tokens, modeTokens, mode } = resolveProjectTheme(
      {
        themeId: "sesi",
        mode: "dark",
        overrides: { primary: "#0055ff" },
        modeOverrides: themeOverrides,
      },
      [FALLBACK_THEME]
    );

    expect(mode).toBe("dark");
    expect(tokens.primary).toBe("#0055ff");
    expect(modeTokens.primary).toBe("#22c55e");
    expect(modeTokens.bgPage).toBe("#000000");
    // Alto contraste parte da paleta acessível e aceita o ajuste do usuário.
    const hc = tokensForMode(tokens, FALLBACK_THEME.dark, "high-contrast", themeOverrides);
    expect(hc.primary).toBe("#ff0000");
    expect(hc.bgPage).toBe("#ffffff");
    expect(hc.border).toBe("#000000");
  });
});
