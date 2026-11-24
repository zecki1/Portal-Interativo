import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiFetch } from "../../lib/api";
import type { ProjectDocument, Block, BlockType, ProjectPage } from "../../types/project";
import { SidebarPanels } from "./SidebarPanels";
import { BlockCanvas } from "./BlockCanvas";
import { BlockInspector } from "./BlockInspector";
import { PreviewModal } from "./PreviewModal";
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

  const [doc, setDoc] = useState<ProjectDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados de navegação do editor
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [sidebarTab, setSidebarTab] = useState<"pages" | "blocks" | "media">("pages");
  const [showPreview, setShowPreview] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(true);

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
        id: String(Date.now()),
        pageNumber: newPageNumber,
        title: `Página ${newPageNumber}`,
        blocks: [
          {
            id: String(Date.now() + 1),
            type: "heading",
            data: { level: 2, text: `Seção da Página ${newPageNumber}` },
          },
          {
            id: String(Date.now() + 2),
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
        id: String(Date.now()),
        pageNumber: prev.pages.length + 1,
        title: `${source.title || "Página"} (Cópia)`,
      };
      cloned.blocks.forEach((b: Block) => {
        b.id = String(Math.random());
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
      cloned.id = String(Date.now());
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
        <p className="text-sm font-bold text-ink">Carregando livro interativo...</p>
        <p className="text-xs text-muted mt-1">Carregando páginas, mídias e blocos editáveis.</p>
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className="min-h-screen bg-surface-2 flex flex-col items-center justify-center p-6 text-center">
        <IconAlert className="w-12 h-12 text-brand-red mb-3" />
        <h2 className="text-lg font-bold text-ink">Falha ao carregar o livro</h2>
        <p className="text-xs text-muted mt-1 max-w-md">{error || "Projeto não encontrado."}</p>
        <button
          onClick={() => navigate("/")}
          className="mt-4 px-4 py-2 bg-brand-red text-white text-xs font-bold rounded-xl hover:bg-brand-red-dark transition shadow-sm"
        >
          Voltar para Projetos
        </button>
      </div>
    );
  }

  const activePage = doc.pages[activePageIndex] || doc.pages[0];
  const selectedBlock =
    activePage?.blocks.find((b) => b.id === selectedBlockId) || null;

  return (
    <div className="h-[calc(100vh-56px)] w-screen flex flex-col bg-surface-2 overflow-hidden font-sans select-none transition-colors duration-200">
      {/* Top Header do Editor */}
      <header className="h-14 bg-surface border-b border-border px-4 flex items-center justify-between z-30 shrink-0 transition-colors duration-200">
        {/* Lado Esquerdo: Voltar & Título do Livro */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="p-1.5 rounded-lg text-muted hover:text-ink hover:bg-surface-3 transition flex items-center gap-1 text-xs font-bold"
            title="Voltar ao Catálogo de Livros"
          >
            <IconChevronLeft className="w-4 h-4" />
            <span>Voltar</span>
          </button>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-2">
            <span className="bg-brand-red text-white text-[10px] font-black uppercase px-2 py-0.5 rounded tracking-wider">
              {doc.sourceFormat}
            </span>
            <input
              type="text"
              value={doc.title}
              onChange={(e) => {
                const newTitle = e.target.value;
                updateDoc((prev) => ({ ...prev, title: newTitle }));
              }}
              className="text-sm font-bold text-ink bg-transparent hover:bg-surface-3 focus:bg-surface px-2 py-1 rounded border border-transparent hover:border-border focus:border-brand-red outline-none transition max-w-md truncate"
            />
          </div>
        </div>

        {/* Lado Direito: Status de Auto-save, Preview e Exportar ZIP */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-muted">
            {saveStatus === "saved" && (
              <>
                <IconCheck className="w-4 h-4 text-emerald-500" />
                <span className="text-emerald-500 font-semibold text-[11px]">Salvo</span>
              </>
            )}
            {saveStatus === "saving" && (
              <span className="text-amber-500 font-semibold text-[11px] animate-pulse">
                Salvando...
              </span>
            )}
            {saveStatus === "unsaved" && (
              <span className="text-muted text-[11px]">Alterações pendentes</span>
            )}
          </div>

          <div className="h-4 w-px bg-border" />

          {/* Botão de Toggle do Inspector */}
          <button
            onClick={() => setInspectorOpen(!inspectorOpen)}
            className={`p-1.5 px-2.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition ${
              inspectorOpen
                ? "bg-surface-3 border-border text-ink"
                : "bg-surface border-border text-muted hover:bg-surface-3"
            }`}
            title="Abrir/Fechar Propriedades do Bloco"
          >
            <IconSliders className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Propriedades</span>
          </button>

          {/* Botão Preview */}
          <button
            onClick={() => setShowPreview(true)}
            className="p-1.5 px-3 rounded-xl bg-surface-3 hover:bg-surface text-ink border border-border text-xs font-bold flex items-center gap-1.5 transition shadow-sm"
          >
            <IconEye className="w-4 h-4 text-brand-red" />
            <span>Visualizar (Preview)</span>
          </button>

          {/* Botão Exportar Web ZIP */}
          <a
            href={`${apiBase}/projects/${doc.id}/download`}
            className="p-1.5 px-4 rounded-xl bg-brand-red hover:bg-brand-red-dark text-white text-xs font-bold flex items-center gap-1.5 transition shadow-sm"
          >
            <IconDownload className="w-4 h-4" />
            <span>Exportar Web (.ZIP)</span>
          </a>
        </div>
      </header>

      {/* Corpo do Editor: 3 Colunas */}
      <div className="flex-1 flex overflow-hidden">
        {/* 1. Barra Lateral Esquerda (Páginas, Blocos, Mídias) */}
        <SidebarPanels
          doc={doc}
          activeTab={sidebarTab}
          setActiveTab={setSidebarTab}
          activePageIndex={activePageIndex}
          setActivePageIndex={setActivePageIndex}
          onAddPage={handleAddPage}
          onDuplicatePage={handleDuplicatePage}
          onDeletePage={handleDeletePage}
          onAddBlock={handleAddBlock}
          onUploadAsset={handleUploadAsset}
          selectedBlockId={selectedBlockId}
          onReplaceImageInSelectedBlock={handleReplaceImageInSelectedBlock}
          apiBase={apiBase}
        />

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
        )}
      </div>

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
  const id = String(Date.now());
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
            { id: String(Date.now() + 1), title: "Tópico 1", contentHtml: "Explicação do primeiro tópico...", defaultOpen: true },
            { id: String(Date.now() + 2), title: "Tópico 2", contentHtml: "Explicação do segundo tópico...", defaultOpen: false },
          ],
        },
      };
    case "tabs":
      return {
        id,
        type: "tabs",
        data: {
          items: [
            { id: String(Date.now() + 1), label: "Aba 1", contentHtml: "Conteúdo da primeira aba..." },
            { id: String(Date.now() + 2), label: "Aba 2", contentHtml: "Conteúdo da segunda aba..." },
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
            { id: String(Date.now() + 1), text: "Conceito A (Correto)", isCorrect: true },
            { id: String(Date.now() + 2), text: "Conceito B (Incorreto)", isCorrect: false },
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
  }
}
