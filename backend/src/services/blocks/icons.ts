/**
 * Ícones inline (traço, 24x24) usados no HTML publicado.
 *
 * O build é HTML/CSS/JS puro — não há React nem emoji. Cada ícone herda a cor
 * do texto (`currentColor`) e o tamanho de `1em` via classe `.px-icon`.
 */

const PATHS: Record<string, string> = {
  alert:
    '<path d="m21.7 18-8-14a2 2 0 0 0-3.4 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  bulb:
    '<path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7V18h8v-3.3A7 7 0 0 0 12 2Z"/>',
  help:
    '<circle cx="12" cy="12" r="9"/><path d="M9.1 9a3 3 0 1 1 4.9 2.4c-.7.5-1 1-1 1.8v.3"/><path d="M12 17h.01"/>',
  file:
    '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/><path d="M8 13h8"/><path d="M8 17h8"/>',
  message:
    '<path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z"/><path d="M9.1 9a3 3 0 1 1 4.9 2.4c-.7.5-1 1-1 1.8"/>',
  info:
    '<circle cx="12" cy="12" r="9"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
  image:
    '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-4.5-4.5a2 2 0 0 0-2.8 0L3 21"/>',
  link:
    '<path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/>',
  printer:
    '<path d="M6 9V3h12v6"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8" rx="1"/>',
  theme:
    '<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 0 0 18Z" fill="currentColor" stroke="none"/>',
  video:
    '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M7 4v16"/><path d="M17 4v16"/><path d="M2 9h5"/><path d="M2 15h5"/><path d="M17 9h5"/><path d="M17 15h5"/>',
  headphones:
    '<path d="M4 14v-2a8 8 0 0 1 16 0v2"/><rect x="2" y="14" width="5" height="7" rx="2"/><rect x="17" y="14" width="5" height="7" rx="2"/>',
  target:
    '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  refresh: '<path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 3v6h-6"/>',
  undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>',
  sparkles:
    '<path d="m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9Z"/><path d="M19 15v4"/><path d="M17 17h4"/>',
};

/** Retorna o SVG do ícone (string vazia se o nome não existir). */
export function svgIcon(name: keyof typeof PATHS | string, extraClass = ""): string {
  const path = PATHS[name];
  if (!path) return "";
  return `<svg class="px-icon${extraClass ? ` ${extraClass}` : ""}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${path}</svg>`;
}

/** Regra base dos ícones; cada build concatena no seu CSS. */
export const ICON_CSS = `.px-icon { width: 1em; height: 1em; display: inline-block; vertical-align: -0.12em; flex-shrink: 0; }`;
