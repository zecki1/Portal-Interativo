import { useCallback, useEffect, useState } from "react";

/**
 * i18n do editor (interface).
 *
 * Escopo desta primeira etapa: **textos da interface** (chrome do editor).
 * O conteúdo do material continua sendo escrito no idioma da página — para
 * materiais multilíngues, use uma página por idioma dentro do mesmo projeto
 * (ver docs/BACKLOG.md, seção i18n). Esta base permite trocar o idioma da
 * interface sem tocar no conteúdo e serve de ponto de partida para traduzir o
 * restante do editor e dos blocos publicados.
 */

export type Locale = "pt-BR" | "en" | "es";

export const LOCALES: { id: Locale; label: string }[] = [
  { id: "pt-BR", label: "Português (BR)" },
  { id: "en", label: "English" },
  { id: "es", label: "Español" },
];

const PT = {
  "editor.back": "Voltar",
  "editor.saved": "Salvo",
  "editor.saving": "Salvando...",
  "editor.unsaved": "Alterações pendentes",
  "editor.properties": "Propriedades",
  "editor.preview": "Visualizar (Preview)",
  "editor.export": "Exportar Web (.ZIP)",
  "editor.loading": "Carregando livro interativo...",
  "editor.loadingHint": "Carregando páginas, mídias e blocos editáveis.",
  "editor.loadError": "Falha ao carregar o livro",
  "editor.backToProjects": "Voltar para Projetos",
  "editor.language": "Idioma da interface",
  "editor.page": "Página",
  "editor.blocks": "blocos",
  "editor.block": "bloco",
  "editor.emptyPage": "Esta página está vazia.",
  "editor.emptyPageHint": "Clique em \"+ Blocos\" na barra lateral ou use os botões abaixo para começar a adicionar conteúdo.",
};

export type MessageKey = keyof typeof PT;

const DICTIONARIES: Record<Locale, Record<MessageKey, string>> = {
  "pt-BR": PT,
  en: {
    "editor.back": "Back",
    "editor.saved": "Saved",
    "editor.saving": "Saving...",
    "editor.unsaved": "Unsaved changes",
    "editor.properties": "Properties",
    "editor.preview": "Preview",
    "editor.export": "Export Web (.ZIP)",
    "editor.loading": "Loading interactive book...",
    "editor.loadingHint": "Loading pages, media and editable blocks.",
    "editor.loadError": "Could not load the book",
    "editor.backToProjects": "Back to Projects",
    "editor.language": "Interface language",
    "editor.page": "Page",
    "editor.blocks": "blocks",
    "editor.block": "block",
    "editor.emptyPage": "This page is empty.",
    "editor.emptyPageHint": "Click \"+ Blocks\" in the sidebar or use the buttons below to start adding content.",
  },
  es: {
    "editor.back": "Volver",
    "editor.saved": "Guardado",
    "editor.saving": "Guardando...",
    "editor.unsaved": "Cambios pendientes",
    "editor.properties": "Propiedades",
    "editor.preview": "Vista previa",
    "editor.export": "Exportar Web (.ZIP)",
    "editor.loading": "Cargando libro interactivo...",
    "editor.loadingHint": "Cargando páginas, medios y bloques editables.",
    "editor.loadError": "No se pudo cargar el libro",
    "editor.backToProjects": "Volver a Proyectos",
    "editor.language": "Idioma de la interfaz",
    "editor.page": "Página",
    "editor.blocks": "bloques",
    "editor.block": "bloque",
    "editor.emptyPage": "Esta página está vacía.",
    "editor.emptyPageHint": "Haz clic en \"+ Bloques\" en la barra lateral o usa los botones de abajo para empezar a agregar contenido.",
  },
};

const STORAGE_KEY = "interativo.locale";

export function isLocale(value: string | null | undefined): value is Locale {
  return value === "pt-BR" || value === "en" || value === "es";
}

/** Traduz uma chave; usa o texto em português como fallback. */
export function translate(locale: Locale, key: MessageKey): string {
  return DICTIONARIES[locale]?.[key] ?? PT[key];
}

/**
 * Hook com o idioma da interface, persistido em `localStorage`.
 * `t` é estável para o locale atual.
 */
export function useLocale() {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window === "undefined") return "pt-BR";
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return isLocale(saved) ? saved : "pt-BR";
  });

  useEffect(() => {
    document.documentElement.lang = locale;
    try {
      window.localStorage.setItem(STORAGE_KEY, locale);
    } catch {
      /* armazenamento indisponível (modo privado) */
    }
  }, [locale]);

  const setLocale = useCallback((next: Locale) => setLocaleState(next), []);
  const t = useCallback((key: MessageKey) => translate(locale, key), [locale]);

  return { locale, setLocale, t };
}
