import { useState } from "react";
import { apiFetch } from "../../lib/api";
import { saveTokens, saveUser } from "../../lib/auth";
import { abrirAcessibilidade } from "../../lib/a11y/config";
import { Button } from "../../components/ui/Button";
import Logo from "../../components/Logo";
import {
  IconAccessibility,
  IconAlert,
  IconCheck,
  IconEye,
  IconEyeOff,
  IconLock,
  IconMail,
  IconSparkles,
} from "../../components/icons";

interface LoginPageProps {
  onLogin: () => void;
}

type Modo = "login" | "cadastro" | "recuperar";

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [modo, setModo] = useState<Modo>("login");
  const [nome, setNome] = useState("");
  const [sobrenome, setSobrenome] = useState("");
  const [email, setEmail] = useState("zecki1@hotmail.com");
  const [password, setPassword] = useState("Mudar@Sesi123");
  const [showPassword, setShowPassword] = useState(false);
  const [lembrar, setLembrar] = useState(true);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setAviso("");
    setLoading(true);
    try {
      const res = await apiFetch<{
        accessToken: string;
        refreshToken: string;
        user: { id: string; email: string; name: string; role: string };
      }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      saveTokens(res.data.accessToken, res.data.refreshToken);
      saveUser(res.data.user);
      onLogin();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha no login. Verifique se o backend está rodando.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCadastro(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setAviso("");

    if (!nome.trim() || !sobrenome.trim()) {
      setError("Informe seu nome e sobrenome.");
      return;
    }
    if (password.length < 6) {
      setError("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }

    setLoading(true);
    try {
      await apiFetch("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name: nome.trim(),
          surname: sobrenome.trim(),
          email: email.trim(),
          password,
        }),
      });

      // Já entra após o cadastro.
      const res = await apiFetch<{
        accessToken: string;
        refreshToken: string;
        user: { id: string; email: string; name: string; role: string };
      }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), password }),
      });
      saveTokens(res.data.accessToken, res.data.refreshToken);
      saveUser(res.data.user);
      onLogin();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível concluir o cadastro.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRecuperar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setAviso("");
    if (!email.trim()) {
      setError("Informe o e-mail cadastrado.");
      return;
    }
    setLoading(true);
    try {
      await apiFetch("/auth/password-request", {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), nome: nome || undefined }),
      });
      setAviso(
        "Solicitação registrada. Um gestor precisa aprovar seu pedido; quando aprovado, o link para redefinir a senha ficará disponível na área de administração."
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível registrar a solicitação.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen bg-surface-2 lg:grid-cols-[1.05fr_1fr]">
      {/* Painel de marca */}
      <aside className="relative hidden overflow-hidden bg-brand-red px-10 py-12 pb-28 text-white lg:flex lg:flex-col">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 top-24 h-72 w-72 rounded-full border border-white/20"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-10 top-40 h-44 w-44 rounded-full border border-white/15"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-20 left-10 h-56 w-56 rounded-full border border-white/10"
        />

        <div className="relative">
          <Logo className="h-8 w-auto text-white" title="SESI" />
        </div>

        <div className="relative mt-auto max-w-lg">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-white/85">
            <IconSparkles className="h-4 w-4" />
            Banco de recursos educacionais
          </p>
          <h1 className="text-4xl font-bold leading-[1.12]">
            Imagens, vetores e arquivos para criar materiais que representam todo mundo.
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-white/80">
            Um catálogo vivo para a rede SESI: busque por tags, frases e autores, envie arquivos
            em segundos e encontre a referência certa para cada projeto.
          </p>

          <ul className="mt-8 space-y-3 text-sm text-white/90">
            {[
              "Busca por conjunto de palavras, tags e autores",
              "Upload por arrastar, colar ou em lote",
              "Acessibilidade: VLibras, temas e fonte OpenDyslexic",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white text-brand-red">
                  <IconCheck className="h-3.5 w-3.5" />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative mt-10 flex items-center gap-3 text-xs text-white/70">
          <span className="h-1 w-10 rounded-full bg-white/80" />
          <span className="h-1 w-10 rounded-full bg-white/50" />
          <span className="h-1 w-10 rounded-full bg-white/30" />
          <span>SESI · Catálogo de Recursos</span>
        </div>
      </aside>

      {/* Formulário */}
      <main id="conteudo" className="flex flex-col px-5 py-8 sm:px-10">
        <div className="mb-10 flex items-center justify-between lg:hidden">
          <Logo className="h-7 w-auto text-ink" title="SESI" />
          <span className="text-xs font-semibold text-muted">Catálogo de Recursos</span>
        </div>

        <div className="m-auto w-full max-w-md animate-slide-up">
          <div className="rounded-2xl border border-line bg-surface p-6 shadow-card sm:p-8">
            <div className="mb-1 flex items-center gap-2">
              <button
                type="button"
                onClick={abrirAcessibilidade}
                aria-label="Abrir opções de acessibilidade"
                title="Acessibilidade"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-red/12 text-brand-red-ink transition hover:bg-brand-red hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red focus-visible:ring-offset-2"
              >
                <IconAccessibility className="h-5 w-5" />
              </button>
              <h2 className="text-2xl font-bold text-ink">
                {modo === "login" ? "Login" : modo === "cadastro" ? "Criar conta" : "Redefinir senha"}
              </h2>
            </div>
            <p className="mb-6 text-sm text-muted">
              {modo === "login"
                ? "Acesse com sua conta institucional para enviar e organizar recursos."
                : modo === "cadastro"
                  ? "Cadastre-se para enviar, organizar e baixar recursos do catálogo."
                  : "Informe seu e-mail para receber o link de redefinição de senha."}
            </p>

            {error && (
              <div
                role="alert"
                className="mb-4 flex items-start gap-2 rounded border border-brand-red/40 bg-brand-red/10 px-3 py-2.5 text-sm text-brand-red-ink"
              >
                <IconAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {aviso && (
              <div
                role="status"
                className="mb-4 flex items-start gap-2 rounded border border-brand-green/40 bg-brand-green/10 px-3 py-2.5 text-sm text-brand-green-ink"
              >
                <IconCheck className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{aviso}</span>
              </div>
            )}

            {modo === "login" && (
              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                <div>
                  <label htmlFor="login-email" className="mb-1.5 block text-sm font-semibold text-ink">
                    Usuário ou e-mail
                  </label>
                  <div className="relative">
                    <IconMail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                    <input
                      id="login-email"
                      name="email"
                      type="text"
                      autoComplete="username"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="username ou nome@sesi.org.br"
                      required
                      aria-required="true"
                      className="h-11 w-full rounded border border-line bg-surface pl-9 pr-3 text-sm text-ink placeholder:text-muted focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/25"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="login-password" className="mb-1.5 block text-sm font-semibold text-ink">
                    Senha
                  </label>
                  <div className="relative">
                    <IconLock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                    <input
                      id="login-password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Sua senha"
                      required
                      aria-required="true"
                      className="h-11 w-full rounded border border-line bg-surface pl-9 pr-12 text-sm text-ink placeholder:text-muted focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/25"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? "Ocultar senha" : "Visualizar senha"}
                      aria-pressed={showPassword}
                      title={showPassword ? "Ocultar senha" : "Visualizar senha"}
                      className="absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-muted transition hover:bg-surface-3 hover:text-ink"
                    >
                      {showPassword ? <IconEyeOff className="h-4 w-4" /> : <IconEye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-ink">
                    <input
                      type="checkbox"
                      checked={lembrar}
                      onChange={(e) => setLembrar(e.target.checked)}
                      className="h-4 w-4 rounded border-line accent-brand-red"
                    />
                    Lembrar de mim
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setModo("recuperar");
                      setError("");
                      setAviso("");
                    }}
                    className="text-sm font-semibold text-brand-red-ink underline-offset-4 hover:underline"
                  >
                    Esqueci minha senha
                  </button>
                </div>

                <Button type="submit" variant="primary" size="lg" block disabled={loading}>
                  {loading ? "Entrando..." : "Entrar"}
                </Button>

                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  block
                  onClick={() => {
                    setModo("cadastro");
                    setError("");
                    setAviso("");
                  }}
                >
                  Criar conta
                </Button>

                <p className="rounded bg-surface-2 px-3 py-2 text-center text-xs text-muted">
                  Ambiente de demonstração:{" "}
                  <span className="font-semibold text-ink">zecki1@hotmail.com</span> /{" "}
                  <span className="font-semibold text-ink">Mudar@Sesi123</span>
                </p>
              </form>
            )}

            {modo === "cadastro" && (
              <form onSubmit={handleCadastro} className="space-y-4" noValidate>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="cadastro-nome" className="mb-1.5 block text-sm font-semibold text-ink">
                      Nome
                    </label>
                    <input
                      id="cadastro-nome"
                      name="name"
                      type="text"
                      autoComplete="given-name"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      placeholder="Maria"
                      required
                      aria-required="true"
                      className="h-11 w-full rounded border border-line bg-surface px-3 text-sm text-ink placeholder:text-muted focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/25"
                    />
                  </div>
                  <div>
                    <label htmlFor="cadastro-sobrenome" className="mb-1.5 block text-sm font-semibold text-ink">
                      Sobrenome
                    </label>
                    <input
                      id="cadastro-sobrenome"
                      name="surname"
                      type="text"
                      autoComplete="family-name"
                      value={sobrenome}
                      onChange={(e) => setSobrenome(e.target.value)}
                      placeholder="Silva"
                      required
                      aria-required="true"
                      className="h-11 w-full rounded border border-line bg-surface px-3 text-sm text-ink placeholder:text-muted focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/25"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="cadastro-email" className="mb-1.5 block text-sm font-semibold text-ink">
                    E-mail
                  </label>
                  <div className="relative">
                    <IconMail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                    <input
                      id="cadastro-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="nome@sesi.org.br"
                      required
                      aria-required="true"
                      className="h-11 w-full rounded border border-line bg-surface pl-9 pr-3 text-sm text-ink placeholder:text-muted focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/25"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="cadastro-password" className="mb-1.5 block text-sm font-semibold text-ink">
                    Senha
                  </label>
                  <div className="relative">
                    <IconLock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                    <input
                      id="cadastro-password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mínimo de 6 caracteres"
                      minLength={6}
                      required
                      aria-required="true"
                      className="h-11 w-full rounded border border-line bg-surface pl-9 pr-12 text-sm text-ink placeholder:text-muted focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/25"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? "Ocultar senha" : "Visualizar senha"}
                      aria-pressed={showPassword}
                      title={showPassword ? "Ocultar senha" : "Visualizar senha"}
                      className="absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-muted transition hover:bg-surface-3 hover:text-ink"
                    >
                      {showPassword ? <IconEyeOff className="h-4 w-4" /> : <IconEye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button type="submit" variant="primary" size="lg" block disabled={loading}>
                  {loading ? "Cadastrando..." : "Criar conta"}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="md"
                  block
                  onClick={() => {
                    setModo("login");
                    setError("");
                    setAviso("");
                  }}
                >
                  Já tenho conta — entrar
                </Button>
              </form>
            )}

            {modo === "recuperar" && (
              <form onSubmit={handleRecuperar} className="space-y-4" noValidate>
                <div>
                  <label htmlFor="reset-email" className="mb-1.5 block text-sm font-semibold text-ink">
                    E-mail cadastrado
                  </label>
                  <div className="relative">
                    <IconMail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                    <input
                      id="reset-email"
                      type="email"
                      autoComplete="username"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="nome@sesi.org.br"
                      required
                      className="h-11 w-full rounded border border-line bg-surface pl-9 pr-3 text-sm text-ink placeholder:text-muted focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/25"
                    />
                  </div>
                </div>

                <Button type="submit" variant="primary" size="lg" block>
                  Enviar link de redefinição
                </Button>
                <Button
                  variant="ghost"
                  size="md"
                  block
                  onClick={() => {
                    setModo("login");
                    setAviso("");
                    setError("");
                  }}
                >
                  Voltar para o login
                </Button>
              </form>
            )}
          </div>

          <p className="mt-5 text-center text-xs leading-relaxed text-muted">
            Ao acessar, você concorda com a política de uso do catálogo. Precisa de ajuda?{" "}
            <a href="mailto:suporte@sesi.org.br" className="font-semibold text-brand-red-ink hover:underline">
              Fale com o suporte
            </a>
            .
          </p>
        </div>
      </main>
    </div>
  );
}
