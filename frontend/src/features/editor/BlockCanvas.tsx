import React, { useState } from "react";
import type { ProjectPage, Block, BlockType } from "../../types/project";
import { ProjxBlockPreview, isProjxBlock } from "./ProjxBlockPreview";
import { blockLabel } from "../../lib/blockLabels";
import {
  isImageSkeletonBlock,
  extractVectorFileName,
  getImageSuggestions,
  detectStaticGameTitle,
  getGameSuggestions,
} from "../../lib/blockSuggestions";
import {
  LuTriangleAlert,
  LuSearch,
  LuLightbulb,
  LuCircleHelp,
  LuFileText,
  LuMessageCircleQuestion,
  LuInfo,
  LuZoomIn,
  LuCheck,
} from "react-icons/lu";
import {
  IconGripVertical,
  IconArrowUp,
  IconArrowDown,
  IconTrash,
  IconCopy,
  IconPlus,
  IconImage,
  IconChevronDown,
  IconSparkles,
  IconPlay,
  IconLink,
} from "../../components/icons";

interface BlockCanvasProps {
  page: ProjectPage;
  selectedBlockId: string | null;
  onSelectBlock: (blockId: string) => void;
  onMoveBlock: (fromIndex: number, toIndex: number) => void;
  onDuplicateBlock: (blockId: string) => void;
  onDeleteBlock: (blockId: string) => void;
  onUpdateBlock: (block: Block) => void;
  onInsertBlockAt: (index: number, type: BlockType) => void;
  apiBase: string;
  projectId: string;
}

export const BlockCanvas: React.FC<BlockCanvasProps> = ({
  page,
  selectedBlockId,
  onSelectBlock,
  onMoveBlock,
  onDuplicateBlock,
  onDeleteBlock,
  onUpdateBlock,
  onInsertBlockAt,
  apiBase,
  projectId,
}) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index));
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== targetIndex) {
      onMoveBlock(draggedIndex, targetIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden bg-surface-2 p-3 sm:p-6 flex flex-col items-center transition-colors duration-200">
      {/* Folha / Página do Livro */}
      <div className="w-full max-w-3xl bg-surface rounded-2xl shadow-card border border-border p-4 sm:p-10 mb-12 flex flex-col min-w-0 transition-colors duration-200">
        {/* Cabeçalho da Página */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-border mb-6 sm:mb-8">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <span className="bg-brand-red text-white text-xs font-black uppercase px-2.5 py-1 rounded-full tracking-wider shadow-sm shrink-0">
              Página {page.pageNumber}
            </span>
            <input
              type="text"
              value={page.title || ""}
              onChange={(e) => {
                page.title = e.target.value;
              }}
              placeholder="Título da página ou seção"
              className="w-full min-w-0 flex-1 text-base sm:text-lg font-bold text-ink bg-transparent hover:bg-surface-3 focus:bg-surface px-2 py-1 rounded border border-transparent hover:border-border focus:border-brand-red outline-none transition"
            />
          </div>
          <span className="text-xs font-semibold text-muted shrink-0">
            {page.blocks.length} {page.blocks.length === 1 ? "bloco" : "blocos"}
          </span>
        </div>

        {/* Lista de Blocos */}
        {page.blocks.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-border rounded-xl my-4 text-muted">
            <p className="text-sm font-bold text-ink mb-1">Esta página está vazia.</p>
            <p className="text-xs text-muted mb-4">
              Clique em "+ Blocos" na barra lateral ou use os botões abaixo para começar a adicionar conteúdo.
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              <button
                onClick={() => onInsertBlockAt(0, "heading")}
                className="px-3 py-1.5 bg-surface-3 hover:bg-brand-red hover:text-white rounded-lg text-xs font-bold text-ink transition"
              >
                + Título
              </button>
              <button
                onClick={() => onInsertBlockAt(0, "paragraph")}
                className="px-3 py-1.5 bg-surface-3 hover:bg-brand-red hover:text-white rounded-lg text-xs font-bold text-ink transition"
              >
                + Parágrafo
              </button>
              <button
                onClick={() => onInsertBlockAt(0, "accordion")}
                className="px-3 py-1.5 bg-surface-3 hover:bg-brand-red hover:text-white rounded-lg text-xs font-bold text-ink transition"
              >
                + Sanfona
              </button>
              <button
                onClick={() => onInsertBlockAt(0, "quiz")}
                className="px-3 py-1.5 bg-surface-3 hover:bg-brand-red hover:text-white rounded-lg text-xs font-bold text-ink transition"
              >
                + Quiz
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {page.blocks.map((block, idx) => {
              const isSelected = block.id === selectedBlockId;
              const isDragTarget = dragOverIndex === idx;

              return (
                <div key={block.id} className="relative group">
                  {/* Divisor de inserção rápida */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 -my-2 py-1 flex items-center justify-center relative z-20">
                    <button
                      onClick={() => onInsertBlockAt(idx, "paragraph")}
                      title="Inserir parágrafo aqui"
                      className="px-2 py-0.5 bg-surface border border-border shadow-sm hover:border-brand-red hover:text-brand-red text-[10px] font-bold text-muted rounded-full flex items-center gap-1 transition scale-90 hover:scale-100"
                    >
                      <IconPlus className="w-3 h-3 text-brand-red" />
                      Inserir Bloco Aqui
                    </button>
                  </div>

                  {/* Cartão do Bloco */}
                  <div
                    draggable
                    onDragStart={(e) => handleDragStart(e, idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDrop={(e) => handleDrop(e, idx)}
                    onDragEnd={handleDragEnd}
                    onClick={() => onSelectBlock(block.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onSelectBlock(block.id);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    aria-pressed={isSelected}
                    aria-label={`${blockLabel(block.type)} — bloco ${idx + 1} de ${page.blocks.length}`}
                    className={`relative rounded-xl border transition-all cursor-pointer p-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-red/60 ${
                      isSelected
                        ? "border-brand-red ring-2 ring-brand-red/20 bg-brand-red/5 shadow-sm"
                        : "border-transparent hover:border-border hover:bg-surface-3/50"
                    } ${isDragTarget ? "border-t-4 border-t-brand-red bg-brand-red/10" : ""}`}
                  >
                    {/* Alça e Barra de Ações Rápidas */}
                    <div
                      className={`absolute -top-3 right-3 flex items-center gap-1 bg-surface border border-border shadow-sm rounded-lg px-2 py-1 z-10 transition ${
                        isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                      }`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span
                        className="cursor-grab active:cursor-grabbing text-muted hover:text-ink px-0.5"
                        title="Arraste para mover"
                      >
                        <IconGripVertical className="w-3.5 h-3.5" />
                      </span>
                      <button
                        onClick={() => idx > 0 && onMoveBlock(idx, idx - 1)}
                        disabled={idx === 0}
                        title="Mover para cima"
                        aria-label="Mover bloco para cima"
                        className="p-1 text-muted hover:text-ink disabled:opacity-30 rounded"
                      >
                        <IconArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => idx < page.blocks.length - 1 && onMoveBlock(idx, idx + 1)}
                        disabled={idx === page.blocks.length - 1}
                        title="Mover para baixo"
                        aria-label="Mover bloco para baixo"
                        className="p-1 text-muted hover:text-ink disabled:opacity-30 rounded"
                      >
                        <IconArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <div className="w-px h-3 bg-border mx-0.5" />
                      <button
                        onClick={() => onDuplicateBlock(block.id)}
                        title="Duplicar bloco"
                        aria-label="Duplicar bloco"
                        className="p-1 text-muted hover:text-ink rounded"
                      >
                        <IconCopy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteBlock(block.id)}
                        title="Excluir bloco"
                        aria-label="Excluir bloco"
                        className="p-1 text-muted hover:text-brand-red rounded"
                      >
                        <IconTrash className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Conteúdo Visual do Bloco */}
                    <div className="select-text min-w-0 break-words [overflow-wrap:anywhere]">
                      {/* TÍTULO */}
                      {block.type === "heading" && (
                        <div>
                          {block.data.level === 1 && (
                            <h1 className="text-2xl font-extrabold text-brand-red tracking-tight">
                              {block.data.text || "Título Principal"}
                            </h1>
                          )}
                          {block.data.level === 2 && (
                            <h2 className="text-xl font-bold text-ink border-l-4 border-brand-red pl-3">
                              {block.data.text || "Subtítulo da Seção"}
                            </h2>
                          )}
                          {block.data.level === 3 && (
                            <h3 className="text-base font-semibold text-ink">
                              {block.data.text || "Título Secundário"}
                            </h3>
                          )}
                        </div>
                      )}

                      {/* PARÁGRAFO — html gerado pelo parser (negrito, itálico, <br/>, listas) */}
                      {block.type === "paragraph" && (
                        <div
                          className="text-sm text-ink leading-relaxed [&_p]:my-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-1 [&_li]:my-0.5 [&_strong]:font-bold [&_em]:italic"
                          dangerouslySetInnerHTML={{
                            __html: block.data.html || "Parágrafo sem texto...",
                          }}
                        />
                      )}

                      {/* IMAGEM / SKELETON */}
                      {block.type === "image" && (
                        <div className="text-center my-1">
                          {block.data.missing || !block.data.src ? (
                            <div
                              style={
                                block.layout && block.layout.w > 0 && block.layout.h > 0
                                  ? { aspectRatio: `${block.layout.w} / ${block.layout.h}` }
                                  : undefined
                              }
                              className="w-full min-h-[140px] max-h-[360px] flex flex-col items-center justify-center gap-2 p-5 rounded-xl border-2 border-dashed border-border bg-surface-3"
                            >
                              <IconImage className="w-8 h-8 opacity-60 text-brand-red" />
                              <p className="text-xs font-bold text-ink break-all">
                                {block.data.fileName || block.data.alt || "Área de imagem"}
                              </p>
                              <p className="text-[11px] text-muted max-w-md">
                                Skeleton preservando a área do material · envie/vincule uma imagem em Mídias ou converta em:
                              </p>
                              <div
                                className="flex flex-wrap items-center justify-center gap-1.5 pt-1"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {getImageSuggestions(block).map((sug) => (
                                  <button
                                    key={sug.label}
                                    type="button"
                                    onClick={() => onUpdateBlock(sug.action())}
                                    className="px-2.5 py-1 rounded-lg border border-border bg-surface hover:border-brand-red hover:text-brand-red text-[10px] font-bold text-ink transition"
                                  >
                                    {sug.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="inline-block relative rounded-xl overflow-hidden border border-border bg-surface-3">
                              <img
                                src={`${apiBase}/projects/${projectId}/preview/${block.data.src}`}
                                alt={block.data.alt}
                                className="max-h-80 max-w-full object-contain mx-auto rounded-lg"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = "none";
                                }}
                              />
                              {!!(block.data.hotspots && block.data.hotspots.length) && (
                                <div className="absolute inset-0">
                                  {block.data.hotspots!.map((h, hi) => (
                                    <span
                                      key={h.id}
                                      title={h.title}
                                      className="absolute border-2 border-dashed border-brand-red bg-brand-red/20 rounded grid place-items-center text-[10px] font-black text-white"
                                      style={{ left: `${h.x}%`, top: `${h.y}%`, width: `${h.w}%`, height: `${h.h}%` }}
                                    >
                                      <span className="w-5 h-5 rounded-full bg-brand-red grid place-items-center shadow">
                                        {hi + 1}
                                      </span>
                                    </span>
                                  ))}
                                </div>
                              )}
                              {block.data.enableZoom && (
                                <span className="absolute top-2 right-2 bg-black/60 text-white text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-sm inline-flex items-center gap-1">
                                  <LuZoomIn className="w-3 h-3" aria-hidden="true" /> Zoom ativo
                                </span>
                              )}
                              {block.data.linkUrl && (
                                <span className="absolute bottom-2 left-2 bg-brand-red text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 backdrop-blur-sm">
                                  <IconLink className="w-3 h-3" /> Link Ativo
                                </span>
                              )}
                            </div>
                          )}
                          {block.data.caption && (
                            <p className="text-xs text-muted italic mt-1.5">{block.data.caption}</p>
                          )}
                          {!!(block.data.hotspots && block.data.hotspots.length) && (
                            <p className="text-[10px] font-bold text-brand-red mt-1">
                              {block.data.hotspots!.length} zona(s) de clique · abre modal na publicação
                            </p>
                          )}
                        </div>
                      )}

                      {/* SANFONA (ACCORDION) */}
                      {block.type === "accordion" && (
                        <div className="border border-border rounded-xl overflow-hidden bg-surface my-1">
                          {block.data.title && (
                            <div className="px-4 py-2.5 bg-surface-3 border-b border-border font-bold text-xs text-ink uppercase tracking-wider">
                              ≡ {block.data.title}
                            </div>
                          )}
                          <div className="divide-y divide-border">
                            {(block.data.items || []).map((item) => (
                              <div key={item.id} className="p-3">
                                <div className="flex items-center justify-between font-semibold text-xs text-ink">
                                  <span>{item.title}</span>
                                  <IconChevronDown className="w-4 h-4 text-muted" />
                                </div>
                                <div
                                  className="mt-2 text-xs text-muted pl-2 border-l-2 border-brand-red/40 leading-relaxed [&_p]:my-1 [&_strong]:font-bold [&_ul]:list-disc [&_ul]:pl-4 [&_mark]:bg-yellow-200 [&_mark]:text-ink"
                                  dangerouslySetInnerHTML={{ __html: item.contentHtml || "" }}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* ABAS (TABS) */}
                      {block.type === "tabs" && (
                        <div className="border border-border rounded-xl overflow-hidden bg-surface my-1">
                          <div className="flex flex-wrap gap-1 px-2 pt-2 bg-surface-3 border-b border-border">
                            {(block.data.items || []).map((tab, ti) => (
                              <span
                                key={tab.id}
                                className={`px-3 py-1.5 text-[11px] font-bold rounded-t-lg ${
                                  ti === 0 ? "bg-surface text-brand-red border border-border border-b-surface" : "text-muted"
                                }`}
                              >
                                {tab.label}
                              </span>
                            ))}
                          </div>
                          <div className="p-3">
                            <RichBlock html={block.data.items?.[0]?.contentHtml || ""} />
                          </div>
                        </div>
                      )}

                      {/* CAIXA DE DESTAQUE (BOXES PROJETOX) */}
                      {block.type === "callout" && (() => {
                        const preset = BOX_PRESETS[block.data.variant] || BOX_PRESETS.info;
                        const title = block.data.title ?? preset.title;
                        return (
                          <div className={`p-4 rounded-xl border-l-4 my-1 flex items-start gap-3 ${preset.classes}`}>
                            <div className="flex-1 min-w-0">
                              {title && (
                                <div className={`flex items-center gap-2 font-bold text-xs uppercase tracking-wider mb-1 ${preset.titleClass}`}>
                                  {preset.icon ?? <IconSparkles className="w-4 h-4" aria-hidden="true" />}
                                  <span>{title}</span>
                                </div>
                              )}
                              <div
                                className="text-xs leading-relaxed opacity-95 [&_p]:my-1 [&_strong]:font-bold [&_ul]:list-disc [&_ul]:pl-4 [&_mark]:bg-yellow-200 [&_mark]:text-ink"
                                dangerouslySetInnerHTML={{ __html: block.data.contentHtml || "" }}
                              />
                            </div>
                            {preset.icon && <span className="shrink-0 [&>svg]:w-6 [&>svg]:h-6">{preset.icon}</span>}
                          </div>
                        );
                      })()}

                      {/* QUIZ INTERATIVO */}
                      {block.type === "quiz" && (
                        <div className="p-5 rounded-2xl border-2 border-dashed border-brand-red/40 bg-brand-red/5 my-1">
                          <span className="inline-block bg-brand-red text-white text-[10px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider mb-2">
                            Quiz Interativo
                          </span>
                          <h4 className="text-sm font-bold text-ink mb-3">{block.data.question}</h4>
                          <div className="space-y-1.5">
                            {(block.data.options || []).map((opt) => (
                              <div
                                key={opt.id}
                                className={`flex items-center gap-2 p-2 rounded-lg border text-xs font-semibold ${
                                  opt.isCorrect
                                    ? "bg-emerald-500/15 border-emerald-500 text-ink font-bold"
                                    : "bg-surface border-border text-ink"
                                }`}
                              >
                                <span
                                  className={`w-3.5 h-3.5 rounded-full border grid place-items-center ${
                                    opt.isCorrect
                                      ? "border-emerald-500 bg-emerald-500 text-white text-[8px]"
                                      : "border-border"
                                  }`}
                                >
                                  {opt.isCorrect ? <LuCheck className="w-2.5 h-2.5" aria-hidden="true" /> : ""}
                                </span>
                                <span>{opt.text}</span>
                                {opt.isCorrect && (
                                  <span className="ml-auto text-[10px] text-emerald-500 uppercase font-black tracking-wider">
                                    Correta
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                          {block.data.explanation && (
                            <p className="text-[11px] text-muted italic mt-3 pt-2 border-t border-border">
                              Feedback: {block.data.explanation}
                            </p>
                          )}
                        </div>
                      )}

                      {/* VÍDEO */}
                      {block.type === "video" && (
                        <div className="border border-border rounded-xl overflow-hidden bg-surface-3 text-ink p-4 text-center my-1">
                          <IconPlay className="w-8 h-8 mx-auto text-brand-red mb-2" />
                          <p className="text-xs font-bold truncate">{block.data.title || "Vídeo Incorporado"}</p>
                          <p className="text-[10px] text-muted mt-0.5 truncate">{block.data.url}</p>
                        </div>
                      )}

                      {/* RECURSO EXTERNO */}
                      {block.type === "external-embed" && (
                        <div className="border border-border rounded-xl overflow-hidden bg-surface-3 text-ink p-4 text-center my-1">
                          <IconLink className="w-8 h-8 mx-auto text-cyan-500 mb-2" />
                          <p className="text-xs font-bold truncate">{block.data.title || "Recurso Externo"}</p>
                          <p className="text-[10px] text-muted mt-0.5 truncate">{block.data.embedUrl}</p>
                        </div>
                      )}

                      {/* BLOCOS PROJETOX (flipcard, timeline, tabela, capa, galeria, exercícios...) */}
                      {isProjxBlock(block.type) && (
                        <ProjxBlockPreview block={block} apiBase={apiBase} projectId={projectId} />
                      )}

                      {/* SUGESTÃO PARA VETOR LEGADO (CALLOUT) */}
                      {block.type === "callout" && isImageSkeletonBlock(block) && (
                        <div
                          className="mt-2 p-3 rounded-xl border border-dashed border-border bg-surface-3 text-center space-y-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <p className="text-[11px] font-bold text-ink">
                            Área de imagem ({extractVectorFileName(block)}) — converter em bloco visual:
                          </p>
                          <div className="flex flex-wrap justify-center gap-1.5">
                            {getImageSuggestions(block).map((sug) => (
                              <button
                                key={sug.label}
                                type="button"
                                onClick={() => onUpdateBlock(sug.action())}
                                className="px-2.5 py-1 rounded-lg border border-border bg-surface hover:border-brand-red hover:text-brand-red text-[10px] font-bold text-ink transition"
                              >
                                {sug.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* SUGESTÃO DE JOGOS INTERATIVOS PARA QUEBRA-CABEÇA / ATIVIDADE ESTÁTICA */}
                      {(() => {
                        const gameTopic = detectStaticGameTitle(block);
                        if (!gameTopic) return null;
                        return (
                          <div
                            className="mt-2 p-3 rounded-xl border border-dashed border-brand-red/40 bg-brand-red/5 space-y-1.5"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <p className="text-[11px] font-bold text-ink">
                              Sugestão: transformar em jogo interativo ({gameTopic})
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {getGameSuggestions(block, gameTopic).map((sug) => (
                                <button
                                  key={sug.type}
                                  type="button"
                                  onClick={() => onUpdateBlock(sug.action())}
                                  className="px-2.5 py-1 rounded-lg border border-border bg-surface hover:border-brand-red hover:text-brand-red text-[10px] font-bold text-ink transition"
                                >
                                  {sug.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Botão de adicionar bloco no final da página */}
        <div className="mt-8 pt-6 border-t border-border flex items-center justify-center">
          <button
            onClick={() => onInsertBlockAt(page.blocks.length, "paragraph")}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-3 hover:bg-brand-red hover:text-white text-xs font-bold text-ink transition shadow-sm border border-border"
          >
            <IconPlus className="w-4 h-4" />
            Adicionar Novo Bloco no Fim da Página
          </button>
        </div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Helpers do canvas                                                   */
/* ------------------------------------------------------------------ */

const RichBlock: React.FC<{ html: string; className?: string }> = ({ html, className = "" }) => (
  <div
    className={`text-xs leading-relaxed [&_p]:my-1 [&_strong]:font-bold [&_em]:italic [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_mark]:bg-yellow-200 [&_mark]:text-ink ${className}`}
    dangerouslySetInnerHTML={{ __html: html || "" }}
  />
);

const BOX_PRESETS: Record<
  string,
  { title: string; icon: React.ReactNode; classes: string; titleClass: string }
> = {
  importante: { title: "IMPORTANTE!", icon: <LuTriangleAlert className="w-4 h-4" aria-hidden="true" />, classes: "bg-rose-500/10 border-rose-500 text-ink", titleClass: "text-rose-600" },
  "saiba-mais": { title: "SAIBA MAIS...", icon: <LuSearch className="w-4 h-4" aria-hidden="true" />, classes: "bg-emerald-500/10 border-emerald-500 text-ink", titleClass: "text-emerald-600" },
  dica: { title: "DICA!", icon: <LuLightbulb className="w-4 h-4" aria-hidden="true" />, classes: "bg-orange-500/10 border-orange-500 text-ink", titleClass: "text-orange-600" },
  "voce-sabia": { title: "VOCÊ SABIA?", icon: <LuCircleHelp className="w-4 h-4" aria-hidden="true" />, classes: "bg-purple-500/10 border-purple-500 text-ink", titleClass: "text-purple-600" },
  "box-pdf": { title: "PDF", icon: <LuFileText className="w-4 h-4" aria-hidden="true" />, classes: "bg-slate-500/10 border-slate-500 text-ink", titleClass: "text-slate-600" },
  "vamos-refletir": { title: "VAMOS REFLETIR", icon: <LuMessageCircleQuestion className="w-4 h-4" aria-hidden="true" />, classes: "bg-cyan-500/10 border-cyan-500 text-ink", titleClass: "text-cyan-600" },
  box: { title: "", icon: null, classes: "bg-surface-3 border-brand-red text-ink", titleClass: "text-brand-red" },
  info: { title: "Informação", icon: <LuInfo className="w-4 h-4" aria-hidden="true" />, classes: "bg-blue-500/10 border-blue-500 text-ink", titleClass: "text-blue-600" },
  tip: { title: "Dica", icon: <LuLightbulb className="w-4 h-4" aria-hidden="true" />, classes: "bg-emerald-500/10 border-emerald-500 text-ink", titleClass: "text-emerald-600" },
  warning: { title: "Atenção", icon: <LuTriangleAlert className="w-4 h-4" aria-hidden="true" />, classes: "bg-amber-500/10 border-amber-500 text-ink", titleClass: "text-amber-600" },
  curiosity: { title: "Curiosidade", icon: <LuSearch className="w-4 h-4" aria-hidden="true" />, classes: "bg-purple-500/10 border-purple-500 text-ink", titleClass: "text-purple-600" },
};

