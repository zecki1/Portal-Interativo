import React, { useRef } from "react";
import type { ProjectDocument, BlockType } from "../../types/project";
import {
  IconLayers,
  IconGrid,
  IconImage,
  IconPlus,
  IconTrash,
  IconCopy,
  IconType,
  IconHelpCircle,
  IconPlay,
  IconUpload,
  IconLink,
  IconChevronRight,
  IconSparkles,
} from "../../components/icons";
import {
  LuBookOpen,
  LuRefreshCw,
  LuHistory,
  LuTable,
  LuImages,
  LuPuzzle,
  LuMountain,
  LuHighlighter,
  LuCode,
  LuCheckCheck,
  LuBadgeCheck,
  LuPencil,
  LuArrowUpDown,
  LuLink2,
  LuGamepad2,
  LuCaseSensitive,
  LuLayoutGrid,
  LuArrowDownToLine,
} from "react-icons/lu";

interface SidebarPanelsProps {
  doc: ProjectDocument;
  activeTab: "pages" | "blocks" | "media";
  setActiveTab: (tab: "pages" | "blocks" | "media") => void;
  activePageIndex: number;
  setActivePageIndex: (index: number) => void;
  onAddPage: () => void;
  onDuplicatePage: (index: number) => void;
  onDeletePage: (index: number) => void;
  /** Junta a página `index` com a próxima (concatena os blocos). */
  onMergePageWithNext: (index: number) => void;
  onAddBlock: (type: BlockType, assetSrc?: string) => void;
  onUploadAsset: (file: File) => void;
  selectedBlockId: string | null;
  onReplaceImageInSelectedBlock?: (src: string, alt: string) => void;
  apiBase: string;
}

export const SidebarPanels: React.FC<SidebarPanelsProps> = ({
  doc,
  activeTab,
  setActiveTab,
  activePageIndex,
  setActivePageIndex,
  onAddPage,
  onDuplicatePage,
  onDeletePage,
  onMergePageWithNext,
  onAddBlock,
  onUploadAsset,
  selectedBlockId,
  onReplaceImageInSelectedBlock,
  apiBase,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const blockCatalog: Array<{
    type: BlockType;
    title: string;
    description: string;
    badge: string;
    color: string;
    icon: React.ReactNode;
  }> = [
    {
      type: "heading",
      title: "Título",
      description: "Títulos de seção (H1, H2, H3)",
      badge: "Texto",
      color: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      icon: <IconType className="w-5 h-5 text-blue-500" />,
    },
    {
      type: "paragraph",
      title: "Parágrafo",
      description: "Texto corrido com rich text",
      badge: "Texto",
      color: "bg-surface-3 text-ink border-border",
      icon: <span className="font-bold text-ink text-sm">¶</span>,
    },
    {
      type: "image",
      title: "Imagem Interativa",
      description: "Com zoom em tela cheia ou link",
      badge: "Mídia",
      color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
      icon: <IconImage className="w-5 h-5 text-emerald-500" />,
    },
    {
      type: "accordion",
      title: "Sanfona (Accordion)",
      description: "Itens expansíveis e recolhíveis",
      badge: "Interativo",
      color: "bg-amber-500/10 text-amber-500 border-amber-500/20",
      icon: <span className="font-bold text-amber-500 text-sm">≡</span>,
    },
    {
      type: "tabs",
      title: "Abas (Tabs)",
      description: "Conteúdo segmentado por abas",
      badge: "Interativo",
      color: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
      icon: <IconLayers className="w-5 h-5 text-indigo-500" />,
    },
    {
      type: "callout",
      title: "Caixa de Destaque",
      description: "Dicas, avisos e curiosidades",
      badge: "Destaque",
      color: "bg-purple-500/10 text-purple-500 border-purple-500/20",
      icon: <IconSparkles className="w-5 h-5 text-purple-500" />,
    },
    {
      type: "quiz",
      title: "Quiz Interativo",
      description: "Questão com feedback imediato",
      badge: "Gamificação",
      color: "bg-rose-500/10 text-rose-500 border-rose-500/20",
      icon: <IconHelpCircle className="w-5 h-5 text-rose-500" />,
    },
    {
      type: "video",
      title: "Vídeo Incorporado",
      description: "YouTube ou vídeo local MP4",
      badge: "Mídia",
      color: "bg-brand-red/10 text-brand-red border-brand-red/20",
      icon: <IconPlay className="w-5 h-5 text-brand-red" />,
    },
    {
      type: "external-embed",
      title: "Recurso Externo (Embed)",
      description: "Simuladores, H5P, Genially",
      badge: "Interativo",
      color: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
      icon: <IconLink className="w-5 h-5 text-cyan-500" />,
    },
    {
      type: "cover",
      title: "Capa / Hero",
      description: "Abertura de unidade com imagem e botão",
      badge: "ProjetoX",
      color: "bg-rose-500/10 text-rose-500 border-rose-500/20",
      icon: <LuBookOpen className="w-5 h-5 text-rose-500" aria-hidden="true" />,
    },
    {
      type: "flipcard",
      title: "Cartão que Vira (Flipcard)",
      description: "Frente e verso com revelação ao clicar",
      badge: "ProjetoX",
      color: "bg-violet-500/10 text-violet-500 border-violet-500/20",
      icon: <LuRefreshCw className="w-5 h-5 text-violet-500" aria-hidden="true" />,
    },
    {
      type: "timeline",
      title: "Linha do Tempo",
      description: "Etapas verticais com ícones",
      badge: "ProjetoX",
      color: "bg-amber-500/10 text-amber-600 border-amber-500/20",
      icon: <LuHistory className="w-5 h-5 text-amber-600" aria-hidden="true" />,
    },
    {
      type: "table",
      title: "Tabela Responsiva",
      description: "Vira cartões no celular",
      badge: "ProjetoX",
      color: "bg-slate-500/10 text-slate-500 border-slate-500/20",
      icon: <LuTable className="w-5 h-5 text-slate-500" aria-hidden="true" />,
    },
    {
      type: "gallery",
      title: "Galeria / Carrossel",
      description: "Várias imagens com navegação",
      badge: "ProjetoX",
      color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
      icon: <LuImages className="w-5 h-5 text-emerald-600" aria-hidden="true" />,
    },
    {
      type: "image-text-card",
      title: "Imagem + Texto",
      description: "Card lado a lado com imagem",
      badge: "ProjetoX",
      color: "bg-teal-500/10 text-teal-600 border-teal-500/20",
      icon: <LuPuzzle className="w-5 h-5 text-teal-600" aria-hidden="true" />,
    },
    {
      type: "parallax",
      title: "Faixa Parallax",
      description: "Separador com imagem de fundo fixa",
      badge: "ProjetoX",
      color: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
      icon: <LuMountain className="w-5 h-5 text-indigo-500" aria-hidden="true" />,
    },
    {
      type: "highlight",
      title: "Texto Destacado",
      description: "Marcações em amarelo no texto",
      badge: "ProjetoX",
      color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
      icon: <LuHighlighter className="w-5 h-5 text-yellow-600" aria-hidden="true" />,
    },
    {
      type: "code",
      title: "Bloco de Código",
      description: "Código com nome do arquivo e linguagem",
      badge: "ProjetoX",
      color: "bg-zinc-500/10 text-zinc-500 border-zinc-500/20",
      icon: <LuCode className="w-5 h-5 text-zinc-500" aria-hidden="true" />,
    },
    {
      type: "multiple-choice",
      title: "Múltipla Escolha",
      description: "Uma ou várias corretas, com tentativas",
      badge: "Jogo",
      color: "bg-rose-500/10 text-rose-500 border-rose-500/20",
      icon: <LuCheckCheck className="w-5 h-5 text-rose-500" aria-hidden="true" />,
    },
    {
      type: "true-false",
      title: "Verdadeiro ou Falso",
      description: "Afirmações com V/F e correção",
      badge: "Jogo",
      color: "bg-lime-500/10 text-lime-600 border-lime-500/20",
      icon: <LuBadgeCheck className="w-5 h-5 text-lime-600" aria-hidden="true" />,
    },
    {
      type: "fill-blanks",
      title: "Completar Lacunas",
      description: "Banco de palavras e lacunas",
      badge: "Jogo",
      color: "bg-sky-500/10 text-sky-600 border-sky-500/20",
      icon: <LuPencil className="w-5 h-5 text-sky-600" aria-hidden="true" />,
    },
    {
      type: "ordering",
      title: "Ordenar Itens",
      description: "Arraste para colocar na ordem",
      badge: "Jogo",
      color: "bg-orange-500/10 text-orange-600 border-orange-500/20",
      icon: <LuArrowUpDown className="w-5 h-5 text-orange-600" aria-hidden="true" />,
    },
    {
      type: "matching",
      title: "Relacionar Colunas",
      description: "Associe cada item à sua dupla",
      badge: "Jogo",
      color: "bg-fuchsia-500/10 text-fuchsia-600 border-fuchsia-500/20",
      icon: <LuLink2 className="w-5 h-5 text-fuchsia-600" aria-hidden="true" />,
    },
    {
      type: "memory-game",
      title: "Jogo da Memória",
      description: "Encontre os pares de cartas",
      badge: "Jogo",
      color: "bg-purple-500/10 text-purple-600 border-purple-500/20",
      icon: <LuGamepad2 className="w-5 h-5 text-purple-600" aria-hidden="true" />,
    },
    {
      type: "word-search",
      title: "Caça-Palavras",
      description: "Grade gerada com as palavras",
      badge: "Jogo",
      color: "bg-green-500/10 text-green-600 border-green-500/20",
      icon: <LuCaseSensitive className="w-5 h-5 text-green-600" aria-hidden="true" />,
    },
    {
      type: "crossword",
      title: "Palavras Cruzadas",
      description: "Grade e dicas geradas automaticamente",
      badge: "Jogo",
      color: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",
      icon: <LuLayoutGrid className="w-5 h-5 text-cyan-600" aria-hidden="true" />,
    },
  ];

  return (
    <aside className="w-80 max-w-[85vw] shrink-0 bg-surface border-r border-border flex flex-col h-full overflow-hidden select-none transition-colors duration-200">
      {/* Abas Superiores */}
      <div className="flex border-b border-border bg-surface-3 text-xs font-semibold">
        <button
          onClick={() => setActiveTab("pages")}
          className={`flex-1 py-3 px-2 flex items-center justify-center gap-1.5 border-b-2 transition ${
            activeTab === "pages"
              ? "border-brand-red text-brand-red font-bold bg-surface"
              : "border-transparent text-muted hover:text-ink"
          }`}
        >
          <IconLayers className="w-4 h-4" />
          <span>Páginas ({doc.pages.length})</span>
        </button>
        <button
          onClick={() => setActiveTab("blocks")}
          className={`flex-1 py-3 px-2 flex items-center justify-center gap-1.5 border-b-2 transition ${
            activeTab === "blocks"
              ? "border-brand-red text-brand-red font-bold bg-surface"
              : "border-transparent text-muted hover:text-ink"
          }`}
        >
          <IconGrid className="w-4 h-4" />
          <span>+ Blocos</span>
        </button>
        <button
          onClick={() => setActiveTab("media")}
          className={`flex-1 py-3 px-2 flex items-center justify-center gap-1.5 border-b-2 transition ${
            activeTab === "media"
              ? "border-brand-red text-brand-red font-bold bg-surface"
              : "border-transparent text-muted hover:text-ink"
          }`}
        >
          <IconImage className="w-4 h-4" />
          <span>Mídias ({doc.assets.length})</span>
        </button>
      </div>

      {/* Conteúdo da Aba */}
      <div className="flex-1 overflow-y-auto p-3">
        {/* ABA: PÁGINAS */}
        {activeTab === "pages" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <span className="text-xs font-bold text-muted uppercase tracking-wider">
                Estrutura do Livro
              </span>
              <button
                onClick={onAddPage}
                className="inline-flex items-center gap-1 text-xs font-bold text-brand-red hover:underline bg-brand-red/10 px-2.5 py-1 rounded-full transition"
              >
                <IconPlus className="w-3.5 h-3.5" />
                Nova Página
              </button>
            </div>

            <div className="space-y-1.5 pt-1">
              {doc.pages.map((p, idx) => {
                const isActive = idx === activePageIndex;
                return (
                  <div
                    key={p.id}
                    onClick={() => setActivePageIndex(idx)}
                    className={`group relative flex items-center justify-between p-2.5 rounded-xl border transition cursor-pointer ${
                      isActive
                        ? "bg-brand-red/10 border-brand-red shadow-sm"
                        : "bg-surface border-border hover:border-brand-red/50 hover:bg-surface-3"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`w-6 h-6 rounded-lg text-xs font-bold grid place-items-center shrink-0 ${
                          isActive
                            ? "bg-brand-red text-white"
                            : "bg-surface-3 text-muted"
                        }`}
                      >
                        {p.pageNumber}
                      </span>
                      <div className="truncate">
                        <p
                          className={`text-xs font-semibold truncate ${
                            isActive ? "text-brand-red font-bold" : "text-ink"
                          }`}
                        >
                          {p.title || `Página ${p.pageNumber}`}
                        </p>
                        <p className="text-[10px] text-muted">
                          {p.blocks.length} {p.blocks.length === 1 ? "bloco" : "blocos"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                      {idx < doc.pages.length - 1 && (
                        <button
                          title="Juntar com a próxima página"
                          aria-label="Juntar com a próxima página"
                          onClick={(e) => {
                            e.stopPropagation();
                            onMergePageWithNext(idx);
                          }}
                          className="p-1 text-muted hover:text-brand-red rounded hover:bg-brand-red/10"
                        >
                          <LuArrowDownToLine className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                      )}
                      <button
                        title="Duplicar Página"
                        aria-label="Duplicar página"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDuplicatePage(idx);
                        }}
                        className="p-1 text-muted hover:text-ink rounded hover:bg-surface-3"
                      >
                        <IconCopy className="w-3.5 h-3.5" />
                      </button>
                      {doc.pages.length > 1 && (
                        <button
                          title="Excluir Página"
                          aria-label="Excluir página"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeletePage(idx);
                          }}
                          className="p-1 text-muted hover:text-brand-red rounded hover:bg-brand-red/10"
                        >
                          <IconTrash className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ABA: BLOCOS / COMPONENTES */}
        {activeTab === "blocks" && (
          <div className="space-y-3">
            <div className="pb-1">
              <span className="text-xs font-bold text-muted uppercase tracking-wider">
                Clique para adicionar à página {activePageIndex + 1}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {blockCatalog.map((b) => (
                <button
                  key={b.type}
                  onClick={() => onAddBlock(b.type)}
                  className="w-full text-left p-3 rounded-xl border border-border bg-surface hover:border-brand-red hover:shadow-sm hover:translate-x-0.5 transition flex items-center justify-between group"
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg border ${b.color} shrink-0`}>
                      {b.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-ink group-hover:text-brand-red">
                          {b.title}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted mt-0.5 leading-snug">
                        {b.description}
                      </p>
                    </div>
                  </div>
                  <IconChevronRight className="w-4 h-4 text-muted group-hover:text-brand-red shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ABA: MÍDIAS EXTRAÍDAS */}
        {activeTab === "media" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-border">
              <span className="text-xs font-bold text-muted uppercase tracking-wider">
                Mídias do Livro
              </span>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1 text-xs font-bold text-brand-red hover:underline bg-brand-red/10 px-2.5 py-1 rounded-full transition"
              >
                <IconUpload className="w-3.5 h-3.5" />
                + Enviar Imagem
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onUploadAsset(f);
                }}
              />
            </div>

            {doc.assets.length === 0 ? (
              <div className="text-center py-8 px-4 text-muted">
                <IconImage className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs font-semibold text-ink">Nenhuma imagem extraída.</p>
                <p className="text-[11px] text-muted mt-1">
                  Você pode enviar fotos e ilustrações clicando no botão acima.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {doc.assets.map((ast) => {
                  const isPlaceholder = ast.mimeType.includes("placeholder");
                  const fullUrl = `${apiBase}/projects/${doc.id}/preview/${ast.path}`;
                  return (
                    <div
                      key={ast.id}
                      className="group relative rounded-lg border border-border overflow-hidden bg-surface hover:border-brand-red hover:shadow-md transition"
                    >
                      <div className="aspect-square w-full bg-surface-3 flex items-center justify-center overflow-hidden">
                        {isPlaceholder ? (
                          <div className="p-2 text-center text-muted">
                            <IconImage className="w-6 h-6 mx-auto mb-1 opacity-40 text-brand-red" />
                            <span className="text-[9px] font-bold block truncate" title={ast.fileName}>
                              {ast.fileName}
                            </span>
                            <span className="text-[8px] text-muted block">InDesign Link</span>
                          </div>
                        ) : (
                          <img
                            src={fullUrl}
                            alt={ast.altText}
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                          />
                        )}
                      </div>
                      <div className="p-1.5 bg-surface border-t border-border">
                        <p className="text-[10px] font-semibold text-ink truncate" title={ast.fileName}>
                          {ast.fileName}
                        </p>
                        <div className="mt-1 flex gap-1">
                          <button
                            onClick={() => onAddBlock("image", ast.path)}
                            title="Inserir como novo bloco de imagem"
                            className="flex-1 py-1 text-[10px] font-bold text-center bg-surface-3 hover:bg-brand-red hover:text-white rounded transition text-ink"
                          >
                            + Inserir
                          </button>
                          {selectedBlockId && onReplaceImageInSelectedBlock && (
                            <button
                              onClick={() => onReplaceImageInSelectedBlock(ast.path, ast.altText)}
                              title="Trocar a imagem do bloco ativo por esta"
                              className="py-1 px-1.5 text-[10px] font-bold bg-emerald-500/10 text-emerald-500 hover:bg-emerald-600 hover:text-white rounded transition"
                            >
                              Trocar
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
