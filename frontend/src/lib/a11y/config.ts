export type Tema = "claro" | "escuro";
export type FiltroDaltonismo =
  | "none"
  | "protanopia"
  | "deuteranopia"
  | "tritanopia"
  | "monocromia";
export type TamanhoFonte = "small" | "normal" | "large" | "xlarge";

export interface ConfigAcessibilidade {
  tema: Tema;
  filtro: FiltroDaltonismo;
  tamanhoFonte: TamanhoFonte;
  dislexia: boolean;
  vlibras: boolean;
}

export const CHAVE_ACESSIBILIDADE = "catalogo.a11y.v1";
export const EVENTO_ABRIR = "catalogo:abrir-acessibilidade";

export const ACESSIBILIDADE_PADRAO: ConfigAcessibilidade = {
  tema: "claro",
  filtro: "none",
  tamanhoFonte: "normal",
  dislexia: false,
  vlibras: true,
};

/** Lê as preferências salvas, preenchendo campos novos com o padrão. */
export function lerConfig(): ConfigAcessibilidade {
  if (typeof window === "undefined") return { ...ACESSIBILIDADE_PADRAO };

  try {
    const bruto = window.localStorage.getItem(CHAVE_ACESSIBILIDADE);
    if (!bruto) {
      const prefereEscuro = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
      return { ...ACESSIBILIDADE_PADRAO, tema: prefereEscuro ? "escuro" : "claro" };
    }
    return { ...ACESSIBILIDADE_PADRAO, ...(JSON.parse(bruto) as Partial<ConfigAcessibilidade>) };
  } catch {
    return { ...ACESSIBILIDADE_PADRAO };
  }
}

/** Aplica as preferências no elemento raiz (antes da primeira pintura). */
export function aplicarNaRaiz(config: ConfigAcessibilidade) {
  const root = document.documentElement;

  if (config.filtro === "none") root.removeAttribute("data-color-filter");
  else root.setAttribute("data-color-filter", config.filtro);

  root.setAttribute("data-font-size", config.tamanhoFonte);
  root.setAttribute("data-theme", config.tema);

  if (config.dislexia) root.setAttribute("data-font", "opendyslexic");
  else root.removeAttribute("data-font");

  root.setAttribute("data-vlibras", config.vlibras ? "on" : "off");
}

export function salvarConfig(config: ConfigAcessibilidade) {
  window.localStorage.setItem(CHAVE_ACESSIBILIDADE, JSON.stringify(config));
  window.dispatchEvent(new CustomEvent("catalogo:acessibilidade-atualizada", { detail: config }));
}

export function abrirAcessibilidade() {
  window.dispatchEvent(new Event(EVENTO_ABRIR));
}
