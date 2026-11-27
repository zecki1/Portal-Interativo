import { useEffect, useRef, useState } from "react";
import { apiFetch } from "../../lib/api";
import Logo from "../../components/Logo";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [concluido, setConcluido] = useState(false);

  const token = new URLSearchParams(window.location.search).get("token") || "";

  async function validarToken() {
    if (!token) return;
    setCarregando(true);
    try {
      const res = await apiFetch<{ email: string }>(`/auth/reset/${encodeURIComponent(token)}`);
      setEmail(res.data.email);
      setAviso("Link aprovado por um gestor. Defina sua nova senha abaixo.");
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Link inválido.");
    } finally {
      setCarregando(false);
    }
  }

  // Valida e consome o token de uso único uma vez por montagem.
  const validado = useRef(false);
  useEffect(() => {
    if (validado.current) return;
    validado.current = true;
    void validarToken();
  }, []);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    if (password !== confirmar) return setErro("As senhas não coincidem.");
    if (password.length < 8) return setErro("A senha deve ter ao menos 8 caracteres.");
    setCarregando(true);
    try {
      await apiFetch("/auth/reset", { method: "POST", body: JSON.stringify({ token, password }) });
      setConcluido(true);
      setAviso("Senha alterada. Você já pode entrar com a nova senha.");
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível redefinir a senha.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-surface-2 p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-card">
        <Logo className="mx-auto h-10 w-auto text-brand-red" title="SESI" />
        <h1 className="mt-4 text-center text-lg font-bold text-ink">Redefinir senha</h1>
        <p className="mt-1 text-center text-xs text-muted">
          Página reservada. O link é gerado por um gestor na área de administração.
        </p>

        {erro && <p className="mt-4 rounded bg-red-50 p-3 text-sm text-red-700">{erro}</p>}
        {aviso && <p className="mt-4 rounded bg-emerald-50 p-3 text-sm text-emerald-700">{aviso}</p>}

        {!concluido && (
          <form onSubmit={salvar} className="mt-4 space-y-4">
            <label className="block text-xs font-bold text-ink">
              E-mail
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1 h-11 w-full rounded border border-border bg-surface px-3 text-sm text-ink"
              />
            </label>
            <label className="block text-xs font-bold text-ink">
              Nova senha
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="mt-1 h-11 w-full rounded border border-border bg-surface px-3 text-sm text-ink"
              />
            </label>
            <label className="block text-xs font-bold text-ink">
              Confirmar senha
              <input
                type="password"
                value={confirmar}
                onChange={(e) => setConfirmar(e.target.value)}
                required
                minLength={8}
                className="mt-1 h-11 w-full rounded border border-border bg-surface px-3 text-sm text-ink"
              />
            </label>
            <button
              type="submit"
              disabled={carregando || !token}
              className="h-11 w-full rounded-lg bg-brand-red font-bold text-white disabled:opacity-50"
            >
              {carregando ? "Aguarde…" : "Salvar nova senha"}
            </button>
          </form>
        )}

        {concluido && (
          <a href="/" className="mt-4 block text-center text-sm font-bold text-brand-red">
            Ir para o login
          </a>
        )}
      </div>
    </div>
  );
}
