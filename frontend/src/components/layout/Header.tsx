import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Logo from "../Logo";
import { Container } from "./Container";
import { Button } from "../ui/Button";
import {
  IconAccessibility,
  IconLogout,
  IconMenu,
  IconClose,
  IconUpload,
} from "../icons";
import { abrirAcessibilidade } from "../../lib/a11y/config";

interface HeaderProps {
  onLogout: () => void;
  onUpload: () => void;
  userName?: string;
  userEmail?: string;
}

const NAV = [
  { label: "Catálogo", to: "/" },
  { label: "Árvore Genealógica", to: "/arvore" },
  { label: "Admin", to: "/admin" },
  { label: "Suporte", to: "/suporte" },
];

export function Header({ onLogout, onUpload, userName = "zecki1", userEmail = "zecki1@hotmail.com" }: HeaderProps) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const iniciais = userName
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join("");

  /** O envio vive no catálogo: se estiver em outra página, volta antes de abrir. */
  function enviar() {
    setOpen(false);
    if (pathname !== "/") navigate("/");
    onUpload();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface text-ink shadow-[0_1px_4px_rgb(0_0_0/0.10)]">
      <Container className="flex h-[72px] items-center gap-4">
        <Link to="/" className="flex shrink-0 items-center gap-3" aria-label="Catálogo de Recursos — início">
          <Logo className="logo-marca h-6 w-auto" title="SESI" />
          <span aria-hidden="true" className="hidden h-6 w-px bg-line sm:block" />
          <span className="hidden text-sm font-semibold leading-tight sm:block">
            Catálogo de
            <br />
            Recursos
          </span>
        </Link>

        <nav className="ml-4 hidden items-center gap-1 lg:flex" aria-label="Navegação principal">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              aria-current={pathname === item.to ? "page" : undefined}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition hover:bg-surface-3 hover:text-brand-red-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-red ${
                pathname === item.to ? "bg-surface-3 text-brand-red-ink" : "text-ink/80"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Button variant="primary" size="sm" onClick={enviar} className="hidden sm:inline-flex">
            <IconUpload className="h-4 w-4" />
            Enviar arquivo
          </Button>

          <button
            type="button"
            onClick={abrirAcessibilidade}
            aria-label="Abrir opções de acessibilidade"
            title="Acessibilidade"
            className="grid h-10 w-10 place-items-center rounded-full text-ink/80 transition hover:bg-surface-3 hover:text-brand-red-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-red"
          >
            <IconAccessibility className="h-5 w-5" />
          </button>

          <div className="hidden items-center gap-2 rounded-full border border-line py-1 pl-1 pr-3 sm:flex">
            <span
              aria-hidden="true"
              className="grid h-8 w-8 place-items-center rounded-full bg-brand-red text-xs font-bold text-white"
            >
              {iniciais || "S"}
            </span>
            <span className="max-w-28 truncate text-xs font-semibold" title={userEmail}>
              {userName}
            </span>
          </div>

          <button
            type="button"
            onClick={onLogout}
            aria-label="Sair da conta"
            title="Sair"
            className="hidden h-10 w-10 place-items-center rounded-full text-ink/80 transition hover:bg-brand-red/10 hover:text-brand-red-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-red sm:grid"
          >
            <IconLogout className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="grid h-10 w-10 place-items-center rounded-full text-ink transition hover:bg-surface-3 lg:hidden"
            aria-label={open ? "Fechar menu" : "Abrir menu"}
            aria-expanded={open}
            aria-controls="menu-mobile"
          >
            {open ? <IconClose className="h-5 w-5" /> : <IconMenu className="h-5 w-5" />}
          </button>
        </div>
      </Container>

      <div className="brand-stripe h-0.5 w-full" aria-hidden="true" />

      {open && (
        <div
          id="menu-mobile"
          className="absolute inset-x-0 top-full border-t border-line bg-surface text-ink shadow-xl lg:hidden"
        >
          <Container className="flex flex-col gap-1 py-4">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-3 text-sm font-semibold hover:bg-surface-3 hover:text-brand-red-ink"
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-3 flex items-center gap-2">
              <Button variant="primary" size="sm" block onClick={enviar}>
                <IconUpload className="h-4 w-4" />
                Enviar arquivo
              </Button>
              <Button variant="danger" size="sm" onClick={onLogout} className="shrink-0">
                <IconLogout className="h-4 w-4" />
                Sair
              </Button>
            </div>
          </Container>
        </div>
      )}
    </header>
  );
}
