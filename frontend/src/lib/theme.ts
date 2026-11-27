/**
 * Tipos e utilitários de tema do editor.
 * A fonte da verdade é o backend (`/themes`); este arquivo guarda apenas o
 * fallback para o primeiro carregamento e os helpers de preview.
 */

export type VisualStyle = "flat" | "card" | "editorial" | "playful" | "technical" | "minimal";
export type ThemeMode = "light" | "dark" | "high-contrast";

export interface ThemeTokens {
  primary: string;
  primaryInk: string;
  accent: string;
  bgPage: string;
  bgSurface: string;
  bgSidebar: string;
  textMain: string;
  textMuted: string;
  border: string;
  link: string;
  highlight: string;
  success: string;
  warning: string;
  danger: string;

  fontBody: string;
  fontHeading: string;
  baseSize: number;
  headingScale: number;
  lineHeight: number;
  paragraphSpacing: number;
  blockSpacing: number;
  headingWeight: number;
  headingTransform: "none" | "uppercase";
  headingAccent: "plain" | "bar" | "underline";
  textAlign: "left" | "justify";
  readingWidth: number;

  radius: number;
  borderWidth: number;
  shadow: "none" | "soft" | "medium" | "strong";
  density: "compact" | "comfortable" | "spacious";
  divider: "none" | "line" | "space" | "band";

  visualStyle: VisualStyle;
  bgKind: "solid" | "gradient" | "pattern";
  bgGradient: string;
  bgPattern: "none" | "grid" | "dots" | "diagonal";

  boxStyle: "side" | "full" | "dashed" | "icon";
  buttonStyle: "pill" | "square" | "outline";
  imageFrame: "none" | "border" | "shadow" | "polaroid";
}

export interface Theme {
  id: string;
  name: string;
  builtin: boolean;
  tokens: ThemeTokens;
  dark?: Partial<ThemeTokens>;
  customCss: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectTheme {
  themeId?: string;
  /** Compatibilidade com projetos antigos. */
  primaryColor?: string;
  fontFamily?: string;
  mode?: ThemeMode;
  /** Ajustes do modo claro. */
  overrides?: Partial<ThemeTokens>;
  /** Ajustes por modo (escuro / alto contraste). */
  modeOverrides?: Partial<Record<ThemeMode, Partial<ThemeTokens>>>;
  customCss?: string;
}

export const DEFAULT_THEME_TOKENS: ThemeTokens = {
  primary: "#d42731",
  primaryInk: "#a81a22",
  accent: "#fcd19c",
  bgPage: "#f2f3f5",
  bgSurface: "#ffffff",
  bgSidebar: "#ffffff",
  textMain: "#0c0c0d",
  textMuted: "#5f6773",
  border: "#e3e3e3",
  link: "#a81a22",
  highlight: "#fde68a",
  success: "#009f5e",
  warning: "#b45309",
  danger: "#b91c1c",
  fontBody: '"Open Sans", system-ui, -apple-system, sans-serif',
  fontHeading: '"Open Sans", system-ui, -apple-system, sans-serif',
  baseSize: 16,
  headingScale: 1,
  lineHeight: 1.65,
  paragraphSpacing: 12,
  blockSpacing: 26,
  headingWeight: 700,
  headingTransform: "none",
  headingAccent: "bar",
  textAlign: "left",
  readingWidth: 960,
  radius: 12,
  borderWidth: 1,
  shadow: "soft",
  density: "comfortable",
  divider: "space",
  visualStyle: "card",
  bgKind: "solid",
  bgGradient: "linear-gradient(180deg, #ffffff 0%, #eef1f5 100%)",
  bgPattern: "none",
  boxStyle: "side",
  buttonStyle: "pill",
  imageFrame: "shadow",
};

export const FALLBACK_THEME: Theme = {
  id: "sesi",
  name: "Sesi",
  builtin: true,
  tokens: DEFAULT_THEME_TOKENS,
  dark: {},
  customCss: "",
  createdAt: "",
  updatedAt: "",
};

/** Resolve o tema do projeto na biblioteca + overrides do material. */
/** Overrides aplicados em qualquer tema quando o modo é alto contraste. */
export const HIGH_CONTRAST_OVERRIDES: Partial<ThemeTokens> = {
  primary: "#0033cc",
  primaryInk: "#001f80",
  accent: "#ffe600",
  bgPage: "#ffffff",
  bgSurface: "#ffffff",
  bgSidebar: "#ffffff",
  textMain: "#000000",
  textMuted: "#1a1a1a",
  border: "#000000",
  link: "#0033cc",
  highlight: "#ffe600",
  borderWidth: 2,
  shadow: "none",
  radius: 0,
  bgKind: "solid",
};

/**
 * Tokens efetivos para o modo escolhido (claro, escuro ou alto contraste).
 * Usado pelo canvas do editor para que o modo apareça na hora.
 */
export function tokensForMode(
  base: ThemeTokens,
  dark: Partial<ThemeTokens> | undefined,
  mode: ThemeMode,
  modeOverrides?: Partial<Record<ThemeMode, Partial<ThemeTokens>>>
): ThemeTokens {
  if (mode === "high-contrast") {
    return {
      ...base,
      ...HIGH_CONTRAST_OVERRIDES,
      ...(modeOverrides?.["high-contrast"] || {}),
      // Alto contraste sempre sólido, mesmo que o ajuste peça gradiente.
      bgKind: "solid",
    };
  }
  if (mode === "dark") {
    const own = modeOverrides?.dark;
    const merged: ThemeTokens = { ...base, ...(dark || {}), ...(own || {}) };
    // Sem fundo escuro próprio, usa cor sólida em vez do gradiente claro.
    if (!dark?.bgKind && !dark?.bgGradient && !own?.bgKind && !own?.bgGradient) {
      merged.bgKind = "solid";
    }
    return merged;
  }
  return { ...base, ...(modeOverrides?.light || {}) };
}

export function resolveProjectTheme(
  projectTheme: ProjectTheme | undefined,
  library: Theme[]
): { theme: Theme; tokens: ThemeTokens; modeTokens: ThemeTokens; mode: ThemeMode } {
  const base =
    library.find((t) => t.id === projectTheme?.themeId) ||
    library.find((t) => t.id === "sesi") ||
    FALLBACK_THEME;

  const tokens: ThemeTokens = { ...base.tokens };
  if (!projectTheme?.themeId) {
    if (projectTheme?.primaryColor) {
      tokens.primary = projectTheme.primaryColor;
      tokens.link = projectTheme.primaryColor;
    }
    if (projectTheme?.fontFamily) {
      tokens.fontBody = projectTheme.fontFamily;
      tokens.fontHeading = projectTheme.fontFamily;
    }
  }
  if (projectTheme?.overrides) Object.assign(tokens, projectTheme.overrides);

  const mode = projectTheme?.mode || "light";
  return {
    theme: base,
    tokens,
    modeTokens: tokensForMode(tokens, base.dark, mode, projectTheme?.modeOverrides),
    mode,
  };
}

/** Fontes disponíveis no build (locais + web-safe, sem rede). */
export const FONT_OPTIONS: Array<{ label: string; value: string }> = [
  { label: "Open Sans", value: '"Open Sans", system-ui, -apple-system, sans-serif' },
  { label: "OpenDyslexic", value: 'OpenDyslexic, "Open Sans", system-ui, sans-serif' },
  { label: "System UI", value: "system-ui, -apple-system, sans-serif" },
  { label: "Georgia (serifada)", value: 'Georgia, "Times New Roman", serif' },
  { label: "Times New Roman", value: '"Times New Roman", Times, serif' },
  { label: "Verdana", value: "Verdana, Geneva, sans-serif" },
  { label: "Trebuchet MS", value: '"Trebuchet MS", Tahoma, sans-serif' },
  { label: "Courier (mono)", value: '"Courier New", Courier, monospace' },
];

export const ROLE_LABELS: Record<string, string> = {
  conteudo: "Conteúdo",
  capa: "Capa",
  "segunda-capa": "2ª capa",
  "terceira-capa": "3ª capa",
  "quarta-capa": "4ª capa",
  subcapa: "Subcapa",
  atividade: "Atividade",
  encerramento: "Encerramento",
  "apresentacao": "Apresentação",
  "ficha-catalografica": "Ficha catalográfica",
  "lista-ods": "Lista de ODs",
  "lista-urls": "Lista de URLs",
  creditos: "Créditos",
  sumario: "Sumário",
};

export const MODE_OPTIONS: Array<{ label: string; value: ThemeMode }> = [
  { label: "Claro", value: "light" },
  { label: "Escuro", value: "dark" },
  { label: "Alto contraste", value: "high-contrast" },
];

export const VISUAL_STYLE_OPTIONS: Array<{ label: string; value: VisualStyle }> = [
  { label: "Cartão", value: "card" },
  { label: "Flat", value: "flat" },
  { label: "Editorial", value: "editorial" },
  { label: "Lúdico", value: "playful" },
  { label: "Técnico", value: "technical" },
  { label: "Minimalista", value: "minimal" },
];

/* -------------------------------------------------------------------------- */
/* Helpers de cor (preview)                                                   */
/* -------------------------------------------------------------------------- */

function parseHex(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec((hex || "").trim());
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

export function shade(hex: string, percent: number): string {
  const rgb = parseHex(hex);
  if (!rgb) return hex;
  const target = percent < 0 ? 0 : 255;
  const p = Math.abs(percent) / 100;
  return (
    "#" +
    rgb
      .map((v) => Math.max(0, Math.min(255, Math.round(v + (target - v) * p))).toString(16).padStart(2, "0"))
      .join("")
  );
}

export function withAlpha(hex: string, alpha: number): string {
  const rgb = parseHex(hex);
  if (!rgb) return hex;
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
}

/** Contraste WCAG entre duas cores (1 a 21). */
export function contrastRatio(a: string, b: string): number {
  const lum = (hex: string) => {
    const rgb = parseHex(hex);
    if (!rgb) return 0;
    const [r, g, bl] = rgb.map((v) => {
      const c = v / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const l1 = lum(a);
  const l2 = lum(b);
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}
