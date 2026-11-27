import { useState } from "react";
import { Routes, Route, Navigate, Link } from "react-router-dom";
import LoginPage from "./features/auth/LoginPage";
import ConverterPage from "./features/converter/ConverterPage";
import EditorPage from "./features/editor/EditorPage";
import AdminPage from "./features/admin/AdminPage";
import ResetPasswordPage from "./features/auth/ResetPasswordPage";
import { clearTokens, getUser, isAuthenticated } from "./lib/auth";
import { canAdministrate, currentRole } from "./lib/permissions";
import { apiFetch } from "./lib/api";
import Logo from "./components/Logo";
import { IconLogout } from "./components/icons";
import { aplicarNaRaiz, lerConfig } from "./lib/a11y/config";
import { AccessibilityMenu } from "./components/a11y/AccessibilityMenu";
import { ToastProvider } from "./lib/toast";

export default function App() {
  const [authed, setAuthed] = useState(isAuthenticated());
  const [role, setRole] = useState(currentRole());

  // Aplica tema/fonte/filtros antes da primeira pintura.
  aplicarNaRaiz(lerConfig());

  const usuario = getUser();
  const nome = usuario?.name || usuario?.email || "Usuário";

  if (window.location.pathname.includes("/redefinir-senha")) {
    return <ResetPasswordPage />;
  }

  if (!authed) {
    return (
      <>
        <LoginPage onLogin={() => { setRole(currentRole()); setAuthed(true); }} />
        <AccessibilityMenu />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-surface-2 flex flex-col font-sans text-ink transition-colors duration-200">
      {/* Header: somente usuário e Sair */}
      <header className="h-14 bg-surface border-b border-border px-3 sm:px-6 flex items-center justify-between gap-2 sticky top-0 z-40 shadow-sm select-none transition-colors duration-200">
        <Link to="/" className="flex items-center gap-2 sm:gap-3 group min-w-0">
          <Logo className="h-6 w-auto shrink-0 text-brand-red logo-marca" title="SESI" />
          <div className="h-4 w-px bg-border shrink-0" />
          <span className="font-bold text-sm tracking-tight text-ink group-hover:text-brand-red transition truncate">
            Interativo <span className="hidden sm:inline text-xs font-normal text-muted">· Livros para Web</span>
          </span>
        </Link>

        <div className="flex items-center gap-3">
          {canAdministrate() ? (
            <Link
              to="/admin"
              title="Abrir administração"
              className="text-right text-xs font-bold text-ink hover:text-brand-red transition"
            >
              Usuário: <span className="text-brand-red">{nome}</span>
              <span className="block text-[10px] font-normal text-muted">{role} · Administração</span>
            </Link>
          ) : (
            <span className="text-right text-xs font-bold text-ink">
              Usuário: <span className="text-brand-red">{nome}</span>
              <span className="block text-[10px] font-normal text-muted">{role}</span>
            </span>
          )}

          <button
            onClick={async () => {
              try { await apiFetch("/auth/logout", { method: "POST" }); } catch { /* sessão já expirada */ }
              clearTokens();
              setRole("Convidado");
              setAuthed(false);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold text-muted hover:text-brand-red hover:bg-surface-3 transition"
          >
            <IconLogout className="w-4 h-4" />
            <span>Sair</span>
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col">
        <Routes>
          <Route path="/" element={<ConverterPage />} />
          <Route path="/editor/:id" element={<EditorPage />} />
          {canAdministrate() && <Route path="/admin" element={<AdminPage />} />}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <AccessibilityMenu />
    </div>
  );
}
