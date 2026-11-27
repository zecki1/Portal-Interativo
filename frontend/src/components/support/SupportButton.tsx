import { useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { apiFetch } from "../../lib/api";
import { Button } from "../ui/Button";
import { useToast } from "../../lib/toast";

interface RecursoAtual {
  id: string;
  title: string;
}

export default function SupportButton({ inline = false }: { inline?: boolean }) {
  const { mostrar } = useToast();
  const recursoAtual = (() => {
    const m = window.location.pathname.match(/^\/recurso-(.+)$/);
    if (!m) return null;
    const slug = m[1];
    const partes = slug.split("-");
    if (partes.length >= 2) {
      const codigo = partes[0].toUpperCase();
      const nome = partes.slice(1).map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" ");
      return `${codigo} - ${nome}`;
    }
    return slug;
  })();

  const [open, setOpen] = useState(false);
  const [descricao, setDescricao] = useState("");
  const [tipo, setTipo] = useState<"bug" | "duvida" | "sugestao">("bug");
  const [urgencia, setUrgencia] = useState<"Baixa" | "Média" | "Alta" | "Crítica">("Média");
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [capturando, setCapturando] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const capturar = useCallback(async () => {
    setCapturando(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(document.body, {
        backgroundColor: null,
        scale: Math.min(1, 1280 / window.innerWidth),
        logging: false,
        useCORS: true,
      });
      setScreenshot(canvas.toDataURL("image/jpeg", 0.55));
    } catch {
      setScreenshot(null);
    } finally {
      setCapturando(false);
    }
  }, []);

  // Captura automática ao abrir.
  useEffect(() => {
    if (open) {
      setDescricao("");
      setScreenshot(null);
      capturar();
    }
  }, [open, capturar]);

  const enviar = async () => {
    if (!descricao.trim()) return;
    setEnviando(true);
    try {
      await apiFetch("/support/tickets", {
        method: "POST",
        body: JSON.stringify({
          descricao: descricao.trim(),
          tipo,
          urgencia,
          screenshot: screenshot || undefined,
          autor: "zecki1",
          email: "zecki1@hotmail.com",
          pagina: window.location.pathname,
          recurso: recursoAtual || undefined,
          url: window.location.href,
          userAgent: navigator.userAgent,
        }),
      });
      mostrar("Chamado enviado com sucesso!", "sucesso");
      setOpen(false);
    } catch {
      mostrar("Não foi possível enviar o chamado.", "erro");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Reportar problema ao suporte"
        title="Encontrou um erro? Reporte ao suporte"
        className={inline
          ? "grid h-12 w-12 place-items-center rounded-full border-2 border-white bg-brand-black text-white shadow-[0_4px_16px_rgba(0,0,0,0.35)] ring-1 ring-black/20 transition hover:scale-105 hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          : "fixed bottom-6 left-6 z-50 grid h-14 w-14 place-items-center rounded-full bg-brand-red text-white shadow-xl transition hover:bg-brand-red-ink"}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
          <path d="M12 2a10 10 0 1 0 10 10" />
          <path d="M12 6v6l4 2" />
        </svg>
      </button>

      {open && createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px]" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="relative w-full max-w-lg animate-slide-up rounded-2xl border border-line bg-surface shadow-2xl">
            <header className="flex items-center justify-between border-b border-line px-6 py-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-red-ink">SESI</p>
                <h2 className="text-xl font-bold text-ink">Reportar problema</h2>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Fechar" className="grid h-10 w-10 place-items-center rounded-full text-muted transition hover:bg-surface-3 hover:text-ink">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </header>
            <div className="px-6 py-6 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-ink">Tipo</label>
                <select value={tipo} onChange={(e) => setTipo(e.target.value as any)} className="w-full rounded border border-line bg-surface px-3 py-2 text-sm">
                  <option value="bug">Bug</option>
                  <option value="duvida">Dúvida</option>
                  <option value="sugestao">Sugestão</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-ink">Descrição</label>
                <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={4} className="w-full rounded border border-line bg-surface px-3 py-2 text-sm" placeholder="O que aconteceu? O que você esperava?" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-ink">Urgência</label>
                <select value={urgencia} onChange={(e) => setUrgencia(e.target.value as any)} className="w-full rounded border border-line bg-surface px-3 py-2 text-sm">
                  <option value="Baixa">Baixa</option>
                  <option value="Média">Média</option>
                  <option value="Alta">Alta</option>
                  <option value="Crítica">Crítica</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                {capturando && <span className="text-xs text-muted">Capturando tela...</span>}
                {screenshot && <span className="text-xs text-muted">Print anexado automaticamente</span>}
              </div>
            </div>
            <footer className="flex justify-end gap-2 border-t border-line px-6 py-4">
              <Button variant="secondary" size="sm" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button variant="primary" size="sm" onClick={enviar} disabled={enviando || !descricao.trim()}>
                {enviando ? "Enviando..." : "Enviar"}
              </Button>
            </footer>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
