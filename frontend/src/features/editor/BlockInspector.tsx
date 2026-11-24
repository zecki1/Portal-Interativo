import React from "react";
import type { Block, ProjectAsset } from "../../types/project";
import {
  IconTrash,
  IconCopy,
  IconClose,
  IconLink,
  IconSliders,
  IconPlus,
} from "../../components/icons";

interface BlockInspectorProps {
  block: Block | null;
  onUpdateBlock: (updated: Block) => void;
  onDuplicateBlock: (blockId: string) => void;
  onDeleteBlock: (blockId: string) => void;
  onClose: () => void;
  assets: ProjectAsset[];
  apiBase: string;
  projectId: string;
}

export const BlockInspector: React.FC<BlockInspectorProps> = ({
  block,
  onUpdateBlock,
  onDuplicateBlock,
  onDeleteBlock,
  onClose,
  assets,
  apiBase,
  projectId,
}) => {
  if (!block) {
    return (
      <aside className="w-80 shrink-0 bg-surface border-l border-border p-6 flex flex-col items-center justify-center text-center text-muted select-none transition-colors duration-200">
        <IconSliders className="w-10 h-10 mb-3 opacity-40 text-muted" />
        <p className="text-sm font-bold text-ink">Nenhum bloco selecionado</p>
        <p className="text-xs text-muted mt-1 max-w-[200px]">
          Clique em qualquer bloco do canvas para editar suas configurações, estilos ou interatividades.
        </p>
      </aside>
    );
  }

  return (
    <aside className="w-80 shrink-0 bg-surface border-l border-border flex flex-col h-full overflow-hidden select-none shadow-sm transition-colors duration-200">
      {/* Header do Inspector */}
      <div className="p-3.5 border-b border-border flex items-center justify-between bg-surface-3">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-brand-red"></span>
          <h3 className="text-xs font-bold uppercase tracking-wider text-ink">
            Propriedades: {block.type.toUpperCase()}
          </h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onDuplicateBlock(block.id)}
            title="Duplicar este bloco"
            className="p-1 text-muted hover:text-ink rounded hover:bg-surface-2"
          >
            <IconCopy className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDeleteBlock(block.id)}
            title="Excluir este bloco"
            className="p-1 text-muted hover:text-brand-red rounded hover:bg-brand-red/10"
          >
            <IconTrash className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            title="Fechar inspetor"
            className="p-1 text-muted hover:text-ink rounded hover:bg-surface-2"
          >
            <IconClose className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Conteúdo específico por tipo de bloco */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs text-ink">
        {/* BLOCO: TÍTULO (HEADING) */}
        {block.type === "heading" && (
          <div className="space-y-4">
            <div>
              <label className="font-bold text-ink block mb-1.5">Nível do Título</label>
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3].map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() =>
                      onUpdateBlock({
                        ...block,
                        data: { ...block.data, level: lvl as any },
                      })
                    }
                    className={`py-2 text-center rounded-lg border font-bold transition ${
                      block.data.level === lvl
                        ? "bg-brand-red text-white border-brand-red"
                        : "bg-surface-3 border-border text-muted hover:text-ink"
                    }`}
                  >
                    H{lvl}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="font-bold text-ink block mb-1.5">Texto do Título</label>
              <textarea
                value={block.data.text}
                onChange={(e) =>
                  onUpdateBlock({
                    ...block,
                    data: { ...block.data, text: e.target.value },
                  })
                }
                rows={3}
                className="w-full p-2.5 rounded-lg border border-border bg-surface text-ink focus:border-brand-red focus:outline-none focus:ring-1 focus:ring-brand-red text-xs"
              />
            </div>
          </div>
        )}

        {/* BLOCO: PARÁGRAFO */}
        {block.type === "paragraph" && (
          <div className="space-y-4">
            <div>
              <label className="font-bold text-ink block mb-1.5">Conteúdo do Parágrafo</label>
              <textarea
                value={block.data.html}
                onChange={(e) =>
                  onUpdateBlock({
                    ...block,
                    data: { ...block.data, html: e.target.value },
                  })
                }
                rows={8}
                className="w-full p-2.5 rounded-lg border border-border bg-surface text-ink focus:border-brand-red focus:outline-none focus:ring-1 focus:ring-brand-red text-xs leading-relaxed"
                placeholder="Escreva seu parágrafo..."
              />
            </div>
          </div>
        )}

        {/* BLOCO: IMAGEM */}
        {block.type === "image" && (
          <div className="space-y-4">
            <div>
              <label className="font-bold text-ink block mb-1.5">Pré-visualização da Imagem</label>
              <div className="rounded-lg border border-border overflow-hidden bg-surface-3 p-2 text-center">
                <img
                  src={`${apiBase}/projects/${projectId}/preview/${block.data.src}`}
                  alt={block.data.alt}
                  className="max-h-36 mx-auto object-contain rounded"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = "none";
                  }}
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-ink block mb-1.5">Texto Alternativo (Alt / Acessibilidade)</label>
              <input
                type="text"
                value={block.data.alt || ""}
                onChange={(e) =>
                  onUpdateBlock({
                    ...block,
                    data: { ...block.data, alt: e.target.value },
                  })
                }
                className="w-full p-2 rounded-lg border border-border bg-surface text-ink focus:border-brand-red focus:outline-none text-xs"
              />
            </div>

            <div>
              <label className="font-bold text-ink block mb-1.5">Legenda Exibida</label>
              <input
                type="text"
                value={block.data.caption || ""}
                onChange={(e) =>
                  onUpdateBlock({
                    ...block,
                    data: { ...block.data, caption: e.target.value },
                  })
                }
                placeholder="Ex: Figura 1. Esquema ilustrativo"
                className="w-full p-2 rounded-lg border border-border bg-surface text-ink focus:border-brand-red focus:outline-none text-xs"
              />
            </div>

            <div className="pt-2 border-t border-border space-y-3">
              <label className="flex items-center gap-2 cursor-pointer font-semibold text-ink">
                <input
                  type="checkbox"
                  checked={block.data.enableZoom ?? true}
                  onChange={(e) =>
                    onUpdateBlock({
                      ...block,
                      data: { ...block.data, enableZoom: e.target.checked },
                    })
                  }
                  className="rounded text-brand-red focus:ring-brand-red w-4 h-4"
                />
                <span>Habilitar Zoom com Lupa ao Clicar</span>
              </label>

              <div>
                <label className="font-bold text-ink block mb-1.5">
                  <span className="flex items-center gap-1">
                    <IconLink className="w-3.5 h-3.5 text-brand-red" />
                    Link Externo (Opcional)
                  </span>
                </label>
                <input
                  type="url"
                  value={block.data.linkUrl || ""}
                  onChange={(e) =>
                    onUpdateBlock({
                      ...block,
                      data: { ...block.data, linkUrl: e.target.value },
                    })
                  }
                  placeholder="https://exemplo.org.br"
                  className="w-full p-2 rounded-lg border border-border bg-surface text-ink focus:border-brand-red focus:outline-none text-xs"
                />
              </div>
            </div>
          </div>
        )}

        {/* BLOCO: ACCORDION (SANFONA) */}
        {block.type === "accordion" && (
          <div className="space-y-4">
            <div>
              <label className="font-bold text-ink block mb-1.5">Título da Seção de Sanfonas</label>
              <input
                type="text"
                value={block.data.title || ""}
                onChange={(e) =>
                  onUpdateBlock({
                    ...block,
                    data: { ...block.data, title: e.target.value },
                  })
                }
                placeholder="Ex: Tópicos de Estudo"
                className="w-full p-2 rounded-lg border border-border bg-surface text-ink focus:border-brand-red focus:outline-none text-xs"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="font-bold text-ink">Itens Expansíveis</label>
                <button
                  onClick={() => {
                    const newItems = [
                      ...(block.data.items || []),
                      {
                        id: String(Date.now()),
                        title: `Novo Tópico ${(block.data.items?.length || 0) + 1}`,
                        contentHtml: "Conteúdo detalhado deste tópico...",
                        defaultOpen: false,
                      },
                    ];
                    onUpdateBlock({
                      ...block,
                      data: { ...block.data, items: newItems },
                    });
                  }}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-red hover:underline"
                >
                  <IconPlus className="w-3 h-3" />
                  Adicionar Item
                </button>
              </div>

              <div className="space-y-2">
                {(block.data.items || []).map((item, idx) => (
                  <div key={item.id} className="p-2.5 rounded-lg border border-border bg-surface-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-ink text-[11px]">Item {idx + 1}</span>
                      <button
                        onClick={() => {
                          const newItems = block.data.items.filter((_, i) => i !== idx);
                          onUpdateBlock({
                            ...block,
                            data: { ...block.data, items: newItems },
                          });
                        }}
                        className="text-muted hover:text-brand-red p-0.5"
                      >
                        <IconTrash className="w-3 h-3" />
                      </button>
                    </div>
                    <input
                      type="text"
                      value={item.title}
                      onChange={(e) => {
                        const newItems = [...block.data.items];
                        newItems[idx].title = e.target.value;
                        onUpdateBlock({
                          ...block,
                          data: { ...block.data, items: newItems },
                        });
                      }}
                      placeholder="Título da sanfona"
                      className="w-full p-1.5 rounded border border-border bg-surface text-ink text-xs"
                    />
                    <textarea
                      value={item.contentHtml}
                      onChange={(e) => {
                        const newItems = [...block.data.items];
                        newItems[idx].contentHtml = e.target.value;
                        onUpdateBlock({
                          ...block,
                          data: { ...block.data, items: newItems },
                        });
                      }}
                      rows={2}
                      placeholder="Conteúdo que abre na sanfona"
                      className="w-full p-1.5 rounded border border-border bg-surface text-ink text-xs"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* BLOCO: CAIXA DE DESTAQUE (CALLOUT) */}
        {block.type === "callout" && (
          <div className="space-y-4">
            <div>
              <label className="font-bold text-ink block mb-1.5">Tipo de Destaque</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "tip", label: "💡 Dica", color: "border-green-500 bg-green-500/10 text-ink" },
                  { id: "info", label: "ℹ️ Informação", color: "border-blue-500 bg-blue-500/10 text-ink" },
                  { id: "warning", label: "⚠️ Atenção", color: "border-amber-500 bg-amber-500/10 text-ink" },
                  { id: "curiosity", label: "🔍 Curiosidade", color: "border-purple-500 bg-purple-500/10 text-ink" },
                ].map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() =>
                      onUpdateBlock({
                        ...block,
                        data: { ...block.data, variant: v.id as any },
                      })
                    }
                    className={`py-2 px-3 rounded-lg border font-bold text-left transition ${
                      block.data.variant === v.id
                        ? `${v.color} ring-2 ring-brand-red ring-offset-1`
                        : "bg-surface-3 border-border text-muted hover:text-ink"
                    }`}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="font-bold text-ink block mb-1.5">Título do Destaque</label>
              <input
                type="text"
                value={block.data.title || ""}
                onChange={(e) =>
                  onUpdateBlock({
                    ...block,
                    data: { ...block.data, title: e.target.value },
                  })
                }
                className="w-full p-2 rounded-lg border border-border bg-surface text-ink focus:border-brand-red focus:outline-none text-xs"
              />
            </div>

            <div>
              <label className="font-bold text-ink block mb-1.5">Conteúdo</label>
              <textarea
                value={block.data.contentHtml}
                onChange={(e) =>
                  onUpdateBlock({
                    ...block,
                    data: { ...block.data, contentHtml: e.target.value },
                  })
                }
                rows={4}
                className="w-full p-2 rounded-lg border border-border bg-surface text-ink focus:border-brand-red focus:outline-none text-xs leading-relaxed"
              />
            </div>
          </div>
        )}

        {/* BLOCO: QUIZ INTERATIVO */}
        {block.type === "quiz" && (
          <div className="space-y-4">
            <div>
              <label className="font-bold text-ink block mb-1.5">Pergunta do Quiz</label>
              <textarea
                value={block.data.question}
                onChange={(e) =>
                  onUpdateBlock({
                    ...block,
                    data: { ...block.data, question: e.target.value },
                  })
                }
                rows={3}
                className="w-full p-2 rounded-lg border border-border bg-surface text-ink focus:border-brand-red focus:outline-none text-xs font-semibold"
                placeholder="Digite a pergunta para o estudante..."
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="font-bold text-ink">
                  Alternativas (Marque a Correta)
                </label>
                <button
                  onClick={() => {
                    const newOpts = [
                      ...(block.data.options || []),
                      {
                        id: String(Date.now()),
                        text: `Opção ${(block.data.options?.length || 0) + 1}`,
                        isCorrect: false,
                      },
                    ];
                    onUpdateBlock({
                      ...block,
                      data: { ...block.data, options: newOpts },
                    });
                  }}
                  className="text-[11px] font-bold text-brand-red hover:underline"
                >
                  + Alternativa
                </button>
              </div>

              <div className="space-y-2">
                {(block.data.options || []).map((opt, idx) => (
                  <div
                    key={opt.id}
                    className={`p-2 rounded-lg border flex items-center gap-2 transition ${
                      opt.isCorrect
                        ? "bg-emerald-500/10 border-emerald-500 text-ink"
                        : "bg-surface-3 border-border text-ink"
                    }`}
                  >
                    <input
                      type="radio"
                      name={`quiz-correct-${block.id}`}
                      checked={opt.isCorrect}
                      onChange={() => {
                        const newOpts = block.data.options.map((o, i) => ({
                          ...o,
                          isCorrect: i === idx,
                        }));
                        onUpdateBlock({
                          ...block,
                          data: { ...block.data, options: newOpts },
                        });
                      }}
                      title="Marcar como resposta correta"
                      className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={opt.text}
                      onChange={(e) => {
                        const newOpts = [...block.data.options];
                        newOpts[idx].text = e.target.value;
                        onUpdateBlock({
                          ...block,
                          data: { ...block.data, options: newOpts },
                        });
                      }}
                      className="flex-1 p-1 bg-surface border border-border rounded text-xs text-ink"
                    />
                    {block.data.options.length > 2 && (
                      <button
                        onClick={() => {
                          const newOpts = block.data.options.filter((_, i) => i !== idx);
                          onUpdateBlock({
                            ...block,
                            data: { ...block.data, options: newOpts },
                          });
                        }}
                        className="text-muted hover:text-brand-red p-1"
                      >
                        <IconTrash className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="font-bold text-ink block mb-1.5">
                Explicação / Feedback Pedagógico
              </label>
              <textarea
                value={block.data.explanation || ""}
                onChange={(e) =>
                  onUpdateBlock({
                    ...block,
                    data: { ...block.data, explanation: e.target.value },
                  })
                }
                rows={3}
                placeholder="Ex: Esta resposta está correta porque..."
                className="w-full p-2 rounded-lg border border-border bg-surface text-ink focus:border-brand-red focus:outline-none text-xs"
              />
            </div>
          </div>
        )}

        {/* BLOCO: VÍDEO */}
        {block.type === "video" && (
          <div className="space-y-4">
            <div>
              <label className="font-bold text-ink block mb-1.5">Origem do Vídeo</label>
              <div className="grid grid-cols-2 gap-2">
                {["youtube", "local"].map((src) => (
                  <button
                    key={src}
                    type="button"
                    onClick={() =>
                      onUpdateBlock({
                        ...block,
                        data: { ...block.data, source: src as any },
                      })
                    }
                    className={`py-2 text-center rounded-lg border font-bold capitalize transition ${
                      block.data.source === src
                        ? "bg-brand-red text-white border-brand-red"
                        : "bg-surface-3 border-border text-muted hover:text-ink"
                    }`}
                  >
                    {src}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="font-bold text-ink block mb-1.5">URL do Vídeo</label>
              <input
                type="url"
                value={block.data.url}
                onChange={(e) =>
                  onUpdateBlock({
                    ...block,
                    data: { ...block.data, url: e.target.value },
                  })
                }
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full p-2 rounded-lg border border-border bg-surface text-ink focus:border-brand-red focus:outline-none text-xs"
              />
            </div>

            <div>
              <label className="font-bold text-ink block mb-1.5">Título / Legenda</label>
              <input
                type="text"
                value={block.data.title || ""}
                onChange={(e) =>
                  onUpdateBlock({
                    ...block,
                    data: { ...block.data, title: e.target.value },
                  })
                }
                className="w-full p-2 rounded-lg border border-border bg-surface text-ink focus:border-brand-red focus:outline-none text-xs"
              />
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
