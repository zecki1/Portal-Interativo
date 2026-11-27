/**
 * Helpers de marcação semântica exigidos pelo Anexo 03 do PNLD
 * (Especificações Técnicas da Obra Digital, 2028-2031).
 *
 * Mantidos em módulo separado para que converterService.ts não cresça com
 * regras normativas — ver docs/ARCHITECTURE.md, "Pontos de extensão".
 */

import type { PageRole } from "../themes.js";

/** Escapa texto para uso dentro de atributos HTML (inclui aspas). */
export function escapeAttr(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Texto disponível apenas para leitores de tela (Anexo 03, 4.3.6.6 / 4.3.12.2). */
export function srOnly(text: string): string {
  return `<span class="sr-only">${escapeAttr(text)}</span>`;
}

/** Converte número para algarismo romano (seção do manual do professor). */
export function toRoman(value: number): string {
  const table: Array<[number, string]> = [
    [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"],
    [100, "C"], [90, "XC"], [50, "L"], [40, "XL"],
    [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
  ];
  let n = Math.max(0, Math.floor(value));
  let out = "";
  for (const [amount, numeral] of table) {
    while (n >= amount) {
      out += numeral;
      n -= amount;
    }
  }
  return out || "0";
}

/**
 * Mapeia o papel visual da página para o valor `data-book` correspondente
 * (Anexo 03, item 4.3.5). Retorna undefined quando o papel não possui
 * valor normativo próprio.
 */
export function pageBookRole(role?: PageRole): string | undefined {
  switch (role) {
    case "capa":
      return "capa";
    case "segunda-capa":
      return "segunda-capa";
    case "terceira-capa":
      return "terceira-capa";
    case "quarta-capa":
      return "quarta-capa";
    case "subcapa":
      return "titulo-unidade";
    case "apresentacao":
      return "apresentacao";
    case "ficha-catalografica":
      return "ficha-catalografica";
    case "lista-ods":
      return "lista-ods";
    case "lista-urls":
      return "lista-urls";
    case "creditos":
      return "creditos";
    // "sumario" fica no <nav id="toc"> para não repetir o atributo.
    default:
      return undefined;
  }
}

/** Mapeia o papel da página para o valor `data-book` do título (4.3.5). */
export function titleBookRole(role?: PageRole): string {
  if (role === "subcapa") return "titulo-unidade";
  if (role === "capa" || role === "sumario" || role === "creditos") return "titulo-capitulo";
  return "titulo-capitulo";
}

/** Blocos que representam Objetos Digitais / interatividades (4.3.5). */
export const INTERACTIVE_BLOCK_TYPES = new Set([
  "accordion", "tabs", "quiz", "multiple-choice", "true-false",
  "fill-blanks", "ordering", "matching", "memory-game",
  "word-search", "crossword", "puzzle", "flipcard", "external-embed",
]);

export interface PageBreakOptions {
  number: number;
  /** Numeral alternativo, por exemplo "XXIV" na seção do professor. */
  label?: string;
  /** Numeral por extenso para o aria-label (ex.: "vinte e quatro"). */
  spelled?: string;
  isProfessor?: boolean;
  /** Página sem conteúdo no impresso (4.3.10.8). */
  isEmpty?: boolean;
}

/**
 * Paginação normativa (Anexo 03, 4.3.12):
 * <p role="doc-pagebreak"><span class="sr-only">página </span>
 *   <span class="page-number">N</span></p>
 */
export function pageBreakHtml(options: PageBreakOptions): string {
  const prefix = options.isEmpty ? "página sem conteúdo " : "página ";
  const number = options.label || (options.isProfessor ? toRoman(options.number) : String(options.number));
  const aria = options.spelled ? ` aria-label="${escapeAttr(options.spelled)}"` : "";
  const mp = options.isProfessor ? srOnly(" MP") : "";
  return `<p class="page-break" role="doc-pagebreak" data-book="pagina">${srOnly(prefix)}<span class="page-number"${aria}>${escapeAttr(number)}</span>${mp}</p>`;
}

/** Indica se a página contém pelo menos um Objeto Digital (para o sumário). */
export function pageHasInteractive(blocks: Array<{ type: string }>): boolean {
  return blocks.some((b) => INTERACTIVE_BLOCK_TYPES.has(b.type));
}

/**
 * Encurtador local determinístico para o apêndice de URLs (Anexo 03, 7.13.1).
 * O domínio base pode ser substituído pelo serviço da editora.
 */
export function shortenUrl(original: string, base = "https://go.sesi.org.br/"): string {
  let hash = 2166136261;
  for (let i = 0; i < original.length; i += 1) {
    hash ^= original.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `${base.replace(/\/$/, "")}/${(hash >>> 0).toString(36)}`;
}

/** Razão de contraste WCAG 2.x entre duas cores hex (4.5:1 texto, 3:1 não textual). */
export function contrastRatio(foreground: string, background: string): number {
  const luminance = (color: string): number => {
    const hex = color.replace("#", "");
    const full = hex.length === 3 ? hex.split("").map((c) => c + c).join("") : hex;
    const channels = [0, 2, 4].map((i) => {
      const value = parseInt(full.slice(i, i + 2), 16) / 255;
      return value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  };
  const a = luminance(foreground);
  const b = luminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
