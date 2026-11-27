import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiFetch } from "../../lib/api";
import type { ProjectMeta } from "../../types/project";
import ConfirmModal from "../../components/ui/ConfirmModal";
import {
  IconUpload,
  IconEye,
  IconDownload,
  IconTrash,
  IconSearch,
  IconAlert,
  IconFile,
  IconLayers,
  IconSparkles,
} from "../../components/icons";

export default function ConverterPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [projects, setProjects] = useState<ProjectMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const [creatingExemplo, setCreatingExemplo] = useState(false);
  const [creatingDemos, setCreatingDemos] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [queue, setQueue] = useState<
    { file: File; status: "pendente" | "convertendo" | "ok" | "erro"; message?: string; projectId?: string }[]
  >([]);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const apiBase =
    import.meta.env.VITE_API_BASE || `http://${window.location.hostname}:3002/api/v1`;

  const loadProjects = async () => {
    setLoading(true);
    try {
      const res = await apiFetch<ProjectMeta[]>("/projects");
      if (res.data) setProjects(res.data);
    } catch (e: any) {
      setError(e.message || "Erro ao carregar lista de livros.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  // Documento-modelo com todos os blocos: criado no backend e aberto no editor.
  const handleCreateExemplo = async () => {
    setCreatingExemplo(true);
    setError(null);
    try {
      const res = await apiFetch<ProjectMeta>("/projects/exemplo", { method: "POST" });
      if (res.data) navigate(`/editor/${res.data.id}`);
    } catch (e: any) {
      setError(e.message || "Não foi possível criar o material de exemplo.");
    } finally {
      setCreatingExemplo(false);
    }
  };

  const handleCreateDemos = async (reset = false) => {
    setCreatingDemos(true);
    setError(null);
    try {
      const res = await apiFetch<ProjectMeta[]>("/projects/exemplo/todos", {
        method: "POST",
        body: JSON.stringify({ reset }),
      });
      const first = (res.data || [])[0];
      if (first) navigate(`/editor/${first.id}`);
    } catch (e: any) {
      setError(e.message || "Não foi possível criar os materiais demonstrativos.");
    } finally {
      setCreatingDemos(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    if (ext === ".indd") {
      setError(
        "Arquivos .indd são binários proprietários da Adobe. No InDesign, clique em 'Arquivo > Exportar' e selecione 'IDML' ou 'PDF' para importar no Interativo."
      );
      return;
    }
    if (ext !== ".pdf" && ext !== ".idml" && ext !== ".zip") {
      setError("Formato não suportado. Por favor, envie um arquivo .pdf, .idml ou .zip (IDML + Links/).");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await apiFetch<ProjectMeta>("/convert", {
        method: "POST",
        body: fd,
      });

      if (res.data) {
        // Redireciona imediatamente para o Editor Visual do novo livro
        navigate(`/editor/${res.data.id}`);
      }
    } catch (e: any) {
      setError(e.message || "Falha na conversão do arquivo.");
    } finally {
      setUploading(false);
    }
  };

  // Lote: vários arquivos → cada um vira um projeto vinculado na lista abaixo.
  const handleFiles = async (files: File[]) => {
    const valid: File[] = [];
    const rejected: string[] = [];
    for (const f of files) {
      const ext = f.name.slice(f.name.lastIndexOf(".")).toLowerCase();
      if (ext === ".pdf" || ext === ".idml" || ext === ".zip") valid.push(f);
      else rejected.push(f.name);
    }
    if (rejected.length) {
      setError(`Ignorado(s) por formato não suportado: ${rejected.join(", ")}. Use .pdf, .idml ou .zip (IDML + Links/).`);
    }
    if (!valid.length) return;
    if (valid.length === 1) return handleFileUpload(valid[0]);

    setUploading(true);
    setError(null);
    setQueue(valid.map((file) => ({ file, status: "pendente" })));
    for (let i = 0; i < valid.length; i++) {
      setQueue((q) => q.map((it, j) => (j === i ? { ...it, status: "convertendo" } : it)));
      try {
        const fd = new FormData();
        fd.append("file", valid[i]);
        const res = await apiFetch<ProjectMeta>("/convert", { method: "POST", body: fd });
        setQueue((q) =>
          q.map((it, j) => (j === i ? { ...it, status: "ok", projectId: res.data?.id, message: res.data?.name } : it))
        );
        loadProjects();
      } catch (e: any) {
        setQueue((q) => q.map((it, j) => (j === i ? { ...it, status: "erro", message: e.message || "Falha" } : it)));
      }
    }
    setUploading(false);
  };

  const handleDelete = (id: string, name: string) => {
    setDeleteTarget({ id, name });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const { id } = deleteTarget;
    try {
      await apiFetch(`/projects/${id}`, { method: "DELETE" });
      setProjects((prev) => prev.filter((p) => p.id !== id));
      setDeleteTarget(null);
    } catch (e: any) {
      setDeleteError(e.message || "Erro ao excluir.");
    }
  };

  const confirmBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    for (const id of ids) {
      try {
        await apiFetch(`/projects/${id}`, { method: "DELETE" });
      } catch {
        /* continua */
      }
    }
    setProjects((prev) => prev.filter((p) => !selectedIds.has(p.id)));
    setSelectedIds(new Set());
    setBulkDeleteOpen(false);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const startRename = (id: string, name: string) => {
    setEditingId(id);
    setEditingName(name);
  };

  const saveRename = async () => {
    if (!editingId) return;
    try {
      await apiFetch(`/projects/${editingId}/name`, { method: "PATCH", body: JSON.stringify({ name: editingName }) });
      setProjects((prev) => prev.map((p) => (p.id === editingId ? { ...p, name: editingName } : p)));
    } catch (e: any) {
      setDeleteError(e.message || "Erro ao renomear.");
    } finally {
      setEditingId(null);
    }
  };

  const filteredProjects = projects.filter((p) =>
    (p.name || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-[calc(100vh-60px)] bg-surface-2 py-8 px-4 sm:px-8 transition-colors duration-200">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Banner SESI Interativo */}
        <div className="relative overflow-hidden rounded-3xl bg-brand-red text-white p-8 sm:p-10 shadow-card">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full border border-white/20"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-6 top-32 h-36 w-36 rounded-full border border-white/10"
          />
          <div className="relative z-10 max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white mb-3">
              <IconSparkles className="w-3.5 h-3.5" />
              Conversor Editorial em Blocos
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight">
              Transforme Livros Didáticos em Experiências Web Interativas
            </h1>
            <p className="mt-3 text-sm sm:text-base text-white/85 leading-relaxed">
              Envie materiais fechados em <strong>PDF</strong> ou <strong>IDML (InDesign)</strong>. O sistema extrai automaticamente textos e imagens, gerando blocos editáveis com sanfonas, abas, quizzes e exportação web (.zip).
            </p>
          </div>
        </div>

        {/* Mensagem de Erro / Alerta */}
        {error && (
          <div className="flex items-start gap-3 p-4 rounded-2xl border border-brand-red/40 bg-brand-red/10 text-brand-red-ink text-sm animate-shake">
            <IconAlert className="w-5 h-5 shrink-0 mt-0.5 text-brand-red" />
            <div className="flex-1">
              <strong className="block font-bold">Aviso importante</strong>
              <span>{error}</span>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-brand-red hover:underline font-bold text-xs"
            >
              Fechar
            </button>
          </div>
        )}

        {/* Zona de Upload Drag & Drop */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragOver(false);
            const files = Array.from(e.dataTransfer.files || []);
            if (files.length) handleFiles(files);
          }}
          className={`relative rounded-3xl border-2 border-dashed p-10 text-center transition-all duration-200 flex flex-col items-center justify-center ${isDragOver
              ? "border-brand-red bg-brand-red/10 scale-[1.01]"
              : "border-border bg-surface hover:border-brand-red/50 hover:bg-surface-3/50"
            } ${uploading ? "opacity-75 pointer-events-none" : "cursor-pointer"}`}
          onClick={() => !uploading && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.idml,.indd,.zip"
            multiple
            className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files || []);
              if (files.length) handleFiles(files);
              e.target.value = "";
            }}
          />

          {uploading ? (
            <div className="py-6 flex flex-col items-center">
              <div className="w-12 h-12 border-4 border-brand-red border-t-transparent rounded-full animate-spin mb-4" />
              <h3 className="text-base font-bold text-ink">
                Lendo e convertendo o livro em blocos...
              </h3>
              <p className="text-xs text-muted mt-1 max-w-sm">
                Descompactando páginas, decodificando textos em UTF-8 e extraindo imagens em alta resolução.
              </p>
            </div>
          ) : (
            <div className="py-4 flex flex-col items-center">
              <div className="w-16 h-16 rounded-2xl bg-brand-red/10 text-brand-red grid place-items-center mb-4">
                <IconUpload className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-ink">
                Arraste seus arquivos PDF ou IDML aqui
              </h3>
              <p className="text-xs text-muted mt-1">
                ou clique para escolher · vários arquivos = lote (cada um vira um projeto vinculado)
              </p>
              <div className="mt-4 flex items-center gap-2 text-xs font-semibold">
                <span className="px-2.5 py-1 rounded-md bg-surface-3 text-ink border border-border">.PDF</span>
                <span className="px-2.5 py-1 rounded-md bg-surface-3 text-ink border border-border">.IDML (InDesign)</span>
                <span className="px-2.5 py-1 rounded-md bg-surface-3 text-ink border border-border">.ZIP (IDML + Links/)</span>
              </div>
            </div>
          )}
        </div>

        {/* Documento-modelo: cria um projeto com todos os blocos preenchidos */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border border-border bg-surface px-5 py-4">
          <div className="flex items-start gap-3">
            <IconSparkles className="w-5 h-5 shrink-0 text-brand-red mt-0.5" aria-hidden="true" />
            <div>
              <p className="text-sm font-bold text-ink">Primeira vez por aqui?</p>
              <p className="text-xs text-muted">
                Crie um material de exemplo com <strong>todos os blocos</strong> preenchidos para explorar o editor.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
          <button
            type="button"
            onClick={handleCreateExemplo}
            disabled={creatingExemplo}
            className="shrink-0 rounded border border-brand-red/40 bg-brand-red/10 px-4 py-2 text-xs font-bold text-brand-red hover:bg-brand-red hover:text-white transition disabled:opacity-50 disabled:cursor-wait"
          >
            {creatingExemplo ? "Criando exemplo…" : "Criar material de exemplo"}
          </button>
          <button
            type="button"
            onClick={() => handleCreateDemos()}
            disabled={creatingDemos}
            className="shrink-0 rounded border border-border bg-surface-3 px-4 py-2 text-xs font-bold text-ink hover:bg-brand-red hover:text-white transition disabled:opacity-50 disabled:cursor-wait"
            title="Um material por tema (Sesi, Editora, Noturno, Alto contraste, Lúdico, Oceano, Floresta), com e sem menu lateral"
          >
            {creatingDemos ? "Criando demonstrativos…" : "Criar demos por tema"}
          </button>
          <button
            type="button"
            onClick={() => handleCreateDemos(true)}
            disabled={creatingDemos}
            className="shrink-0 rounded border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-xs font-bold text-amber-700 hover:bg-amber-600 hover:text-white transition disabled:opacity-50 disabled:cursor-wait"
            title="Apaga os demonstrativos antigos e gera um novo conjunto completo (todos os blocos + todos os temas)"
          >
            {creatingDemos ? "Recriando…" : "Recriar demos (apaga antigos)"}
          </button>
          </div>
        </div>
        {/* Fila de conversão em lote — cada arquivo vira um projeto vinculado */}
        {queue.length > 0 && (
          <div className="rounded-2xl border border-border bg-surface p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-ink">
                Fila de conversão ({queue.filter((q) => q.status === "ok").length}/{queue.length})
              </h2>
              <button
                onClick={() => setQueue([])}
                disabled={uploading}
                className="text-xs font-bold text-muted hover:text-brand-red disabled:opacity-40"
              >
                Limpar fila
              </button>
            </div>
            <ul className="space-y-2" aria-live="polite">
              {queue.map((it, i) => (
                <li
                  key={`${it.file.name}-${i}`}
                  className="flex items-center gap-3 rounded border border-border bg-surface-2 px-4 py-2.5 text-xs"
                >
                  <IconFile className="w-4 h-4 shrink-0 text-muted" />
                  <span className="flex-1 truncate font-semibold text-ink" title={it.file.name}>
                    {it.file.name}
                  </span>
                  {it.status === "erro" && (
                    <span className="max-w-[40%] truncate text-brand-red" title={it.message}>
                      {it.message}
                    </span>
                  )}
                  {it.status === "ok" && it.projectId ? (
                    <Link
                      to={`/editor/${it.projectId}`}
                      className="shrink-0 rounded bg-brand-red px-3 py-1.5 font-bold text-white hover:bg-brand-red-dark transition"
                    >
                      Abrir Editor
                    </Link>
                  ) : (
                    <span
                      className={`shrink-0 rounded-full px-3 py-1 font-bold ${
                        it.status === "ok"
                          ? "bg-green-500/10 text-green-500 border border-green-500/30"
                          : it.status === "erro"
                            ? "bg-brand-red/10 text-brand-red border border-brand-red/30"
                            : it.status === "convertendo"
                              ? "bg-purple-500/10 text-purple-400 border border-purple-500/30"
                              : "bg-surface-3 text-muted border border-border"
                      }`}
                    >
                      {it.status === "ok"
                        ? "convertido"
                        : it.status === "erro"
                          ? "erro"
                          : it.status === "convertendo"
                            ? "convertendo…"
                            : "pendente"}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Seção de Livros Convertidos */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-ink">Livros & Materiais Disponíveis</h2>
              <p className="text-xs text-muted mt-0.5">
                Abra qualquer material para editar seus blocos interativos ou baixe o pacote pronto para publicação.
              </p>
            </div>

            {/* Campo de Busca + visualização */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative w-full sm:w-72">
                <IconSearch className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar livro por título..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded border border-border bg-surface text-ink text-xs focus:border-brand-red focus:outline-none focus:ring-1 focus:ring-brand-red"
                />
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={`px-3 py-2 rounded text-xs font-bold border ${viewMode === "grid" ? "bg-brand-red text-white border-brand-red" : "bg-surface text-ink border-border"}`}
                >
                  Grade
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={`px-3 py-2 rounded text-xs font-bold border ${viewMode === "list" ? "bg-brand-red text-white border-brand-red" : "bg-surface text-ink border-border"}`}
                >
                  Lista
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (selectedIds.size === filteredProjects.length) setSelectedIds(new Set());
                    else setSelectedIds(new Set(filteredProjects.map((p) => p.id)));
                  }}
                  className="px-3 py-2 rounded text-xs font-bold border bg-surface text-ink border-border"
                >
                  {selectedIds.size === filteredProjects.length && filteredProjects.length > 0 ? "Desmarcar todos" : "Selecionar todos"}
                </button>
              </div>
            </div>

          
          </div>
        <div>

        </div>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-surface rounded-2xl border border-border shadow-card p-5 animate-pulse">
                  <div className="h-4 bg-surface-3 rounded w-1/3 mb-3" />
                  <div className="h-5 bg-surface-3 rounded w-2/3 mb-2" />
                  <div className="h-3 bg-surface-3 rounded w-1/2 mb-4" />
                  <div className="h-8 bg-surface-3 rounded" />
                </div>
              ))}
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-surface border border-border text-muted">
              <IconFile className="w-10 h-10 mx-auto mb-3 opacity-40 text-muted" />
              <p className="text-sm font-bold text-ink">Nenhum livro encontrado</p>
              <p className="text-xs text-muted mt-1">
                {searchTerm
                  ? "Tente buscar com outro termo."
                  : "Envie seu primeiro arquivo .pdf ou .idml acima para começar a editar."}
              </p>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredProjects.map((p) => {
                const downloadUrl = `${apiBase}/projects/${p.id}/download`;

                return (
                  <div
                    key={p.id}
                    className="bg-surface rounded-2xl border border-border shadow-card hover:border-brand-red/50 hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden group"
                  >
                    <div className="p-5">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(p.id)}
                            onChange={() => toggleSelect(p.id)}
                          />
                          <span
                          className={`text-[10px] font-black uppercase px-2 py-0.5 rounded tracking-wider ${p.sourceFormat === "PDF"
                              ? "bg-brand-red/10 text-brand-red border border-brand-red/30"
                              : "bg-purple-500/10 text-purple-400 border border-purple-500/30"
                            }`}
                        >
                          {p.sourceFormat}
                        </span>
                      </div>
                        <span className="text-[11px] text-muted font-medium">
                          {new Date(p.updatedAt || p.createdAt || Date.now()).toLocaleDateString("pt-BR")}
                        </span>
                      </div>

                      <h3
                        className="text-base font-bold text-ink line-clamp-2 leading-snug group-hover:text-brand-red transition"
                        title={p.name}
                        onDoubleClick={() => startRename(p.id, p.name)}
                      >
                        {editingId === p.id ? (
                          <input
                            autoFocus
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onBlur={saveRename}
                            onKeyDown={(e) => { if (e.key === "Enter") saveRename(); if (e.key === "Escape") setEditingId(null); }}
                            className="w-full px-2 py-1 rounded border border-border bg-surface text-ink text-sm"
                          />
                        ) : (
                          p.name
                        )}
                      </h3>

                      {/* Métricas do Livro */}
                      <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs text-muted">
                        <div className="flex items-center gap-1.5" title="Total de Páginas">
                          <IconLayers className="w-4 h-4 text-muted" />
                          <span>{p.pageCount || 1} pág.</span>
                        </div>
                        <div className="flex items-center gap-1.5" title="Total de Blocos Editáveis">
                          <span className="font-bold text-ink">{p.blockCount || 0}</span>
                          <span>blocos</span>
                        </div>
                        <div className="flex items-center gap-1.5" title="Imagens Extraídas">
                          <span className="font-bold text-ink">{p.assetCount || 0}</span>
                          <span>mídias</span>
                        </div>
                      </div>
                    </div>

                    {/* Barra de Ações Rápidas */}
                    <div className="p-3 bg-surface-3 border-t border-border flex items-center gap-2">
                      <Link
                        to={`/editor/${p.id}`}
                        className="flex-1 py-2 px-3 rounded bg-brand-red hover:bg-brand-red-dark text-white text-xs font-bold text-center transition shadow-sm"
                      >
                        Abrir Editor
                      </Link>

                      <a
                        href={downloadUrl}
                        title="Baixar pacote web completo (.zip)"
                        className="p-2 rounded text-muted hover:text-ink bg-surface hover:bg-surface-2 border border-border transition"
                      >
                        <IconDownload className="w-4 h-4" />
                      </a>

                      <button
                        onClick={() => handleDelete(p.id, p.name)}
                        title="Excluir livro"
                        className="p-2 rounded text-muted hover:text-brand-red bg-surface hover:bg-surface-2 border border-border transition"
                      >
                        <IconTrash className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded border border-border bg-surface overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-surface-3 text-ink">
                  <tr>
                    <th className="p-2 w-8"></th>
                    <th className="p-2 text-left">Título</th>
                    <th className="p-2 text-left">Formato</th>
                    <th className="p-2 text-left">Páginas</th>
                    <th className="p-2 text-left">Blocos</th>
                    <th className="p-2 text-left">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProjects.map((p) => {
                    const downloadUrl = `${apiBase}/projects/${p.id}/download`;
                    return (
                      <tr key={p.id} className="border-t border-border">
                        <td className="p-2">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(p.id)}
                            onChange={() => toggleSelect(p.id)}
                          />
                        </td>
                        <td className="p-2 font-semibold text-ink">
                          {editingId === p.id ? (
                            <input
                              autoFocus
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              onBlur={saveRename}
                              onKeyDown={(e) => { if (e.key === "Enter") saveRename(); if (e.key === "Escape") setEditingId(null); }}
                              className="w-full px-2 py-1 rounded border border-border bg-surface text-ink text-sm"
                            />
                          ) : (
                            <span onDoubleClick={() => startRename(p.id, p.name)} title="Duplo clique para renomear">{p.name}</span>
                          )}
                        </td>
                        <td className="p-2">{p.sourceFormat}</td>
                        <td className="p-2">{p.pageCount || 1}</td>
                        <td className="p-2">{p.blockCount || 0}</td>
                        <td className="p-2 flex gap-2">
                          <Link to={`/editor/${p.id}`} className="text-brand-red font-bold text-xs">Editar</Link>
                          <a href={downloadUrl} className="text-ink text-xs">Baixar</a>
                          <button onClick={() => handleDelete(p.id, p.name)} className="text-brand-red text-xs">Excluir</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-2 bg-surface-3 border border-border rounded p-2 mt-4">
                <span className="text-xs font-bold text-ink">{selectedIds.size} selecionado(s)</span>
                <button
                  type="button"
                  onClick={() => {
                    selectedIds.forEach((id) => {
                      const url = `${apiBase}/projects/${id}/download`;
                      window.open(url, "_blank");
                    });
                  }}
                  className="px-3 py-1.5 rounded bg-surface border border-border text-xs font-bold text-ink hover:bg-surface-2"
                >
                  Baixar selecionados
                </button>
                <button
                  type="button"
                  onClick={() => setBulkDeleteOpen(true)}
                  className="px-3 py-1.5 rounded bg-brand-red text-white text-xs font-bold hover:bg-brand-red-dark"
                >
                  Excluir selecionados
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedIds(new Set())}
                  className="px-2 py-1.5 rounded text-xs text-muted hover:text-ink"
                >
                  Limpar
                </button>
              </div>
            )}
        </div>
      </div>
      <ConfirmModal
        open={!!deleteTarget}
        title="Excluir livro"
        message={`Tem certeza que deseja excluir o livro "${deleteTarget?.name}"?`}
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        tone="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
      <ConfirmModal
        open={bulkDeleteOpen}
        title="Excluir selecionados"
        message={`Excluir ${selectedIds.size} livro(s) selecionado(s)?`}
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        tone="danger"
        onConfirm={confirmBulkDelete}
        onCancel={() => setBulkDeleteOpen(false)}
      />
    </div>
  );
}
