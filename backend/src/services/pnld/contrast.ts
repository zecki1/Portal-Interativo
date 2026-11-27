/**
 * Auditoria automática de contraste dos temas embutidos (Anexo 03, 7.5.2).
 * Texto ≥ 4.5:1; componentes não textuais ≥ 3:1.
 */

import { BUILTIN_THEMES, readableInk, type Theme, type ThemeTokens } from "../themes.js";
import { contrastRatio } from "./semantics.js";

export interface ContrastFinding {
  theme: string;
  mode: string;
  pair: string;
  ratio: number;
  minimum: number;
}

interface Pair {
  name: string;
  fg: keyof ThemeTokens;
  bg: keyof ThemeTokens;
  minimum: number;
}

const TEXT_PAIRS: Pair[] = [
  { name: "texto principal / fundo", fg: "textMain", bg: "bgPage", minimum: 4.5 },
  { name: "texto principal / superfície", fg: "textMain", bg: "bgSurface", minimum: 4.5 },
  { name: "texto secundário / fundo", fg: "textMuted", bg: "bgPage", minimum: 4.5 },
  { name: "link / fundo", fg: "link", bg: "bgPage", minimum: 4.5 },
];

const NON_TEXT_PAIRS: Pair[] = [
  { name: "botão / fundo", fg: "primary", bg: "bgPage", minimum: 3 },
];

function auditTokens(themeId: string, mode: string, tokens: ThemeTokens): ContrastFinding[] {
  const findings: ContrastFinding[] = [];
  const check = (name: string, fg: string, bg: string, minimum: number) => {
    const ratio = contrastRatio(fg, bg);
    if (ratio < minimum) findings.push({ theme: themeId, mode, pair: name, ratio, minimum });
  };

  for (const pair of [...TEXT_PAIRS, ...NON_TEXT_PAIRS]) {
    const fg = tokens[pair.fg];
    const bg = tokens[pair.bg];
    if (typeof fg === "string" && typeof bg === "string") {
      check(pair.name, fg, bg, pair.minimum);
    }
  }
  // Cor do texto sobre o botão é calculada (readableInk), não o token primaryInk.
  check("texto do botão / botão", readableInk(tokens.primary), tokens.primary, 4.5);
  return findings;
}

/** Verifica claro e escuro de um tema. */
export function auditThemeContrast(theme: Theme): ContrastFinding[] {
  return [
    ...auditTokens(theme.id, "light", theme.tokens),
    ...auditTokens(theme.id, "dark", { ...theme.tokens, ...(theme.dark || {}) }),
  ];
}

/** Verifica os 7 temas embutidos. Alto contraste já é forçado em `tokensForMode`. */
export function auditAllThemes(): ContrastFinding[] {
  return BUILTIN_THEMES.flatMap(auditThemeContrast);
}
