import { describe, expect, it } from "vitest";
import {
  DEFAULT_THEME_TOKENS,
  FALLBACK_THEME,
  contrastRatio,
  resolveProjectTheme,
  shade,
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
});
