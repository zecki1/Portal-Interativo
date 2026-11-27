import React, { useEffect, useState } from "react";
import type { Theme, ThemeMode, ThemeTokens } from "../../lib/theme";
import {
  FONT_OPTIONS,
  MODE_OPTIONS,
  VISUAL_STYLE_OPTIONS,
  contrastRatio,
  resolveProjectTheme,
  tokensForMode,
} from "../../lib/theme";
import type { ProjectDocument } from "../../types/project";
import {
  LuPalette,
  LuPlus,
  LuCopy,
  LuTrash2,
  LuSave,
  LuRotateCcw,
  LuCheck,
  LuTriangleAlert,
  LuChevronDown,
  LuPencil,
} from "react-icons/lu";

interface ThemePanelProps {
  doc: ProjectDocument;
  themes: Theme[];
  loading: boolean;
  activeTheme: Theme;
  tokens: ThemeTokens;
  onApplyTheme: (id: string) => void;
  onOverride: (patch: Partial<ThemeTokens>) => void;
  onResetOverrides: () => void;
  onCustomCss: (css: string) => void;
  onMode: (mode: ThemeMode) => void;
  onCreateTheme: (name?: string) => Promise<void>;
  onDuplicateTheme: (id: string) => Promise<void>;
  onRenameTheme: (id: string, name: string) => Promise<void>;
  onDeleteTheme: (id: string) => Promise<void>;
  onSaveTheme: () => Promise<void>;
}

const label = "text-[10px] font-bold uppercase tracking-wider text-muted";
const input =
  "w-full rounded-lg border border-border bg-surface px-2 py-1.5 text-[11px] text-ink focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/30";
const btn =
  "inline-flex items-center justify-center gap-1 rounded-lg border border-border bg-surface px-2 py-1.5 text-[11px] font-bold text-ink hover:border-brand-red hover:text-brand-red transition disabled:opacity-40 disabled:hover:border-border disabled:hover:text-ink";

const Section: React.FC<{ title: string; children: React.ReactNode; defaultOpen?: boolean }> = ({
  title,
  children,
  defaultOpen = true,
}) => (
  <details open={defaultOpen} className="rounded-xl border border-border bg-surface overflow-hidden">
    <summary className="cursor-pointer select-none px-3 py-2 text-[11px] font-bold text-ink bg-surface-3 flex items-center justify-between">
      {title}
      <LuChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
    </summary>
    <div className="p-3 space-y-2.5">{children}</div>
  </details>
);

const ColorField: React.FC<{ label: string; value: string; onChange: (v: string) => void }> = ({
  label: fieldLabel,
  value,
  onChange,
}) => (
  <label className="block">
    <span className={label}>{fieldLabel}</span>
    <div className="mt-1 flex items-center gap-1.5">
      <input
        type="color"
        value={/^#[0-9a-f]{6}$/i.test(value) ? value : "#000000"}
        onChange={(e) => onChange(e.target.value)}
        aria-label={fieldLabel}
        className="h-7 w-9 shrink-0 cursor-pointer rounded border border-border bg-transparent p-0.5"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={`${fieldLabel} (hex)`}
        className={input}
      />
    </div>
  </label>
);

const RangeField: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (v: number) => void;
}> = ({ label: fieldLabel, value, min, max, step = 1, suffix = "", onChange }) => (
  <label className="block">
    <span className={label}>
      {fieldLabel} <span className="text-brand-red">{value}{suffix}</span>
    </span>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      aria-label={fieldLabel}
      onChange={(e) => onChange(Number(e.target.value))}
      className="mt-1 w-full accent-brand-red"
    />
  </label>
);

const SelectField: React.FC<{
  label: string;
  value: string | number;
  options: Array<{ label: string; value: string | number }>;
  onChange: (v: string) => void;
}> = ({ label: fieldLabel, value, options, onChange }) => (
  <label className="block">
    <span className={label}>{fieldLabel}</span>
    <select value={value} onChange={(e) => onChange(e.target.value)} className={`${input} mt-1`}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  </label>
);

const Segmented: React.FC<{
  label: string;
  value: string;
  options: Array<{ label: string; value: string }>;
  onChange: (v: string) => void;
}> = ({ label: fieldLabel, value, options, onChange }) => (
  <div>
    <span className={label}>{fieldLabel}</span>
    <div className="mt-1 flex rounded-lg border border-border overflow-hidden">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={`flex-1 px-1.5 py-1.5 text-[10px] font-bold transition ${
            value === o.value ? "bg-brand-red text-white" : "bg-surface text-muted hover:text-ink"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  </div>
);

export const ThemePanel: React.FC<ThemePanelProps> = ({
  doc,
  themes,
  loading,
  activeTheme,
  tokens,
  onApplyTheme,
  onOverride,
  onResetOverrides,
  onCustomCss,
  onMode,
  onCreateTheme,
  onDuplicateTheme,
  onRenameTheme,
  onDeleteTheme,
  onSaveTheme,
}) => {
  const [busy, setBusy] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [draftName, setDraftName] = useState(activeTheme.name);
  const [cssDraft, setCssDraft] = useState(doc.theme.customCss || "");

  useEffect(() => {
    setDraftName(activeTheme.name);
    setRenaming(false);
  }, [activeTheme.id, activeTheme.name]);

  useEffect(() => {
    setCssDraft(doc.theme.customCss || "");
  }, [doc.theme.customCss]);

  const hasOverrides = Boolean(
    (doc.theme.overrides && Object.keys(doc.theme.overrides).length > 0) ||
      Object.values(doc.theme.modeOverrides || {}).some(
        (patch) => patch && Object.keys(patch).length > 0
      )
  );
  const baseResolved = resolveProjectTheme(doc.theme, themes);
  const modoAtivo = MODE_OPTIONS.find((m) => m.value === (doc.theme.mode || "light"))?.label || "Claro";
  const passRatio = contrastRatio(tokens.textMain, tokens.bgSurface);
  const brandRatio = contrastRatio(tokens.primary, tokens.bgSurface);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Não foi possível concluir a ação no tema.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Tema ativo */}
      <div className="rounded-xl border border-border bg-surface p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <LuPalette className="w-3.5 h-3.5 text-brand-red" aria-hidden="true" />
              <span className="text-xs font-bold text-ink truncate">{activeTheme.name}</span>
              <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-surface-3 text-muted border border-border">
                {activeTheme.builtin ? "Embutido" : "Personalizado"}
              </span>
            </div>
            <p className="text-[10px] text-muted mt-0.5">
              {hasOverrides ? "Com ajustes neste material" : "Sem ajustes locais"}
            </p>
          </div>
          <div className="flex gap-1 shrink-0">
            {tokens.primary && (
              <>
                <span className="w-4 h-4 rounded-full border border-black/10" style={{ background: tokens.primary }} title="Destaque" />
                <span className="w-4 h-4 rounded-full border border-black/10" style={{ background: tokens.accent }} title="Apoio" />
                <span className="w-4 h-4 rounded-full border border-black/10" style={{ background: tokens.bgPage }} title="Fundo" />
              </>
            )}
          </div>
        </div>

        <div className="mt-2 grid grid-cols-2 gap-1.5">
          <button className={btn} disabled={busy} onClick={() => run(() => onCreateTheme())}>
            <LuPlus className="w-3.5 h-3.5" /> Novo tema
          </button>
          <button className={btn} disabled={busy} onClick={() => run(() => onDuplicateTheme(activeTheme.id))}>
            <LuCopy className="w-3.5 h-3.5" /> Duplicar
          </button>
          {!activeTheme.builtin && (
            <button className={btn} disabled={busy} onClick={() => run(onSaveTheme)} title="Gravar os ajustes no tema da biblioteca">
              <LuSave className="w-3.5 h-3.5" /> Salvar no tema
            </button>
          )}
          <button className={btn} disabled={busy || !hasOverrides} onClick={onResetOverrides}>
            <LuRotateCcw className="w-3.5 h-3.5" /> Restaurar
          </button>
          {!activeTheme.builtin && (
            <>
              <button
                className={btn}
                disabled={busy}
                onClick={() => setRenaming((v) => !v)}
                title="Renomear tema"
              >
                <LuPencil className="w-3.5 h-3.5" /> Renomear
              </button>
              <button
                className={`${btn} hover:border-red-500 hover:text-red-500`}
                disabled={busy}
                onClick={() => {
                  if (window.confirm(`Excluir o tema "${activeTheme.name}"? Os projetos que o usam voltam ao Sesi.`)) {
                    run(() => onDeleteTheme(activeTheme.id));
                  }
                }}
              >
                <LuTrash2 className="w-3.5 h-3.5" /> Excluir
              </button>
            </>
          )}
        </div>

        {renaming && !activeTheme.builtin && (
          <div className="mt-2 flex gap-1.5">
            <input
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              aria-label="Nome do tema"
              className={input}
            />
            <button
              className={`${btn} shrink-0`}
              disabled={busy || !draftName.trim()}
              onClick={() => run(async () => { await onRenameTheme(activeTheme.id, draftName.trim()); setRenaming(false); })}
            >
              <LuCheck className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Biblioteca */}
      <div>
        <div className="flex items-center justify-between pb-1">
          <span className={label}>Biblioteca de temas</span>
          <span className="text-[10px] text-muted">{themes.length}</span>
        </div>
        {loading ? (
          <p className="text-[11px] text-muted py-2">Carregando temas…</p>
        ) : (
          <div className="grid grid-cols-2 gap-1.5">
            {themes.map((t) => {
              const selected = t.id === activeTheme.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onApplyTheme(t.id)}
                  aria-pressed={selected}
                  className={`text-left rounded-lg border p-2 transition ${
                    selected ? "border-brand-red ring-1 ring-brand-red/30 bg-brand-red/5" : "border-border bg-surface hover:border-brand-red/50"
                  }`}
                >
                  <span className="flex gap-1 mb-1">
                    {[t.tokens.primary, t.tokens.accent, t.tokens.bgPage, t.tokens.bgSurface].map((c, i) => (
                      <span key={i} className="w-3 h-3 rounded-full border border-black/10" style={{ background: c }} />
                    ))}
                  </span>
                  <span className="block text-[10px] font-bold text-ink truncate">{t.name}</span>
                  <span className="block text-[9px] text-muted truncate">{t.builtin ? "Embutido" : "Personalizado"}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Avisos de contraste */}
      {(passRatio < 4.5 || brandRatio < 3) && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-2 text-[10px] text-amber-700 dark:text-amber-400 flex gap-1.5">
          <LuTriangleAlert className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>
            {passRatio < 4.5 && <>Contraste do texto sobre o cartão em {passRatio.toFixed(1)}:1 (recomendado 4,5:1). </>}
            {brandRatio < 3 && <>Destaque sobre o cartão em {brandRatio.toFixed(1)}:1 (mínimo 3:1).</>}
          </span>
        </div>
      )}

      <Section title="Modo de exibição">
        <span className={label}>Tema publicado abre em</span>
        <div className="grid grid-cols-3 gap-1.5" role="group" aria-label="Tema publicado abre em">
          {MODE_OPTIONS.map((m) => {
            const preview = tokensForMode(
              baseResolved.tokens,
              activeTheme.dark,
              m.value,
              doc.theme.modeOverrides
            );
            const selected = (doc.theme.mode || "light") === m.value;
            return (
              <button
                key={m.value}
                type="button"
                aria-pressed={selected}
                onClick={() => onMode(m.value)}
                className={`rounded-lg border p-1 transition text-left ${
                  selected
                    ? "border-brand-red ring-1 ring-brand-red/30"
                    : "border-border hover:border-brand-red/50"
                }`}
                title={`Prévia do modo ${m.label.toLowerCase()}`}
              >
                <span
                  className="block rounded border px-1.5 py-1"
                  style={{
                    background: preview.bgSurface,
                    color: preview.textMain,
                    borderColor: preview.border,
                  }}
                >
                  <span className="block text-[11px] font-black leading-none" style={{ color: preview.primary }}>
                    Aa
                  </span>
                  <span className="block text-[8px] mt-1 truncate" style={{ color: preview.textMuted }}>
                    {m.label}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        <p className="text-[10px] text-muted">
          A prévia do editor e o material publicado abrem neste modo. No build, o botão
          “Tema” alterna claro → escuro → alto contraste.
        </p>
      </Section>

      <Section title="Cores">
        <p className="text-[10px] text-muted">
          Editando a paleta <strong>{modoAtivo.toLowerCase()}</strong>. Cada modo guarda os
          próprios ajustes de cor.
        </p>
        <ColorField label="Cor de destaque" value={tokens.primary} onChange={(v) => onOverride({ primary: v })} />
        <ColorField label="Cor de apoio" value={tokens.accent} onChange={(v) => onOverride({ accent: v })} />
        <ColorField label="Fundo da página" value={tokens.bgPage} onChange={(v) => onOverride({ bgPage: v })} />
        <ColorField label="Fundo do cartão" value={tokens.bgSurface} onChange={(v) => onOverride({ bgSurface: v })} />
        <ColorField label="Texto" value={tokens.textMain} onChange={(v) => onOverride({ textMain: v })} />
        <details className="pt-1">
          <summary className="cursor-pointer text-[10px] font-bold text-brand-red">Mais cores</summary>
          <div className="mt-2 space-y-2.5">
            <ColorField label="Texto suave" value={tokens.textMuted} onChange={(v) => onOverride({ textMuted: v })} />
            <ColorField label="Bordas" value={tokens.border} onChange={(v) => onOverride({ border: v })} />
            <ColorField label="Links" value={tokens.link} onChange={(v) => onOverride({ link: v })} />
            <ColorField label="Marca-texto" value={tokens.highlight} onChange={(v) => onOverride({ highlight: v })} />
            <ColorField label="Barra superior/fundo menu" value={tokens.bgSidebar} onChange={(v) => onOverride({ bgSidebar: v })} />
          </div>
        </details>
      </Section>

      <Section title="Leitura e tipografia">
        <SelectField
          label="Fonte do corpo"
          value={tokens.fontBody}
          options={FONT_OPTIONS}
          onChange={(v) => onOverride({ fontBody: v })}
        />
        <SelectField
          label="Fonte dos títulos"
          value={tokens.fontHeading}
          options={FONT_OPTIONS}
          onChange={(v) => onOverride({ fontHeading: v })}
        />
        <RangeField label="Tamanho do texto" value={tokens.baseSize} min={13} max={22} suffix="px" onChange={(v) => onOverride({ baseSize: v })} />
        <RangeField label="Entrelinha" value={tokens.lineHeight} min={1.2} max={2.2} step={0.05} onChange={(v) => onOverride({ lineHeight: v })} />
        <RangeField label="Espaço entre parágrafos" value={tokens.paragraphSpacing} min={0} max={36} suffix="px" onChange={(v) => onOverride({ paragraphSpacing: v })} />
        <RangeField label="Espaço entre blocos" value={tokens.blockSpacing} min={8} max={64} suffix="px" onChange={(v) => onOverride({ blockSpacing: v })} />
        <RangeField label="Escala dos títulos" value={tokens.headingScale} min={0.8} max={1.5} step={0.05} onChange={(v) => onOverride({ headingScale: v })} />
        <RangeField label="Largura da coluna" value={tokens.readingWidth} min={560} max={1200} step={20} suffix="px" onChange={(v) => onOverride({ readingWidth: v })} />
        <Segmented
          label="Alinhamento do texto"
          value={tokens.textAlign}
          options={[
            { label: "Esquerda", value: "left" },
            { label: "Justificado", value: "justify" },
          ]}
          onChange={(v) => onOverride({ textAlign: v as ThemeTokens["textAlign"] })}
        />
      </Section>

      <Section title="Títulos" defaultOpen={false}>
        <SelectField
          label="Peso dos títulos"
          value={tokens.headingWeight}
          options={[500, 600, 700, 800, 900].map((w) => ({ label: String(w), value: w }))}
          onChange={(v) => onOverride({ headingWeight: Number(v) })}
        />
        <Segmented
          label="Caixa"
          value={tokens.headingTransform}
          options={[
            { label: "Normal", value: "none" },
            { label: "MAIÚSCULA", value: "uppercase" },
          ]}
          onChange={(v) => onOverride({ headingTransform: v as ThemeTokens["headingTransform"] })}
        />
        <Segmented
          label="Marca do H2"
          value={tokens.headingAccent}
          options={[
            { label: "Barra", value: "bar" },
            { label: "Sublinhado", value: "underline" },
            { label: "Nenhuma", value: "plain" },
          ]}
          onChange={(v) => onOverride({ headingAccent: v as ThemeTokens["headingAccent"] })}
        />
      </Section>

      <Section title="Estilo visual" defaultOpen={false}>
        <SelectField
          label="Personalidade"
          value={tokens.visualStyle}
          options={VISUAL_STYLE_OPTIONS}
          onChange={(v) => onOverride({ visualStyle: v as ThemeTokens["visualStyle"] })}
        />
        <RangeField label="Cantos arredondados" value={tokens.radius} min={0} max={32} suffix="px" onChange={(v) => onOverride({ radius: v })} />
        <RangeField label="Espessura da borda" value={tokens.borderWidth} min={0} max={4} suffix="px" onChange={(v) => onOverride({ borderWidth: v })} />
        <SelectField
          label="Sombra"
          value={tokens.shadow}
          options={[
            { label: "Nenhuma", value: "none" },
            { label: "Suave", value: "soft" },
            { label: "Média", value: "medium" },
            { label: "Forte", value: "strong" },
          ]}
          onChange={(v) => onOverride({ shadow: v as ThemeTokens["shadow"] })}
        />
        <SelectField
          label="Densidade"
          value={tokens.density}
          options={[
            { label: "Compacta", value: "compact" },
            { label: "Confortável", value: "comfortable" },
            { label: "Espaçosa", value: "spacious" },
          ]}
          onChange={(v) => onOverride({ density: v as ThemeTokens["density"] })}
        />
        <SelectField
          label="Separador entre blocos"
          value={tokens.divider}
          options={[
            { label: "Só espaço", value: "space" },
            { label: "Linha", value: "line" },
            { label: "Faixa", value: "band" },
            { label: "Nenhum", value: "none" },
          ]}
          onChange={(v) => onOverride({ divider: v as ThemeTokens["divider"] })}
        />
        <SelectField
          label="Estilo das caixas"
          value={tokens.boxStyle}
          options={[
            { label: "Faixa lateral", value: "side" },
            { label: "Fundo cheio", value: "full" },
            { label: "Borda tracejada", value: "dashed" },
            { label: "Só ícone", value: "icon" },
          ]}
          onChange={(v) => onOverride({ boxStyle: v as ThemeTokens["boxStyle"] })}
        />
        <SelectField
          label="Botões"
          value={tokens.buttonStyle}
          options={[
            { label: "Pílula", value: "pill" },
            { label: "Quadrado", value: "square" },
            { label: "Contorno", value: "outline" },
          ]}
          onChange={(v) => onOverride({ buttonStyle: v as ThemeTokens["buttonStyle"] })}
        />
        <SelectField
          label="Moldura das imagens"
          value={tokens.imageFrame}
          options={[
            { label: "Sombra", value: "shadow" },
            { label: "Borda", value: "border" },
            { label: "Polaroid", value: "polaroid" },
            { label: "Nenhuma", value: "none" },
          ]}
          onChange={(v) => onOverride({ imageFrame: v as ThemeTokens["imageFrame"] })}
        />
      </Section>

      <Section title="Fundo da página" defaultOpen={false}>
        <Segmented
          label="Tipo"
          value={tokens.bgKind}
          options={[
            { label: "Sólido", value: "solid" },
            { label: "Gradiente", value: "gradient" },
            { label: "Padrão", value: "pattern" },
          ]}
          onChange={(v) => onOverride({ bgKind: v as ThemeTokens["bgKind"] })}
        />
        {tokens.bgKind === "gradient" && (
          <label className="block">
            <span className={label}>Gradiente (CSS)</span>
            <input
              value={tokens.bgGradient}
              onChange={(e) => onOverride({ bgGradient: e.target.value })}
              className={`${input} mt-1 font-mono`}
              placeholder="linear-gradient(180deg, #fff, #eee)"
            />
          </label>
        )}
        {tokens.bgKind === "pattern" && (
          <SelectField
            label="Padrão"
            value={tokens.bgPattern}
            options={[
              { label: "Grade", value: "grid" },
              { label: "Pontos", value: "dots" },
              { label: "Diagonal", value: "diagonal" },
              { label: "Nenhum", value: "none" },
            ]}
            onChange={(v) => onOverride({ bgPattern: v as ThemeTokens["bgPattern"] })}
          />
        )}
      </Section>

      <Section title="CSS do projeto" defaultOpen={false}>
        <p className="text-[10px] text-muted">
          Aplicado depois do tema no material publicado. Selecione um bloco para escopar com <code>#block-id</code>.
        </p>
        <textarea
          value={cssDraft}
          onChange={(e) => setCssDraft(e.target.value)}
          rows={7}
          spellCheck={false}
          aria-label="CSS personalizado do projeto"
          className={`${input} font-mono resize-y`}
          placeholder={".block-heading-1 { letter-spacing: -0.02em; }"}
        />
        <div className="flex gap-1.5">
          <button className={`${btn} flex-1`} onClick={() => onCustomCss(cssDraft)}>
            <LuCheck className="w-3.5 h-3.5" /> Aplicar CSS
          </button>
          <button
            className={`${btn} shrink-0`}
            onClick={() => {
              setCssDraft("");
              onCustomCss("");
            }}
          >
            Limpar
          </button>
        </div>
      </Section>

      <p className="text-[10px] text-muted pb-2">
        Alterações são salvas automaticamente e podem ser desfeitas em <strong>Versões</strong>.
      </p>
    </div>
  );
};

/** Prévia compacta usada no inspetor (não usada hoje, mantida para reuso). */
export function themePreviewStyle(tokens: ThemeTokens): React.CSSProperties {
  return {
    background: tokens.bgSurface,
    color: tokens.textMain,
    borderColor: tokens.border,
    fontFamily: tokens.fontBody,
  };
}

export { resolveProjectTheme };
