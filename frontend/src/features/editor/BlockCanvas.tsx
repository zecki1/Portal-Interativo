import React, { useState } from "react";
import type { ProjectPage, Block, BlockType } from "../../types/project";
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
    <div className="flex-1 overflow-y-auto bg-surface-2 p-6 flex flex-col items-center transition-colors duration-200">
      {/* Folha / Página do Livro */}
      <div className="w-full max-w-3xl bg-surface rounded-2xl shadow-card border border-border p-8 sm:p-12 mb-12 min-h-[700px] flex flex-col transition-colors duration-200">
        {/* Cabeçalho da Página */}
        <div className="flex items-center justify-between pb-4 border-b border-border mb-8">
          <div className="flex items-center gap-3">
            <span className="bg-brand-red text-white text-xs font-black uppercase px-2.5 py-1 rounded-full tracking-wider shadow-sm">
              Página {page.pageNumber}
            </span>
            <input
              type="text"
              value={page.title || ""}
              onChange={(e) => {
                page.title = e.target.value;
              }}
              placeholder="Título da página ou seção"
              className="text-lg font-bold text-ink bg-transparent hover:bg-surface-3 focus:bg-surface px-2 py-1 rounded border border-transparent hover:border-border focus:border-brand-red outline-none transition"
            />
          </div>
          <span className="text-xs font-semibold text-muted">
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
                    className={`relative rounded-xl border transition-all cursor-pointer p-4 ${
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
                        className="p-1 text-muted hover:text-ink disabled:opacity-30 rounded"
                      >
                        <IconArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => idx < page.blocks.length - 1 && onMoveBlock(idx, idx + 1)}
                        disabled={idx === page.blocks.length - 1}
                        title="Mover para baixo"
                        className="p-1 text-muted hover:text-ink disabled:opacity-30 rounded"
                      >
                        <IconArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <div className="w-px h-3 bg-border mx-0.5" />
                      <button
                        onClick={() => onDuplicateBlock(block.id)}
                        title="Duplicar bloco"
                        className="p-1 text-muted hover:text-ink rounded"
                      >
                        <IconCopy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteBlock(block.id)}
                        title="Excluir bloco"
                        className="p-1 text-muted hover:text-brand-red rounded"
                      >
                        <IconTrash className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Conteúdo Visual do Bloco */}
                    <div className="select-text">
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

                      {/* PARÁGRAFO */}
                      {block.type === "paragraph" && (
                        <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap">
                          {block.data.html || "Parágrafo sem texto..."}
                        </p>
                      )}

                      {/* IMAGEM */}
                      {block.type === "image" && (
                        <div className="text-center my-1">
                          <div className="inline-block relative rounded-xl overflow-hidden border border-border bg-surface-3">
                            <img
                              src={`${apiBase}/projects/${projectId}/preview/${block.data.src}`}
                              alt={block.data.alt}
                              className="max-h-80 max-w-full object-contain mx-auto rounded-lg"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = "none";
                              }}
                            />
                            {/* Fallback visual quando a imagem é uma referência do InDesign */}
                            <div className="p-4 text-center">
                              <IconImage className="w-8 h-8 mx-auto mb-2 opacity-50 text-brand-red" />
                              <p className="text-xs font-bold text-ink">{block.data.alt || block.data.caption || "Imagem"}</p>
                              <p className="text-[10px] text-muted mt-0.5">Recurso do InDesign · Clique para vincular arquivo</p>
                            </div>
                            {block.data.enableZoom && (
                              <span className="absolute top-2 right-2 bg-black/60 text-white text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-sm">
                                🔍 Zoom Ativo
                              </span>
                            )}
                            {block.data.linkUrl && (
                              <span className="absolute bottom-2 left-2 bg-brand-red text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 backdrop-blur-sm">
                                <IconLink className="w-3 h-3" /> Link Ativo
                              </span>
                            )}
                          </div>
                          {block.data.caption && (
                            <p className="text-xs text-muted italic mt-1.5">{block.data.caption}</p>
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
                                <div className="mt-2 text-xs text-muted pl-2 border-l-2 border-brand-red/40 leading-relaxed">
                                  {item.contentHtml}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* CAIXA DE DESTAQUE (CALLOUT) */}
                      {block.type === "callout" && (
                        <div
                          className={`p-4 rounded-xl border-l-4 my-1 ${
                            block.data.variant === "tip"
                              ? "bg-emerald-500/10 border-emerald-500 text-ink"
                              : block.data.variant === "warning"
                              ? "bg-amber-500/10 border-amber-500 text-ink"
                              : block.data.variant === "curiosity"
                              ? "bg-purple-500/10 border-purple-500 text-ink"
                              : "bg-blue-500/10 border-blue-500 text-ink"
                          }`}
                        >
                          <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider mb-1 text-brand-red">
                            <IconSparkles className="w-4 h-4" />
                            <span>{block.data.title || "Destaque"}</span>
                          </div>
                          <div className="text-xs leading-relaxed opacity-95">{block.data.contentHtml}</div>
                        </div>
                      )}

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
                                  {opt.isCorrect ? "✓" : ""}
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
