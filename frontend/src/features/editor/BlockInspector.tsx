import React from "react";
import type { Block, ProjectAsset, ImageHotspot } from "../../types/project";
import { BlockSchemaEditor, hasSchema } from "./BlockSchemaEditor";
import { newId } from "../../lib/ids";
import {
  isImageSkeletonBlock,
  getImageSuggestions,
  detectStaticGameTitle,
  getGameSuggestions,
} from "../../lib/blockSuggestions";
import {
  LuImage,
  LuTriangleAlert,
  LuSearch,
  LuLightbulb,
  LuCircleHelp,
  LuFileText,
  LuMessageCircleQuestion,
  LuSquare,
  LuInfo,
} from "react-icons/lu";
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
      <aside className="w-80 max-w-[85vw] shrink-0 bg-surface border-l border-border p-6 flex flex-col items-center justify-center text-center text-muted select-none transition-colors duration-200 h-full">
        <IconSliders className="w-10 h-10 mb-3 opacity-40 text-muted" />
        <p className="text-sm font-bold text-ink">Nenhum bloco selecionado</p>
        <p className="text-xs text-muted mt-1 max-w-[200px]">
          Clique em qualquer bloco do canvas para editar suas configurações, estilos ou interatividades.
        </p>
      </aside>
    );
  }

  return (
    <aside className="w-80 max-w-[85vw] shrink-0 bg-surface border-l border-border flex flex-col h-full overflow-hidden select-none shadow-sm transition-colors duration-200">
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
              {block.data.missing || !block.data.src ? (
                <div className="rounded-lg border-2 border-dashed border-amber-400 bg-amber-50 p-3 text-center">
                  <p className="text-[11px] font-bold text-amber-800 break-all inline-flex items-center gap-1">
                    <LuImage className="w-3.5 h-3.5" aria-hidden="true" />
                    {block.data.fileName || block.data.alt || "Imagem vinculada"}
                  </p>
                  <p className="text-[10px] text-amber-700 mt-1">
                    O arquivo não veio no IDML. Envie em Mídias e vincule abaixo.
                  </p>
                </div>
              ) : (
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
              )}
            </div>

            <div>
              <label className="font-bold text-ink block mb-1.5">Arquivo da Mídia</label>
              <select
                value={block.data.src || ""}
                onChange={(e) => {
                  const asset = assets.find((a) => a.path === e.target.value);
                  onUpdateBlock({
                    ...block,
                    data: {
                      ...block.data,
                      src: e.target.value,
                      alt: block.data.alt || asset?.altText || "",
                      missing: false,
                      fileName: undefined,
                    },
                  });
                }}
                className="w-full p-2 rounded-lg border border-border bg-surface text-ink focus:border-brand-red focus:outline-none text-xs"
              >
                <option value="">— Selecionar da pasta de mídias —</option>
                {assets.map((a) => (
                  <option key={a.id} value={a.path}>
                    {a.fileName}
                  </option>
                ))}
              </select>
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

            <HotspotEditor
              hotspots={block.data.hotspots || []}
              onChange={(hotspots) =>
                onUpdateBlock({ ...block, data: { ...block.data, hotspots } })
              }
            />
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
                        id: newId("item"),
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
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "importante", label: "Importante", icon: <LuTriangleAlert className="w-4 h-4" aria-hidden="true" />, color: "border-rose-500 bg-rose-500/10 text-ink" },
                  { id: "saiba-mais", label: "Saiba Mais", icon: <LuSearch className="w-4 h-4" aria-hidden="true" />, color: "border-emerald-500 bg-emerald-500/10 text-ink" },
                  { id: "dica", label: "Dica", icon: <LuLightbulb className="w-4 h-4" aria-hidden="true" />, color: "border-orange-500 bg-orange-500/10 text-ink" },
                  { id: "voce-sabia", label: "Você Sabia", icon: <LuCircleHelp className="w-4 h-4" aria-hidden="true" />, color: "border-purple-500 bg-purple-500/10 text-ink" },
                  { id: "box-pdf", label: "PDF", icon: <LuFileText className="w-4 h-4" aria-hidden="true" />, color: "border-slate-500 bg-slate-500/10 text-ink" },
                  { id: "vamos-refletir", label: "Refletir", icon: <LuMessageCircleQuestion className="w-4 h-4" aria-hidden="true" />, color: "border-cyan-500 bg-cyan-500/10 text-ink" },
                  { id: "box", label: "Caixa", icon: <LuSquare className="w-4 h-4" aria-hidden="true" />, color: "border-border bg-surface-3 text-ink" },
                  { id: "info", label: "Info", icon: <LuInfo className="w-4 h-4" aria-hidden="true" />, color: "border-blue-500 bg-blue-500/10 text-ink" },
                  { id: "tip", label: "Dica (clássica)", icon: <LuLightbulb className="w-4 h-4" aria-hidden="true" />, color: "border-emerald-500 bg-emerald-500/10 text-ink" },
                  { id: "warning", label: "Atenção", icon: <LuTriangleAlert className="w-4 h-4" aria-hidden="true" />, color: "border-amber-500 bg-amber-500/10 text-ink" },
                  { id: "curiosity", label: "Curiosidade", icon: <LuSearch className="w-4 h-4" aria-hidden="true" />, color: "border-purple-500 bg-purple-500/10 text-ink" },
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
                    className={`py-2 px-1.5 rounded-lg border font-bold text-[10px] text-left transition ${
                      block.data.variant === v.id
                        ? `${v.color} ring-2 ring-brand-red ring-offset-1`
                        : "bg-surface-3 border-border text-muted hover:text-ink"
                    }`}
                    aria-pressed={block.data.variant === v.id}
                  >
                    <span className="inline-flex items-center gap-1">
                      {v.icon}
                      {v.label}
                    </span>
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-muted mt-1.5">
                Deixe o título vazio para usar o padrão da caixa.
              </p>
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
                        id: newId("item"),
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

        {/* BLOCO: RECURSO EXTERNO */}
        {block.type === "external-embed" && (
          <div className="space-y-4">
            <div>
              <label className="font-bold text-ink block mb-1.5">URL do Recurso (iframe)</label>
              <input
                type="url"
                value={block.data.embedUrl}
                onChange={(e) =>
                  onUpdateBlock({ ...block, data: { ...block.data, embedUrl: e.target.value } })
                }
                placeholder="https://phet.colorado.edu/..."
                className="w-full p-2 rounded-lg border border-border bg-surface text-ink focus:border-brand-red focus:outline-none text-xs"
              />
            </div>
            <div>
              <label className="font-bold text-ink block mb-1.5">Título</label>
              <input
                type="text"
                value={block.data.title || ""}
                onChange={(e) =>
                  onUpdateBlock({ ...block, data: { ...block.data, title: e.target.value } })
                }
                className="w-full p-2 rounded-lg border border-border bg-surface text-ink focus:border-brand-red focus:outline-none text-xs"
              />
            </div>
          </div>
        )}

        {/* BLOCOS PROJETOX — formulário gerado pelo esquema */}
        {hasSchema(block.type) && <BlockSchemaEditor block={block} onUpdateBlock={onUpdateBlock} />}

        {/* SUGESTÕES CONTEXTUAIS (Skeleton de imagem e jogos estáticos) */}
        {isImageSkeletonBlock(block) && (
          <div className="pt-3 border-t border-border space-y-2">
            <label className="font-bold text-ink block">
              Sugestões para esta área de imagem
              <span className="block text-[10px] text-muted font-normal mt-0.5">
                Converta o espaço reservado em um componente interativo:
              </span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {getImageSuggestions(block, assets[0]?.path || "").map((sug) => (
                <button
                  key={sug.label}
                  type="button"
                  onClick={() => onUpdateBlock(sug.action())}
                  className="px-2.5 py-1.5 rounded-lg border border-border bg-surface-3 hover:border-brand-red hover:text-brand-red text-[11px] font-bold text-ink transition"
                >
                  {sug.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {(() => {
          const gameTopic = detectStaticGameTitle(block);
          if (!gameTopic) return null;
          return (
            <div className="pt-3 border-t border-border space-y-2">
              <label className="font-bold text-ink block">
                Substituir por jogo do editor
                <span className="block text-[10px] text-muted font-normal mt-0.5">
                  Este bloco cita uma atividade externa. Troque por um jogo nativo:
                </span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {getGameSuggestions(block, gameTopic).map((sug) => (
                  <button
                    key={sug.type}
                    type="button"
                    onClick={() => onUpdateBlock(sug.action())}
                    className="px-2.5 py-1.5 rounded-lg border border-border bg-surface-3 hover:border-brand-red hover:text-brand-red text-[11px] font-bold text-ink transition"
                  >
                    {sug.label}
                  </button>
                ))}
              </div>
            </div>
          );
        })()}
      </div>
      </aside>
  );
};

/* ------------------------------------------------------------------ */
/* Editor de zonas de clique (imagem interativa)                       */
/* ------------------------------------------------------------------ */

const HotspotEditor: React.FC<{
  hotspots: ImageHotspot[];
  onChange: (hotspots: ImageHotspot[]) => void;
}> = ({ hotspots, onChange }) => {
  const update = (id: string, patch: Partial<ImageHotspot>) =>
    onChange(hotspots.map((h) => (h.id === id ? { ...h, ...patch } : h)));

  return (
    <div className="pt-3 border-t border-border">
      <div className="flex items-center justify-between mb-2">
        <label className="font-bold text-ink">
          Zonas de clique
          <span className="block text-[10px] text-muted font-normal">
            Posição em % da imagem. Abre um modal na publicação.
          </span>
        </label>
        <button
          type="button"
          onClick={() =>
            onChange([
              ...hotspots,
              {
                id: newId("hotspot"),
                x: 10,
                y: 10,
                w: 25,
                h: 22,
                title: `Zona ${hotspots.length + 1}`,
                contentHtml: "Descreva aqui o que esta parte da imagem mostra.",
              },
            ])
          }
          className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-red hover:underline"
        >
          <IconPlus className="w-3 h-3" /> Zona
        </button>
      </div>

      <div className="space-y-2">
        {hotspots.map((h, i) => (
          <div key={h.id} className="rounded-lg border border-border bg-surface-3 p-2 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-brand-red">
                Zona {i + 1}
              </span>
              <button
                type="button"
                onClick={() => onChange(hotspots.filter((x) => x.id !== h.id))}
                className="text-[11px] font-bold text-brand-red hover:underline"
              >
                remover
              </button>
            </div>
            <input
              className="w-full p-1.5 rounded border border-border bg-surface text-ink text-[11px] focus:border-brand-red focus:outline-none"
              value={h.title}
              placeholder="Título do modal"
              onChange={(e) => update(h.id, { title: e.target.value })}
            />
            <textarea
              className="w-full p-1.5 rounded border border-border bg-surface text-ink text-[11px] leading-relaxed focus:border-brand-red focus:outline-none"
              rows={2}
              value={h.contentHtml}
              placeholder="Conteúdo do modal (aceita HTML)"
              onChange={(e) => update(h.id, { contentHtml: e.target.value })}
            />
            <div className="grid grid-cols-4 gap-1">
              {(["x", "y", "w", "h"] as const).map((k) => (
                <label key={k} className="text-[9px] uppercase font-bold text-muted">
                  {k === "w" ? "larg." : k === "h" ? "alt." : k}%
                  <input
                    type="number"
                    min={0}
                    max={100}
                    className="mt-0.5 w-full p-1 rounded border border-border bg-surface text-ink text-[10px] focus:border-brand-red focus:outline-none"
                    value={h[k]}
                    onChange={(e) => update(h.id, { [k]: Number(e.target.value) } as Partial<ImageHotspot>)}
                  />
                </label>
              ))}
            </div>
          </div>
        ))}
        {!hotspots.length && (
          <p className="text-[10px] text-muted italic">
            Nenhuma zona. Adicione para tornar a imagem interativa.
          </p>
        )}
      </div>
    </div>
  );
};

