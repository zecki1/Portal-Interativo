import { useState, useEffect } from "react";
import { Routes, Route, Navigate, Link } from "react-router-dom";
import LoginPage from "./features/auth/LoginPage";
import ConverterPage from "./features/converter/ConverterPage";
import EditorPage from "./features/editor/EditorPage";
import { clearTokens, isAuthenticated } from "./lib/auth";
import Logo from "./components/Logo";
import { IconAccessibility, IconLogout, IconSun, IconMoon } from "./components/icons";
import {
  abrirAcessibilidade,
  lerConfig,
  salvarConfig,
  aplicarNaRaiz,
  type Tema,
} from "./lib/a11y/config";
import { AccessibilityMenu } from "./components/a11y/AccessibilityMenu";
import { ToastProvider } from "./lib/toast";

export default function App() {
  const [authed, setAuthed] = useState(isAuthenticated());
  const [tema, setTema] = useState<Tema>(() => {
    const cfg = lerConfig();
    aplicarNaRaiz(cfg);
    return cfg.tema;
  });

  useEffect(() => {
    const handleUpdate = (e: any) => {
      if (e.detail?.tema) {
        setTema(e.detail.tema);
      }
    };
    window.addEventListener("catalogo:acessibilidade-atualizada", handleUpdate);
    return () => window.removeEventListener("catalogo:acessibilidade-atualizada", handleUpdate);
  }, []);

  const toggleTema = () => {
    const cfg = lerConfig();
    const proximoTema: Tema = cfg.tema === "escuro" ? "claro" : "escuro";
    cfg.tema = proximoTema;
    salvarConfig(cfg);
    aplicarNaRaiz(cfg);
    setTema(proximoTema);
  };

  if (!authed) {
    return (
      <>
        <LoginPage onLogin={() => setAuthed(true)} />
        <AccessibilityMenu />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-surface-2 flex flex-col font-sans text-ink transition-colors duration-200">
      {/* Header Institucional Global */}
      <header className="h-14 bg-surface border-b border-border px-3 sm:px-6 flex items-center justify-between gap-2 sticky top-0 z-40 shadow-sm select-none transition-colors duration-200">
        <Link to="/" className="flex items-center gap-2 sm:gap-3 group min-w-0">
          <Logo className="h-6 w-auto shrink-0 text-brand-red logo-marca" title="SESI" />
          <div className="h-4 w-px bg-border shrink-0" />
          <span className="font-bold text-sm tracking-tight text-ink group-hover:text-brand-red transition truncate">
            Interativo <span className="hidden sm:inline text-xs font-normal text-muted">· Livros para Web</span>
          </span>
        </Link>

        <div className="flex items-center gap-2">
          {/* Alternador Rápido de Tema Claro / Escuro */}
          <button
            type="button"
            onClick={toggleTema}
            aria-label={tema === "escuro" ? "Ativar tema claro" : "Ativar tema escuro"}
            title={tema === "escuro" ? "Tema Claro" : "Tema Escuro"}
            className="p-2 rounded-lg text-muted hover:text-ink hover:bg-surface-3 transition"
          >
            {tema === "escuro" ? (
              <IconSun className="w-4 h-4 text-amber-400" />
            ) : (
              <IconMoon className="w-4 h-4 text-slate-600" />
            )}
          </button>

          {/* Menu Lateral Completo de Acessibilidade */}
          <button
            type="button"
            onClick={abrirAcessibilidade}
            aria-label="Abrir painel de acessibilidade"
            title="Acessibilidade (VLibras, Fontes, Daltonismo)"
            className="p-2 rounded-lg text-muted hover:text-ink hover:bg-surface-3 transition"
          >
            <IconAccessibility className="w-4 h-4" />
          </button>

          <div className="h-4 w-px bg-border mx-1" />

          {/* Sair */}
          <button
            onClick={() => {
              clearTokens();
              setAuthed(false);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-muted hover:text-brand-red hover:bg-surface-3 transition"
          >
            <IconLogout className="w-4 h-4" />
            <span>Sair</span>
          </button>
        </div>
      </header>

      {/* Roteamento */}
      <main className="flex-1 flex flex-col">
        <Routes>
          <Route path="/" element={<ConverterPage />} />
          <Route path="/editor/:id" element={<EditorPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Drawer de Acessibilidade SESI */}
      <AccessibilityMenu />
    </div>
  );
}
