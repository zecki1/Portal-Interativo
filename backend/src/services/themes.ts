/**
 * Biblioteca de temas do Portal Interativo.
 *
 * Um tema é um conjunto de tokens (cores, tipografia, forma, fundo) + CSS
 * livre. Os presets `builtin` vivem no código; os temas criados pelo usuário
 * ficam em `data/themes/<id>.json` e valem para todos os projetos.
 *
 * O projeto guarda `themeId` + `overrides` (ajustes só daquele material) +
 * `customCss`. O build resolve os tokens efetivos e gera o CSS final.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

const THEMES_DIR = path.join(process.env.DATA_DIR || path.join(process.cwd(), "data"), "themes");

/* -------------------------------------------------------------------------- */
/* Tipos                                                                      */
/* -------------------------------------------------------------------------- */

export type VisualStyle = "flat" | "card" | "editorial" | "playful" | "technical" | "minimal";
export type PageRole =
  | "conteudo"
  | "capa"
  | "segunda-capa"
  | "terceira-capa"
  | "quarta-capa"
  | "subcapa"
  | "atividade"
  | "encerramento"
  | "creditos"
  | "apresentacao"
  | "ficha-catalografica"
  | "lista-ods"
  | "lista-urls"
  | "sumario";
export type ThemeMode = "light" | "dark" | "high-contrast";

export interface ThemeTokens {
  /* Cor */
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

  /* Leitura */
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

  /* Forma e profundidade */
  radius: number;
  borderWidth: number;
  shadow: "none" | "soft" | "medium" | "strong";
  density: "compact" | "comfortable" | "spacious";
  divider: "none" | "line" | "space" | "band";

  /* Personalidade visual */
  visualStyle: VisualStyle;
  bgKind: "solid" | "gradient" | "pattern";
  bgGradient: string;
  bgPattern: "none" | "grid" | "dots" | "diagonal";

  /* Componentes */
  boxStyle: "side" | "full" | "dashed" | "icon";
  buttonStyle: "pill" | "square" | "outline";
  imageFrame: "none" | "border" | "shadow" | "polaroid";
}

export interface Theme {
  id: string;
  name: string;
  builtin: boolean;
  tokens: ThemeTokens;
  /** Overrides aplicados apenas no modo escuro. */
  dark?: Partial<ThemeTokens>;
  /** CSS livre do tema, aplicado depois das regras geradas. */
  customCss: string;
  createdAt: string;
  updatedAt: string;
}

/** Formato persistido no projeto (compatível com versões antigas). */
export interface ProjectThemeInput {
  themeId?: string;
  primaryColor?: string;
  fontFamily?: string;
  mode?: ThemeMode;
  /** Ajustes do modo claro. */
  overrides?: Partial<ThemeTokens>;
  /** Ajustes por modo (escuro / alto contraste). */
  modeOverrides?: Partial<Record<ThemeMode, Partial<ThemeTokens>>>;
  customCss?: string;
}

/* -------------------------------------------------------------------------- */
/* Presets                                                                    */
/* -------------------------------------------------------------------------- */

const SESI_TOKENS: ThemeTokens = {
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

const EDITORA_TOKENS: ThemeTokens = {
  primary: "#7a1f2b",
  primaryInk: "#5c1620",
  accent: "#c9a227",
  bgPage: "#f8f4ec",
  bgSurface: "#fffdf8",
  bgSidebar: "#fffdf8",
  textMain: "#231e18",
  textMuted: "#6b6257",
  border: "#ded3c1",
  link: "#7a1f2b",
  highlight: "#f4e3a1",
  success: "#3f6b4a",
  warning: "#8a5a12",
  danger: "#8f1d24",
  fontBody: 'Georgia, "Times New Roman", serif',
  fontHeading: 'Georgia, "Times New Roman", serif',
  baseSize: 17,
  headingScale: 1.05,
  lineHeight: 1.8,
  paragraphSpacing: 16,
  blockSpacing: 30,
  headingWeight: 600,
  headingTransform: "none",
  headingAccent: "underline",
  textAlign: "justify",
  readingWidth: 780,
  radius: 4,
  borderWidth: 1,
  shadow: "none",
  density: "spacious",
  divider: "line",
  visualStyle: "editorial",
  bgKind: "solid",
  bgGradient: "linear-gradient(180deg, #fffdf8 0%, #f3ecdf 100%)",
  bgPattern: "none",
  boxStyle: "icon",
  buttonStyle: "square",
  imageFrame: "border",
};

const NOTURNO_TOKENS: ThemeTokens = {
  primary: "#f43f5e",
  primaryInk: "#fda4af",
  accent: "#38bdf8",
  bgPage: "#0b0f19",
  bgSurface: "#151b2b",
  bgSidebar: "#0f1523",
  textMain: "#e5e7eb",
  textMuted: "#94a3b8",
  border: "#2a3348",
  link: "#93c5fd",
  highlight: "#713f12",
  success: "#34d399",
  warning: "#fbbf24",
  danger: "#fb7185",
  fontBody: '"Open Sans", system-ui, -apple-system, sans-serif',
  fontHeading: '"Open Sans", system-ui, -apple-system, sans-serif',
  baseSize: 16,
  headingScale: 1,
  lineHeight: 1.7,
  paragraphSpacing: 12,
  blockSpacing: 26,
  headingWeight: 700,
  headingTransform: "none",
  headingAccent: "bar",
  textAlign: "left",
  readingWidth: 960,
  radius: 14,
  borderWidth: 1,
  shadow: "strong",
  density: "comfortable",
  divider: "space",
  visualStyle: "card",
  bgKind: "gradient",
  bgGradient: "linear-gradient(180deg, #0b0f19 0%, #111827 60%, #0b0f19 100%)",
  bgPattern: "none",
  boxStyle: "full",
  buttonStyle: "pill",
  imageFrame: "shadow",
};

const ALTO_CONTRASTE_TOKENS: ThemeTokens = {
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
  success: "#006400",
  warning: "#6b4400",
  danger: "#a00000",
  fontBody: "system-ui, -apple-system, sans-serif",
  fontHeading: "system-ui, -apple-system, sans-serif",
  baseSize: 18,
  headingScale: 1.15,
  lineHeight: 1.8,
  paragraphSpacing: 16,
  blockSpacing: 30,
  headingWeight: 800,
  headingTransform: "none",
  headingAccent: "bar",
  textAlign: "left",
  readingWidth: 900,
  radius: 0,
  borderWidth: 2,
  shadow: "none",
  density: "spacious",
  divider: "line",
  visualStyle: "flat",
  bgKind: "solid",
  bgGradient: "",
  bgPattern: "none",
  boxStyle: "full",
  buttonStyle: "square",
  imageFrame: "border",
};

const LUDICO_TOKENS: ThemeTokens = {
  primary: "#7c3aed",
  primaryInk: "#5b21b6",
  accent: "#f59e0b",
  bgPage: "#fbf5ff",
  bgSurface: "#ffffff",
  bgSidebar: "#fff7fd",
  textMain: "#241238",
  textMuted: "#6d5a86",
  border: "#e9d8fd",
  link: "#6d28d9",
  highlight: "#fef08a",
  success: "#059669",
  warning: "#d97706",
  danger: "#dc2626",
  fontBody: '"Open Sans", system-ui, -apple-system, sans-serif',
  fontHeading: '"Open Sans", system-ui, -apple-system, sans-serif',
  baseSize: 17,
  headingScale: 1.15,
  lineHeight: 1.7,
  paragraphSpacing: 14,
  blockSpacing: 30,
  headingWeight: 800,
  headingTransform: "uppercase",
  headingAccent: "underline",
  textAlign: "left",
  readingWidth: 920,
  radius: 24,
  borderWidth: 2,
  shadow: "medium",
  density: "spacious",
  divider: "space",
  visualStyle: "playful",
  bgKind: "gradient",
  bgGradient: "linear-gradient(160deg, #fbf5ff 0%, #eef2ff 55%, #fdf2f8 100%)",
  bgPattern: "none",
  boxStyle: "full",
  buttonStyle: "pill",
  imageFrame: "polaroid",
};

const OCEANO_TOKENS: ThemeTokens = {
  ...SESI_TOKENS,
  primary: "#0369a1",
  primaryInk: "#075985",
  accent: "#bae6fd",
  bgPage: "#f1f9ff",
  bgSurface: "#ffffff",
  bgSidebar: "#f8fcff",
  textMain: "#0b2239",
  textMuted: "#486581",
  border: "#d6e8f5",
  link: "#0369a1",
  highlight: "#cfefff",
  success: "#0f766e",
  warning: "#b45309",
  danger: "#b91c1c",
  baseSize: 16,
  headingScale: 1.02,
  lineHeight: 1.7,
  blockSpacing: 24,
  headingAccent: "underline",
  readingWidth: 980,
  radius: 14,
  shadow: "soft",
  divider: "line",
  visualStyle: "minimal",
  bgKind: "gradient",
  bgGradient: "linear-gradient(180deg, #f7fcff 0%, #eaf6ff 100%)",
  buttonStyle: "outline",
  imageFrame: "border",
};

const FLORESTA_TOKENS: ThemeTokens = {
  ...SESI_TOKENS,
  primary: "#15803d",
  primaryInk: "#166534",
  accent: "#bbf7d0",
  bgPage: "#f4faf5",
  bgSurface: "#ffffff",
  bgSidebar: "#f0fdf4",
  textMain: "#0f2318",
  textMuted: "#47624f",
  border: "#d8ebdc",
  link: "#15803d",
  highlight: "#dcfce7",
  success: "#15803d",
  warning: "#a16207",
  fontHeading: 'Georgia, "Times New Roman", serif',
  baseSize: 17,
  headingScale: 1.03,
  lineHeight: 1.7,
  paragraphSpacing: 14,
  blockSpacing: 28,
  headingAccent: "bar",
  readingWidth: 940,
  radius: 16,
  density: "spacious",
  divider: "space",
  visualStyle: "editorial",
  bgKind: "pattern",
  bgPattern: "dots",
  boxStyle: "icon",
  imageFrame: "polaroid",
};

export const BUILTIN_THEMES: Theme[] = [
  {
    id: "sesi",
    name: "Sesi",
    builtin: true,
    tokens: SESI_TOKENS,
    dark: {
      bgPage: "#0b0f19",
      bgSurface: "#1e293b",
      bgSidebar: "#0f172a",
      textMain: "#f8fafc",
      textMuted: "#94a3b8",
      border: "#334155",
      link: "#fca5a5",
      highlight: "#78350f",
      primaryInk: "#fca5a5",
    },
    customCss: "",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "editora",
    name: "Editora",
    builtin: true,
    tokens: EDITORA_TOKENS,
    dark: {
      bgPage: "#14110d",
      bgSurface: "#1e1a14",
      bgSidebar: "#1a1611",
      textMain: "#f3ede3",
      textMuted: "#b8ac9c",
      border: "#3a3227",
      link: "#e8c8a0",
      highlight: "#5c4310",
      primary: "#e8c8a0",
      primaryInk: "#3a2a12",
    },
    customCss: "",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "noturno",
    name: "Noturno",
    builtin: true,
    tokens: NOTURNO_TOKENS,
    dark: {},
    customCss: "",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "alto-contraste",
    name: "Alto Contraste",
    builtin: true,
    tokens: ALTO_CONTRASTE_TOKENS,
    dark: {
      bgPage: "#000000",
      bgSurface: "#000000",
      bgSidebar: "#000000",
      textMain: "#ffffff",
      textMuted: "#f5f5f5",
      border: "#ffffff",
      link: "#ffff00",
      primary: "#ffe600",
      primaryInk: "#111111",
      highlight: "#ffe600",
    },
    customCss: "",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "ludico",
    name: "Lúdico",
    builtin: true,
    tokens: LUDICO_TOKENS,
    dark: {
      bgPage: "#160b24",
      bgSurface: "#221336",
      bgSidebar: "#1b0f2b",
      textMain: "#f5edff",
      textMuted: "#c4b5d9",
      border: "#3c2a55",
      link: "#d8b4fe",
      highlight: "#713f12",
      primaryInk: "#ddd6fe",
    },
    customCss: "",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "oceano",
    name: "Oceano",
    builtin: true,
    tokens: OCEANO_TOKENS,
    dark: {
      bgPage: "#071620",
      bgSurface: "#0e2433",
      bgSidebar: "#0a1c28",
      textMain: "#e6f4ff",
      textMuted: "#9fc3d9",
      border: "#1c3a4d",
      link: "#7dd3fc",
      highlight: "#075985",
      primaryInk: "#7dd3fc",
    },
    customCss: "",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "floresta",
    name: "Floresta",
    builtin: true,
    tokens: FLORESTA_TOKENS,
    dark: {
      bgPage: "#08130d",
      bgSurface: "#11241a",
      bgSidebar: "#0c1b12",
      textMain: "#eaf6ec",
      textMuted: "#a7c4b0",
      border: "#24402e",
      link: "#86efac",
      highlight: "#14532d",
      primaryInk: "#86efac",
    },
    customCss: "",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
];

export const DEFAULT_THEME_ID = "sesi";
export const DEFAULT_THEME_TOKENS = SESI_TOKENS;

/* -------------------------------------------------------------------------- */
/* Cores                                                                      */
/* -------------------------------------------------------------------------- */

function parseHex(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec((hex || "").trim());
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function toHex(rgb: [number, number, number]): string {
  return "#" + rgb.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
}

/** Clareia (percent > 0) ou escurece (percent < 0) uma cor. */
export function shade(hex: string, percent: number): string {
  const rgb = parseHex(hex);
  if (!rgb) return hex;
  const target = percent < 0 ? 0 : 255;
  const p = Math.abs(percent) / 100;
  return toHex(rgb.map((v) => v + (target - v) * p) as [number, number, number]);
}

/** Cor com alpha (rgba), segura para valores não-hex. */
export function withAlpha(hex: string, alpha: number): string {
  const rgb = parseHex(hex);
  if (!rgb) return hex;
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
}

/** Texto legível (preto ou branco) sobre uma cor de fundo. */
export function readableInk(hex: string): string {
  const rgb = parseHex(hex);
  if (!rgb) return "#ffffff";
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  // Ponto de cruzamento WCAG: abaixo de ~0.179 o branco dá ≥4.5:1; acima, o preto dá.
  return lum > 0.179 ? "#111111" : "#ffffff";
}

/* -------------------------------------------------------------------------- */
/* Persistência da biblioteca                                                 */
/* -------------------------------------------------------------------------- */

async function ensureThemesDir(): Promise<void> {
  await fs.mkdir(THEMES_DIR, { recursive: true });
}

/** Limites dos campos numéricos, para evitar CSS absurdo vindo da API. */
const NUMERIC_LIMITS: Partial<Record<keyof ThemeTokens, [number, number]>> = {
  baseSize: [10, 32],
  headingScale: [0.6, 2],
  lineHeight: [1, 2.6],
  paragraphSpacing: [0, 64],
  blockSpacing: [0, 120],
  headingWeight: [300, 900],
  readingWidth: [480, 1440],
  radius: [0, 40],
  borderWidth: [0, 6],
};

/** Bloqueia injeção de regras em valores que vão para o CSS. */
function safeCssValue(value: string): string {
  if (/[;{}<>]|url\s*\(|@import|expression\s*\(/i.test(value)) return "";
  return value.trim().slice(0, 400);
}

function normalizeTokens(raw: unknown, base: ThemeTokens = DEFAULT_THEME_TOKENS): ThemeTokens {
  const input = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const out: ThemeTokens = { ...base };
  for (const key of Object.keys(base) as Array<keyof ThemeTokens>) {
    const value = input[key];
    if (value === undefined || value === null) continue;
    if (typeof base[key] === "number") {
      if (typeof value === "number" && Number.isFinite(value)) {
        const limits = NUMERIC_LIMITS[key];
        (out[key] as number) = limits ? Math.min(limits[1], Math.max(limits[0], value)) : value;
      }
    } else if (typeof value === "string") {
      const safe = safeCssValue(value);
      if (safe) (out[key] as string) = safe;
    }
  }
  return out;
}

/** Normaliza só as chaves presentes (usado nos ajustes por modo). */
function normalizePartial(raw: unknown, base: ThemeTokens): Partial<ThemeTokens> {
  const input = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const full = normalizeTokens(input, base);
  const out: Partial<ThemeTokens> = {};
  for (const key of Object.keys(base) as Array<keyof ThemeTokens>) {
    if (input[key] !== undefined && input[key] !== null) {
      (out as Record<string, unknown>)[key] = full[key];
    }
  }
  return out;
}

function normalizeTheme(raw: any, fallback?: Theme): Theme {
  const base = fallback || BUILTIN_THEMES[0];
  return {
    id: typeof raw?.id === "string" && raw.id ? raw.id : randomUUID(),
    name: typeof raw?.name === "string" && raw.name.trim() ? raw.name.trim() : "Tema sem nome",
    builtin: Boolean(raw?.builtin),
    tokens: normalizeTokens(raw?.tokens, base.tokens),
    dark: raw?.dark && typeof raw.dark === "object" ? normalizeTokens(raw.dark, { ...base.tokens, ...(base.dark || {}) }) : base.dark,
    customCss: typeof raw?.customCss === "string" ? raw.customCss : "",
    createdAt: typeof raw?.createdAt === "string" ? raw.createdAt : new Date().toISOString(),
    updatedAt: typeof raw?.updatedAt === "string" ? raw.updatedAt : new Date().toISOString(),
  };
}

async function readCustomThemes(): Promise<Theme[]> {
  await ensureThemesDir();
  let files: string[];
  try {
    files = await fs.readdir(THEMES_DIR);
  } catch {
    return [];
  }
  const themes: Theme[] = [];
  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    try {
      const raw = await fs.readFile(path.join(THEMES_DIR, file), "utf8");
      const parsed = JSON.parse(raw);
      const theme = normalizeTheme(parsed);
      theme.builtin = false;
      themes.push(theme);
    } catch {
      // Arquivo inválido é ignorado para não derrubar a listagem.
    }
  }
  return themes;
}

export async function listThemes(): Promise<Theme[]> {
  const custom = await readCustomThemes();
  const builtinIds = new Set(BUILTIN_THEMES.map((t) => t.id));
  return [...BUILTIN_THEMES, ...custom.filter((t) => !builtinIds.has(t.id))].sort((a, b) => {
    if (a.builtin !== b.builtin) return a.builtin ? -1 : 1;
    return a.name.localeCompare(b.name, "pt-BR");
  });
}

export async function getTheme(id: string): Promise<Theme | null> {
  const all = await listThemes();
  return all.find((t) => t.id === id) || null;
}

async function persistTheme(theme: Theme): Promise<void> {
  await ensureThemesDir();
  await fs.writeFile(path.join(THEMES_DIR, `${theme.id}.json`), JSON.stringify(theme, null, 2), "utf8");
}

function nextCustomName(themes: Theme[]): string {
  let n = 1;
  const names = new Set(themes.map((t) => t.name.toLowerCase()));
  while (names.has(`personalizado ${n}`.toLowerCase())) n++;
  return `Personalizado ${n}`;
}

export interface CreateThemeInput {
  name?: string;
  basedOn?: string;
  /** Tokens já resolvidos (ex.: tema atual + overrides do projeto). */
  tokens?: Partial<ThemeTokens>;
}

export async function createTheme(input: CreateThemeInput = {}): Promise<Theme> {
  const all = await listThemes();
  const base = all.find((t) => t.id === input.basedOn) || all.find((t) => t.builtin) || BUILTIN_THEMES[0];
  const now = new Date().toISOString();
  const theme: Theme = {
    id: randomUUID(),
    name: (input.name || "").trim() || nextCustomName(all),
    builtin: false,
    tokens: normalizeTokens({ ...base.tokens, ...(input.tokens || {}) }, base.tokens),
    dark: base.dark ? { ...base.dark } : undefined,
    customCss: base.customCss || "",
    createdAt: now,
    updatedAt: now,
  };
  await persistTheme(theme);
  return theme;
}

export async function duplicateTheme(id: string): Promise<Theme> {
  const source = await getTheme(id);
  if (!source) throw new Error("Tema não encontrado.");
  const all = await listThemes();
  const now = new Date().toISOString();
  const baseName = `${source.name} (cópia)`;
  let name = baseName;
  let counter = 2;
  while (all.some((t) => t.name === name)) name = `${baseName} ${counter++}`;
  const theme: Theme = {
    ...source,
    id: randomUUID(),
    name,
    builtin: false,
    createdAt: now,
    updatedAt: now,
  };
  await persistTheme(theme);
  return theme;
}

export interface UpdateThemeInput {
  name?: string;
  tokens?: Partial<ThemeTokens>;
  dark?: Partial<ThemeTokens>;
  customCss?: string;
}

export async function updateTheme(id: string, patch: UpdateThemeInput): Promise<Theme> {
  const builtin = BUILTIN_THEMES.find((t) => t.id === id);
  if (builtin) {
    throw new Error("Temas embutidos não podem ser alterados. Duplique o tema para personalizar.");
  }
  const current = await getTheme(id);
  if (!current) throw new Error("Tema não encontrado.");
  const updated: Theme = {
    ...current,
    name: patch.name !== undefined ? patch.name.trim() || current.name : current.name,
    tokens: patch.tokens ? normalizeTokens({ ...current.tokens, ...patch.tokens }, current.tokens) : current.tokens,
    dark: patch.dark ? normalizeTokens({ ...(current.dark || {}), ...patch.dark }, { ...current.tokens, ...(current.dark || {}) }) : current.dark,
    customCss: patch.customCss !== undefined ? patch.customCss : current.customCss,
    updatedAt: new Date().toISOString(),
  };
  await persistTheme(updated);
  return updated;
}

export async function deleteTheme(id: string): Promise<void> {
  if (BUILTIN_THEMES.some((t) => t.id === id)) {
    throw new Error("Temas embutidos não podem ser excluídos.");
  }
  await fs.unlink(path.join(THEMES_DIR, `${id}.json`)).catch(() => {
    throw new Error("Tema não encontrado.");
  });
}

/* -------------------------------------------------------------------------- */
/* Resolução do tema do projeto                                               */
/* -------------------------------------------------------------------------- */

export interface ResolvedTheme extends Theme {
  mode: ThemeMode;
  /** Ajustes do projeto por modo (escuro / alto contraste). */
  modeOverrides?: Partial<Record<ThemeMode, Partial<ThemeTokens>>>;
}

/**
 * Resolve o tema efetivo de um projeto:
 * preset da biblioteca → compatibilidade com `primaryColor`/`fontFamily`
 * (projetos antigos) → `overrides` do projeto.
 */
export async function resolveThemeForProject(input?: ProjectThemeInput | null): Promise<ResolvedTheme> {
  const all = await listThemes();
  let base = input?.themeId ? all.find((t) => t.id === input.themeId) : undefined;
  if (!base) base = all.find((t) => t.id === DEFAULT_THEME_ID) || BUILTIN_THEMES[0];

  const tokens: ThemeTokens = { ...base.tokens };
  // Projetos anteriores à biblioteca guardavam apenas a cor e a fonte.
  if (!input?.themeId) {
    if (input?.primaryColor && parseHex(input.primaryColor)) {
      tokens.primary = input.primaryColor;
      tokens.link = input.primaryColor;
      tokens.primaryInk = shade(input.primaryColor, -18);
    }
    if (input?.fontFamily) {
      tokens.fontBody = input.fontFamily;
      tokens.fontHeading = input.fontFamily;
    }
  }
  if (input?.overrides) Object.assign(tokens, normalizeTokens(input.overrides, tokens));
  if (input?.modeOverrides?.light) {
    Object.assign(tokens, normalizePartial(input.modeOverrides.light, tokens));
  }

  const modeOverrides: Partial<Record<ThemeMode, Partial<ThemeTokens>>> = {};
  for (const m of ["dark", "high-contrast"] as ThemeMode[]) {
    const raw = input?.modeOverrides?.[m];
    if (raw && typeof raw === "object" && Object.keys(raw).length > 0) {
      modeOverrides[m] = normalizePartial(raw, tokens);
    }
  }

  return {
    ...base,
    tokens,
    customCss: input?.customCss !== undefined ? input.customCss : base.customCss,
    mode: input?.mode || "light",
    modeOverrides,
  };
}

/* -------------------------------------------------------------------------- */
/* Sanitização de CSS livre                                                   */
/* -------------------------------------------------------------------------- */

export interface SanitizedCss {
  css: string;
  warnings: string[];
}

const MAX_CUSTOM_CSS = 20000;

/** Bloqueia vetores óbvios de abuso no CSS escrito pelo usuário. */
export function sanitizeCss(raw: string): SanitizedCss {
  if (typeof raw !== "string" || !raw.trim()) return { css: "", warnings: [] };
  const warnings: string[] = [];
  let css = raw.slice(0, MAX_CUSTOM_CSS);
  if (raw.length > MAX_CUSTOM_CSS) warnings.push(`CSS limitado a ${MAX_CUSTOM_CSS} caracteres.`);

  const rules: Array<{ re: RegExp; replace: string; warning: string }> = [
    { re: /@import[^;]*;?/gi, replace: "/* @import bloqueado */", warning: "@import externo bloqueado." },
    { re: /expression\s*\(/gi, replace: "/* expression() bloqueado */", warning: "expression() bloqueado." },
    { re: /url\s*\(\s*['"]?\s*(?:javascript|vbscript|data:text\/html)[^)]*\)/gi, replace: "none", warning: "URL não permitida bloqueada." },
    { re: /<\/?style[^>]*>/gi, replace: "", warning: "Tag <style> removida." },
    { re: /-moz-binding\s*:/gi, replace: "/* bloqueado */", warning: "-moz-binding bloqueado." },
    { re: /\bbehavior\s*:/gi, replace: "/* bloqueado */", warning: "behavior bloqueado." },
  ];
  for (const rule of rules) {
    if (rule.re.test(css)) {
      css = css.replace(rule.re, rule.replace);
      warnings.push(rule.warning);
    }
  }
  return { css, warnings };
}

/* -------------------------------------------------------------------------- */
/* Geração do CSS do tema                                                     */
/* -------------------------------------------------------------------------- */

function shadowValues(level: ThemeTokens["shadow"]): { sm: string; md: string } {
  switch (level) {
    case "none":
      return { sm: "none", md: "none" };
    case "strong":
      return {
        sm: "0 2px 6px rgba(0,0,0,0.18)",
        md: "0 18px 42px rgba(0,0,0,0.28)",
      };
    case "medium":
      return {
        sm: "0 1px 4px rgba(0,0,0,0.10)",
        md: "0 10px 28px rgba(0,0,0,0.16)",
      };
    default:
      return {
        sm: "0 1px 3px rgba(0,0,0,0.06)",
        md: "0 4px 14px rgba(0,0,0,0.08)",
      };
  }
}

function densityPadding(density: ThemeTokens["density"]): string {
  if (density === "compact") return "22px 24px";
  if (density === "spacious") return "46px 52px";
  return "36px";
}

function bodyBackground(tokens: ThemeTokens): { image: string; size: string } {
  if (tokens.bgKind === "gradient" && tokens.bgGradient.trim()) {
    return { image: tokens.bgGradient.trim(), size: "auto" };
  }
  if (tokens.bgKind === "pattern") {
    const line = withAlpha(tokens.textMain, 0.05);
    if (tokens.bgPattern === "dots") {
      return {
        image: `radial-gradient(${line} 1.2px, transparent 1.2px)`,
        size: "22px 22px",
      };
    }
    if (tokens.bgPattern === "diagonal") {
      return {
        image: `repeating-linear-gradient(45deg, ${line} 0 1px, transparent 1px 16px)`,
        size: "auto",
      };
    }
    return {
      image: `linear-gradient(${line} 1px, transparent 1px), linear-gradient(90deg, ${line} 1px, transparent 1px)`,
      size: "26px 26px",
    };
  }
  return { image: "none", size: "auto" };
}

function tokenVars(tokens: ThemeTokens): string {
  const shadow = shadowValues(tokens.shadow);
  return `--brand-red: ${tokens.primary};
  --brand-red-hover: ${shade(tokens.primary, -14)};
  --brand-red-ink: ${tokens.primaryInk};
  --brand-accent: ${tokens.accent};
  --on-brand: ${readableInk(tokens.primary)};
  --bg-page: ${tokens.bgPage};
  --bg-surface: ${tokens.bgSurface};
  --bg-sidebar: ${tokens.bgSidebar};
  --surface-1: ${tokens.bgSurface};
  --surface-2: ${withAlpha(tokens.textMain, 0.035)};
  --text-main: ${tokens.textMain};
  --text-muted: ${tokens.textMuted};
  --border-color: ${tokens.border};
  --link-color: ${tokens.link};
  --highlight-bg: ${tokens.highlight};
  --success-color: ${tokens.success};
  --warning-color: ${tokens.warning};
  --danger-color: ${tokens.danger};
  --font-body: ${tokens.fontBody};
  --font-heading: ${tokens.fontHeading};
  --font-size-base: ${tokens.baseSize}px;
  --line-height-body: ${tokens.lineHeight};
  --paragraph-gap: ${tokens.paragraphSpacing}px;
  --space-block: ${tokens.blockSpacing}px;
  --heading-weight: ${tokens.headingWeight};
  --heading-transform: ${tokens.headingTransform};
  --heading-scale: ${tokens.headingScale};
  --text-align: ${tokens.textAlign};
  --reading-width: ${tokens.readingWidth}px;
  --radius-sm: ${Math.max(0, tokens.radius - 4)}px;
  --radius-md: ${tokens.radius}px;
  --radius-lg: ${tokens.radius + 6}px;
  --border-width: ${tokens.borderWidth}px;
  --shadow-sm: ${shadow.sm};
  --shadow-md: ${shadow.md};
  --page-padding: ${densityPadding(tokens.density)};
  --body-bg-image: ${bodyBackground(tokens).image};
  --body-bg-size: ${bodyBackground(tokens).size};
  --box-bg-soft: ${withAlpha(tokens.primary, 0.06)};`;
}

/** Cores forçadas no modo alto contraste (qualquer tema). */
const HIGH_CONTRAST_OVERRIDES: Partial<ThemeTokens> = {
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

function headingAccentRules(tokens: ThemeTokens): string {
  if (tokens.headingAccent === "plain") {
    return `.block-heading-2 { border-left: 0; padding-left: 0; }`;
  }
  if (tokens.headingAccent === "underline") {
    return `.block-heading-2 {
      border-left: 0;
      padding-left: 0;
      padding-bottom: 6px;
      border-bottom: 2px solid var(--brand-red);
      display: inline-block;
    }`;
  }
  return `.block-heading-2 { border-left: 4px solid var(--brand-red); padding-left: 14px; }`;
}

function visualStyleRules(tokens: ThemeTokens): string {
  switch (tokens.visualStyle) {
    case "editorial":
      return `html[data-style="editorial"] .top-bar { border-bottom: 2px solid var(--text-main); box-shadow: none; }
      html[data-style="editorial"] .book-page { border: 0; border-top: 3px double var(--border-color); border-radius: 0; box-shadow: none; }
      html[data-style="editorial"] .block-heading-1 { text-align: center; letter-spacing: 0.03em; }
      html[data-style="editorial"] .page-break { background: transparent; color: var(--text-muted); border: 1px solid var(--border-color); }
      html[data-style="editorial"] .sidebar-nav { border-right: 1px solid var(--border-color); }`;
    case "playful":
      return `html[data-style="playful"] .book-page { border-width: 3px; }
      html[data-style="playful"] .page-break { transform: rotate(-2deg); }
      html[data-style="playful"] .block-heading-1 { letter-spacing: -0.01em; }
      html[data-style="playful"] .btn-ctrl, html[data-style="playful"] .px-cover-cta { font-weight: 800; }`;
    case "technical":
      return `html[data-style="technical"] .book-page { border-radius: 2px; }
      html[data-style="technical"] .page-break { border-radius: 2px; letter-spacing: 0.08em; }
      html[data-style="technical"] .block-heading-2 { text-transform: uppercase; letter-spacing: 0.04em; font-size: calc(var(--font-size-base) * 1.15); }`;
    case "minimal":
      return `html[data-style="minimal"] .top-bar { box-shadow: none; }
      html[data-style="minimal"] .book-page { border: 0; box-shadow: none; }
      html[data-style="minimal"] .page-header { border-bottom-width: var(--border-width); }`;
    case "flat":
      return `html[data-style="flat"] .book-page, html[data-style="flat"] .top-bar { box-shadow: none; }`;
    default:
      return "";
  }
}

function boxStyleRules(tokens: ThemeTokens): string {
  switch (tokens.boxStyle) {
    case "full":
      return `.pbox, .block-callout { border-left-width: var(--border-width); border-width: var(--border-width); }`;
    case "dashed":
      return `.pbox, .block-callout { border-style: dashed; border-left-width: var(--border-width); }`;
    case "icon":
      return `.pbox { border-left-width: 0; border-width: var(--border-width); padding: 18px 20px; }
      .pbox .pbox-icon { color: var(--brand-red); }`;
    default:
      return `.pbox, .block-callout { border-left-width: 6px; }`;
  }
}

function buttonStyleRules(tokens: ThemeTokens): string {
  switch (tokens.buttonStyle) {
    case "square":
      return `.btn-ctrl, .px-cover-cta { border-radius: 4px; }`;
    case "outline":
      return `.btn-ctrl, .px-cover-cta {
        background: transparent;
        border: 2px solid var(--brand-red);
        color: var(--brand-red);
      }
      .btn-ctrl:hover, .px-cover-cta:hover { background: var(--brand-red); color: var(--on-brand); }`;
    default:
      return `.btn-ctrl { border-radius: 999px; }
      .px-cover-cta { border-radius: 999px; }`;
  }
}

function imageFrameRules(tokens: ThemeTokens): string {
  switch (tokens.imageFrame) {
    case "border":
      return `.block-image img { border: 2px solid var(--border-color); box-shadow: none; }`;
    case "polaroid":
      return `.block-image img { border: 8px solid #fff; box-shadow: var(--shadow-md); }
      .block-image figcaption { font-style: normal; font-size: 0.8rem; letter-spacing: 0.02em; }`;
    case "none":
      return `.block-image img { box-shadow: none; border-radius: var(--radius-md); }`;
    default:
      return "";
  }
}

function dividerRules(tokens: ThemeTokens): string {
  if (tokens.divider === "line") {
    return `.book-page + .book-page { border-top: 1px solid var(--border-color); }
    .page-content > * + * { border-top: 1px solid ${withAlpha(tokens.textMain, 0.08)}; padding-top: var(--space-block); }`;
  }
  if (tokens.divider === "band") {
    return `.page-content > * + * { border-top: 4px solid ${withAlpha(tokens.primary, 0.25)}; padding-top: var(--space-block); }`;
  }
  return "";
}

function roleRules(tokens: ThemeTokens): string {
  return `
  /* Papéis de página */
  .role-capa, .role-subcapa, .role-encerramento, .role-creditos { --role-accent: var(--brand-red); }
  .role-capa { min-height: 72vh; display: flex; flex-direction: column; justify-content: center; text-align: center; }
  /* A paginação é obrigatória em todas as páginas (Anexo 03, 4.3.12) — esconde só o título. */
  .role-capa .page-title, .role-creditos .page-title, .role-encerramento .page-title { display: none; }
  .role-capa .page-header, .role-creditos .page-header, .role-encerramento .page-header { border-bottom: none; padding-bottom: 0; margin-bottom: 12px; }
  .role-capa .page-content { gap: var(--space-block); align-items: stretch; }
  .role-capa .page-content > * { max-width: 100%; }
  .role-subcapa { border-left: 10px solid var(--brand-red); }
  .role-subcapa .page-title { font-size: calc(var(--font-size-base) * 2.2 * var(--heading-scale)); line-height: 1.15; }
  .role-subcapa .page-break { background: transparent; color: var(--brand-red); border: 2px solid var(--brand-red); }
  .role-atividade { background: ${withAlpha(tokens.primary, 0.05)}; }
  .role-atividade .page-header { border-bottom-color: var(--brand-red); }
  .role-encerramento { background: ${withAlpha(tokens.primary, 0.08)}; }
  .role-creditos { background: ${withAlpha(tokens.textMain, 0.03)}; font-size: 0.95em; }
  .role-creditos .page-title { font-size: calc(var(--font-size-base) * 1.4); }
  .role-sumario .page-content { gap: calc(var(--space-block) * 0.6); }
  `;
}

/**
 * CSS completo do tema. É inserido no FINAL do styles.css para vencer as
 * regras base dos blocos sem depender de especificidade frágil.
 */
export function buildThemeCss(theme: ResolvedTheme): string {
  const tokens = theme.tokens;
  const modeOv = theme.modeOverrides || {};
  const darkTokens: ThemeTokens = { ...tokens, ...(theme.dark || {}), ...(modeOv.dark || {}) };
  // Sem fundo próprio para o escuro, usa cor sólida no lugar do gradiente claro.
  if (!theme.dark?.bgKind && !theme.dark?.bgGradient && !modeOv.dark?.bgKind && !modeOv.dark?.bgGradient) {
    darkTokens.bgKind = "solid";
  }
  const hcTokens: ThemeTokens = {
    ...tokens,
    ...HIGH_CONTRAST_OVERRIDES,
    ...(modeOv["high-contrast"] || {}),
    // Alto contraste nunca usa gradiente.
    bgKind: "solid",
  };
  const custom = sanitizeCss(theme.customCss || "").css;

  return `/* ================================================================
   Tema: ${theme.name}
   Gerado automaticamente — edite pelo painel Aparência do editor.
   ================================================================ */
:root {
  ${tokenVars(tokens)}
}

[data-theme="dark"] {
  ${tokenVars(darkTokens)}
}

[data-theme="high-contrast"] {
  ${tokenVars(hcTokens)}
}

body {
  font-family: var(--font-body);
  font-size: var(--font-size-base);
  line-height: var(--line-height-body);
  background-color: var(--bg-page);
  background-image: var(--body-bg-image);
  background-size: var(--body-bg-size);
  background-attachment: fixed;
  color: var(--text-main);
}

a { color: var(--link-color); }
.top-bar { background: var(--bg-surface); border-bottom: var(--border-width) solid var(--border-color); }
.sidebar-nav { background: var(--bg-sidebar); border-right: var(--border-width) solid var(--border-color); }
.brand-badge, .page-break, .nav-item.active { background: var(--brand-red); color: var(--on-brand); }
.nav-item.active .nav-num { background: ${withAlpha("#ffffff", 0.28)}; color: var(--on-brand); }
.btn-ctrl { border: var(--border-width) solid var(--border-color); color: var(--text-main); border-radius: var(--radius-sm); }
.btn-ctrl:hover { background: var(--surface-2); }
.content-area { max-width: calc(var(--reading-width) + 64px); }
.book-page {
  background: var(--bg-surface);
  border: var(--border-width) solid var(--border-color);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  padding: var(--page-padding);
}
.page-header { border-bottom: 2px solid var(--border-color); }
.page-title, .px-section-title, .px-flip-title, .acc-main-title, .px-timeline-title,
.px-table caption, .px-cover h2, .px-image-text-title {
  font-family: var(--font-heading);
}
.page-title { color: var(--text-main); }

.block-heading-1 {
  font-family: var(--font-heading);
  font-size: calc(var(--font-size-base) * 2.1 * var(--heading-scale));
  line-height: 1.15;
  font-weight: var(--heading-weight);
  color: var(--brand-red);
  text-transform: var(--heading-transform);
}
.block-heading-2 {
  font-family: var(--font-heading);
  font-size: calc(var(--font-size-base) * 1.5 * var(--heading-scale));
  line-height: 1.25;
  font-weight: var(--heading-weight);
  color: var(--text-main);
  text-transform: var(--heading-transform);
}
.block-heading-3 {
  font-family: var(--font-heading);
  font-size: calc(var(--font-size-base) * 1.18 * var(--heading-scale));
  font-weight: var(--heading-weight);
  color: var(--text-main);
  text-transform: var(--heading-transform);
}
${headingAccentRules(tokens)}

.block-paragraph p,
.block-paragraph ul,
.block-paragraph ol,
.block-paragraph li,
.callout-content,
.pbox-content,
.px-flip-text,
.px-image-text-html,
.acc-body,
.tab-pane,
.block-quiz p {
  font-size: calc(var(--font-size-base) * 1.02);
  line-height: var(--line-height-body);
  text-align: var(--text-align);
}
.block-paragraph p + p { margin-top: var(--paragraph-gap); }
.block-paragraph ul, .block-paragraph ol { gap: var(--paragraph-gap); }
.page-content { gap: var(--space-block); }
.acc-body, .tab-pane { background: var(--bg-surface); }
.acc-group, .block-tabs { border: var(--border-width) solid var(--border-color); border-radius: var(--radius-md); }
.block-quiz { background: var(--surface-2); border: 2px dashed var(--border-color); border-radius: var(--radius-lg); }

/* Boxes */
.pbox { border-radius: var(--radius-md); }
.pbox-box { background: var(--box-bg-soft); }
.pbox .pbox-icon svg { color: var(--brand-red); }
${boxStyleRules(tokens)}
${buttonStyleRules(tokens)}
${imageFrameRules(tokens)}
${dividerRules(tokens)}

/* Marca-texto e destaques */
mark, .px-highlight mark { background: var(--highlight-bg); color: inherit; }
.hotspot { border-color: var(--brand-red); background: ${withAlpha(tokens.primary, 0.14)}; }
.hotspot:hover, .hotspot:focus-visible { background: ${withAlpha(tokens.primary, 0.32)}; outline-color: var(--brand-red); }
.hotspot-dot { background: var(--brand-red); color: var(--on-brand); }

/* Navegação por páginas */
.nav-item { border-radius: var(--radius-sm); }
.badge-count { background: var(--surface-2); }

${roleRules(tokens)}
${visualStyleRules(tokens)}

/* Impressão: papéis de abertura/fechamento em páginas próprias */
@media print {
  .role-capa, .role-subcapa, .role-encerramento, .role-creditos { page-break-after: always; }
  .book-page { box-shadow: none; border-color: #ccc; }
}

@media (max-width: 640px) {
  .book-page { padding: 20px 16px; }
  .role-capa { min-height: 60vh; }
}

/* CSS personalizado do tema (sanitizado) */
${custom}
`;
}

/** CSS apenas dos tokens (útil para o preview do editor). */
export function tokensToCssVariables(tokens: ThemeTokens): Record<string, string> {
  return {
    "--brand-red": tokens.primary,
    "--brand-red-dark": shade(tokens.primary, -14),
    "--brand-red-hover": shade(tokens.primary, -14),
    "--brand-accent": tokens.accent,
    "--surface": tokens.bgSurface,
    "--surface-2": tokens.bgPage,
    "--surface-3": withAlpha(tokens.textMain, 0.05),
    "--border": tokens.border,
    "--text": tokens.textMain,
    "--muted": tokens.textMuted,
  };
}
