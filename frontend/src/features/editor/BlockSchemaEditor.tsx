import React from "react";
import type { Block } from "../../types/project";
import { newId } from "../../lib/ids";
import { LuX, LuArrowUp, LuArrowDown } from "react-icons/lu";

/* ------------------------------------------------------------------ */
/* Editor genérico por esquema para os blocos ProjetoX                 */
/* ------------------------------------------------------------------ */

type FieldType = "text" | "textarea" | "html" | "number" | "boolean" | "select" | "strings" | "items" | "matrix";

interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  hint?: string;
  options?: Array<{ value: string; label: string }>;
  min?: number;
  max?: number;
  step?: number;
  fields?: FieldDef[];
  itemLabel?: string;
}

const text = (key: string, label: string, placeholder?: string): FieldDef => ({ key, label, type: "text", placeholder });
const html = (key: string, label: string): FieldDef => ({ key, label, type: "html" });
const num = (key: string, label: string, min = 0, max = 999): FieldDef => ({ key, label, type: "number", min, max });

const SCHEMAS: Record<string, FieldDef[]> = {
  flipcard: [
    text("title", "Título do cartão"),
    { ...html("frontHtml", "Frente (HTML)"), hint: "Texto exibido antes de virar." },
    { ...html("backHtml", "Verso (HTML)"), hint: "Conteúdo revelado ao clicar." },
    text("image", "Imagem da frente", "assets/imagem.jpg"),
    text("hint", "Texto de ajuda", "Clique para virar"),
  ],
  timeline: [
    text("title", "Título da linha do tempo"),
    { key: "items", label: "Etapas", type: "items", itemLabel: "Etapa", fields: [text("title", "Título"), html("contentHtml", "Conteúdo"), text("icon", "Ícone (emoji ou número)")] },
  ],
  table: [
    text("caption", "Legenda"),
    { key: "headers", label: "Cabeçalhos", type: "strings", placeholder: "Coluna" },
    { key: "rows", label: "Linhas", type: "matrix" },
    { key: "striped", label: "Linhas zebradas", type: "boolean" },
    { key: "rowHeaders", label: "Primeira coluna como título de linha", type: "boolean" },
    { ...html("textAlternative", "Versão textual (tabela complexa)"), hint: "Gera content/tabela_<id>.html com link de ida e volta (7.4.2)." },
  ],
  cover: [
    text("title", "Título"),
    text("subtitle", "Subtítulo"),
    text("image", "Imagem de fundo", "assets/capa.jpg"),
    text("ctaLabel", "Texto do botão"),
    text("ctaHref", "Link do botão", "https://..."),
    { key: "align", label: "Alinhamento", type: "select", options: [{ value: "left", label: "Esquerda" }, { value: "center", label: "Centro" }] },
  ],
  parallax: [
    text("image", "Imagem de fundo", "assets/imagem.jpg"),
    text("title", "Título"),
    text("subtitle", "Subtítulo"),
    num("height", "Altura (px)", 160, 640),
  ],
  gallery: [
    { key: "items", label: "Imagens", type: "items", itemLabel: "Imagem", fields: [text("src", "Arquivo / URL", "assets/imagem.jpg"), text("caption", "Legenda")] },
    { key: "autoplay", label: "Passar automaticamente", type: "boolean" },
  ],
  "image-text-card": [
    text("image", "Imagem", "assets/imagem.jpg"),
    text("title", "Título"),
    html("html", "Texto"),
    { key: "layout", label: "Posição da imagem", type: "select", options: [{ value: "left", label: "Esquerda" }, { value: "right", label: "Direita" }] },
  ],
  highlight: [
    text("title", "Título"),
    { ...html("html", "Texto destacado"), hint: "Use ==palavra== para marcar em amarelo." },
    text("legend", "Legenda do destaque"),
  ],
  code: [
    text("filename", "Nome do arquivo", "exemplo.js"),
    text("language", "Linguagem", "javascript"),
    { key: "code", label: "Código", type: "textarea", placeholder: "console.log('olá');" },
  ],
  "true-false": [
    text("question", "Enunciado"),
    { key: "statements", label: "Afirmações", type: "items", itemLabel: "Afirmação", fields: [{ ...text("text", "Afirmação"), type: "text" }, { key: "answer", label: "Verdadeira?", type: "boolean" }] },
    num("attempts", "Tentativas", 1, 9),
    text("explanation", "Comentário do professor"),
  ],
  "fill-blanks": [
    text("question", "Enunciado"),
    { key: "sentences", label: "Frases com lacunas", type: "items", itemLabel: "Frase", hint: "Use ____ (4 sublinhados) para cada lacuna.", fields: [{ key: "text", label: "Frase", type: "textarea", placeholder: "A ____ é um animal." }, { key: "answers", label: "Respostas (na ordem)", type: "strings" }] },
    num("attempts", "Tentativas", 1, 9),
  ],
  ordering: [
    text("question", "Enunciado"),
    { key: "items", label: "Itens na ordem correta", type: "items", itemLabel: "Item", fields: [text("text", "Texto")] },
    num("attempts", "Tentativas", 1, 9),
  ],
  matching: [
    text("question", "Enunciado"),
    { key: "pairs", label: "Pares", type: "items", itemLabel: "Par", fields: [text("left", "Coluna A"), text("right", "Coluna B")] },
    num("attempts", "Tentativas", 1, 9),
  ],
  "memory-game": [
    text("title", "Título"),
    { key: "pairs", label: "Pares de cartas", type: "items", itemLabel: "Par", fields: [text("a", "Carta 1"), text("b", "Carta 2")] },
    num("columns", "Colunas", 2, 6),
  ],
  "word-search": [
    text("title", "Título"),
    { key: "words", label: "Palavras", type: "strings", placeholder: "Palavra" },
    num("size", "Tamanho da grade", 8, 22),
  ],
  crossword: [
    text("title", "Título"),
    { key: "entries", label: "Palavras e dicas", type: "items", itemLabel: "Palavra", fields: [text("answer", "Resposta", "ANIMAIS"), text("clue", "Dica")] },
  ],
  puzzle: [
    text("title", "Título"),
    num("size", "Peças (NxN)", 2, 8),
  ],
  glossary: [
    text("title", "Título do glossário"),
    {
      key: "items",
      label: "Termos",
      type: "items",
      itemLabel: "Termo",
      hint: "Use data-book=\"glossario-termo\" no link do texto apontando para #gt-<id-do-bloco>-<índice>.",
      fields: [text("term", "Termo"), html("definition", "Definição"), text("refId", "ID do link de retorno")],
    },
  ],
  footnotes: [
    text("title", "Título das notas"),
    {
      key: "items",
      label: "Notas de rodapé",
      type: "items",
      itemLabel: "Nota",
      hint: "Use data-book=\"nota\" no link do texto apontando para #nt-<id-do-bloco>-<índice>.",
      fields: [html("contentHtml", "Texto da nota"), text("refId", "ID do link de retorno")],
    },
  ],
  audio: [
    text("localSrc", "MP3 local", "resources/audios/audio.mp3"),
    { ...text("src", "Origem atual"), hint: "URLs externas são recusadas no build PNLD." },
    { ...html("transcript", "Transcrição integral"), hint: "Exibida em um painel expansível logo após o áudio (7.8.1.4)." },
    text("caption", "Legenda exibida"),
  ],
  math: [
    { ...html("mathml", "Markup MathML"), hint: "Cole aqui o <math>...</math> (presentation ou content)." },
    text("text", "Fórmula em texto", "x² + y² = z²"),
    { ...text("description", "Descrição alternativa"), hint: "Obrigatória: descreva a fórmula por extenso (7.12.1.3)." },
    { key: "display", label: "Exibição", type: "select", options: [{ value: "block", label: "Bloco" }, { value: "inline", label: "Na linha" }] },
  ],
};

/** Campos com esquema + tipos especiais. */
export const hasSchema = (type: string) => type in SCHEMAS || type === "multiple-choice";

/* ------------------------------------------------------------------ */
/* Componentes de campo                                                */
/* ------------------------------------------------------------------ */

const inputCls =
  "w-full p-2 rounded border border-border bg-surface text-ink focus:border-brand-red focus:outline-none focus:ring-1 focus:ring-brand-red text-xs";

const FieldLabel: React.FC<{ children: React.ReactNode; hint?: string; htmlFor?: string }> = ({
  children,
  hint,
  htmlFor,
}) => (
  <label htmlFor={htmlFor} className="font-bold text-ink block mb-1.5">
    {children}
    {hint && <span className="block text-[10px] text-muted font-normal mt-0.5">{hint}</span>}
  </label>
);

const IconBtn: React.FC<{ title: string; onClick: () => void; danger?: boolean; children: React.ReactNode }> = ({
  title,
  onClick,
  danger,
  children,
}) => (
  <button
    type="button"
    title={title}
    aria-label={title}
    onClick={onClick}
    className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${
      danger ? "text-brand-red hover:bg-brand-red/10" : "text-muted hover:text-ink hover:bg-surface-3"
    }`}
  >
    {children}
  </button>
);

interface Props {
  block: Block;
  onUpdateBlock: (updated: Block) => void;
}

export const BlockSchemaEditor: React.FC<Props> = ({ block, onUpdateBlock }) => {
  const data = block.data as Record<string, any>;
  const update = (patch: Record<string, any>) =>
    onUpdateBlock({ ...block, data: { ...data, ...patch } } as Block);

  if (block.type === "multiple-choice") {
    return <MultipleChoiceEditor block={block} onUpdateBlock={onUpdateBlock} />;
  }

  const fields = SCHEMAS[block.type];
  if (!fields) return null;

  return (
    <div className="space-y-4">
      {fields.map((field) => (
        <FieldRenderer
          key={field.key}
          field={field}
          value={data[field.key]}
          onChange={(v) => update({ [field.key]: v })}
          columns={(data.headers as string[] | undefined)?.length || 0}
        />
      ))}
    </div>
  );
};

const FieldRenderer: React.FC<{
  field: FieldDef;
  value: any;
  onChange: (v: any) => void;
  columns: number;
  compact?: boolean;
}> = ({ field, value, onChange, columns, compact }) => {
  const fieldId = React.useId();

  if (field.type === "boolean") {
    return (
      <label className={`flex items-center gap-2 cursor-pointer font-semibold text-ink ${compact ? "text-[11px]" : ""}`}>
        <input
          type="checkbox"
          checked={!!value}
          onChange={(e) => onChange(e.target.checked)}
          className="rounded text-brand-red focus:ring-brand-red w-4 h-4"
        />
        <span>{field.label}</span>
      </label>
    );
  }

  if (field.type === "select") {
    return (
      <div>
        <FieldLabel htmlFor={fieldId} hint={field.hint}>{field.label}</FieldLabel>
        <select id={fieldId} className={inputCls} value={value || ""} onChange={(e) => onChange(e.target.value)}>
          {(field.options || []).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (field.type === "number") {
    return (
      <div>
        <FieldLabel htmlFor={fieldId} hint={field.hint}>{field.label}</FieldLabel>
        <input
          type="number"
          id={fieldId}
          className={inputCls}
          value={typeof value === "number" ? value : ""}
          min={field.min}
          max={field.max}
          step={field.step ?? 1}
          onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
        />
      </div>
    );
  }

  if (field.type === "strings") {
    const list: string[] = Array.isArray(value) ? value : [];
    return (
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <FieldLabel hint={field.hint}>{field.label}</FieldLabel>
          <button
            type="button"
            onClick={() => onChange([...list, ""])}
            className="text-[11px] font-bold text-brand-red hover:underline"
          >
            + Adicionar
          </button>
        </div>
        <div className="space-y-1.5">
          {list.map((item, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <input
                aria-label={`${field.label} (item ${i + 1})`}
                className={inputCls}
                value={item}
                placeholder={field.placeholder}
                onChange={(e) => onChange(list.map((v, vi) => (vi === i ? e.target.value : v)))}
              />
              <IconBtn title="Remover" danger onClick={() => onChange(list.filter((_, vi) => vi !== i))}>
                <LuX className="w-3.5 h-3.5" aria-hidden="true" />
              </IconBtn>
            </div>
          ))}
          {!list.length && <p className="text-[10px] text-muted italic">Nenhum item.</p>}
        </div>
      </div>
    );
  }

  if (field.type === "matrix") {
    const rows: string[][] = Array.isArray(value) ? value : [];
    const cols = Math.max(columns, 1);
    return (
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <FieldLabel hint="Use uma coluna por cabeçalho.">{field.label}</FieldLabel>
          <button
            type="button"
            onClick={() => onChange([...rows, Array.from({ length: cols }, () => "")])}
            className="text-[11px] font-bold text-brand-red hover:underline"
          >
            + Linha
          </button>
        </div>
        <div className="space-y-1.5">
          {rows.map((row, r) => (
            <div key={r} className="flex items-start gap-1.5">
              <div className="grid flex-1 gap-1" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }}>
                {Array.from({ length: cols }, (_, c) => (
                  <input
                    key={c}
                    aria-label={`${field.label}: linha ${r + 1}, coluna ${c + 1}`}
                    className="w-full p-1.5 rounded border border-border bg-surface text-ink text-[11px] focus:border-brand-red focus:outline-none"
                    value={row[c] || ""}
                    onChange={(e) =>
                      onChange(
                        rows.map((rv, ri) =>
                          ri === r ? Array.from({ length: cols }, (_, ci) => (ci === c ? e.target.value : rv[ci] || "")) : rv
                        )
                      )
                    }
                  />
                ))}
              </div>
              <IconBtn title="Remover linha" danger onClick={() => onChange(rows.filter((_, ri) => ri !== r))}>
                <LuX className="w-3.5 h-3.5" aria-hidden="true" />
              </IconBtn>
            </div>
          ))}
          {!rows.length && <p className="text-[10px] text-muted italic">Nenhuma linha.</p>}
        </div>
      </div>
    );
  }

  if (field.type === "items") {
    const list: Array<Record<string, any>> = Array.isArray(value) ? value : [];
    const remove = (i: number) => onChange(list.filter((_, vi) => vi !== i));
    const move = (i: number, dir: number) => {
      const next = [...list];
      const j = i + dir;
      if (j < 0 || j >= next.length) return;
      [next[i], next[j]] = [next[j], next[i]];
      onChange(next);
    };
    const add = () => {
      const item: Record<string, any> = { id: newId("item") };
      (field.fields || []).forEach((f) => {
        item[f.key] =
          f.type === "boolean" ? false : f.type === "number" ? 1 : f.type === "strings" || f.type === "items" ? [] : "";
      });
      onChange([...list, item]);
    };
    return (
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <FieldLabel hint={field.hint}>{field.label}</FieldLabel>
          <button type="button" onClick={add} className="text-[11px] font-bold text-brand-red hover:underline">
            + {field.itemLabel || "Item"}
          </button>
        </div>
        <div className="space-y-2">
          {list.map((item, i) => (
            <div key={item.id || i} className="rounded border border-border bg-surface-3 p-2">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-muted">
                  {field.itemLabel || "Item"} {i + 1}
                </span>
                <div className="flex items-center gap-0.5">
                  <IconBtn title="Mover para cima" onClick={() => move(i, -1)}>
                    <LuArrowUp className="w-3.5 h-3.5" aria-hidden="true" />
                  </IconBtn>
                  <IconBtn title="Mover para baixo" onClick={() => move(i, 1)}>
                    <LuArrowDown className="w-3.5 h-3.5" aria-hidden="true" />
                  </IconBtn>
                  <IconBtn title="Remover" danger onClick={() => remove(i)}>
                    <LuX className="w-3.5 h-3.5" aria-hidden="true" />
                  </IconBtn>
                </div>
              </div>
              <div className="space-y-2">
                {(field.fields || []).map((sub) => (
                  <FieldRenderer
                    key={sub.key}
                    field={sub}
                    value={item[sub.key]}
                    onChange={(v) =>
                      onChange(list.map((it, ii) => (ii === i ? { ...it, [sub.key]: v } : it)))
                    }
                    columns={columns}
                    compact
                  />
                ))}
              </div>
            </div>
          ))}
          {!list.length && <p className="text-[10px] text-muted italic">Nenhum item.</p>}
        </div>
      </div>
    );
  }

  const isLong = field.type === "html" || field.type === "textarea";
  return (
    <div>
      <FieldLabel htmlFor={fieldId} hint={field.hint}>{field.label}</FieldLabel>
      {isLong ? (
        <textarea
          id={fieldId}
          className={`${inputCls} leading-relaxed ${field.type === "textarea" ? "font-mono" : ""}`}
          rows={field.type === "textarea" ? 7 : 4}
          value={value ?? ""}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          id={fieldId}
          className={inputCls}
          value={value ?? ""}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Múltipla escolha (alternativas com marcação de corretas)            */
/* ------------------------------------------------------------------ */

const MultipleChoiceEditor: React.FC<Props> = ({ block, onUpdateBlock }) => {
  if (block.type !== "multiple-choice") return null;
  const data = block.data;
  const correct = new Set(data.correctIds || []);

  const update = (patch: Partial<typeof data>) =>
    onUpdateBlock({ ...block, data: { ...data, ...patch } });

  const toggle = (id: string) => {
    const next = new Set(correct);
    next.has(id) ? next.delete(id) : next.add(id);
    update({ correctIds: [...next] });
  };

  return (
    <div className="space-y-4">
      <div>
        <FieldLabel>Pergunta</FieldLabel>
        <textarea
          aria-label="Pergunta"
          className={`${inputCls} leading-relaxed`}
          rows={3}
          value={data.question || ""}
          onChange={(e) => update({ question: e.target.value })}
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <FieldLabel hint="Marque uma ou mais alternativas corretas.">Alternativas</FieldLabel>
          <button
            type="button"
            className="text-[11px] font-bold text-brand-red hover:underline"
            onClick={() =>
              update({
                options: [
                  ...(data.options || []),
                  { id: newId("item"), text: "Nova alternativa" },
                ],
              })
            }
          >
            + Alternativa
          </button>
        </div>
        <div className="space-y-1.5">
          {(data.options || []).map((opt, i) => (
            <div
              key={opt.id}
              className={`flex items-center gap-2 rounded border p-2 ${
                correct.has(opt.id) ? "border-emerald-500 bg-emerald-500/10" : "border-border bg-surface-3"
              }`}
            >
              <input
                type="checkbox"
                aria-label={`Marcar alternativa ${i + 1} como correta`}
                checked={correct.has(opt.id)}
                onChange={() => toggle(opt.id)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                title="Alternativa correta"
              />
              <input
                aria-label={`Texto da alternativa ${i + 1}`}
                className="flex-1 p-1.5 rounded border border-border bg-surface text-ink text-[11px] focus:border-brand-red focus:outline-none"
                value={opt.text}
                onChange={(e) =>
                  update({
                    options: (data.options || []).map((o, oi) =>
                      oi === i ? { ...o, text: e.target.value } : o
                    ),
                  })
                }
              />
              <IconBtn
                title="Remover"
                danger
                onClick={() =>
                  update({
                    options: (data.options || []).filter((_, oi) => oi !== i),
                    correctIds: (data.correctIds || []).filter((id) => id !== opt.id),
                  })
                }
              >
                <LuX className="w-3.5 h-3.5" aria-hidden="true" />
              </IconBtn>
            </div>
          ))}
          {!(data.options || []).length && <p className="text-[10px] text-muted italic">Nenhuma alternativa.</p>}
        </div>
      </div>

      <div>
        <FieldLabel>Tentativas</FieldLabel>
        <input
          type="number"
          aria-label="Tentativas"
          min={1}
          max={9}
          className={inputCls}
          value={data.attempts ?? 2}
          onChange={(e) => update({ attempts: Number(e.target.value) })}
        />
      </div>

      <div>
        <FieldLabel hint="Exibido após a resposta.">Comentário do professor</FieldLabel>
        <textarea
          aria-label="Comentário do professor"
          className={`${inputCls} leading-relaxed`}
          rows={2}
          value={data.explanation || ""}
          onChange={(e) => update({ explanation: e.target.value })}
        />
      </div>
    </div>
  );
};
