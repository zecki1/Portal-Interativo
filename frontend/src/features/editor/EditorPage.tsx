import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiFetch } from "../../lib/api";
import type { ProjectDocument, Block, BlockType, ProjectPage, ProjectVersion } from "../../types/project";
import { SidebarPanels } from "./SidebarPanels";
import { BlockCanvas } from "./BlockCanvas";
import { BlockInspector } from "./BlockInspector";
import { PreviewModal } from "./PreviewModal";
import { newId } from "../../lib/ids";
import { useLocale, LOCALES } from "../../lib/i18n";
import { LuHistory, LuLayers, LuRotateCcw, LuX } from "react-icons/lu";
import {
  IconChevronLeft,
  IconEye,
  IconDownload,
  IconCheck,
  IconAlert,
  IconSliders,
} from "../../components/icons";

export default function EditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { locale, setLocale, t } = useLocale();

  const [doc, setDoc] = useState<ProjectDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados de navegação do editor
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [sidebarTab, setSidebarTab] = useState<"pages" | "blocks" | "media">("pages");
  const [showPreview, setShowPreview] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth >= 768 : true
  );
  const [showVersions, setShowVersions] = useState(false);
  const [versions, setVersions] = useState<ProjectVersion[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [versionLabel, setVersionLabel] = useState("");
  const [versionActionBusy, setVersionActionBusy] = useState(false);

  // Estados de salvamento
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const apiBase =
    import.meta.env.VITE_API_BASE || `http://${window.location.hostname}:3002/api/v1`;

  // Carrega o documento do projeto
  const loadProject = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<ProjectDocument>(`/projects/${id}`);
      if (res.data) {
        setDoc(res.data);
        if (res.data.pages.length > 0 && res.data.pages[0].blocks.length > 0) {
          setSelectedBlockId(res.data.pages[0].blocks[0].id);
        }
      }
    } catch (err: any) {
      setError(err.message || "Erro ao carregar projeto");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProject();
  }, [id]);

  // Função para salvar documento
  const saveDocument = async (currentDoc: ProjectDocument) => {
    if (!id) return;
    setSaveStatus("saving");
    try {
      await apiFetch(`/projects/${id}`, {
        method: "PUT",
        body: JSON.stringify(currentDoc),
      });
      setSaveStatus("saved");
    } catch (err) {
      setSaveStatus("unsaved");
    }
  };

  // Garante que edições pendentes sejam persistidas antes de abrir preview/exportar
  const flushPendingSave = async () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    if (doc && saveStatus !== "saved") {
      await saveDocument(doc);
    }
  };

  const handleOpenPreview = async () => {
    await flushPendingSave();
    setShowPreview(true);
  };

  const handleExportZip = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!doc) return;
    if (saveStatus !== "saved" || saveTimeoutRef.current) {
      e.preventDefault();
      await flushPendingSave();
      const a = document.createElement("a");
      a.href = `${apiBase}/projects/${doc.id}/download`;
      a.download = `${doc.id}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
  };

  // Versionamento e rollback
  const loadVersions = async () => {
    if (!id) return;
    setVersionsLoading(true);
    try {
      const res = await apiFetch<ProjectVersion[]>(`/projects/${id}/versions`);
      setVersions(res.data || []);
    } catch {
      setVersions([]);
    } finally {
      setVersionsLoading(false);
    }
  };

  const handleOpenVersions = async () => {
    await flushPendingSave();
    setShowVersions(true);
    await loadVersions();
  };

  const handleSaveVersion = async () => {
    if (!id || versionActionBusy) return;
    setVersionActionBusy(true);
    try {
      await flushPendingSave();
      await apiFetch(`/projects/${id}/versions`, {
        method: "POST",
        body: JSON.stringify({ label: versionLabel.trim() || undefined }),
      });
      setVersionLabel("");
      await loadVersions();
    } catch (err: any) {
      alert(err.message || "Erro ao salvar versão.");
    } finally {
      setVersionActionBusy(false);
    }
  };

  const handleRestoreVersion = async (v: ProjectVersion) => {
    if (!id || versionActionBusy) return;
    if (!window.confirm(`Restaurar o projeto para "${v.label}"? Um backup automático do estado atual será criado antes.`)) {
      return;
    }
    setVersionActionBusy(true);
    try {
      const res = await apiFetch<ProjectDocument>(`/projects/${id}/versions/${v.id}/restore`, {
        method: "POST",
      });
      if (res.data) {
        setDoc(res.data);
        setActivePageIndex(0);
        setSelectedBlockId(res.data.pages[0]?.blocks[0]?.id || null);
        setSaveStatus("saved");
        await loadVersions();
      }
    } catch (err: any) {
      alert(err.message || "Erro ao restaurar versão.");
    } finally {
      setVersionActionBusy(false);
    }
  };

  // Atualização com auto-save com debounce
  const updateDoc = (updater: (prev: ProjectDocument) => ProjectDocument) => {
    setDoc((prev) => {
      if (!prev) return prev;
      const updated = updater({ ...prev });
      setSaveStatus("unsaved");

      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        saveDocument(updated);
      }, 1000);

      return updated;
    });
  };

  // Gerenciamento de Páginas
  const handleAddPage = () => {
    updateDoc((prev) => {
      const newPageNumber = prev.pages.length + 1;
      const newPage: ProjectPage = {
        id: newId("page"),
        pageNumber: newPageNumber,
        title: `Página ${newPageNumber}`,
        blocks: [
          {
            id: newId("block"),
            type: "heading",
            data: { level: 2, text: `Seção da Página ${newPageNumber}` },
          },
          {
            id: newId("block"),
            type: "paragraph",
            data: { html: "Digite aqui o conteúdo da nova página..." },
          },
        ],
      };
      setActivePageIndex(prev.pages.length);
      setSelectedBlockId(newPage.blocks[0].id);
      return {
        ...prev,
        pages: [...prev.pages, newPage],
      };
    });
  };

  const handleDuplicatePage = (index: number) => {
    updateDoc((prev) => {
      const source = prev.pages[index];
      const cloned: ProjectPage = {
        ...JSON.parse(JSON.stringify(source)),
        id: newId("page"),
        pageNumber: prev.pages.length + 1,
        title: `${source.title || "Página"} (Cópia)`,
      };
      cloned.blocks.forEach((b: Block) => {
        b.id = newId("block");
      });
      return {
        ...prev,
        pages: [...prev.pages, cloned],
      };
    });
  };

  const handleDeletePage = (index: number) => {
    if (!doc || doc.pages.length <= 1) return;
    updateDoc((prev) => {
      const filtered = prev.pages
        .filter((_, i) => i !== index)
        .map((p, i) => ({ ...p, pageNumber: i + 1 }));
      const nextIndex = Math.min(activePageIndex, filtered.length - 1);
      setActivePageIndex(nextIndex);
      return {
        ...prev,
        pages: filtered,
      };
    });
  };

  /** Junta a página atual com a seguinte: os blocos são concatenados. */
  const handleMergeWithNext = (index: number) => {
    updateDoc((prev) => {
      if (index < 0 || index >= prev.pages.length - 1) return prev;
      const current = prev.pages[index];
      const next = prev.pages[index + 1];
      const merged: ProjectPage = {
        ...current,
        title: current.title || next.title,
        blocks: [...current.blocks, ...next.blocks],
      };
      const pages = prev.pages
        .filter((_, i) => i !== index + 1)
        .map((p, i) => (i === index ? merged : p))
        .map((p, i) => ({ ...p, pageNumber: i + 1 }));
      setActivePageIndex(index);
      return { ...prev, pages };
    });
  };

  // Gerenciamento de Blocos
  const handleAddBlock = (type: BlockType, assetSrc?: string) => {
    const newBlock = createEmptyBlock(type, assetSrc);
    updateDoc((prev) => {
      const pages = [...prev.pages];
      const currentPage = pages[activePageIndex];
      if (!currentPage) return prev;
      currentPage.blocks = [...currentPage.blocks, newBlock];
      return { ...prev, pages };
    });
    setSelectedBlockId(newBlock.id);
  };

  const handleInsertBlockAt = (index: number, type: BlockType) => {
    const newBlock = createEmptyBlock(type);
    updateDoc((prev) => {
      const pages = [...prev.pages];
      const currentPage = pages[activePageIndex];
      if (!currentPage) return prev;
      currentPage.blocks.splice(index, 0, newBlock);
      return { ...prev, pages };
    });
    setSelectedBlockId(newBlock.id);
  };

  const handleMoveBlock = (fromIndex: number, toIndex: number) => {
    updateDoc((prev) => {
      const pages = [...prev.pages];
      const currentPage = pages[activePageIndex];
      if (!currentPage) return prev;
      const [moved] = currentPage.blocks.splice(fromIndex, 1);
      currentPage.blocks.splice(toIndex, 0, moved);
      return { ...prev, pages };
    });
  };

  const handleDuplicateBlock = (blockId: string) => {
    updateDoc((prev) => {
      const pages = [...prev.pages];
      const currentPage = pages[activePageIndex];
      if (!currentPage) return prev;
      const idx = currentPage.blocks.findIndex((b) => b.id === blockId);
      if (idx === -1) return prev;
      const cloned = JSON.parse(JSON.stringify(currentPage.blocks[idx]));
      cloned.id = newId("block");
      currentPage.blocks.splice(idx + 1, 0, cloned);
      setSelectedBlockId(cloned.id);
      return { ...prev, pages };
    });
  };

  const handleDeleteBlock = (blockId: string) => {
    updateDoc((prev) => {
      const pages = [...prev.pages];
      const currentPage = pages[activePageIndex];
      if (!currentPage) return prev;
      currentPage.blocks = currentPage.blocks.filter((b) => b.id !== blockId);
      if (selectedBlockId === blockId) {
        setSelectedBlockId(null);
      }
      return { ...prev, pages };
    });
  };

  const handleUpdateBlock = (updated: Block) => {
    updateDoc((prev) => {
      const pages = [...prev.pages];
      const currentPage = pages[activePageIndex];
      if (!currentPage) return prev;
      currentPage.blocks = currentPage.blocks.map((b) =>
        b.id === updated.id ? updated : b
      );
      return { ...prev, pages };
    });
  };

  // Upload manual de asset
  const handleUploadAsset = async (file: File) => {
    if (!id) return;
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await apiFetch<any>(`/projects/${id}/assets`, {
        method: "POST",
        body: fd,
      });
      if (res.data) {
        loadProject();
      }
    } catch (e: any) {
      alert("Erro ao enviar imagem: " + (e.message || ""));
    }
  };

  // Trocar imagem do bloco atualmente selecionado
  const handleReplaceImageInSelectedBlock = (src: string, alt: string) => {
    if (!selectedBlockId || !doc) return;
    const currentPage = doc.pages[activePageIndex];
    const targetBlock = currentPage?.blocks.find((b) => b.id === selectedBlockId);
    if (targetBlock && targetBlock.type === "image") {
      handleUpdateBlock({
        ...targetBlock,
        data: {
          ...targetBlock.data,
          src,
          alt,
          missing: false,
          fileName: undefined,
        },
      });
    } else {
      handleAddBlock("image", src);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-2 flex flex-col items-center justify-center p-6 text-muted">
        <div className="w-10 h-10 border-4 border-brand-red border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-bold text-ink">{t("editor.loading")}</p>
        <p className="text-xs text-muted mt-1">{t("editor.loadingHint")}</p>
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className="min-h-screen bg-surface-2 flex flex-col items-center justify-center p-6 text-center">
        <IconAlert className="w-12 h-12 text-brand-red mb-3" />
        <h2 className="text-lg font-bold text-ink">{t("editor.loadError")}</h2>
        <p className="text-xs text-muted mt-1 max-w-md">{error || "Projeto não encontrado."}</p>
        <button
          onClick={() => navigate("/")}
          className="mt-4 px-4 py-2 bg-brand-red text-white text-xs font-bold rounded-xl hover:bg-brand-red-dark transition shadow-sm"
        >
          {t("editor.backToProjects")}
        </button>
      </div>
    );
  }

  const activePage = doc.pages[activePageIndex] || doc.pages[0];
  const selectedBlock =
    activePage?.blocks.find((b) => b.id === selectedBlockId) || null;

  const hasIdmlGeometry = doc.pages.some((p) => typeof p.width === "number" && p.width > 0);

  return (
    <div className="h-[calc(100vh-56px)] w-full flex flex-col bg-surface-2 overflow-hidden font-sans select-none transition-colors duration-200">
      {/* Top Header do Editor */}
      <header className="min-h-14 bg-surface border-b border-border px-3 sm:px-4 py-2 flex flex-wrap items-center justify-between gap-2 z-30 shrink-0 transition-colors duration-200">
        {/* Lado Esquerdo: Voltar & Título do Livro */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <button
            type="button"
            onClick={() => setMobileSidebarOpen((v) => !v)}
            className="md:hidden p-1.5 px-2 rounded-lg border border-border bg-surface-3 text-ink text-xs font-bold flex items-center gap-1"
            title="Páginas, blocos e mídias"
          >
            <LuLayers className="w-3.5 h-3.5" />
            <span>Painel</span>
          </button>
          <button
            onClick={() => navigate("/")}
            className="p-1.5 rounded-lg text-muted hover:text-ink hover:bg-surface-3 transition flex items-center gap-1 text-xs font-bold shrink-0"
            title="Voltar ao Catálogo de Livros"
          >
            <IconChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">{t("editor.back")}</span>
          </button>
          <div className="hidden sm:block h-4 w-px bg-border" />
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="bg-brand-red text-white text-[10px] font-black uppercase px-2 py-0.5 rounded tracking-wider shrink-0">
              {doc.sourceFormat}
            </span>
            <input
              type="text"
              value={doc.title}
              onChange={(e) => {
                const newTitle = e.target.value;
                updateDoc((prev) => ({ ...prev, title: newTitle }));
              }}
              className="text-sm font-bold text-ink bg-transparent hover:bg-surface-3 focus:bg-surface px-2 py-1 rounded border border-transparent hover:border-border focus:border-brand-red outline-none transition w-full max-w-xs sm:max-w-md truncate"
            />
          </div>
        </div>

        {/* Lado Direito: Status de Auto-save, Versões, Preview e Exportar ZIP */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          <div className="flex items-center gap-1.5 text-xs text-muted">
            {saveStatus === "saved" && (
              <>
                <IconCheck className="w-4 h-4 text-emerald-500" />
                <span className="hidden sm:inline text-emerald-500 font-semibold text-[11px]">{t("editor.saved")}</span>
              </>
            )}
            {saveStatus === "saving" && (
              <span className="text-amber-500 font-semibold text-[11px] animate-pulse">
                {t("editor.saving")}
              </span>
            )}
            {saveStatus === "unsaved" && (
              <span className="text-muted text-[11px]">{t("editor.unsaved")}</span>
            )}
          </div>

          <div className="hidden sm:block h-4 w-px bg-border" />

          {hasIdmlGeometry && (
            <label className="flex items-center gap-1 text-[11px] font-bold text-muted" title="Modo de layout na publicação">
              <select
                value={doc.layoutMode || "flow"}
                onChange={(e) =>
                  updateDoc((prev) => ({
                    ...prev,
                    layoutMode: e.target.value as "flow" | "idml",
                  }))
                }
                className="rounded-lg border border-border bg-surface px-2 py-1.5 text-[11px] font-bold text-ink hover:bg-surface-3 focus:outline-none focus:ring-2 focus:ring-brand-red/40"
              >
                <option value="idml">Layout: Fiel ao IDML</option>
                <option value="flow">Layout: Fluxo contínuo</option>
              </select>
            </label>
          )}

          {/* Botão Histórico de Versões */}
          <button
            type="button"
            onClick={handleOpenVersions}
            className="p-1.5 px-2.5 rounded-lg border border-border bg-surface hover:bg-surface-3 text-ink text-xs font-bold flex items-center gap-1.5 transition"
            title="Histórico de versões e rollback"
          >
            <LuHistory className="w-3.5 h-3.5 text-brand-red" />
            <span className="hidden sm:inline">Versões</span>
          </button>

          {/* Botão de Toggle do Inspector */}
          <button
            onClick={() => setInspectorOpen(!inspectorOpen)}
            className={`p-1.5 px-2.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition ${inspectorOpen
                ? "bg-surface-3 border-border text-ink"
                : "bg-surface border-border text-muted hover:bg-surface-3"
              }`}
            title="Abrir/Fechar Propriedades do Bloco"
          >
            <IconSliders className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t("editor.properties")}</span>
          </button>

          {/* Seletor de idioma da interface (i18n) */}
          <label className="hidden lg:flex items-center gap-1 text-[11px] font-bold text-muted">
            <span className="sr-only">{t("editor.language")}</span>
            <select
              value={locale}
              onChange={(e) => setLocale(e.target.value as typeof locale)}
              title={t("editor.language")}
              className="rounded-lg border border-border bg-surface px-2 py-1.5 text-[11px] font-bold text-ink hover:bg-surface-3 focus:outline-none focus:ring-2 focus:ring-brand-red/40"
            >
              {LOCALES.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.label}
                </option>
              ))}
            </select>
          </label>

          {/* Botão Preview */}
          <button
            onClick={handleOpenPreview}
            className="p-1.5 px-3 rounded-xl bg-surface-3 hover:bg-surface text-ink border border-border text-xs font-bold flex items-center gap-1.5 transition shadow-sm"
          >
            <IconEye className="w-4 h-4 text-brand-red" />
            <span className="hidden sm:inline">{t("editor.preview")}</span>
          </button>

          {/* Botão Exportar Web ZIP */}
          <a
            href={`${apiBase}/projects/${doc.id}/download`}
            onClick={handleExportZip}
            className="p-1.5 px-3 sm:px-4 rounded-xl bg-brand-red hover:bg-brand-red-dark text-white text-xs font-bold flex items-center gap-1.5 transition shadow-sm"
          >
            <IconDownload className="w-4 h-4" />
            <span className="hidden sm:inline">{t("editor.export")}</span>
          </a>
        </div>
      </header>

      {/* Corpo do Editor: 3 Colunas (drawers no mobile) */}
      <div className="relative flex-1 flex overflow-hidden">
        {mobileSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-30 md:hidden"
            onClick={() => setMobileSidebarOpen(false)}
          />
        )}
        {/* 1. Barra Lateral Esquerda (Páginas, Blocos, Mídias) */}
        <div
          className={`${
            mobileSidebarOpen ? "fixed inset-y-0 left-0 z-40 flex" : "hidden"
          } md:static md:flex h-full`}
        >
          <SidebarPanels
            doc={doc}
            activeTab={sidebarTab}
            setActiveTab={setSidebarTab}
            activePageIndex={activePageIndex}
            setActivePageIndex={(idx) => {
              setActivePageIndex(idx);
              setMobileSidebarOpen(false);
            }}
            onAddPage={handleAddPage}
            onDuplicatePage={handleDuplicatePage}
            onDeletePage={handleDeletePage}
            onMergePageWithNext={handleMergeWithNext}
            onAddBlock={(type, src) => {
              handleAddBlock(type, src);
              setMobileSidebarOpen(false);
            }}
            onUploadAsset={handleUploadAsset}
            selectedBlockId={selectedBlockId}
            onReplaceImageInSelectedBlock={handleReplaceImageInSelectedBlock}
            apiBase={apiBase}
          />
        </div>

        {/* 2. Área Central de Trabalho (Canvas do Livro) */}
        <BlockCanvas
          page={activePage}
          selectedBlockId={selectedBlockId}
          onSelectBlock={(bId) => {
            setSelectedBlockId(bId);
            setInspectorOpen(true);
          }}
          onMoveBlock={handleMoveBlock}
          onDuplicateBlock={handleDuplicateBlock}
          onDeleteBlock={handleDeleteBlock}
          onUpdateBlock={handleUpdateBlock}
          onInsertBlockAt={handleInsertBlockAt}
          apiBase={apiBase}
          projectId={doc.id}
        />

        {/* 3. Painel Lateral Direito (Configurações do Bloco Ativo) */}
        {inspectorOpen && (
          <>
            <div
              className="fixed inset-0 bg-black/50 z-30 md:hidden"
              onClick={() => setInspectorOpen(false)}
            />
            <div className="fixed inset-y-0 right-0 z-40 flex md:static h-full">
              <BlockInspector
                block={selectedBlock}
                onUpdateBlock={handleUpdateBlock}
                onDuplicateBlock={handleDuplicateBlock}
                onDeleteBlock={handleDeleteBlock}
                onClose={() => setInspectorOpen(false)}
                assets={doc.assets}
                apiBase={apiBase}
                projectId={doc.id}
              />
            </div>
          </>
        )}
      </div>

      {/* Modal de Histórico de Versões / Rollback */}
      {showVersions && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-surface border border-border rounded-2xl shadow-card overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-5 py-3.5 border-b border-border flex items-center justify-between bg-surface-3">
              <div className="flex items-center gap-2">
                <LuHistory className="w-4 h-4 text-brand-red" />
                <h2 className="text-sm font-bold text-ink">Versões do projeto (Rollback)</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowVersions(false)}
                className="p-1 text-muted hover:text-ink rounded-lg hover:bg-surface-2"
                aria-label="Fechar histórico de versões"
              >
                <LuX className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 border-b border-border flex gap-2">
              <input
                type="text"
                value={versionLabel}
                onChange={(e) => setVersionLabel(e.target.value)}
                placeholder="Nome do marco (ex: Antes de trocar imagens)"
                className="flex-1 px-3 py-2 rounded-xl border border-border bg-surface text-xs text-ink focus:border-brand-red focus:outline-none"
              />
              <button
                type="button"
                onClick={handleSaveVersion}
                disabled={versionActionBusy}
                className="px-4 py-2 rounded-xl bg-brand-red hover:bg-brand-red-dark text-white text-xs font-bold transition disabled:opacity-50"
              >
                Salvar versão
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {versionsLoading ? (
                <p className="text-xs text-muted text-center py-6">Carregando versões...</p>
              ) : versions.length === 0 ? (
                <p className="text-xs text-muted text-center py-6">
                  Nenhuma versão salva ainda. Salve uma versão manual acima para criar um ponto de restauração.
                </p>
              ) : (
                versions.map((v) => (
                  <div
                    key={v.id}
                    className="p-3 rounded-xl border border-border bg-surface-2 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-ink truncate">{v.label}</span>
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-surface-3 text-muted border border-border">
                          {v.kind === "manual" ? "Manual" : v.kind === "rollback" ? "Backup" : "Auto"}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted mt-0.5">
                        {new Date(v.createdAt).toLocaleString("pt-BR")} · {v.pageCount} pág. · {v.blockCount} blocos
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRestoreVersion(v)}
                      disabled={versionActionBusy}
                      className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border bg-surface hover:border-brand-red hover:text-brand-red text-xs font-bold text-ink transition disabled:opacity-50"
                    >
                      <LuRotateCcw className="w-3.5 h-3.5" />
                      Restaurar
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Preview Interativo */}
      {showPreview && (
        <PreviewModal
          projectId={doc.id}
          projectName={doc.title}
          apiBase={apiBase}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
}

function createEmptyBlock(type: BlockType, assetSrc?: string): Block {
  const id = newId("block");
  switch (type) {
    case "heading":
      return { id, type: "heading", data: { level: 2, text: "Novo Título de Seção" } };
    case "paragraph":
      return { id, type: "paragraph", data: { html: "Digite aqui seu texto ou parágrafo explicativo..." } };
    case "image":
      return {
        id,
        type: "image",
        data: {
          src: assetSrc || "assets/img_1.jpg",
          alt: "Ilustração do material",
          caption: "Legenda da imagem",
          enableZoom: true,
        },
      };
    case "accordion":
      return {
        id,
        type: "accordion",
        data: {
          title: "Tópicos de Aprofundamento",
          items: [
            { id: newId("item"), title: "Tópico 1", contentHtml: "Explicação do primeiro tópico...", defaultOpen: true },
            { id: newId("item"), title: "Tópico 2", contentHtml: "Explicação do segundo tópico...", defaultOpen: false },
          ],
        },
      };
    case "tabs":
      return {
        id,
        type: "tabs",
        data: {
          items: [
            { id: newId("item"), label: "Aba 1", contentHtml: "Conteúdo da primeira aba..." },
            { id: newId("item"), label: "Aba 2", contentHtml: "Conteúdo da segunda aba..." },
          ],
        },
      };
    case "callout":
      return {
        id,
        type: "callout",
        data: {
          variant: "tip",
          title: "Dica de Mediação Pedagógica",
          contentHtml: "Oriente os estudantes a debaterem as respostas em grupos.",
        },
      };
    case "quiz":
      return {
        id,
        type: "quiz",
        data: {
          question: "Qual o conceito principal abordado nesta seção?",
          options: [
            { id: newId("item"), text: "Conceito A (Correto)", isCorrect: true },
            { id: newId("item"), text: "Conceito B (Incorreto)", isCorrect: false },
          ],
          explanation: "O Conceito A está correto de acordo com a definição apresentada no capítulo.",
        },
      };
    case "video":
      return {
        id,
        type: "video",
        data: {
          source: "youtube",
          url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
          title: "Vídeo Complementar",
        },
      };
    case "external-embed":
      return {
        id,
        type: "external-embed",
        data: {
          embedUrl: "https://phet.colorado.edu/sims/html/forces-and-motion-basics/latest/forces-and-motion-basics_all.html",
          title: "Simulador Interativo PhET",
        },
      };

    /* ---------- Conteúdo ProjetoX ---------- */
    case "flipcard":
      return {
        id,
        type: "flipcard",
        data: {
          title: "Você sabia?",
          frontHtml: "Passe o olhar pela imagem e clique para descobrir uma curiosidade.",
          backHtml: "Os animais que põem ovos são chamados de <strong>ovíparos</strong>.",
          hint: "Clique para virar",
        },
      };
    case "timeline":
      return {
        id,
        type: "timeline",
        data: {
          title: "Linha do tempo",
          items: [
            { id: id + "-1", title: "Primeiro passo", contentHtml: "Descreva o primeiro momento.", icon: "1" },
            { id: id + "-2", title: "Segundo passo", contentHtml: "Descreva o segundo momento.", icon: "2" },
            { id: id + "-3", title: "Terceiro passo", contentHtml: "Descreva o terceiro momento.", icon: "3" },
          ],
        },
      };
    case "table":
      return {
        id,
        type: "table",
        data: {
          caption: "Tabela comparativa",
          headers: ["Animal", "Característica"],
          rows: [
            ["Tucano", "Bico grande e colorido"],
            ["Onça", "Pelagem pintada"],
          ],
          striped: true,
        },
      };
    case "cover":
      return {
        id,
        type: "cover",
        data: {
          title: "Título da Unidade",
          subtitle: "Um subtítulo curto que apresenta o tema.",
          ctaLabel: "Começar",
          ctaHref: "#page-content",
          align: "left",
        },
      };
    case "parallax":
      return {
        id,
        type: "parallax",
        data: { image: "", title: "Separe os conteúdos", subtitle: "Use esta faixa para marcar uma nova parte do material.", height: 280 },
      };
    case "gallery":
      return {
        id,
        type: "gallery",
        data: {
          items: [
            { id: id + "-1", src: "assets/img_1.jpg", caption: "Imagem 1" },
            { id: id + "-2", src: "assets/img_1.jpg", caption: "Imagem 2" },
          ],
        },
      };
    case "image-text-card":
      return {
        id,
        type: "image-text-card",
        data: {
          image: "assets/img_1.jpg",
          title: "Imagem e texto",
          html: "<p>Descreva aqui a relação entre a imagem e o conteúdo.</p>",
          layout: "left",
        },
      };
    case "highlight":
      return {
        id,
        type: "highlight",
        data: {
          title: "Destaque",
          html: "<p>As palavras <mark>importantes</mark> aparecem destacadas no texto.</p>",
          legend: "Use ==palavra== para destacar.",
        },
      };
    case "code":
      return {
        id,
        type: "code",
        data: { filename: "exemplo.js", language: "javascript", code: "console.log('Olá, mundo!');" },
      };

    /* ---------- Exercícios ProjetoX ---------- */
    case "multiple-choice":
      return {
        id,
        type: "multiple-choice",
        data: {
          question: "Qual alternativa está correta?",
          options: [
            { id: id + "-1", text: "Alternativa correta" },
            { id: id + "-2", text: "Alternativa incorreta" },
            { id: id + "-3", text: "Outra alternativa incorreta" },
          ],
          correctIds: [id + "-1"],
          attempts: 2,
          explanation: "Explique por que a alternativa é correta.",
        },
      };
    case "true-false":
      return {
        id,
        type: "true-false",
        data: {
          question: "Classifique as afirmações em verdadeiro ou falso.",
          statements: [
            { id: id + "-1", text: "Primeira afirmação verdadeira.", answer: true },
            { id: id + "-2", text: "Segunda afirmação falsa.", answer: false },
          ],
          attempts: 2,
        },
      };
    case "fill-blanks":
      return {
        id,
        type: "fill-blanks",
        data: {
          question: "Complete as lacunas.",
          sentences: [
            { id: id + "-1", text: "O ____ é um animal que põe ovos.", answers: ["tucano"] },
          ],
          attempts: 2,
        },
      };
    case "ordering":
      return {
        id,
        type: "ordering",
        data: {
          question: "Coloque os acontecimentos na ordem correta.",
          items: [
            { id: id + "-1", text: "Primeiro acontecimento" },
            { id: id + "-2", text: "Segundo acontecimento" },
            { id: id + "-3", text: "Terceiro acontecimento" },
          ],
          attempts: 2,
        },
      };
    case "matching":
      return {
        id,
        type: "matching",
        data: {
          question: "Relacione as colunas.",
          pairs: [
            { id: id + "-1", left: "Tucano", right: "Bico grande" },
            { id: id + "-2", left: "Onça", right: "Pelagem pintada" },
            { id: id + "-3", left: "Cobra", right: "Não tem patas" },
          ],
          attempts: 2,
        },
      };
    case "memory-game":
      return {
        id,
        type: "memory-game",
        data: {
          title: "Encontre os pares",
          pairs: [
            { id: id + "-1", a: "Tucano", b: "Bico" },
            { id: id + "-2", a: "Onça", b: "Pintas" },
            { id: id + "-3", a: "Cobra", b: "Escamas" },
            { id: id + "-4", a: "Peixe", b: "Nadadeiras" },
          ],
          columns: 4,
        },
      };
    case "word-search":
      return {
        id,
        type: "word-search",
        data: { title: "Encontre as palavras", words: ["TUCANO", "ONCA", "COBRA", "PEIXE"], size: 12 },
      };
    case "crossword":
      return {
        id,
        type: "crossword",
        data: {
          title: "Palavras cruzadas",
          entries: [
            { id: id + "-1", answer: "ANIMAIS", clue: "Seres vivos que se movem e se alimentam." },
            { id: id + "-2", answer: "TUCANO", clue: "Ave de bico grande e colorido." },
            { id: id + "-3", answer: "ONCA", clue: "Felino de pelagem pintada." },
          ],
        },
      };
    default:
      return { id, type: "paragraph", data: { html: "Novo bloco." } } as Block;
  }
}
