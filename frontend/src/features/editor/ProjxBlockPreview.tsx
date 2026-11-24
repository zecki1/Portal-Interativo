import React, { useState } from "react";
import type { Block } from "../../types/project";

/** Tipos trazidos do ProjetoX (renderizados pelo preview dedicado). */
export const PROJX_BLOCK_TYPES: string[] = [
  "flipcard",
  "timeline",
  "table",
  "cover",
  "parallax",
  "gallery",
  "image-text-card",
  "highlight",
  "code",
  "multiple-choice",
  "true-false",
  "fill-blanks",
  "ordering",
  "matching",
  "memory-game",
  "word-search",
  "crossword",
];

export const isProjxBlock = (type: string) => PROJX_BLOCK_TYPES.includes(type);

const assetUrl = (apiBase: string, projectId: string, src?: string) =>
  !src
    ? ""
    : /^(https?:|data:|blob:)/i.test(src)
    ? src
    : `${apiBase}/projects/${projectId}/preview/${src}`;

const Rich: React.FC<{ html?: string; className?: string }> = ({ html, className = "" }) => (
  <div
    className={`text-sm leading-relaxed [&_p]:my-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5 [&_strong]:font-bold [&_em]:italic [&_mark]:bg-yellow-200 [&_mark]:text-ink [&_mark]:px-0.5 ${className}`}
    dangerouslySetInnerHTML={{ __html: html || "" }}
  />
);

interface Props {
  block: Block;
  apiBase: string;
  projectId: string;
}

export const ProjxBlockPreview: React.FC<Props> = ({ block, apiBase, projectId }) => {
  const [flipped, setFlipped] = useState(false);
  const [slide, setSlide] = useState(0);
  const img = (src?: string) => assetUrl(apiBase, projectId, src);

  switch (block.type) {
    case "flipcard": {
      const d = block.data;
      return (
        <div className="my-1">
          <div
            onClick={() => setFlipped((v) => !v)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setFlipped((v) => !v)}
            className={`min-h-[190px] rounded-xl border p-5 cursor-pointer transition-all ${
              flipped ? "bg-brand-red/5 border-brand-red" : "bg-surface border-border"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-brand-red">
                {flipped ? "Verso do cartão" : "Cartão interativo"}
              </span>
              <span className="text-[10px] font-bold text-muted">↻ clique para virar</span>
            </div>
            {!flipped ? (
              <>
                {d.image && (
                  <img src={img(d.image)} alt="" className="max-h-32 rounded-lg mb-2 object-cover" />
                )}
                {d.title && <h3 className="text-sm font-extrabold text-ink mb-1">{d.title}</h3>}
                <Rich html={d.frontHtml} />
              </>
            ) : (
              <Rich html={d.backHtml} />
            )}
            <p className="text-[10px] font-bold text-brand-red uppercase tracking-wider mt-3">
              {flipped ? "↩ Voltar" : d.hint || "Clique para virar ↻"}
            </p>
          </div>
        </div>
      );
    }

    case "timeline": {
      const d = block.data;
      return (
        <div className="my-1">
          {d.title && <h3 className="text-sm font-extrabold text-ink mb-3">{d.title}</h3>}
          <ol className="relative pl-8 border-l-2 border-brand-red/40 space-y-3">
            {(d.items || []).map((item) => (
              <li key={item.id} className="relative">
                <span className="absolute -left-[41px] top-0 w-6 h-6 rounded-full bg-brand-red text-white grid place-items-center text-[10px] font-black">
                  {item.icon || "•"}
                </span>
                <div className="bg-surface border border-border rounded-lg p-3">
                  <h4 className="text-xs font-bold text-ink mb-1">{item.title}</h4>
                  <Rich html={item.contentHtml} className="text-[11px] text-muted" />
                </div>
              </li>
            ))}
          </ol>
        </div>
      );
    }

    case "table": {
      const d = block.data;
      return (
        <figure className="my-1 overflow-x-auto">
          <table className="w-full text-[11px] border-collapse">
            <thead>
              <tr>
                {(d.headers || []).map((h, i) => (
                  <th
                    key={i}
                    className="bg-brand-red text-white font-bold text-left px-2.5 py-2 border border-brand-red"
                    dangerouslySetInnerHTML={{ __html: h }}
                  />
                ))}
              </tr>
            </thead>
            <tbody>
              {(d.rows || []).map((row, r) => (
                <tr key={r} className={d.striped && r % 2 === 1 ? "bg-surface-3" : ""}>
                  {(d.headers || []).map((_, c) => (
                    <td
                      key={c}
                      className="px-2.5 py-2 border border-border text-ink align-top"
                      dangerouslySetInnerHTML={{ __html: row[c] || "" }}
                    />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {d.caption && <figcaption className="text-[10px] italic text-muted mt-1.5">{d.caption}</figcaption>}
        </figure>
      );
    }

    case "cover": {
      const d = block.data;
      return (
        <div
          className={`relative rounded-xl overflow-hidden min-h-[170px] flex items-center p-6 text-white my-1 ${
            d.align === "center" ? "justify-center text-center" : ""
          }`}
          style={{
            backgroundImage: d.image
              ? `linear-gradient(120deg, rgba(0,0,0,.72), rgba(0,0,0,.35)), url("${img(d.image)}")`
              : "linear-gradient(120deg,#d42731,#7c2d12)",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div>
            <h2 className="text-xl font-black leading-tight">{d.title}</h2>
            {d.subtitle && <p className="text-xs mt-1.5 opacity-95">{d.subtitle}</p>}
            {d.ctaLabel && (
              <span className="inline-block mt-3 bg-white text-brand-red text-[11px] font-extrabold px-3.5 py-1.5 rounded-full">
                {d.ctaLabel}
              </span>
            )}
          </div>
        </div>
      );
    }

    case "parallax": {
      const d = block.data;
      return (
        <div
          className="rounded-xl overflow-hidden grid place-items-center my-1"
          style={{
            backgroundImage: `url("${img(d.image)}")`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            minHeight: Math.min(Math.max(d.height || 280, 160), 480),
          }}
        >
          <div className="w-full bg-black/55 text-white text-center p-5">
            {d.title && <h2 className="text-base font-black">{d.title}</h2>}
            {d.subtitle && <p className="text-[11px] mt-1 opacity-90">{d.subtitle}</p>}
          </div>
        </div>
      );
    }

    case "gallery": {
      const items = block.data.items || [];
      const current = items[slide] || items[0];
      if (!items.length) return <p className="text-xs text-muted">Galeria vazia.</p>;
      return (
        <div className="my-1 relative rounded-xl overflow-hidden bg-slate-900">
          {current && (
            <figure>
              <img src={img(current.src)} alt="" className="w-full max-h-72 object-contain mx-auto" />
              <figcaption className="text-[10px] text-slate-200 px-3 py-2 bg-black/30 flex items-center justify-between gap-3">
                <span>{current.caption || ""}</span>
                <span className="font-bold">
                  {slide + 1}/{items.length}
                </span>
              </figcaption>
            </figure>
          )}
          <button
            type="button"
            onClick={() => setSlide((s) => (s - 1 + items.length) % items.length)}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/55 text-white font-bold"
            aria-label="Anterior"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => setSlide((s) => (s + 1) % items.length)}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/55 text-white font-bold"
            aria-label="Próxima"
          >
            ›
          </button>
          <div className="flex justify-center gap-1.5 py-2">
            {items.map((it, i) => (
              <button
                key={it.id}
                type="button"
                onClick={() => setSlide(i)}
                aria-label={`Imagem ${i + 1}`}
                className={`w-2 h-2 rounded-full ${i === slide ? "bg-brand-red scale-125" : "bg-slate-400"}`}
              />
            ))}
          </div>
        </div>
      );
    }

    case "image-text-card": {
      const d = block.data;
      const reverse = d.layout === "right";
      return (
        <div className="my-1 grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] border border-border rounded-xl overflow-hidden bg-surface">
          <div className={`min-h-[130px] ${reverse ? "sm:order-2" : ""}`}>
            <img src={img(d.image)} alt="" className="w-full h-full object-cover" />
          </div>
          <div className="p-4">
            <h3 className="text-sm font-extrabold text-ink mb-1">{d.title}</h3>
            <Rich html={d.html} />
          </div>
        </div>
      );
    }

    case "highlight": {
      const d = block.data;
      const html = (d.html || "").replace(/==([^=]+)==/g, "<mark>$1</mark>");
      return (
        <div className="my-1 p-4 rounded-xl bg-amber-50 border border-amber-200">
          {d.title && <h3 className="text-xs font-extrabold text-ink mb-1.5">{d.title}</h3>}
          <Rich html={html} />
          {d.legend && <p className="text-[10px] italic text-muted mt-2">{d.legend}</p>}
        </div>
      );
    }

    case "code": {
      const d = block.data;
      return (
        <figure className="my-1 rounded-xl overflow-hidden bg-slate-900 text-slate-200">
          <figcaption className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 text-[10px] text-slate-400">
            <span className="flex gap-1">
              <i className="w-2 h-2 rounded-full bg-red-500 inline-block" />
              <i className="w-2 h-2 rounded-full bg-yellow-400 inline-block" />
              <i className="w-2 h-2 rounded-full bg-green-500 inline-block" />
            </span>
            <span className="font-bold text-slate-300">{d.filename || d.language || "código"}</span>
            {d.language && <span className="ml-auto uppercase tracking-wider">{d.language}</span>}
          </figcaption>
          <pre className="p-3.5 text-[11px] leading-relaxed overflow-x-auto">
            <code>{d.code}</code>
          </pre>
        </figure>
      );
    }

    case "multiple-choice": {
      const d = block.data;
      const correct = new Set(d.correctIds || []);
      return (
        <div className="my-1 p-4 rounded-xl border border-border bg-surface">
          <p className="text-xs font-bold text-ink mb-3">{d.question}</p>
          <div className="space-y-1.5">
            {(d.options || []).map((o, i) => (
              <div
                key={o.id}
                className={`flex items-center gap-2 p-2 rounded-lg border text-[11px] ${
                  correct.has(o.id)
                    ? "border-emerald-500 bg-emerald-500/10 font-bold text-ink"
                    : "border-border text-ink"
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full grid place-items-center text-[9px] font-black ${
                    correct.has(o.id) ? "bg-emerald-500 text-white" : "border border-border text-muted"
                  }`}
                >
                  {String.fromCharCode(65 + i)}
                </span>
                <span className="flex-1" dangerouslySetInnerHTML={{ __html: o.text }} />
                {correct.has(o.id) && <span className="text-[9px] font-black uppercase text-emerald-600">correta</span>}
              </div>
            ))}
          </div>
        </div>
      );
    }

    case "true-false": {
      const d = block.data;
      return (
        <div className="my-1 p-4 rounded-xl border border-border bg-surface">
          {d.question && <p className="text-xs font-bold text-ink mb-3">{d.question}</p>}
          <ol className="space-y-1.5">
            {(d.statements || []).map((s) => (
              <li key={s.id} className="flex items-center gap-2 p-2 rounded-lg border border-border text-[11px]">
                <span className="flex-1">{s.text}</span>
                <span
                  className={`w-7 h-6 rounded grid place-items-center text-[10px] font-black ${
                    s.answer ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"
                  }`}
                >
                  {s.answer ? "V" : "F"}
                </span>
              </li>
            ))}
          </ol>
        </div>
      );
    }

    case "fill-blanks": {
      const d = block.data;
      return (
        <div className="my-1 p-4 rounded-xl border border-border bg-surface">
          {d.question && <p className="text-xs font-bold text-ink mb-3">{d.question}</p>}
          <ol className="space-y-2 list-decimal pl-5 text-[11px] leading-loose text-ink">
            {(d.sentences || []).map((s) => {
              const parts = String(s.text || "").split(/_{2,}/g);
              let bi = 0;
              return (
                <li key={s.id}>
                  {parts.map((part, i) => (
                    <React.Fragment key={i}>
                      <span>{part}</span>
                      {i < parts.length - 1 && (
                        <span className="inline-block mx-1 px-2 border-b-2 border-brand-red text-brand-red font-bold">
                          {s.answers?.[bi++] ?? "____"}
                        </span>
                      )}
                    </React.Fragment>
                  ))}
                </li>
              );
            })}
          </ol>
        </div>
      );
    }

    case "ordering": {
      const d = block.data;
      return (
        <div className="my-1 p-4 rounded-xl border border-border bg-surface">
          {d.question && <p className="text-xs font-bold text-ink mb-3">{d.question}</p>}
          <ol className="space-y-1.5 list-none counter-reset">
            {(d.items || []).map((it, i) => (
              <li key={it.id} className="flex items-center gap-2.5 p-2 rounded-lg border border-border text-[11px]">
                <span className="w-5 h-5 rounded-full bg-brand-red/10 text-brand-red text-[9px] font-black grid place-items-center">
                  {i + 1}
                </span>
                <span className="flex-1">{it.text}</span>
                <span className="text-muted">⠿</span>
              </li>
            ))}
          </ol>
          <p className="text-[10px] text-muted mt-2 italic">No site: o estudante arrasta para ordenar.</p>
        </div>
      );
    }

    case "matching": {
      const d = block.data;
      return (
        <div className="my-1 p-4 rounded-xl border border-border bg-surface">
          {d.question && <p className="text-xs font-bold text-ink mb-3">{d.question}</p>}
          <ul className="space-y-1.5">
            {(d.pairs || []).map((p) => (
              <li
                key={p.id}
                className="flex flex-col gap-1 sm:grid sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:gap-2 sm:items-center p-2 rounded-lg border border-border text-[11px]"
              >
                <span className="font-semibold text-ink">{p.left}</span>
                <span className="px-2 py-1 rounded border border-brand-red/40 bg-brand-red/5 text-brand-red font-semibold">
                  {p.right}
                </span>
              </li>
            ))}
          </ul>
        </div>
      );
    }

    case "memory-game": {
      const d = block.data;
      return (
        <div className="my-1 p-4 rounded-xl border border-border bg-surface">
          {d.title && <p className="text-xs font-bold text-ink mb-3">{d.title}</p>}
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
            {(d.pairs || []).flatMap((p) => [
              <div
                key={p.id + "a"}
                className="aspect-square rounded-lg bg-brand-red text-white grid place-items-center text-[9px] font-bold p-1 text-center"
              >
                {p.a}
              </div>,
              <div
                key={p.id + "b"}
                className="aspect-square rounded-lg border-2 border-brand-red bg-surface-3 text-ink grid place-items-center text-[9px] font-bold p-1 text-center"
              >
                {p.b}
              </div>,
            ])}
          </div>
          <p className="text-[10px] text-muted mt-2 italic">No site: cartas viradas, o estudante encontra os pares.</p>
        </div>
      );
    }

    case "word-search": {
      const d = block.data;
      return (
        <div className="my-1 p-4 rounded-xl border border-border bg-surface">
          {d.title && <p className="text-xs font-bold text-ink mb-2">{d.title}</p>}
          <div className="flex flex-wrap gap-1.5">
            {(d.words || []).map((w, i) => (
              <span key={i} className="text-[10px] font-bold px-2 py-1 rounded bg-surface-3 text-ink">
                {w}
              </span>
            ))}
          </div>
          <p className="text-[10px] text-muted mt-2 italic">
            A grade é gerada na publicação ({d.size || 12}×{d.size || 12}).
          </p>
        </div>
      );
    }

    case "crossword": {
      const d = block.data;
      return (
        <div className="my-1 p-4 rounded-xl border border-border bg-surface">
          {d.title && <p className="text-xs font-bold text-ink mb-2">{d.title}</p>}
          <ul className="space-y-1 text-[10px] text-ink">
            {(d.entries || []).map((e, i) => (
              <li key={e.id}>
                <strong className="text-brand-red">{i + 1}.</strong> {e.clue}{" "}
                <span className="text-muted">({e.answer.length})</span>
              </li>
            ))}
          </ul>
          <p className="text-[10px] text-muted mt-2 italic">
            A grade de palavras cruzadas é montada na publicação.
          </p>
        </div>
      );
    }

    default:
      return null;
  }
};
