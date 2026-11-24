import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiFetch } from "../../lib/api";
import type { ProjectMeta } from "../../types/project";
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

  const handleFileUpload = async (file: File) => {
    const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    if (ext === ".indd") {
      setError(
        "Arquivos .indd são binários proprietários da Adobe. No InDesign, clique em 'Arquivo > Exportar' e selecione 'IDML' ou 'PDF' para importar no Interativo."
      );
      return;
    }
    if (ext !== ".pdf" && ext !== ".idml") {
      setError("Formato não suportado. Por favor, envie um arquivo .pdf ou .idml.");
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

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Tem certeza que deseja excluir o livro "${name}"?`)) return;
    try {
      await apiFetch(`/projects/${id}`, { method: "DELETE" });
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch (e: any) {
      alert("Erro ao excluir: " + (e.message || ""));
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
            const file = e.dataTransfer.files?.[0];
            if (file) handleFileUpload(file);
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
            accept=".pdf,.idml,.indd"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file);
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
                Arraste seu arquivo PDF ou IDML aqui
              </h3>
              <p className="text-xs text-muted mt-1">
                ou clique para escolher um arquivo do seu computador
              </p>
              <div className="mt-4 flex items-center gap-2 text-xs font-semibold">
                <span className="px-2.5 py-1 rounded-md bg-surface-3 text-ink border border-border">.PDF</span>
                <span className="px-2.5 py-1 rounded-md bg-surface-3 text-ink border border-border">.IDML (InDesign)</span>
              </div>
            </div>
          )}
        </div>

        {/* Seção de Livros Convertidos */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-ink">Livros & Materiais Disponíveis</h2>
              <p className="text-xs text-muted mt-0.5">
                Abra qualquer material para editar seus blocos interativos ou baixe o pacote pronto para publicação.
              </p>
            </div>

            {/* Campo de Busca */}
            <div className="relative w-full sm:w-72">
              <IconSearch className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar livro por título..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-border bg-surface text-ink text-xs focus:border-brand-red focus:outline-none focus:ring-1 focus:ring-brand-red"
              />
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12 text-muted">
              <div className="w-8 h-8 border-2 border-brand-red border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <span className="text-xs font-semibold">Carregando lista de livros...</span>
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
          ) : (
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
                        <span
                          className={`text-[10px] font-black uppercase px-2 py-0.5 rounded tracking-wider ${p.sourceFormat === "PDF"
                              ? "bg-brand-red/10 text-brand-red border border-brand-red/30"
                              : "bg-purple-500/10 text-purple-400 border border-purple-500/30"
                            }`}
                        >
                          {p.sourceFormat}
                        </span>
                        <span className="text-[11px] text-muted font-medium">
                          {new Date(p.updatedAt || p.createdAt || Date.now()).toLocaleDateString("pt-BR")}
                        </span>
                      </div>

                      <h3
                        className="text-base font-bold text-ink line-clamp-2 leading-snug group-hover:text-brand-red transition"
                        title={p.name}
                      >
                        {p.name}
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
                        className="flex-1 py-2 px-3 rounded-xl bg-brand-red hover:bg-brand-red-dark text-white text-xs font-bold text-center transition shadow-sm"
                      >
                        Abrir Editor
                      </Link>

                      <a
                        href={downloadUrl}
                        title="Baixar pacote web completo (.zip)"
                        className="p-2 rounded-xl text-muted hover:text-ink bg-surface hover:bg-surface-2 border border-border transition"
                      >
                        <IconDownload className="w-4 h-4" />
                      </a>

                      <button
                        onClick={() => handleDelete(p.id, p.name)}
                        title="Excluir livro"
                        className="p-2 rounded-xl text-muted hover:text-brand-red bg-surface hover:bg-surface-2 border border-border transition"
                      >
                        <IconTrash className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
