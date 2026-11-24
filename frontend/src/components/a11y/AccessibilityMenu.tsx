import { useEffect, useRef, useState } from "react";
import {
  ACESSIBILIDADE_PADRAO,
  CHAVE_ACESSIBILIDADE,
  EVENTO_ABRIR,
  aplicarNaRaiz,
  lerConfig,
  salvarConfig,
  type ConfigAcessibilidade,
  type FiltroDaltonismo,
  type TamanhoFonte,
} from "../../lib/a11y/config";
import { IconAccessibility, IconClose, IconMoon, IconSun } from "../icons";
import SupportButton from "../support/SupportButton";

const TAMANHOS_FONTE: TamanhoFonte[] = ["small", "normal", "large", "xlarge"];
const ROTULOS_FONTE: Record<TamanhoFonte, string> = {
  small: "A-",
  normal: "A",
  large: "A+",
  xlarge: "A++",
};

export function AccessibilityMenu() {
  const [open, setOpen] = useState(false);
  const [config, setConfig] = useState<ConfigAcessibilidade>(() => lerConfig());
  const [botoesVisiveis, setBotoesVisiveis] = useState(true);
  const fecharRef = useRef<HTMLButtonElement>(null);
  const asideRef = useRef<HTMLElement>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const programarOcultacao = () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => setBotoesVisiveis(false), 60_000);
    };
    const aoRolar = () => {
      setBotoesVisiveis(true);
      programarOcultacao();
    };
    window.addEventListener("scroll", aoRolar, { passive: true });
    programarOcultacao();
    return () => {
      window.removeEventListener("scroll", aoRolar);
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    aplicarNaRaiz(config);
  }, [config]);

  useEffect(() => {
    const abrir = () => setOpen(true);
    window.addEventListener(EVENTO_ABRIR, abrir);
    return () => window.removeEventListener(EVENTO_ABRIR, abrir);
  }, []);

  useEffect(() => {
    if (!open) return;
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focoAnterior = document.activeElement as HTMLElement | null;
    fecharRef.current?.focus();

    const focaveis = () =>
      Array.from(
        asideRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        ) ?? []
      ).filter((elemento) => elemento.offsetParent !== null);

    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") {
        evento.preventDefault();
        setOpen(false);
        return;
      }
      if (evento.key !== "Tab") return;

      const lista = focaveis();
      if (lista.length === 0) return;
      const primeiro = lista[0];
      const ultimo = lista[lista.length - 1];
      if (evento.shiftKey && document.activeElement === primeiro) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault();
        primeiro.focus();
      }
    };

    document.addEventListener("keydown", aoTeclar);
    document.documentElement.setAttribute("data-a11y-aberto", "true");
    return () => {
      document.removeEventListener("keydown", aoTeclar);
      document.documentElement.removeAttribute("data-a11y-aberto");
      document.body.style.overflow = overflowAnterior;
      focoAnterior?.focus();
    };
  }, [open]);

  const atualizar = (parcial: Partial<ConfigAcessibilidade>) => {
    const nova = { ...config, ...parcial };
    setConfig(nova);
    salvarConfig(nova);
  };

  const restaurar = () => {
    setConfig({ ...ACESSIBILIDADE_PADRAO });
    window.localStorage.removeItem(CHAVE_ACESSIBILIDADE);
  };

  const indiceFonte = Math.max(0, TAMANHOS_FONTE.indexOf(config.tamanhoFonte));
  const escuro = config.tema === "escuro";

  return (
    <>
      <svg style={{ position: "absolute", width: 0, height: 0 }} aria-hidden="true">
        <defs>
          <filter id="protanopia-filter">
            <feColorMatrix type="matrix" values="0.567,0.433,0,0,0 0.558,0.442,0,0,0 0,0.242,0.758,0,0 0,0,0,1,0" />
          </filter>
          <filter id="deuteranopia-filter">
            <feColorMatrix type="matrix" values="0.625,0.375,0,0,0 0.7,0.3,0,0,0 0,0.3,0.7,0,0 0,0,0,1,0" />
          </filter>
          <filter id="tritanopia-filter">
            <feColorMatrix type="matrix" values="0.95,0.05,0,0,0 0,0.433,0.567,0,0 0,0.475,0.525,0,0 0,0,0,1,0" />
          </filter>
        </defs>
      </svg>

      <div
        className={`fixed bottom-4 left-4 z-[9999] flex flex-col gap-3 transition-all duration-300 print:hidden ${
          botoesVisiveis
            ? "translate-x-0 opacity-100"
            : "pointer-events-none -translate-x-[calc(100%+1.5rem)] opacity-0"
        }`}
      >
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            setBotoesVisiveis(false);
          }}
          aria-label="Abrir menu de acessibilidade"
          title="Acessibilidade"
          aria-expanded={open}
          aria-controls="barra-acessibilidade"
          className="grid h-12 w-12 place-items-center rounded-full border-2 border-white bg-brand-red text-white shadow-[0_4px_16px_rgba(0,0,0,0.35)] ring-1 ring-black/20 transition hover:scale-105 hover:bg-brand-red-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <IconAccessibility className="h-6 w-6" />
        </button>
        <button
          type="button"
          onClick={() => atualizar({ tema: escuro ? "claro" : "escuro" })}
          aria-label={escuro ? "Ativar tema claro" : "Ativar tema escuro"}
          title={escuro ? "Tema claro" : "Tema escuro"}
          aria-pressed={escuro}
          className="grid h-12 w-12 place-items-center rounded-full border-2 border-white bg-brand-black text-white shadow-[0_4px_16px_rgba(0,0,0,0.35)] ring-1 ring-black/20 transition hover:scale-105 hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          {escuro ? <IconSun className="h-5 w-5" /> : <IconMoon className="h-5 w-5" />}
        </button>
        <SupportButton inline />
      </div>

      {!botoesVisiveis && !open && (
        <button
          type="button"
          aria-label="Mostrar botões de acessibilidade"
          title="Mostrar acessibilidade"
          onClick={() => setBotoesVisiveis(true)}
          className="fixed bottom-4 left-0 z-[9999] grid h-16 w-5 place-items-center rounded-r-md border border-l-0 border-white/50 bg-brand-black/80 text-xs text-white shadow-md print:hidden"
        >
          <span aria-hidden="true">›</span>
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <aside
            ref={asideRef}
            id="barra-acessibilidade"
            role="dialog"
            aria-modal="true"
            aria-labelledby="acessibilidade-titulo"
            className="relative flex max-h-[min(90dvh,90vh)] w-full max-w-xl animate-slide-up flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl"
          >
            <header className="flex shrink-0 items-center justify-between border-b border-line px-6 py-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-red-ink">SESI</p>
                <h2 id="acessibilidade-titulo" className="text-xl font-bold text-ink">
                  Acessibilidade
                </h2>
              </div>
              <button
                ref={fecharRef}
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fechar acessibilidade"
                className="grid h-10 w-10 place-items-center rounded-full text-muted transition hover:bg-surface-3 hover:text-ink"
              >
                <IconClose className="h-5 w-5" />
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
              <div className="flex flex-col gap-6">
                <section>
                  <p className="mb-2 text-sm font-bold text-ink">Tema</p>
                  <div className="grid grid-cols-2 gap-2" role="group" aria-label="Tema">
                    <button
                      type="button"
                      onClick={() => atualizar({ tema: "claro" })}
                      aria-pressed={!escuro}
                      className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-semibold transition ${
                        !escuro
                          ? "border-brand-black bg-brand-black text-white"
                          : "border-line bg-surface text-ink hover:border-brand-black"
                      }`}
                    >
                      <IconSun className="h-4 w-4" />
                      Claro
                    </button>
                    <button
                      type="button"
                      onClick={() => atualizar({ tema: "escuro" })}
                      aria-pressed={escuro}
                      className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-semibold transition ${
                        escuro
                          ? "border-brand-black bg-brand-black text-white"
                          : "border-line bg-surface text-ink hover:border-brand-black"
                      }`}
                    >
                      <IconMoon className="h-4 w-4" />
                      Escuro
                    </button>
                  </div>
                </section>

                <section>
                  <label htmlFor="a11y-filtro" className="mb-2 block text-sm font-bold text-ink">
                    Filtro de cor
                  </label>
                  <select
                    id="a11y-filtro"
                    value={config.filtro}
                    onChange={(evento) =>
                      atualizar({ filtro: evento.target.value as FiltroDaltonismo })
                    }
                    className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-brand-red"
                  >
                    <option value="none">Nenhum</option>
                    <option value="protanopia">Protanopia</option>
                    <option value="deuteranopia">Deuteranopia</option>
                    <option value="tritanopia">Tritanopia</option>
                    <option value="monocromia">Monocromia</option>
                  </select>
                </section>

                <section>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <label htmlFor="a11y-fonte" className="text-sm font-bold text-ink">
                      Tamanho da fonte
                    </label>
                    <span className="text-xs font-semibold text-brand-red-ink" aria-live="polite">
                      {ROTULOS_FONTE[config.tamanhoFonte]}
                    </span>
                  </div>
                  <input
                    id="a11y-fonte"
                    type="range"
                    min={0}
                    max={TAMANHOS_FONTE.length - 1}
                    step={1}
                    value={indiceFonte}
                    onChange={(evento) =>
                      atualizar({ tamanhoFonte: TAMANHOS_FONTE[Number(evento.target.value)] })
                    }
                    aria-valuetext={ROTULOS_FONTE[config.tamanhoFonte]}
                    className="w-full cursor-pointer accent-brand-red"
                  />
                  <div className="mt-1 flex justify-between px-0.5 text-xs font-semibold text-muted" aria-hidden="true">
                    {TAMANHOS_FONTE.map((tamanho) => (
                      <span key={tamanho}>{ROTULOS_FONTE[tamanho]}</span>
                    ))}
                  </div>
                </section>

                <section>
                  <p className="mb-2 text-sm font-bold text-ink">Leitura</p>
                  <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-line px-4 py-3 text-sm font-medium text-ink">
                    <span className="flex items-center gap-2">
                      <span aria-hidden="true" className="grid h-6 w-6 place-items-center rounded bg-brand-red/10 text-brand-red-ink">
                        Aa
                      </span>
                      Fonte para dislexia (OpenDyslexic)
                    </span>
                    <input
                      type="checkbox"
                      checked={config.dislexia}
                      onChange={(evento) => atualizar({ dislexia: evento.target.checked })}
                      className="h-5 w-5 accent-brand-red"
                    />
                  </label>
                </section>

                <section>
                  <p className="mb-2 text-sm font-bold text-ink">Libras</p>
                  <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-line px-4 py-3 text-sm font-medium text-ink">
                    <span>Tradução em Libras (VLibras)</span>
                    <input
                      type="checkbox"
                      checked={config.vlibras}
                      onChange={(evento) => atualizar({ vlibras: evento.target.checked })}
                      className="h-5 w-5 accent-brand-red"
                    />
                  </label>
                  <p className="mt-2 text-xs leading-relaxed text-muted">
                    O VLibras aparece no canto inferior direito da página quando ativado.
                  </p>
                </section>
              </div>
            </div>

            <footer className="shrink-0 border-t border-line px-6 py-4">
              <button
                type="button"
                onClick={restaurar}
                className="w-full rounded-lg border border-line px-4 py-2.5 text-sm font-semibold text-ink transition hover:border-brand-black hover:bg-brand-black hover:text-white"
              >
                Restaurar padrões
              </button>
            </footer>
          </aside>
        </div>
      )}
    </>
  );
}
