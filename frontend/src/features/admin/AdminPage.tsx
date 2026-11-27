import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";
import { getUser, type LoggedUser } from "../../lib/auth";
import {
  DEFAULT_MATRIX,
  PERMISSIONS,
  PERMISSION_LABELS,
  ROLES,
  setCachedMatrix,
  type PermissionMatrix,
} from "../../lib/permissions";

type Aba = "usuarios" | "permissoes" | "logs" | "recursos";

interface Usuario {
  id: string;
  email: string;
  name: string;
  role: string;
  username?: string;
  origin?: string;
}

interface Atividade {
  id: string;
  quando: string;
  ator: string;
  acao: string;
  recurso: string;
  titulo: string;
  detalhe?: string;
  temSnapshot?: boolean;
}

interface Recursos {
  totals: {
    projetos: number; paginas: number; blocos: number; imagens: number; videos: number;
    audios: number; documentos: number; fontes: number; scripts: number;
    interatividades: number; bytes: number;
  };
  porProjeto: Array<{
    id: string; titulo: string; paginas: number; blocos: number;
    imagens: number; videos: number; audios: number; interatividades: number;
  }>;
}

const ABAS: Array<{ id: Aba; rotulo: string }> = [
  { id: "usuarios", rotulo: "Usuários e cargos" },
  { id: "permissoes", rotulo: "Permissões" },
  { id: "logs", rotulo: "Logs" },
  { id: "recursos", rotulo: "Recursos" },
];

const ACOES = ["criar", "editar", "excluir", "renomear", "reverter"];

function SkeletonLinhas() {
  return (
    <>
      {Array.from({ length: 10 }).map((_, i) => (
        <tr key={i} className="border-t border-border">
          <td className="py-2 pr-4"><div className="h-3 w-40 animate-pulse rounded bg-surface-3" /></td>
          <td className="py-2 pr-4"><div className="h-3 w-56 animate-pulse rounded bg-surface-3" /></td>
          <td className="py-2"><div className="h-7 w-28 animate-pulse rounded bg-surface-3" /></td>
        </tr>
      ))}
    </>
  );
}

export default function AdminPage() {
  const [aba, setAba] = useState<Aba>("usuarios");
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [carregandoUsuarios, setCarregandoUsuarios] = useState(true);
  const [buscaUsuarios, setBuscaUsuarios] = useState("");
  const [matrix, setMatrix] = useState<PermissionMatrix>(DEFAULT_MATRIX);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [historico, setHistorico] = useState<Array<{ savedAt: string; savedBy: string }>>([]);
  const [auditoria, setAuditoria] = useState<Array<{ id?: string; quando: string; ator: string; acao: string; recurso: string; ip: string; cargo?: string; permissoes?: Record<string, boolean> }>>([]);
  const [atividades, setAtividades] = useState<Atividade[]>([]);
  const [filtroAcao, setFiltroAcao] = useState("");
  const [restaurando, setRestaurando] = useState("");
  const [recursos, setRecursos] = useState<Recursos | null>(null);
  const [carregandoRecursos, setCarregandoRecursos] = useState(true);
  const [pedidos, setPedidos] = useState<Array<{ id: string; email: string; nome: string; status: string; criadoEm: string }>>([]);
  const [linkGerado, setLinkGerado] = useState("");
  const eu = getUser() as LoggedUser | null;

  const termo = buscaUsuarios.trim().toLowerCase();
  const usuariosFiltrados = termo
    ? usuarios.filter((u) =>
        `${u.name} ${u.email} ${u.username || ""}`.toLowerCase().includes(termo),
      )
    : usuarios;

  async function carregar() {
    setErro("");
    setCarregandoUsuarios(true);
    try {
      const [u, dir, m, h, a, p, at] = await Promise.all([
        apiFetch<Usuario[]>("/auth/users"),
        apiFetch<Array<{ id: string; username: string; first_name: string; last_name: string; email: string; role: string }>>("/directory/users"),
        apiFetch<PermissionMatrix>("/auth/permissions"),
        apiFetch<Array<{ savedAt: string; savedBy: string }>>("/auth/permissions/history"),
        apiFetch<Array<{ id?: string; quando: string; ator: string; acao: string; recurso: string; ip: string; cargo?: string; permissoes?: Record<string, boolean> }>>("/auth/audit?limit=100"),
        apiFetch<Array<{ id: string; email: string; nome: string; status: string; criadoEm: string }>>("/auth/password-requests"),
        apiFetch<Atividade[]>("/admin/activity?limit=100"),
      ]);
      const locais = u.data || [];
      const emailsLocais = new Set(locais.map((x) => x.email.toLowerCase()));
      const externos: Usuario[] = (dir.data || [])
        .filter((x) => !emailsLocais.has(x.email.toLowerCase()))
        .map((x) => ({
          id: x.id,
          username: x.username,
          name: `${x.first_name} ${x.last_name}`.trim() || x.username,
          email: x.email,
          role: x.role,
          origin: "externo",
        }));
      setUsuarios([...locais, ...externos]);
      setMatrix(m.data || DEFAULT_MATRIX);
      setCachedMatrix(m.data || DEFAULT_MATRIX);
      setHistorico(h.data || []);
      setAuditoria(a.data || []);
      setPedidos(p.data || []);
      setAtividades(at.data || []);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível carregar a administração.");
    } finally {
      setCarregandoUsuarios(false);
    }
  }

  async function carregarRecursos() {
    setCarregandoRecursos(true);
    try {
      const r = await apiFetch<Recursos>("/admin/resources");
      setRecursos(r.data);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível carregar os recursos.");
    } finally {
      setCarregandoRecursos(false);
    }
  }

  useEffect(() => { carregar(); }, []);
  useEffect(() => {
    if (aba === "recursos" && !recursos) carregarRecursos();
  }, [aba, recursos]);

  function alternar(role: string, permission: (typeof PERMISSIONS)[number]) {
    setMatrix((prev) => ({
      ...prev,
      [role]: { ...(prev[role] || {}), [permission]: !prev[role]?.[permission] },
    }));
  }

  async function salvar() {
    setSalvando(true);
    setErro("");
    setAviso("");
    try {
      const res = await apiFetch<PermissionMatrix>("/auth/permissions", {
        method: "PUT",
        body: JSON.stringify(matrix),
      });
      setMatrix(res.data);
      setCachedMatrix(res.data);
      await carregar();
      setAviso("Matriz salva. As permissões já valem para todas as sessões.");
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível salvar a matriz.");
    } finally {
      setSalvando(false);
    }
  }

  async function trocarCargo(usuario: Usuario, role: string) {
    setErro("");
    setAviso("");
    try {
      const rota = usuario.origin === "externo"
        ? `/directory/users/${encodeURIComponent(usuario.username || usuario.id)}/override`
        : `/auth/users/${usuario.id}/role`;
      await apiFetch(rota, { method: "PATCH", body: JSON.stringify({ role }) });
      setUsuarios((prev) => prev.map((u) => (u.id === usuario.id ? { ...u, role } : u)));
      setAviso(`Cargo de ${usuario.name} alterado para ${role}.`);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível alterar o cargo.");
    }
  }

  async function refazer(atividade: Atividade) {
    setRestaurando(atividade.id);
    setErro("");
    try {
      const r = await apiFetch<{ id: string; name: string }>(
        `/admin/activity/${atividade.id}/restore`, { method: "POST" },
      );
      setAviso(`Projeto "${r.data?.name || atividade.titulo}" recriado a partir do evento.`);
      await carregar();
      await carregarRecursos();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível refazer esta atividade.");
    } finally {
      setRestaurando("");
    }
  }

  const mb = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-xl font-bold text-ink">Administração e permissões</h1>
        <p className="text-sm text-muted">
          Logado como <strong>{eu?.name}</strong> ({eu?.email}) — cargo {eu?.role}.
        </p>
      </div>

      {erro && <p className="rounded bg-red-50 p-3 text-sm text-red-700">{erro}</p>}
      {aviso && <p className="rounded bg-emerald-50 p-3 text-sm text-emerald-700">{aviso}</p>}

      <div role="tablist" aria-label="Seções da administração" className="flex flex-wrap gap-2 border-b border-border pb-2">
        {ABAS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            id={`tab-${item.id}`}
            aria-selected={aba === item.id}
            aria-controls={`painel-${item.id}`}
            onClick={() => setAba(item.id)}
            className={`rounded-lg px-4 py-2 text-sm font-bold transition-colors ${
              aba === item.id
                ? "bg-brand-red text-white"
                : "border border-border bg-surface text-ink hover:bg-surface-2"
            }`}
          >
            {item.rotulo}
          </button>
        ))}
      </div>

      {aba === "usuarios" && (
        <div role="tabpanel" id="painel-usuarios" aria-labelledby="tab-usuarios" className="space-y-6">
          <section className="rounded-xl border border-border bg-surface p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-bold text-ink">Usuários e cargos</h2>
              <div className="flex items-center gap-3">
                <label htmlFor="busca-usuarios" className="text-xs text-muted">Buscar por nome, username ou e-mail</label>
                <input
                  id="busca-usuarios"
                  type="search"
                  value={buscaUsuarios}
                  onChange={(e) => setBuscaUsuarios(e.target.value)}
                  placeholder="nome, username ou e-mail"
                  className="h-9 w-64 rounded border border-border bg-surface px-3 text-sm text-ink placeholder:text-muted focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/25"
                />
                <span className="text-xs text-muted">
                  {carregandoUsuarios ? "carregando…" : `${usuariosFiltrados.length} usuário(s)`}
                </span>
              </div>
            </div>
            <div className="max-h-[440px] overflow-y-auto overflow-x-auto rounded border border-border">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 z-10 bg-surface text-xs uppercase text-muted">
                  <tr><th className="py-2 pl-2 pr-4">Nome</th><th className="py-2 pr-4">E-mail</th><th className="py-2">Cargo</th></tr>
                </thead>
                <tbody>
                  {carregandoUsuarios ? <SkeletonLinhas /> : (
                    <>
                      {usuariosFiltrados.length === 0 && (
                        <tr><td colSpan={3} className="px-2 py-6 text-center text-sm text-muted">
                          Nenhum usuário encontrado para “{buscaUsuarios}”.
                        </td></tr>
                      )}
                      {usuariosFiltrados.map((u) => (
                        <tr key={`${u.origin || "local"}-${u.id}`} className="border-t border-border">
                          <td className="py-2 pl-2 pr-4 text-ink">
                            {u.name}
                            {u.origin === "externo" && <span className="ml-2 text-xs text-muted">(SQL)</span>}
                          </td>
                          <td className="py-2 pr-4 text-muted">{u.email}</td>
                          <td className="py-2">
                            <select
                              aria-label={`Cargo de ${u.name}`}
                              value={u.role === "Admin" ? "Administrador" : u.role}
                              onChange={(e) => trocarCargo(u, e.target.value)}
                              className="rounded border border-border bg-surface px-2 py-1 text-sm text-ink"
                            >
                              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                            </select>
                          </td>
                        </tr>
                      ))}
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-xl border border-border bg-surface p-4">
            <h2 className="mb-1 text-base font-bold text-ink">Redefinição de senha</h2>
            <p className="mb-3 text-xs text-muted">
              Solicitações de “esqueci minha senha”. Aprovar gera um link de uso único (24 h).
            </p>
            {pedidos.length === 0 ? (
              <p className="text-sm text-muted">Nenhuma solicitação.</p>
            ) : (
              <div className="space-y-2">
                {pedidos.map((p) => (
                  <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                    <div className="min-w-0">
                      <span className="font-bold text-ink">{p.nome}</span>{" "}
                      <span className="text-muted">{p.email}</span>{" "}
                      <span className="text-[10px] font-bold uppercase text-brand-red">{p.status}</span>
                    </div>
                    {p.status === "pendente" && (
                      <div className="flex gap-2">
                        <button type="button" onClick={async () => {
                          try {
                            const r = await apiFetch<{ token: string }>(
                              `/auth/password-requests/${p.id}/aprovar`, { method: "POST" },
                            );
                            const url = `${window.location.origin}/redefinir-senha?token=${encodeURIComponent(r.data.token)}`;
                            setLinkGerado(url);
                            setAviso("Link gerado. Envie ao usuário e aguarde a redefinição.");
                            await carregar();
                          } catch (err) { setErro(err instanceof Error ? err.message : "Falha ao aprovar."); }
                        }} className="rounded bg-emerald-600 px-3 py-1 text-xs font-bold text-white">
                          Aprovar e gerar link
                        </button>
                        <button type="button" onClick={async () => {
                          try {
                            await apiFetch(`/auth/password-requests/${p.id}/recusar`, { method: "POST", body: JSON.stringify({}) });
                            await carregar();
                          } catch (err) { setErro(err instanceof Error ? err.message : "Falha ao recusar."); }
                        }} className="rounded border border-border px-3 py-1 text-xs font-bold text-ink">
                          Recusar
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {linkGerado && (
              <div className="mt-3 rounded bg-surface-2 p-3">
                <p className="text-xs font-bold text-ink">Link para o usuário (válido 24 h):</p>
                <input readOnly value={linkGerado} className="mt-1 w-full rounded border border-border bg-surface px-2 py-1 text-xs text-ink" />
                <button type="button" onClick={() => navigator.clipboard.writeText(linkGerado)} className="mt-2 rounded bg-brand-red px-3 py-1 text-xs font-bold text-white">
                  Copiar link
                </button>
              </div>
            )}
          </section>
        </div>
      )}

      {aba === "permissoes" && (
        <div role="tabpanel" id="painel-permissoes" aria-labelledby="tab-permissoes" className="space-y-6">
          <section className="rounded-xl border border-border bg-surface p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-ink">Matriz de permissões</h2>
                <p className="text-xs text-muted">Administrador e Gestor acessam esta página.</p>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={async () => {
                  try {
                    await apiFetch("/auth/permissions/rollback", { method: "POST" });
                    await carregar();
                    setAviso("Última alteração revertida.");
                  } catch (err) { setErro(err instanceof Error ? err.message : "Falha no rollback."); }
                }} disabled={historico.length === 0} className="rounded-lg border border-border px-4 py-2 text-sm font-bold text-ink disabled:opacity-50">
                  Reverter última alteração
                </button>
                <button type="button" onClick={salvar} disabled={salvando} className="rounded-lg bg-brand-red px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
                  {salvando ? "Salvando…" : "Salvar matriz"}
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase text-muted">
                  <tr><th className="py-2 pr-4">Cargo</th>{PERMISSIONS.map((p) => <th key={p} className="px-2 py-2 text-center">{PERMISSION_LABELS[p]}</th>)}</tr>
                </thead>
                <tbody>
                  {ROLES.map((role) => (
                    <tr key={role} className="border-t border-border">
                      <td className="py-2 pr-4 font-semibold text-ink">{role}</td>
                      {PERMISSIONS.map((p) => (
                        <td key={p} className="px-2 py-2 text-center">
                          <input type="checkbox" aria-label={`${PERMISSION_LABELS[p]} para ${role}`}
                            checked={Boolean(matrix[role]?.[p])} onChange={() => alternar(role, p)}
                            className="h-4 w-4 accent-[var(--brand-red)]" />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <section className="rounded-xl border border-border bg-surface p-4">
            <h2 className="mb-3 text-base font-bold text-ink">Permissões vigentes por cargo</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-muted">
                  <tr><th className="py-1 pr-3">Cargo</th>{PERMISSIONS.map((p) => <th key={p} className="px-2 py-1 text-center">{PERMISSION_LABELS[p]}</th>)}</tr>
                </thead>
                <tbody>
                  {ROLES.map((role) => (
                    <tr key={role} className="border-t border-border">
                      <td className="py-1 pr-3 font-semibold text-ink">{role}</td>
                      {PERMISSIONS.map((p) => (
                        <td key={p} className="px-2 py-1 text-center">
                          {matrix[role]?.[p] ? <span className="text-emerald-600">✓</span> : <span className="text-muted">—</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {aba === "logs" && (
        <div role="tabpanel" id="painel-logs" aria-labelledby="tab-logs" className="space-y-6">
          <section className="rounded-xl border border-border bg-surface p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-ink">Atividades (criar, editar, excluir)</h2>
                <p className="text-xs text-muted">
                  Cada evento guarda o estado do projeto. “Refazer” recria o projeto sem sobrescrever o atual.
                </p>
              </div>
              <label className="flex items-center gap-2 text-xs text-muted">
                Ação
                <select value={filtroAcao} onChange={(e) => setFiltroAcao(e.target.value)}
                  className="h-8 rounded border border-border bg-surface px-2 text-sm text-ink">
                  <option value="">Todas</option>
                  {ACOES.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </label>
            </div>
            <div className="max-h-[460px] overflow-auto rounded border border-border">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 z-10 bg-surface text-muted">
                  <tr><th className="py-2 pl-2 pr-3">Quando</th><th className="pr-3">Ator</th><th className="pr-3">Ação</th><th className="pr-3">Título</th><th className="pr-3">Detalhe</th><th>Refazer</th></tr>
                </thead>
                <tbody>
                  {atividades.filter((a) => !filtroAcao || a.acao === filtroAcao).map((a) => (
                    <tr key={a.id} className="border-t border-border">
                      <td className="py-2 pl-2 pr-3 text-muted">{new Date(a.quando).toLocaleString("pt-BR")}</td>
                      <td className="pr-3 text-ink">{a.ator}</td>
                      <td className="pr-3"><span className="rounded bg-surface-2 px-1.5 py-0.5 font-bold uppercase text-brand-red">{a.acao}</span></td>
                      <td className="pr-3 text-ink">{a.titulo}</td>
                      <td className="pr-3 text-muted">{a.detalhe || "—"}</td>
                      <td>
                        <button type="button" disabled={!a.temSnapshot || restaurando === a.id}
                          onClick={() => refazer(a)}
                          className="rounded border border-border px-2 py-1 font-bold text-ink hover:bg-surface-2 disabled:opacity-40">
                          {restaurando === a.id ? "Refazendo…" : "Refazer"}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {atividades.length === 0 && <tr><td colSpan={6} className="py-6 text-center text-muted">Nenhuma atividade registrada.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
          <section className="rounded-xl border border-border bg-surface p-4">
            <h2 className="mb-1 text-base font-bold text-ink">Auditoria de acesso</h2>
            <p className="mb-3 text-xs text-muted">Cada evento registra o cargo do ator e as permissões vigentes naquele instante.</p>
            <div className="max-h-64 overflow-auto text-xs">
              {auditoria.length === 0 ? <p className="text-muted">Nenhum evento registrado.</p> : (
                <table className="w-full text-left">
                  <thead className="text-muted"><tr><th className="py-1 pr-3">Quando</th><th className="pr-3">Ator / cargo</th><th className="pr-3">Ação</th><th className="pr-3">Recurso</th><th>IP</th></tr></thead>
                  <tbody>
                    {auditoria.map((a, i) => (
                      <tr key={a.id || `${a.quando}-${i}`} className="border-t border-border">
                        <td className="py-1 pr-3 text-muted">{new Date(a.quando).toLocaleString("pt-BR")}</td>
                        <td className="pr-3 text-ink">{a.ator}{a.cargo ? <span className="block text-[10px] text-muted">{a.cargo}</span> : null}</td>
                        <td className="pr-3 text-ink">{a.acao}</td>
                        <td className="pr-3 text-muted">{a.recurso}</td>
                        <td className="text-muted">{a.ip}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        </div>
      )}

      {aba === "recursos" && (
        <div role="tabpanel" id="painel-recursos" aria-labelledby="tab-recursos" className="space-y-6">
          {carregandoRecursos ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-24 animate-pulse rounded-xl border border-border bg-surface-3" />
              ))}
            </div>
          ) : recursos ? (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {([
                  ["Projetos", recursos.totals.projetos], ["Páginas", recursos.totals.paginas],
                  ["Blocos", recursos.totals.blocos], ["Interatividades", recursos.totals.interatividades],
                  ["Imagens", recursos.totals.imagens], ["Vídeos", recursos.totals.videos],
                  ["Áudios", recursos.totals.audios], ["Documentos", recursos.totals.documentos],
                ] as Array<[string, number]>).map(([rotulo, valor]) => (
                  <div key={rotulo} className="rounded-xl border border-border bg-surface p-4">
                    <p className="text-xs uppercase text-muted">{rotulo}</p>
                    <p className="mt-1 text-2xl font-bold text-ink">{valor}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted">
                Fontes: {recursos.totals.fontes} · scripts/HTML: {recursos.totals.scripts} · tamanho total: {mb(recursos.totals.bytes)}
              </p>
              <section className="rounded-xl border border-border bg-surface p-4">
                <h2 className="mb-3 text-base font-bold text-ink">Recursos por projeto</h2>
                <div className="max-h-[420px] overflow-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="sticky top-0 z-10 bg-surface text-xs uppercase text-muted">
                      <tr><th className="py-2 pr-4">Projeto</th><th className="pr-4">Páginas</th><th className="pr-4">Blocos</th><th className="pr-4">Imagens</th><th className="pr-4">Vídeos</th><th className="pr-4">Áudios</th><th>ODs</th></tr>
                    </thead>
                    <tbody>
                      {recursos.porProjeto.map((p) => (
                        <tr key={p.id} className="border-t border-border">
                          <td className="py-2 pr-4 text-ink">{p.titulo}</td>
                          <td className="pr-4 text-muted">{p.paginas}</td>
                          <td className="pr-4 text-muted">{p.blocos}</td>
                          <td className="pr-4 text-muted">{p.imagens}</td>
                          <td className="pr-4 text-muted">{p.videos}</td>
                          <td className="pr-4 text-muted">{p.audios}</td>
                          <td className="text-muted">{p.interatividades}</td>
                        </tr>
                      ))}
                      {recursos.porProjeto.length === 0 && <tr><td colSpan={7} className="py-6 text-center text-muted">Nenhum projeto criado ainda.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          ) : <p className="text-sm text-muted">Não foi possível carregar o dashboard.</p>}
        </div>
      )}
    </div>
  );
}
