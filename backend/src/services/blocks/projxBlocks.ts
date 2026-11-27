/**
 * Blocos no padrão ProjetoX (SENAI).
 *
 * Cada bloco é renderizado como HTML estático + CSS e ganha comportamento
 * no script final do build (vanilla JS, sem dependências). O editor usa
 * componentes React equivalentes para a pré-visualização.
 */
import type { Block } from "../converterService.js";
import { svgIcon } from "./icons.js";

/* ------------------------------------------------------------------ */
/* Utilidades                                                          */
/* ------------------------------------------------------------------ */

const esc = (s: unknown): string =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/** URL para uso dentro de CSS (background-image). */
const cssUrl = (u: string): string => `url("${String(u).replace(/["\\\n\r]/g, "")}")`;

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** PRNG determinístico (mesmo build = mesma grade). */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(arr: T[], rnd: () => number): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const normalizeWord = (s: string): string =>
  String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

/** Divide um texto em partes: "A ___ B ___" → [texto, lacuna, texto, ...] */
function splitBlanks(text: string): Array<{ type: "text" | "blank"; value: string }> {
  const parts = String(text || "").split(/_{2,}/g);
  const out: Array<{ type: "text" | "blank"; value: string }> = [];
  parts.forEach((p, i) => {
    out.push({ type: "text", value: p });
    if (i < parts.length - 1) out.push({ type: "blank", value: "" });
  });
  return out;
}

/* ------------------------------------------------------------------ */
/* Geradores (executam no build, resultado é estático)                 */
/* ------------------------------------------------------------------ */

const DIRECTIONS: Array<[number, number]> = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
  [0, -1],
  [-1, 0],
  [-1, -1],
  [-1, 1],
];

function buildWordSearch(words: string[], sizeInput?: number) {
  const cleaned = words.map(normalizeWord).filter((w) => w.length > 1).slice(0, 20);
  const longest = cleaned.reduce((m, w) => Math.max(m, w.length), 8);
  const size = clamp(sizeInput || Math.max(longest + 2, 12), longest, 22);
  const rnd = mulberry32(hashSeed(cleaned.join("|")));
  const grid: string[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => "")
  );
  const placed: Array<{ word: string; cells: Array<[number, number]> }> = [];

  for (const word of cleaned) {
    let done = false;
    for (let attempt = 0; attempt < 240 && !done; attempt++) {
      const [dr, dc] = DIRECTIONS[Math.floor(rnd() * DIRECTIONS.length)];
      const row = Math.floor(rnd() * size);
      const col = Math.floor(rnd() * size);
      const endR = row + dr * (word.length - 1);
      const endC = col + dc * (word.length - 1);
      if (endR < 0 || endR >= size || endC < 0 || endC >= size) continue;
      const cells: Array<[number, number]> = [];
      let ok = true;
      for (let i = 0; i < word.length; i++) {
        const r = row + dr * i;
        const c = col + dc * i;
        if (grid[r][c] && grid[r][c] !== word[i]) {
          ok = false;
          break;
        }
        cells.push([r, c]);
      }
      if (!ok) continue;
      cells.forEach(([r, c], i) => (grid[r][c] = word[i]));
      placed.push({ word, cells });
      done = true;
    }
  }

  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++)
      if (!grid[r][c]) grid[r][c] = alphabet[Math.floor(rnd() * alphabet.length)];

  return { size, grid, words: placed.map((p) => p.word) };
}

interface CrossEntry {
  answer: string;
  clue: string;
  word: string;
  row: number;
  col: number;
  dir: "across" | "down";
}

function buildCrossword(entries: Array<{ answer: string; clue: string }>) {
  const cells = new Map<string, string>();
  const key = (r: number, c: number) => `${r},${c}`;
  const get = (r: number, c: number) => cells.get(key(r, c));
  const placed: CrossEntry[] = [];

  const canPlace = (word: string, row: number, col: number, dir: "across" | "down"): number => {
    const dr = dir === "down" ? 1 : 0;
    const dc = dir === "across" ? 1 : 0;
    if (get(row - dr, col - dc)) return -1;
    if (get(row + dr * word.length, col + dc * word.length)) return -1;
    let crossings = 0;
    for (let i = 0; i < word.length; i++) {
      const r = row + dr * i;
      const c = col + dc * i;
      const cur = get(r, c);
      if (cur) {
        if (cur !== word[i]) return -1;
        crossings++;
      } else if (dir === "across") {
        if (get(r - 1, c) || get(r + 1, c)) return -1;
      } else if (get(r, c - 1) || get(r, c + 1)) return -1;
    }
    return crossings;
  };

  const put = (word: string, row: number, col: number, dir: "across" | "down") => {
    for (let i = 0; i < word.length; i++) {
      const r = row + (dir === "down" ? i : 0);
      const c = col + (dir === "across" ? i : 0);
      cells.set(key(r, c), word[i]);
    }
  };

  const list = entries
    .map((e) => ({ answer: e.answer, clue: e.clue, word: normalizeWord(e.answer) }))
    .filter((e) => e.word.length > 1)
    .sort((a, b) => b.word.length - a.word.length);

  for (const entry of list) {
    if (placed.length === 0) {
      put(entry.word, 0, 0, "across");
      placed.push({ ...entry, row: 0, col: 0, dir: "across" });
      continue;
    }
    let best: { row: number; col: number; dir: "across" | "down"; score: number } | null = null;
    for (const p of placed) {
      for (let i = 0; i < entry.word.length; i++) {
        for (let j = 0; j < p.word.length; j++) {
          if (entry.word[i] !== p.word[j]) continue;
          const dir: "across" | "down" = p.dir === "across" ? "down" : "across";
          const row = p.dir === "across" ? p.row - i : p.row + j;
          const col = p.dir === "across" ? p.col + j : p.col - i;
          const score = canPlace(entry.word, row, col, dir);
          if (score > 0 && (!best || score > best.score)) best = { row, col, dir, score };
        }
      }
    }
    if (best) {
      put(entry.word, best.row, best.col, best.dir);
      placed.push({ ...entry, row: best.row, col: best.col, dir: best.dir });
    } else {
      const maxRow = [...cells.keys()].reduce((m, k) => Math.max(m, parseInt(k.split(",")[0], 10)), 0);
      const row = maxRow + 2;
      put(entry.word, row, 0, "across");
      placed.push({ ...entry, row, col: 0, dir: "across" });
    }
  }

  if (!placed.length) return null;

  const rows = [...cells.keys()].map((k) => parseInt(k.split(",")[0], 10));
  const cols = [...cells.keys()].map((k) => parseInt(k.split(",")[1], 10));
  const minRow = Math.min(...rows);
  const minCol = Math.min(...cols);
  const maxRow = Math.max(...rows);
  const maxCol = Math.max(...cols);

  // Normaliza para começar em 0,0 e numera as entradas.
  const norm = placed.map((p) => ({ ...p, row: p.row - minRow, col: p.col - minCol }));
  const starts = new Map<string, number>();
  const sorted = [...norm].sort((a, b) => a.row - b.row || a.col - b.col);
  let num = 0;
  for (const p of sorted) {
    const k = key(p.row, p.col);
    if (!starts.has(k)) starts.set(k, ++num);
  }

  return {
    rows: maxRow - minRow + 1,
    cols: maxCol - minCol + 1,
    cells: new Map(
      [...cells.entries()].map(([k, v]) => {
        const [r, c] = k.split(",").map(Number);
        return [key(r - minRow, c - minCol), v];
      })
    ),
    entries: norm.map((p) => ({ ...p, number: starts.get(key(p.row, p.col)) || 0 })),
  };
}

/* ------------------------------------------------------------------ */
/* Renderização de conteúdo                                            */
/* ------------------------------------------------------------------ */

function renderFlipcard(block: Extract<Block, { type: "flipcard" }>): string {
  const d = block.data;
  return `
  <div class="px-flipcard" data-px-flip tabindex="0" role="button" aria-label="${esc(
    d.title || "Cartão interativo"
  )}: clique para virar">
    <div class="px-flip-inner">
      <div class="px-flip-face px-flip-front">
        ${d.image ? `<img class="px-flip-img" src="${esc(d.image)}" alt="" loading="lazy"/>` : ""}
        ${d.title ? `<h3 class="px-flip-title">${esc(d.title)}</h3>` : ""}
        <div class="px-flip-text">${d.frontHtml || ""}</div>
        <span class="px-flip-hint">${esc(d.hint || "Clique para virar")} ${svgIcon("refresh")}</span>
      </div>
      <div class="px-flip-face px-flip-back">
        <div class="px-flip-text">${d.backHtml || ""}</div>
        <span class="px-flip-hint">${svgIcon("undo")} Voltar</span>
      </div>
    </div>
  </div>`;
}

function renderTimeline(block: Extract<Block, { type: "timeline" }>): string {
  const d = block.data;
  return `
  <section class="px-timeline">
    ${d.title ? `<h3 class="px-section-title">${esc(d.title)}</h3>` : ""}
    <ol class="px-timeline-list">
      ${(d.items || [])
        .map(
          (item) => `
        <li class="px-timeline-item">
          <span class="px-timeline-dot" aria-hidden="true">${esc(item.icon || "•")}</span>
          <div class="px-timeline-body">
            <h4>${esc(item.title)}</h4>
            <div class="px-rich">${item.contentHtml || ""}</div>
          </div>
        </li>`
        )
        .join("")}
    </ol>
  </section>`;
}

function renderTable(block: Extract<Block, { type: "table" }>, base = ""): string {
  const d = block.data;
  const headers = d.headers || [];
  const rows = d.rows || [];
  if (!headers.length) return "";
  return `
  <figure class="px-table-wrap">
    <table class="px-table${d.striped ? " is-striped" : ""}">
      ${d.caption ? `<caption>${esc(d.caption)}</caption>` : ""}
      <thead>
        <tr>${headers.map((h) => `<th scope="col">${h}</th>`).join("")}</tr>
      </thead>
      <tbody>
        ${rows
          .map(
            (row) =>
              `<tr>${headers
                .map((h, i) =>
                  i === 0 && d.rowHeaders
                    ? `<th scope="row" data-label="${esc(stripTags(h))}">${row[i] || ""}</th>`
                    : `<td data-label="${esc(stripTags(h))}">${row[i] || ""}</td>`,
                )
                .join("")}</tr>`,
          )
          .join("")}
      </tbody>
    </table>
    ${d.textAlternative ? `<a class="table-text-link" href="${base}content/tabela_${esc(block.id)}.html">Versão textual da tabela</a>` : ""}
  </figure>`;
}

const stripTags = (s: string) => String(s || "").replace(/<[^>]*>/g, "");

function renderCover(block: Extract<Block, { type: "cover" }>): string {
  const d = block.data;
  const align = d.align === "center" ? "is-center" : "is-left";
  return `
  <section class="px-cover ${align}${d.image ? " has-image" : ""}"${d.image ? ` style="background-image:${cssUrl(d.image)}"` : ""}>
    <div class="px-cover-content">
      <h2>${esc(d.title)}</h2>
      ${d.subtitle ? `<p>${esc(d.subtitle)}</p>` : ""}
      ${d.ctaLabel && d.ctaHref ? `<a class="px-cover-cta" href="${esc(d.ctaHref)}">${esc(d.ctaLabel)}</a>` : ""}
    </div>
  </section>`;
}

function renderParallax(block: Extract<Block, { type: "parallax" }>): string {
  const d = block.data;
  const height = clamp(d.height || 280, 160, 640);
  return `
  <section class="px-parallax" style="background-image:${cssUrl(d.image)};min-height:${height}px">
    <div class="px-parallax-overlay">
      ${d.title ? `<h2>${esc(d.title)}</h2>` : ""}
      ${d.subtitle ? `<p>${esc(d.subtitle)}</p>` : ""}
    </div>
  </section>`;
}

function renderGallery(block: Extract<Block, { type: "gallery" }>): string {
  const d = block.data;
  const items = d.items || [];
  if (!items.length) return "";
  return `
  <div class="px-gallery" data-px-gallery${d.autoplay ? ' data-autoplay="true"' : ""} tabindex="0" role="region" aria-label="Galeria de imagens">
    <div class="px-gallery-viewport">
      <div class="px-gallery-track">
        ${items
          .map(
            (it) => `
          <figure class="px-gallery-slide">
            <img src="${esc(it.src)}" alt="${esc(it.caption || "")}" loading="lazy"/>
            ${it.caption ? `<figcaption>${esc(it.caption)}</figcaption>` : ""}
          </figure>`
          )
          .join("")}
      </div>
    </div>
    <button type="button" class="px-gallery-nav px-gallery-prev" aria-label="Imagem anterior">‹</button>
    <button type="button" class="px-gallery-nav px-gallery-next" aria-label="Próxima imagem">›</button>
    <div class="px-gallery-dots" role="tablist" aria-label="Selecionar imagem">
      ${items
        .map(
          (_, i) =>
            `<button type="button" class="px-gallery-dot${
              i === 0 ? " active" : ""
            }" data-index="${i}" aria-label="Imagem ${i + 1}"></button>`
        )
        .join("")}
    </div>
  </div>`;
}

function renderImageTextCard(block: Extract<Block, { type: "image-text-card" }>): string {
  const d = block.data;
  const reverse = d.layout === "right" ? " is-reverse" : "";
  return `
  <section class="px-itcard${reverse}">
    <div class="px-itcard-media">
      <img src="${esc(d.image)}" alt="${esc(d.title)}" loading="lazy"/>
    </div>
    <div class="px-itcard-body">
      <h3>${esc(d.title)}</h3>
      <div class="px-rich">${d.html || ""}</div>
    </div>
  </section>`;
}

function renderHighlight(block: Extract<Block, { type: "highlight" }>): string {
  const d = block.data;
  const html = String(d.html || "").replace(/==([^=]+)==/g, "<mark>$1</mark>");
  return `
  <div class="px-highlight">
    ${d.title ? `<h3>${esc(d.title)}</h3>` : ""}
    <div class="px-highlight-text px-rich">${html}</div>
    ${d.legend ? `<p class="px-highlight-legend">${esc(d.legend)}</p>` : ""}
  </div>`;
}

function renderCode(block: Extract<Block, { type: "code" }>): string {
  const d = block.data;
  return `
  <figure class="px-code">
    <figcaption>
      <span class="px-code-dots" aria-hidden="true"><i></i><i></i><i></i></span>
      <span class="px-code-name">${esc(d.filename || d.language || "código")}</span>
      ${d.language ? `<span class="px-code-lang">${esc(d.language)}</span>` : ""}
    </figcaption>
    <pre><code>${esc(d.code)}</code></pre>
  </figure>`;
}

/* ---------------------------- Exercícios --------------------------- */

function exShell(kind: string, question: string | undefined, body: string, extra = ""): string {
  return `
  <div class="px-ex" data-px-ex="${kind}"${extra}>
    ${question ? `<p class="px-ex-q">${question}</p>` : ""}
    ${body}
    <div class="px-ex-bar">
      <button type="button" class="px-btn px-check">Verificar resposta</button>
      <span class="px-tries"></span>
    </div>
    <p class="px-ex-feedback" role="status" aria-live="polite"></p>
  </div>`;
}

function renderChoice(block: Extract<Block, { type: "multiple-choice" }>): string {
  const d = block.data;
  const options = d.options || [];
  const correct = new Set(d.correctIds || []);
  const body = `
    <div class="px-opts" role="group" aria-label="Alternativas">
      ${options
        .map(
          (o, i) => `
        <button type="button" class="px-opt" data-id="${esc(o.id)}" data-correct="${
            correct.has(o.id) ? "true" : "false"
          }" aria-pressed="false">
          <span class="px-opt-mark" aria-hidden="true">${String.fromCharCode(65 + i)}</span>
          <span class="px-opt-text">${o.text}</span>
        </button>`
        )
        .join("")}
    </div>
    ${d.explanation ? `<p class="px-ex-note">${esc(d.explanation)}</p>` : ""}`;
  return exShell(
    "choice",
    d.question,
    body,
    ` data-multi="${correct.size > 1 ? "true" : "false"}" data-attempts="${clamp(d.attempts || 2, 1, 9)}"`
  );
}

function renderTrueFalse(block: Extract<Block, { type: "true-false" }>): string {
  const d = block.data;
  const body = `
    <ol class="px-tf-list">
      ${(d.statements || [])
        .map(
          (s) => `
        <li class="px-tf-item" data-answer="${s.answer ? "true" : "false"}">
          <span class="px-tf-text">${s.text}</span>
          <span class="px-tf-btns">
            <button type="button" class="px-tf-btn" data-v="true" aria-pressed="false">V</button>
            <button type="button" class="px-tf-btn" data-v="false" aria-pressed="false">F</button>
          </span>
          <span class="px-tf-mark" aria-hidden="true"></span>
        </li>`
        )
        .join("")}
    </ol>
    ${d.explanation ? `<p class="px-ex-note">${esc(d.explanation)}</p>` : ""}`;
  return exShell("tf", d.question, body, ` data-attempts="${clamp(d.attempts || 2, 1, 9)}"`);
}

function renderFillBlanks(block: Extract<Block, { type: "fill-blanks" }>): string {
  const d = block.data;
  const bank: string[] = [];
  const sentencesHtml = (d.sentences || [])
    .map((s) => {
      const parts = splitBlanks(s.text);
      let blankIdx = 0;
      const inner = parts
        .map((part) => {
          if (part.type === "text") return esc(part.value);
          const answer = s.answers?.[blankIdx] || "";
          blankIdx++;
          return `<input class="px-blank" type="text" autocomplete="off" spellcheck="false" aria-label="Lacuna ${
            blankIdx
          }" data-answer="${esc(answer)}" size="${clamp(answer.length + 2, 6, 22)}"/>`;
        })
        .join("");
      (s.answers || []).forEach((a) => a && bank.push(a));
      return `<li class="px-sentence">${inner}</li>`;
    })
    .join("");
  const chips = shuffle(bank, mulberry32(hashSeed(bank.join("|"))));
  const bankHtml = chips.length
    ? `<div class="px-wordbank" aria-label="Banco de palavras">
        ${chips
          .map(
            (w, i) =>
              `<button type="button" class="px-chip" data-index="${i}">${esc(w)}</button>`
          )
          .join("")}
      </div>`
    : "";
  return exShell(
    "blanks",
    d.question,
    `<ol class="px-sentences">${sentencesHtml}</ol>${bankHtml}`,
    ` data-attempts="${clamp(d.attempts || 2, 1, 9)}"`
  );
}

function renderOrdering(block: Extract<Block, { type: "ordering" }>): string {
  const d = block.data;
  const items = d.items || [];
  let shuffled = shuffle(items, mulberry32(hashSeed(items.map((i) => i.text).join("|"))));
  // Nunca entregar a ordem já correta: o exercício perderia o sentido.
  if (shuffled.length > 1 && shuffled.every((it, i) => it.id === items[i].id)) {
    shuffled = [...shuffled.slice(1), shuffled[0]];
  }
  return exShell(
    "ordering",
    d.question,
    `<ol class="px-order-list">
      ${shuffled
        .map(
          (it) => `
      <li class="px-order-item" draggable="true" data-pos="${items.findIndex((x) => x.id === it.id)}">
        <span class="px-order-handle" aria-hidden="true">⠿</span>
        <span class="px-order-text">${esc(it.text)}</span>
        <span class="px-order-ctrl">
          <button type="button" class="px-order-btn" data-dir="-1" aria-label="Mover para cima">↑</button>
          <button type="button" class="px-order-btn" data-dir="1" aria-label="Mover para baixo">↓</button>
        </span>
      </li>`
        )
        .join("")}
    </ol>`,
    ` data-attempts="${clamp(d.attempts || 2, 1, 9)}"`
  );
}

function renderMatching(block: Extract<Block, { type: "matching" }>): string {
  const d = block.data;
  const pairs = d.pairs || [];
  const rights = shuffle(pairs, mulberry32(hashSeed(pairs.map((p) => p.right).join("|"))));
  return exShell(
    "matching",
    d.question,
    `<ul class="px-match-list">
      ${pairs
        .map(
          (p) => `
      <li class="px-match-item" data-pair="${esc(p.id)}">
        <span class="px-match-left">${esc(p.left)}</span>
        <select class="px-match-select" aria-label="Associação para ${esc(p.left)}">
          <option value="">Selecione…</option>
          ${rights
            .map((r) => `<option value="${esc(r.id)}">${esc(r.right)}</option>`)
            .join("")}
        </select>
        <span class="px-match-mark" aria-hidden="true"></span>
      </li>`
        )
        .join("")}
    </ul>`,
    ` data-attempts="${clamp(d.attempts || 2, 1, 9)}"`
  );
}

function renderMemory(block: Extract<Block, { type: "memory-game" }>): string {
  const d = block.data;
  const pairs = d.pairs || [];
  const cards = shuffle(
    pairs.flatMap((p) => [
      { pair: p.id, face: "a", text: p.a },
      { pair: p.id, face: "b", text: p.b },
    ]),
    mulberry32(hashSeed(pairs.map((p) => p.id + p.a + p.b).join("|")))
  );
  const cols = clamp(d.columns || 4, 2, 6);
  return `
  <div class="px-ex px-memory" data-px-ex="memory" data-total="${pairs.length}">
    ${d.title ? `<p class="px-ex-q">${esc(d.title)}</p>` : ""}
    <div class="px-memory-grid" style="--px-memo-cols:${cols}">
      ${cards
        .map(
          (c) => `
      <button type="button" class="px-memo-card" data-pair="${esc(c.pair)}" data-face="${c.face}" aria-label="Carta virada">
        <span class="px-memo-inner">
          <span class="px-memo-front" aria-hidden="true">?</span>
          <span class="px-memo-back">${esc(c.text)}</span>
        </span>
      </button>`
        )
        .join("")}
    </div>
    <div class="px-ex-bar">
      <button type="button" class="px-btn px-reset">Embaralhar de novo</button>
      <span class="px-tries">Tentativas: 0</span>
    </div>
    <p class="px-ex-feedback" role="status" aria-live="polite"></p>
  </div>`;
}

function renderWordSearch(block: Extract<Block, { type: "word-search" }>): string {
  const d = block.data;
  const words = (d.words || []).filter(Boolean);
  if (!words.length) return "";
  const { size, grid, words: placedWords } = buildWordSearch(words, d.size);
  return `
  <div class="px-ex px-wordsearch" data-px-ex="wordsearch">
    ${d.title ? `<p class="px-ex-q">${esc(d.title)}</p>` : ""}
    <div class="px-ws-layout">
      <div class="px-ws-grid-wrap">
        <table class="px-ws-grid" data-size="${size}" role="grid" aria-label="Caça-palavras">
          <tbody>
            ${grid
              .map(
                (row, r) =>
                  `<tr>${row
                    .map(
                      (ch, c) =>
                        `<td class="px-ws-cell" data-r="${r}" data-c="${c}">${ch}</td>`
                    )
                    .join("")}</tr>`
              )
              .join("")}
          </tbody>
        </table>
      </div>
      <ul class="px-ws-words">
        ${placedWords
          .map((w) => `<li data-word="${esc(w)}">${esc(w)}</li>`)
          .join("")}
      </ul>
    </div>
    <p class="px-ex-note">Clique na primeira e na última letra da palavra.</p>
    <p class="px-ex-feedback" role="status" aria-live="polite"></p>
  </div>`;
}

function renderCrossword(block: Extract<Block, { type: "crossword" }>): string {
  const d = block.data;
  const entries = (d.entries || []).filter((e) => e.answer && e.clue);
  if (!entries.length) return "";
  const puzzle = buildCrossword(entries);
  if (!puzzle) return "";
  const cellKey = (r: number, c: number) => `${r},${c}`;
  const starts = new Map<string, number>();
  puzzle.entries.forEach((e) => starts.set(cellKey(e.row, e.col), e.number));

  const across = puzzle.entries.filter((e) => e.dir === "across").sort((a, b) => a.number - b.number);
  const down = puzzle.entries.filter((e) => e.dir === "down").sort((a, b) => a.number - b.number);

  const cellsHtml = Array.from({ length: puzzle.rows }, (_, r) =>
    `<tr>${Array.from({ length: puzzle.cols }, (_, c) => {
      const letter = puzzle.cells.get(cellKey(r, c));
      if (!letter) return `<td class="px-cw-block"></td>`;
      const num = starts.get(cellKey(r, c));
      return `<td class="px-cw-cell">${
        num ? `<span class="px-cw-num">${num}</span>` : ""
      }<input class="px-cw-input" maxlength="1" inputmode="text" autocomplete="off" aria-label="Letra" data-answer="${esc(
        letter
      )}"/></td>`;
    }).join("")}</tr>`
  ).join("");

  const clueList = (title: string, list: typeof puzzle.entries) =>
    list.length
      ? `<div class="px-cw-clues"><h4>${title}</h4><ol>${list
          .map((e) => `<li><strong>${e.number}.</strong> ${esc(e.clue)}</li>`)
          .join("")}</ol></div>`
      : "";

  return `
  <div class="px-ex px-crossword" data-px-ex="crossword">
    ${d.title ? `<p class="px-ex-q">${esc(d.title)}</p>` : ""}
    <div class="px-cw-layout">
      <div class="px-cw-grid-wrap">
        <table class="px-cw-grid" aria-label="Palavras cruzadas"><tbody>${cellsHtml}</tbody></table>
      </div>
      <div class="px-cw-side">
        ${clueList("Horizontais", across)}
        ${clueList("Verticais", down)}
      </div>
    </div>
    <div class="px-ex-bar">
      <button type="button" class="px-btn px-check">Conferir</button>
      <span class="px-tries"></span>
    </div>
    <p class="px-ex-feedback" role="status" aria-live="polite"></p>
  </div>`;
}

function renderPuzzle(block: Extract<Block, { type: "puzzle" }>): string {
  const d = block.data;
  const size = d.size || 4;
  return `
  <div class="px-ex px-puzzle" data-px-ex="puzzle" data-size="${size}" data-image="${esc(d.image || "")}">
    ${d.title ? `<p class="px-ex-q">${esc(d.title)}</p>` : ""}
    <div class="px-pz-wrap">
      ${d.image ? `<img class="px-pz-preview" src="${esc(d.image)}" alt="${esc(d.title || "Imagem")}" />` : ""}
      <canvas class="px-pz-canvas"></canvas>
    </div>
    <p class="px-pz-error" role="status" hidden>Não foi possível carregar a imagem do quebra-cabeça. Verifique se o link aponta para uma imagem acessível.</p>
    <div class="px-ex-bar">
      <button type="button" class="px-btn px-pz-shuffle">Embaralhar</button>
      <span class="px-tries px-pz-progress">0%</span>
    </div>
    <p class="px-ex-note">Arraste as peças para montar a imagem.</p>
  </div>`;
}

/* ------------------------------------------------------------------ */
/* Dispatcher                                                          */
/* ------------------------------------------------------------------ */

export function renderProjxBlock(block: Block, base = ""): string | null {
  switch (block.type) {
    case "flipcard":
      return renderFlipcard(block);
    case "timeline":
      return renderTimeline(block);
    case "table":
      return renderTable(block, base);
    case "cover":
      return renderCover(block);
    case "parallax":
      return renderParallax(block);
    case "gallery":
      return renderGallery(block);
    case "image-text-card":
      return renderImageTextCard(block);
    case "highlight":
      return renderHighlight(block);
    case "code":
      return renderCode(block);
    case "multiple-choice":
    case "quiz":
      if (block.type === "multiple-choice") return renderChoice(block);
      return null;
    case "true-false":
      return renderTrueFalse(block);
    case "fill-blanks":
      return renderFillBlanks(block);
    case "ordering":
      return renderOrdering(block);
    case "matching":
      return renderMatching(block);
    case "memory-game":
      return renderMemory(block);
    case "word-search":
      return renderWordSearch(block);
    case "crossword":
      return renderCrossword(block);
    case "puzzle":
      return renderPuzzle(block);
    default:
      return null;
  }
}

/* ------------------------------------------------------------------ */
/* CSS                                                                 */
/* ------------------------------------------------------------------ */

export const PROJX_CSS = `
/* ================= Blocos ProjetoX ================= */
.px-rich { line-height: 1.65; overflow-wrap: anywhere; }.px-rich p { margin: 8px 0; }
.px-rich ul, .px-rich ol { padding-left: 22px; margin: 8px 0; }
.px-section-title { font-size: 1.35rem; font-weight: 800; margin-bottom: 14px; }

/* Flipcard */
.px-flipcard { perspective: 1200px; margin: 22px 0; cursor: pointer; min-width: 0; max-width: 100%; }
.px-flip-inner { position: relative; min-height: 300px; transition: transform .6s cubic-bezier(.4,.2,.2,1); transform-style: preserve-3d; }
.px-flipcard.is-flipped .px-flip-inner { transform: rotateY(180deg); }
.px-flipcard:focus-visible { outline: 3px solid var(--brand-red); outline-offset: 4px; border-radius: var(--radius-md); }
.px-flip-face {
  position: absolute; inset: 0;
  backface-visibility: hidden;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: 24px;
  display: flex; flex-direction: column; justify-content: center; gap: 10px;
  overflow: auto;
  overflow-wrap: anywhere;
  background: var(--bg-surface);
  box-shadow: var(--shadow-sm);
}
.px-flip-back { transform: rotateY(180deg); background: var(--bg-surface); border-left: 5px solid var(--brand-red); }
.px-flip-title { font-size: 1.2rem; font-weight: 800; }
.px-flip-img { max-height: 140px; width: 100%; object-fit: cover; border-radius: 10px; }
.px-flip-text { font-size: 1rem; line-height: 1.6; }
.px-flip-hint { margin-top: auto; font-size: .75rem; font-weight: 700; color: var(--brand-red); text-transform: uppercase; letter-spacing: .06em; }
[data-theme="dark"] .px-flip-face { background: #1e293b; }

/* Timeline */
.px-timeline { margin: 26px 0; min-width: 0; max-width: 100%; }
.px-timeline-list { list-style: none; position: relative; padding-left: 44px; min-width: 0; max-width: 100%; }
.px-timeline-list::before { content: ""; position: absolute; left: 15px; top: 8px; bottom: 8px; width: 3px; background: var(--brand-red); border-radius: 3px; }
.px-timeline-item { position: relative; margin-bottom: 22px; min-width: 0; }
.px-timeline-dot {
  position: absolute; left: -44px; top: 0;
  width: 32px; height: 32px; border-radius: 50%;
  background: var(--brand-red); color: #fff;
  display: grid; place-items: center; font-weight: 800; font-size: .9rem;
  box-shadow: 0 0 0 4px var(--bg-surface);
}
.px-timeline-body h4 { font-size: 1.05rem; font-weight: 800; margin-bottom: 4px; }
.px-timeline-body { background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 14px 16px; min-width: 0; overflow-wrap: anywhere; }
[data-theme="dark"] .px-timeline-body { background: #1e293b; }

/* Tabela responsiva */
.px-table-wrap { margin: 22px 0; overflow-x: auto; min-width: 0; max-width: 100%; }
.px-table { width: 100%; border-collapse: collapse; font-size: .95rem; }
.px-table th, .px-table td { padding: 11px 14px; border: 1px solid var(--border-color); text-align: left; vertical-align: top; }
.px-table th { background: var(--brand-red); color: #fff; font-weight: 700; }
.px-table.is-striped tbody tr:nth-child(even) { background: rgba(0,0,0,.03); }
[data-theme="dark"] .px-table.is-striped tbody tr:nth-child(even) { background: rgba(255,255,255,.04); }
.px-table-wrap caption { font-size: .85rem; color: var(--text-muted); margin-bottom: 8px; font-style: italic; text-align: left; }
@media (max-width: 640px) {
  .px-table thead { display: none; }
  .px-table, .px-table tbody, .px-table tr, .px-table td { display: block; width: 100%; }
  .px-table tr {
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    margin-bottom: 12px;
    padding: 8px 12px;
    background: var(--bg-surface);
  }
  .px-table td {
    border: none;
    border-bottom: 1px solid var(--border-color);
    padding: 8px 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .px-table td:last-child { border-bottom: none; }
  .px-table td::before {
    content: attr(data-label);
    font-size: .72rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: .04em;
    color: var(--brand-red);
  }
}

/* Capa / Hero */
.px-cover {
  position: relative; min-height: 340px;
  display: flex; align-items: center;
  background-color: var(--brand-red);
  background-size: cover; background-position: center;
  border-radius: var(--radius-lg); overflow: hidden;
  color: #fff; padding: 40px;
  margin: 10px 0 26px;
  width: 100%;
  box-sizing: border-box;
}
.px-cover.has-image::before {
  content: "";
  position: absolute;
  inset: 0;
  background: rgba(12, 12, 13, 0.56);
}
.px-cover.is-center { text-align: center; justify-content: center; }
.px-cover-content { position: relative; z-index: 1; max-width: 720px; }
.px-cover h2 { font-size: clamp(1.6rem, 4vw, 2.6rem); font-weight: 900; line-height: 1.15; text-shadow: 0 2px 12px rgba(0,0,0,.4); }
.px-cover p { margin-top: 12px; font-size: 1.05rem; opacity: .95; }
.px-cover-cta { display: inline-block; margin-top: 20px; background: #fff; color: #b91c1c; font-weight: 800; padding: 11px 22px; border-radius: 999px; text-decoration: none; }
.px-cover-cta:hover { background: #fee2e2; }
@media (max-width: 640px) {
  .px-cover { min-height: 220px; padding: 24px 18px; }
  .px-cover-cta { margin-top: 14px; padding: 9px 18px; font-size: .9rem; }
}

/* Parallax */
.px-parallax {
  background-attachment: fixed;
  background-size: cover;
  background-position: center;
  background-color: #0f172a;
  border-radius: var(--radius-lg);
  overflow: hidden;
  display: grid; place-items: center;
  margin: 26px 0;
}
.px-parallax-overlay { background: rgba(0,0,0,.55); color: #fff; text-align: center; padding: 32px; width: 100%; }
.px-parallax-overlay h2 { font-size: clamp(1.4rem, 3vw, 2.2rem); font-weight: 900; }
.px-parallax-overlay p { margin-top: 8px; opacity: .9; }
@media (max-width: 768px) { .px-parallax { background-attachment: scroll; } }

/* Galeria */
.px-gallery { position: relative; margin: 24px 0; min-width: 0; max-width: 100%; overflow: hidden; }
.px-gallery-viewport { overflow: hidden; border-radius: var(--radius-lg); background: #0f172a; width: 100%; }
.px-gallery-track { display: flex; transition: transform .35s ease; }
.px-gallery-slide { min-width: 100%; margin: 0; text-align: center; }
.px-gallery-slide img { width: 100%; max-height: 520px; object-fit: contain; display: block; }
.px-gallery-slide figcaption { color: #e2e8f0; font-size: .85rem; padding: 10px 14px; background: rgba(0,0,0,.35); }
.px-gallery-nav {
  position: absolute; top: 50%; transform: translateY(-50%);
  width: 44px; height: 44px; border-radius: 50%;
  border: none; background: rgba(0,0,0,.55); color: #fff;
  font-size: 1.6rem; line-height: 1; cursor: pointer;
}
.px-gallery-nav:hover { background: var(--brand-red); }
.px-gallery-prev { left: 12px; }
.px-gallery-next { right: 12px; }
.px-gallery-dots { display: flex; gap: 8px; justify-content: center; margin-top: 12px; }
.px-gallery-dot { width: 10px; height: 10px; border-radius: 50%; border: none; background: #cbd5e1; cursor: pointer; padding: 0; }
.px-gallery-dot.active { background: var(--brand-red); transform: scale(1.25); }

/* Imagem + texto */
.px-itcard { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.3fr); gap: 22px; align-items: center; margin: 24px 0; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-lg); overflow: hidden; min-width: 0; max-width: 100%; }
.px-itcard.is-reverse { grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr); }
.px-itcard.is-reverse .px-itcard-media { order: 2; }
.px-itcard-media { height: 100%; min-height: 210px; min-width: 0; }
.px-itcard-media img { width: 100%; height: 100%; object-fit: cover; display: block; }
.px-itcard-body { padding: 22px; min-width: 0; overflow-wrap: anywhere; }
.px-itcard-body h3 { font-size: 1.25rem; font-weight: 800; margin-bottom: 8px; }
@media (max-width: 720px) { .px-itcard, .px-itcard.is-reverse { grid-template-columns: minmax(0, 1fr); } .px-itcard.is-reverse .px-itcard-media { order: 0; } .px-itcard-body { padding: 16px; } }

/* Destaque de texto */
.px-highlight { margin: 22px 0; padding: 20px 22px; border-radius: var(--radius-md); background: #fffbeb; border: 1px solid #fde68a; }
[data-theme="dark"] .px-highlight { background: rgba(250,204,21,.08); border-color: rgba(250,204,21,.3); }
.px-highlight h3 { font-size: 1.1rem; font-weight: 800; margin-bottom: 8px; }
.px-highlight mark { background: #fef08a; border-bottom: 2px solid #eab308; color: #0c0c0d; padding: 0 3px; font-weight: 700; border-radius: 2px; }
.px-highlight-legend { margin-top: 10px; font-size: .82rem; color: var(--text-muted); }

/* Código */
.px-code { margin: 22px 0; border-radius: var(--radius-md); overflow: hidden; background: #0f172a; color: #e2e8f0; min-width: 0; max-width: 100%; }
.px-code figcaption { display: flex; align-items: center; gap: 10px; padding: 10px 14px; background: #1e293b; font-size: .8rem; color: #94a3b8; }
.px-code-dots { display: inline-flex; gap: 5px; }
.px-code-dots i { width: 9px; height: 9px; border-radius: 50%; background: #ef4444; }
.px-code-dots i:nth-child(2) { background: #eab308; }
.px-code-dots i:nth-child(3) { background: #22c55e; }
.px-code-name { font-weight: 700; color: #cbd5e1; }
.px-code-lang { margin-left: auto; text-transform: uppercase; letter-spacing: .08em; }
.px-code pre { margin: 0; padding: 18px; overflow-x: auto; font-size: .88rem; line-height: 1.6; }
.px-code code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }

/* ================= Exercícios ================= */
.px-ex { margin: 26px 0; border: 1px solid var(--border-color); border-radius: var(--radius-lg); background: var(--bg-surface); padding: 22px; box-shadow: var(--shadow-sm); min-width: 0; max-width: 100%; overflow-wrap: anywhere; }
[data-theme="dark"] .px-ex { background: #1e293b; }
@media (max-width: 640px) { .px-ex { padding: 16px 14px; } }
.px-ex-q { font-weight: 800; font-size: 1.05rem; margin-bottom: 16px; }
.px-ex-note { margin-top: 12px; font-size: .85rem; color: var(--text-muted); font-style: italic; }
.px-ex-bar { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; margin-top: 18px; }
.px-btn { border: none; border-radius: 999px; padding: 11px 22px; font-weight: 800; font-size: .9rem; cursor: pointer; background: var(--brand-red); color: #fff; }
.px-btn:hover { filter: brightness(1.08); }
.px-btn:disabled { opacity: .55; cursor: not-allowed; }
.px-btn.px-reset { background: #475569; }
.px-tries { font-size: .8rem; color: var(--text-muted); font-weight: 700; }
.px-ex-feedback { margin-top: 14px; font-weight: 700; font-size: .9rem; min-height: 1px; line-height: 1.5; }
.px-ex-feedback.ok { color: #15803d; }
.px-ex-feedback.warn { color: #b45309; }
.px-ex-feedback.err { color: #b91c1c; }

.px-opts { display: flex; flex-direction: column; gap: 10px; }
.px-opt { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border: 2px solid var(--border-color); border-radius: 12px; background: var(--bg-surface); color: var(--text-main); font-size: .95rem; text-align: left; cursor: pointer; }
[data-theme="dark"] .px-opt { background: #0f172a; }
.px-opt:hover { border-color: var(--brand-red); }
.px-opt-mark { width: 26px; height: 26px; flex: none; border-radius: 50%; border: 2px solid #94a3b8; display: grid; place-items: center; font-size: .75rem; font-weight: 800; color: var(--text-muted); }
.px-opt.selected { border-color: var(--brand-red); background: rgba(212,39,49,.07); }
.px-opt.selected .px-opt-mark { background: var(--brand-red); border-color: var(--brand-red); color: #fff; }
.px-opt.is-right { border-color: #22c55e; background: #dcfce7; color: #15803d !important; }
.px-opt.is-right .px-opt-mark { background: #22c55e; border-color: #22c55e; color: #fff; }
.px-opt.is-wrong { border-color: #ef4444; background: #fee2e2; color: #b91c1c !important; }
.px-opt.is-wrong .px-opt-mark { background: #ef4444; border-color: #ef4444; color: #fff; }

.px-tf-list { list-style: none; display: flex; flex-direction: column; gap: 10px; }
.px-tf-item { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border: 1px solid var(--border-color); border-radius: 12px; flex-wrap: wrap; }
.px-tf-text { flex: 1 1 200px; min-width: 0; overflow-wrap: anywhere; }
.px-tf-btns { display: flex; gap: 6px; }
.px-tf-btn { width: 38px; height: 36px; border-radius: 9px; border: 2px solid var(--border-color); background: transparent; color: var(--text-main); font-weight: 800; cursor: pointer; }
.px-tf-btn.selected { border-color: var(--brand-red); background: rgba(212,39,49,.1); }
.px-tf-item.is-right .px-tf-mark::before { content: "✓"; color: #15803d; font-weight: 900; }
.px-tf-item.is-wrong .px-tf-mark::before { content: "✕"; color: #b91c1c; font-weight: 900; }

.px-sentences { padding-left: 22px; display: flex; flex-direction: column; gap: 14px; }
.px-sentence { line-height: 2.1; }
.px-blank { border: none; border-bottom: 2px solid var(--brand-red); background: rgba(212,39,49,.05); color: var(--text-main); font: inherit; font-weight: 700; padding: 2px 6px; margin: 0 3px; text-align: center; outline: none; max-width: 100%; }
.px-blank:focus { background: rgba(212,39,49,.14); }
.px-blank.is-right { border-color: #22c55e; background: #dcfce7; color: #15803d; }
.px-blank.is-wrong { border-color: #ef4444; background: #fee2e2; color: #b91c1c; }
.px-wordbank { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-top: 18px; padding: 12px; border-radius: 12px; background: rgba(0,0,0,.03); min-width: 0; max-width: 100%; }
[data-theme="dark"] .px-wordbank { background: rgba(255,255,255,.04); }
.px-chip { border: 2px solid var(--brand-red); color: var(--brand-red); background: transparent; border-radius: 8px; padding: 7px 13px; font-weight: 800; cursor: pointer; max-width: 100%; white-space: normal; overflow-wrap: anywhere; }
.px-chip:hover { background: var(--brand-red); color: #fff; }
.px-chip:disabled { opacity: .3; border-color: var(--border-color); color: var(--text-muted); background: transparent; }

.px-order-list { list-style: none; display: flex; flex-direction: column; gap: 8px; counter-reset: px-order; min-width: 0; max-width: 100%; }
.px-order-item { display: flex; align-items: center; gap: 10px; padding: 11px 14px; border: 1px solid var(--border-color); border-radius: 10px; background: var(--bg-surface); cursor: grab; min-width: 0; max-width: 100%; }
[data-theme="dark"] .px-order-item { background: #0f172a; }
.px-order-item::before { counter-increment: px-order; content: counter(px-order); width: 22px; height: 22px; flex: none; border-radius: 50%; background: rgba(212,39,49,.12); color: var(--brand-red); font-size: .72rem; font-weight: 800; display: grid; place-items: center; }
.px-order-item.dragging { opacity: .4; }
.px-order-handle { color: var(--text-muted); }
.px-order-text { flex: 1; min-width: 0; overflow-wrap: anywhere; }
.px-order-ctrl { display: flex; gap: 4px; }
.px-order-btn { width: 30px; height: 28px; border-radius: 7px; border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-main); cursor: pointer; font-weight: 800; }
.px-order-btn:hover { border-color: var(--brand-red); color: var(--brand-red); }
.px-order-item.is-right { border-color: #22c55e; background: #dcfce7; }
[data-theme="dark"] .px-order-item.is-right { background: rgba(34,197,94,.15); }
.px-order-item.is-wrong { border-color: #ef4444; }
.px-order-item.is-right .px-order-btn, .px-order-item.is-wrong .px-order-btn { display: none; }

.px-match-list { list-style: none; display: flex; flex-direction: column; gap: 10px; padding: 0; min-width: 0; max-width: 100%; }
.px-match-item { display: grid; grid-template-columns: minmax(0,1fr) minmax(160px, .9fr) 24px; grid-template-areas: "item select mark"; gap: 10px 12px; align-items: center; padding: 10px 12px; border: 1px solid var(--border-color); border-radius: 10px; min-width: 0; max-width: 100%; }
.px-match-left { grid-area: item; font-weight: 600; min-width: 0; overflow-wrap: anywhere; }
.px-match-select { grid-area: select; width: 100%; min-width: 0; max-width: 100%; padding: 9px 10px; border-radius: 8px; border: 2px solid var(--border-color); background: var(--bg-surface); color: var(--text-main); font: inherit; }
.px-match-select:focus { border-color: var(--brand-red); outline: none; }
.px-match-mark { grid-area: mark; justify-self: center; }
.px-match-item.is-right { border-color: #22c55e; }
.px-match-item.is-right .px-match-mark::before { content: "✓"; color: #15803d; font-weight: 900; }
.px-match-item.is-wrong { border-color: #ef4444; }
.px-match-item.is-wrong .px-match-mark::before { content: "✕"; color: #b91c1c; font-weight: 900; }
/* Telas estreitas: a coluna vira linha (item em cima, associação embaixo). */
@media (max-width: 560px) {
  .px-match-item { grid-template-columns: minmax(0,1fr) 22px; grid-template-areas: "item item" "select mark"; row-gap: 8px; }
}

.px-memory-grid { display: grid; grid-template-columns: repeat(var(--px-memo-cols, 4), minmax(0,1fr)); gap: 10px; margin: 16px 0; }
.px-memo-card { aspect-ratio: 1 / 1; border: none; background: none; padding: 0; cursor: pointer; perspective: 800px; }
.px-memo-inner { position: relative; display: block; width: 100%; height: 100%; transition: transform .45s; transform-style: preserve-3d; }
.px-memo-card.flipped .px-memo-inner, .px-memo-card.matched .px-memo-inner { transform: rotateY(180deg); }
.px-memo-front, .px-memo-back { position: absolute; inset: 0; border-radius: 12px; display: grid; place-items: center; backface-visibility: hidden; padding: 6px; text-align: center; word-break: break-word; }
.px-memo-front { background: var(--brand-red); color: #fff; font-size: 1.6rem; font-weight: 900; box-shadow: var(--shadow-sm); }
.px-memo-back { background: var(--bg-surface); border: 2px solid var(--brand-red); color: var(--text-main); font-size: .8rem; font-weight: 700; transform: rotateY(180deg); }
.px-memo-card.matched .px-memo-back { border-color: #22c55e; background: #dcfce7; color: #15803d; }

.px-ws-layout { display: flex; flex-direction: column; align-items: center; gap: 16px; min-width: 0; max-width: 100%; width: 100%; }
.px-ws-grid-wrap { overflow-x: auto; max-width: 100%; min-width: 0; display: flex; justify-content: center; }
.px-ws-grid { border-collapse: collapse; background: #fff; margin: 0 auto; }
.px-ws-cell { width: 28px; height: 28px; text-align: center; vertical-align: middle; font-weight: 700; font-size: .82rem; color: #1e293b; border: 1px solid #e2e8f0; cursor: pointer; user-select: none; }
.px-ws-cell:hover { background: #fee2e2; }
.px-ws-cell.sel { background: #fecaca; }
.px-ws-cell.found { background: #bbf7d0; color: #14532d; }
.px-ws-words { list-style: none; display: flex; flex-wrap: wrap; justify-content: center; gap: 6px; width: 100%; }
.px-ws-words li { font-weight: 700; font-size: .85rem; padding: 6px 10px; border-radius: 6px; background: rgba(0,0,0,.04); }
.px-ws-words li.found { text-decoration: line-through; color: #15803d; background: #dcfce7; }
@media (max-width: 640px) { .px-ws-cell { width: 22px; height: 22px; font-size: .68rem; } }

.px-cw-layout { display: flex; flex-direction: column; align-items: center; gap: 16px; min-width: 0; max-width: 100%; width: 100%; }
.px-cw-grid-wrap { overflow-x: auto; max-width: 100%; min-width: 0; display: flex; justify-content: center; }
.px-cw-grid { border-collapse: collapse; background: #fff; margin: 0 auto; }
.px-cw-cell { position: relative; width: 32px; height: 32px; padding: 0; border: 1px solid #94a3b8; }
.px-cw-block { width: 32px; height: 32px; background: #0f172a; border: 1px solid #0f172a; }
.px-cw-num { position: absolute; top: 1px; left: 3px; font-size: 9px; font-weight: 800; color: #64748b; line-height: 1; pointer-events: none; }
.px-cw-input { width: 100%; height: 100%; border: none; background: transparent; text-align: center; font-weight: 800; font-size: 1rem; text-transform: uppercase; color: #0f172a; padding: 0; outline: none; }
.px-cw-input:focus { background: #fef08a; }
.px-cw-input.is-right { background: #dcfce7; color: #15803d; }
.px-cw-input.is-wrong { background: #fee2e2; color: #b91c1c; }
.px-cw-clues h4 { font-size: .9rem; text-transform: uppercase; letter-spacing: .06em; color: var(--brand-red); margin: 12px 0 6px; }
.px-cw-clues ol { padding-left: 20px; font-size: .88rem; line-height: 1.6; }
@media (max-width: 720px) {
  .px-cw-layout { grid-template-columns: minmax(0, 1fr); }
  .px-cw-cell, .px-cw-block { width: 24px; height: 24px; }
  .px-cw-input { font-size: .82rem; }
}

.px-pz-wrap { position: relative; width: 100%; max-width: 640px; margin: 0 auto; }
.px-pz-preview { display: block; width: 100%; height: auto; border-radius: 8px; }
.px-pz-canvas { display: none; width: 100%; height: auto; border-radius: 8px; }
.px-pz-error { color: #b91c1c; font-size: .9rem; margin-top: 8px; }
/* Voltar ao topo + rolagem suave */
html { scroll-behavior: smooth; }
@media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto; } }
.btn-top {
  position: fixed; right: 20px; bottom: 20px;
  width: 46px; height: 46px; border-radius: 50%;
  border: none; background: var(--brand-red); color: #fff;
  font-size: 1.3rem; font-weight: 800; cursor: pointer;
  box-shadow: 0 6px 18px rgba(0,0,0,.35);
  z-index: 60;
}
.btn-top:hover { filter: brightness(1.1); }
`;

/* ------------------------------------------------------------------ */
/* JS do build                                                         */
/* ------------------------------------------------------------------ */

export const PROJX_JS = `
// ===== Blocos ProjetoX =====
(function () {
  function pxNorm(s) {
    return (s || "").toString().trim().toLowerCase()
      .normalize("NFD").replace(/[\\u0300-\\u036f]/g, "");
  }
  function pxFeedback(el, kind, msg) {
    if (!el) return;
    el.className = "px-ex-feedback " + kind;
    el.textContent = msg;
  }
  function pxDone(box) {
    box.setAttribute("data-done", "true");
    box.querySelectorAll("button, input, select").forEach(function (c) {
      if (!c.classList.contains("px-reset")) c.disabled = true;
    });
  }
  function pxTries(box, attempts) {
    var el = box.querySelector(".px-tries");
    if (el) el.textContent = "Tentativas: " + attempts;
  }

  /* Flipcard */
  document.querySelectorAll("[data-px-flip]").forEach(function (card) {
    function flip() { card.classList.toggle("is-flipped"); }
    card.addEventListener("click", flip);
    card.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); flip(); }
    });
  });

  /* Galeria */
  document.querySelectorAll("[data-px-gallery]").forEach(function (g) {
    var track = g.querySelector(".px-gallery-track");
    var slides = g.querySelectorAll(".px-gallery-slide");
    var dots = g.querySelectorAll(".px-gallery-dot");
    if (!track || !slides.length) return;
    var index = 0;
    function go(i) {
      index = (i + slides.length) % slides.length;
      track.style.transform = "translateX(" + (-index * 100) + "%)";
      dots.forEach(function (d, di) { d.classList.toggle("active", di === index); });
    }
    var prev = g.querySelector(".px-gallery-prev");
    var next = g.querySelector(".px-gallery-next");
    if (prev) prev.addEventListener("click", function () { go(index - 1); });
    if (next) next.addEventListener("click", function () { go(index + 1); });
    dots.forEach(function (d) {
      d.addEventListener("click", function () { go(parseInt(d.getAttribute("data-index"), 10) || 0); });
    });
    g.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") go(index - 1);
      if (e.key === "ArrowRight") go(index + 1);
    });
    if (g.getAttribute("data-autoplay") === "true") {
      setInterval(function () { go(index + 1); }, 6000);
    }
    go(0);
  });

  /* Escolha única / múltipla */
  document.querySelectorAll('[data-px-ex="choice"]').forEach(function (box) {
    var opts = Array.prototype.slice.call(box.querySelectorAll(".px-opt"));
    var fb = box.querySelector(".px-ex-feedback");
    var multi = box.getAttribute("data-multi") === "true";
    var attempts = parseInt(box.getAttribute("data-attempts"), 10) || 2;
    pxTries(box, attempts);
    opts.forEach(function (o) {
      o.addEventListener("click", function () {
        if (box.getAttribute("data-done")) return;
        if (!multi) {
          opts.forEach(function (x) { x.classList.remove("selected"); x.setAttribute("aria-pressed", "false"); });
        }
        o.classList.toggle("selected");
        o.setAttribute("aria-pressed", o.classList.contains("selected") ? "true" : "false");
        pxFeedback(fb, "", "");
      });
    });
    var check = box.querySelector(".px-check");
    if (check) check.addEventListener("click", function () {
      if (box.getAttribute("data-done")) return;
      var selected = opts.filter(function (o) { return o.classList.contains("selected"); });
      if (!selected.length) { pxFeedback(fb, "warn", "Selecione uma alternativa antes de verificar."); return; }
      var right = opts.filter(function (o) { return o.getAttribute("data-correct") === "true"; });
      var ok = selected.length === right.length && selected.every(function (o) { return o.getAttribute("data-correct") === "true"; });
      opts.forEach(function (o) {
        if (o.classList.contains("selected") && o.getAttribute("data-correct") !== "true") o.classList.add("is-wrong");
      });
      if (ok) {
        opts.forEach(function (o) { if (o.getAttribute("data-correct") === "true") o.classList.add("is-right"); });
        pxFeedback(fb, "ok", "Resposta correta!");
        pxDone(box);
      } else {
        attempts--;
        pxTries(box, attempts);
        if (attempts > 0) {
          pxFeedback(fb, "warn", "Ainda não. Você tem " + attempts + " tentativa(s).");
        } else {
          opts.forEach(function (o) {
            if (o.getAttribute("data-correct") === "true") o.classList.add("is-right");
          });
          pxFeedback(fb, "err", "Resposta incorreta. O gabarito está destacado em verde.");
          pxDone(box);
        }
      }
    });
  });

  /* Verdadeiro ou falso */
  document.querySelectorAll('[data-px-ex="tf"]').forEach(function (box) {
    var items = Array.prototype.slice.call(box.querySelectorAll(".px-tf-item"));
    var fb = box.querySelector(".px-ex-feedback");
    var attempts = parseInt(box.getAttribute("data-attempts"), 10) || 2;
    pxTries(box, attempts);
    items.forEach(function (item) {
      item.querySelectorAll(".px-tf-btn").forEach(function (btn) {
        btn.addEventListener("click", function () {
          if (box.getAttribute("data-done")) return;
          item.querySelectorAll(".px-tf-btn").forEach(function (b) {
            b.classList.remove("selected"); b.setAttribute("aria-pressed", "false");
          });
          btn.classList.add("selected");
          btn.setAttribute("aria-pressed", "true");
          item.setAttribute("data-pick", btn.getAttribute("data-v"));
          pxFeedback(fb, "", "");
        });
      });
    });
    var check = box.querySelector(".px-check");
    if (check) check.addEventListener("click", function () {
      if (box.getAttribute("data-done")) return;
      var missing = items.some(function (i) { return !i.getAttribute("data-pick"); });
      if (missing) { pxFeedback(fb, "warn", "Marque V ou F em todas as afirmações."); return; }
      var wrong = 0;
      items.forEach(function (item) {
        var ok = item.getAttribute("data-pick") === item.getAttribute("data-answer");
        item.classList.add(ok ? "is-right" : "is-wrong");
        if (!ok) wrong++;
      });
      if (!wrong) { pxFeedback(fb, "ok", "Todas as respostas estão corretas!"); pxDone(box); }
      else {
        attempts--;
        pxTries(box, attempts);
        if (attempts > 0) { pxFeedback(fb, "warn", wrong + " afirmação(ões) incorreta(s). Você tem " + attempts + " tentativa(s)."); }
        else {
          items.forEach(function (item) {
            var ok = item.getAttribute("data-pick") === item.getAttribute("data-answer");
            item.classList.toggle("is-right", ok);
            item.classList.toggle("is-wrong", !ok);
          });
          pxFeedback(fb, "err", "Veja as afirmações marcadas em vermelho.");
          pxDone(box);
        }
      }
    });
  });

  /* Lacunas */
  document.querySelectorAll('[data-px-ex="blanks"]').forEach(function (box) {
    var inputs = Array.prototype.slice.call(box.querySelectorAll(".px-blank"));
    var chips = Array.prototype.slice.call(box.querySelectorAll(".px-chip"));
    var fb = box.querySelector(".px-ex-feedback");
    var attempts = parseInt(box.getAttribute("data-attempts"), 10) || 2;
    pxTries(box, attempts);

    function firstEmpty() {
      for (var i = 0; i < inputs.length; i++) if (!inputs[i].value) return inputs[i];
      return null;
    }
    chips.forEach(function (chip, idx) {
      chip.addEventListener("click", function () {
        if (box.getAttribute("data-done")) return;
        var target = firstEmpty();
        if (!target) return;
        target.value = chip.textContent;
        target.setAttribute("data-chip", String(idx));
        chip.disabled = true;
      });
    });
    inputs.forEach(function (inp) {
      inp.addEventListener("input", function () {
        var idx = inp.getAttribute("data-chip");
        if (idx !== null) {
          var chip = chips[parseInt(idx, 10)];
          if (chip) chip.disabled = false;
          inp.removeAttribute("data-chip");
        }
      });
      inp.addEventListener("click", function () {
        if (box.getAttribute("data-done")) return;
        var idx = inp.getAttribute("data-chip");
        if (idx !== null) {
          var chip = chips[parseInt(idx, 10)];
          if (chip) chip.disabled = false;
          inp.value = "";
          inp.removeAttribute("data-chip");
        }
      });
    });
    var check = box.querySelector(".px-check");
    if (check) check.addEventListener("click", function () {
      if (box.getAttribute("data-done")) return;
      if (inputs.some(function (i) { return !i.value.trim(); })) {
        pxFeedback(fb, "warn", "Preencha todas as lacunas antes de verificar.");
        return;
      }
      var wrong = 0;
      inputs.forEach(function (inp) {
        var ok = pxNorm(inp.value) === pxNorm(inp.getAttribute("data-answer"));
        inp.classList.add(ok ? "is-right" : "is-wrong");
        if (!ok) wrong++;
      });
      if (!wrong) { pxFeedback(fb, "ok", "Muito bem, todas as lacunas estão corretas!"); pxDone(box); }
      else {
        attempts--;
        pxTries(box, attempts);
        if (attempts > 0) { pxFeedback(fb, "warn", wrong + " lacuna(s) incorreta(s). Você tem " + attempts + " tentativa(s)."); }
        else {
          inputs.forEach(function (inp) {
            var ok = pxNorm(inp.value) === pxNorm(inp.getAttribute("data-answer"));
            inp.classList.toggle("is-right", ok);
            inp.classList.toggle("is-wrong", !ok);
            if (!ok) inp.value = inp.getAttribute("data-answer");
          });
          pxFeedback(fb, "err", "Veja as respostas corretas em verde.");
          pxDone(box);
        }
      }
    });
  });

  /* Ordenar */
  document.querySelectorAll('[data-px-ex="ordering"]').forEach(function (box) {
    var list = box.querySelector(".px-order-list");
    var fb = box.querySelector(".px-ex-feedback");
    var attempts = parseInt(box.getAttribute("data-attempts"), 10) || 2;
    pxTries(box, attempts);
    var dragged = null;

    function items() { return Array.prototype.slice.call(list.querySelectorAll(".px-order-item")); }

    list.addEventListener("click", function (e) {
      var btn = e.target.closest(".px-order-btn");
      if (!btn || box.getAttribute("data-done")) return;
      var item = btn.closest(".px-order-item");
      var dir = parseInt(btn.getAttribute("data-dir"), 10);
      if (dir < 0 && item.previousElementSibling) list.insertBefore(item, item.previousElementSibling);
      if (dir > 0 && item.nextElementSibling) list.insertBefore(item.nextElementSibling, item);
    });
    list.addEventListener("dragstart", function (e) {
      var item = e.target.closest(".px-order-item");
      if (!item || box.getAttribute("data-done")) return;
      dragged = item;
      item.classList.add("dragging");
      if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";
    });
    list.addEventListener("dragend", function () {
      if (dragged) dragged.classList.remove("dragging");
      dragged = null;
    });
    list.addEventListener("dragover", function (e) {
      if (!dragged) return;
      e.preventDefault();
      var target = e.target.closest(".px-order-item");
      if (!target || target === dragged) return;
      var rect = target.getBoundingClientRect();
      var after = (e.clientY - rect.top) > rect.height / 2;
      list.insertBefore(dragged, after ? target.nextElementSibling : target);
    });

    var check = box.querySelector(".px-check");
    if (check) check.addEventListener("click", function () {
      if (box.getAttribute("data-done")) return;
      var seq = items().map(function (i) { return parseInt(i.getAttribute("data-pos"), 10); });
      var ok = seq.every(function (v, i) { return v === i; });
      if (ok) {
        items().forEach(function (i) { i.classList.add("is-right"); });
        pxFeedback(fb, "ok", "Sequência correta!");
        pxDone(box);
      } else {
        attempts--;
        pxTries(box, attempts);
        if (attempts > 0) {
          pxFeedback(fb, "warn", "A ordem ainda não está correta. Você tem " + attempts + " tentativa(s).");
        } else {
          pxFeedback(fb, "err", "Ordem incorreta. Confira a sequência do conteúdo.");
          pxDone(box);
        }
      }
    });
  });

  /* Associação */
  document.querySelectorAll('[data-px-ex="matching"]').forEach(function (box) {
    var rows = Array.prototype.slice.call(box.querySelectorAll(".px-match-item"));
    var fb = box.querySelector(".px-ex-feedback");
    var attempts = parseInt(box.getAttribute("data-attempts"), 10) || 2;
    pxTries(box, attempts);
    var check = box.querySelector(".px-check");
    if (check) check.addEventListener("click", function () {
      if (box.getAttribute("data-done")) return;
      if (rows.some(function (r) { return !r.querySelector("select").value; })) {
        pxFeedback(fb, "warn", "Associe todas as linhas antes de verificar.");
        return;
      }
      var wrong = 0;
      rows.forEach(function (r) {
        var ok = r.querySelector("select").value === r.getAttribute("data-pair");
        r.classList.add(ok ? "is-right" : "is-wrong");
        if (!ok) wrong++;
      });
      if (!wrong) { pxFeedback(fb, "ok", "Todas as associações estão corretas!"); pxDone(box); }
      else {
        attempts--;
        pxTries(box, attempts);
        if (attempts > 0) { pxFeedback(fb, "warn", wrong + " associação(ões) incorreta(s). Você tem " + attempts + " tentativa(s)."); }
        else { pxFeedback(fb, "err", "Veja as associações marcadas em vermelho."); pxDone(box); }
      }
    });
  });

  /* Jogo da memória */
  document.querySelectorAll('[data-px-ex="memory"]').forEach(function (box) {
    var grid = box.querySelector(".px-memory-grid");
    var fb = box.querySelector(".px-ex-feedback");
    var first = null;
    var lock = false;
    var moves = 0;
    var matched = 0;
    var total = parseInt(box.getAttribute("data-total"), 10) || 0;

    grid.addEventListener("click", function (e) {
      var card = e.target.closest(".px-memo-card");
      if (!card || lock || card.classList.contains("flipped") || card.classList.contains("matched")) return;
      card.classList.add("flipped");
      if (!first) { first = card; return; }
      lock = true;
      moves++;
      var tries = box.querySelector(".px-tries");
      if (tries) tries.textContent = "Tentativas: " + moves;
      var samePair = first.getAttribute("data-pair") === card.getAttribute("data-pair");
      var sameFace = first.getAttribute("data-face") === card.getAttribute("data-face");
      if (samePair && !sameFace) {
        first.classList.add("matched");
        card.classList.add("matched");
        matched++;
        first = null;
        lock = false;
        if (matched === total) pxFeedback(fb, "ok", "Todos os pares encontrados em " + moves + " tentativa(s)!");
      } else {
        var a = first, b = card;
        first = null;
        setTimeout(function () {
          a.classList.remove("flipped");
          b.classList.remove("flipped");
          lock = false;
        }, 900);
      }
    });

    var reset = box.querySelector(".px-reset");
    if (reset) reset.addEventListener("click", function () {
      grid.querySelectorAll(".px-memo-card").forEach(function (c) {
        c.classList.remove("flipped", "matched");
        c.disabled = false;
      });
      first = null; lock = false; moves = 0; matched = 0;
      var tries = box.querySelector(".px-tries");
      if (tries) tries.textContent = "Tentativas: 0";
      pxFeedback(fb, "", "");
    });
  });

  /* Caça-palavras */
  document.querySelectorAll('[data-px-ex="wordsearch"]').forEach(function (box) {
    var table = box.querySelector(".px-ws-grid");
    var fb = box.querySelector(".px-ex-feedback");
    var list = Array.prototype.slice.call(box.querySelectorAll(".px-ws-words li"));
    var start = null;
    var selected = [];

    function clearSel() {
      selected.forEach(function (c) { c.classList.remove("sel"); });
      selected = [];
    }
    function cellAt(r, c) {
      return table.querySelector('.px-ws-cell[data-r="' + r + '"][data-c="' + c + '"]');
    }
    function line(a, b) {
      var r1 = parseInt(a.getAttribute("data-r"), 10), c1 = parseInt(a.getAttribute("data-c"), 10);
      var r2 = parseInt(b.getAttribute("data-r"), 10), c2 = parseInt(b.getAttribute("data-c"), 10);
      var dr = Math.sign(r2 - r1), dc = Math.sign(c2 - c1);
      var len = Math.max(Math.abs(r2 - r1), Math.abs(c2 - c1)) + 1;
      if (dr !== 0 && dc !== 0 && Math.abs(r2 - r1) !== Math.abs(c2 - c1)) return null;
      var cells = [];
      for (var i = 0; i < len; i++) {
        var cell = cellAt(r1 + dr * i, c1 + dc * i);
        if (!cell) return null;
        cells.push(cell);
      }
      return cells;
    }
    table.addEventListener("click", function (e) {
      var cell = e.target.closest(".px-ws-cell");
      if (!cell) return;
      if (!start) {
        start = cell;
        clearSel();
        cell.classList.add("sel");
        selected = [cell];
        return;
      }
      var cells = line(start, cell);
      if (!cells) { start = null; clearSel(); return; }
      clearSel();
      cells.forEach(function (c) { c.classList.add("sel"); });
      var word = cells.map(function (c) { return c.textContent; }).join("");
      var rev = word.split("").reverse().join("");
      var hit = list.find(function (li) {
        var w = li.getAttribute("data-word");
        return !li.classList.contains("found") && (w === word || w === rev);
      });
      if (hit) {
        hit.classList.add("found");
        cells.forEach(function (c) { c.classList.remove("sel"); c.classList.add("found"); });
        pxFeedback(fb, "ok", "Encontrou: " + hit.getAttribute("data-word"));
        if (list.every(function (li) { return li.classList.contains("found"); })) {
          pxFeedback(fb, "ok", "Você encontrou todas as palavras!");
        }
      } else {
        setTimeout(clearSel, 350);
        pxFeedback(fb, "warn", "Essa sequência não corresponde a nenhuma palavra.");
      }
      start = null;
    });
  });

  /* Palavras cruzadas */
  document.querySelectorAll('[data-px-ex="crossword"]').forEach(function (box) {
    var inputs = Array.prototype.slice.call(box.querySelectorAll(".px-cw-input"));
    var fb = box.querySelector(".px-ex-feedback");
    inputs.forEach(function (inp, i) {
      inp.addEventListener("input", function () {
        inp.value = inp.value.slice(0, 1).toUpperCase();
        if (inp.value && inputs[i + 1]) inputs[i + 1].focus();
      });
      inp.addEventListener("keydown", function (e) {
        if (e.key === "Backspace" && !inp.value && inputs[i - 1]) inputs[i - 1].focus();
      });
    });
    var check = box.querySelector(".px-check");
    if (check) check.addEventListener("click", function () {
      if (box.getAttribute("data-done")) return;
      if (inputs.some(function (i) { return !i.value.trim(); })) {
        pxFeedback(fb, "warn", "Preencha todas as letras antes de conferir.");
        return;
      }
      var wrong = 0;
      inputs.forEach(function (inp) {
        var ok = inp.value.toUpperCase() === inp.getAttribute("data-answer");
        inp.classList.add(ok ? "is-right" : "is-wrong");
        if (!ok) wrong++;
      });
      if (!wrong) { pxFeedback(fb, "ok", "Cruzada completa e correta!"); pxDone(box); }
      else {
        inputs.forEach(function (inp) {
          var ok = inp.value.toUpperCase() === inp.getAttribute("data-answer");
          inp.classList.toggle("is-right", ok);
          inp.classList.toggle("is-wrong", !ok);
        });
        pxFeedback(fb, "err", wrong + " letra(s) incorreta(s). Tente novamente.");
        inputs.forEach(function (inp) { if (inp.classList.contains("is-wrong")) inp.value = ""; });
      }
    });
  });
})();

/* Quebra-cabeça (canvas, peças com encaixe realista) */
(function () {
  document.querySelectorAll('[data-px-ex="puzzle"]').forEach(function (box) {
    var canvas = box.querySelector(".px-pz-canvas");
    var wrap = box.querySelector(".px-pz-wrap");
    var ctx = canvas.getContext("2d");
    var sizeAttr = parseInt(box.getAttribute("data-size") || "4", 10);
    var N = sizeAttr;
    if (window.innerWidth < 640) N = Math.min(N, 3);
    var imgSrc = box.getAttribute("data-image") || "";
    var progressEl = box.querySelector(".px-pz-progress");
    var pieces = [], dragging = null, focused = null, img = new Image();
    var boardW = 0, boardH = 0, cellW = 0, cellH = 0, offX = 0, offY = 20;
    var topology = { h: [], v: [] };

    function rndEdge() { return { dir: Math.random() > .5 ? 1 : -1, pos: .5 + (Math.random()-.5)*.08, h: .22 + (Math.random()-.5)*.03, w: .15 + (Math.random()-.5)*.025, n: .075 + (Math.random()-.5)*.015 }; }

    function edgePath(ctx, x1, y1, x2, y2, e, inv) {
      if (!e) { ctx.lineTo(x2, y2); return; }
      var dx = x2-x1, dy = y2-y1, len = Math.hypot(dx,dy); if (len<1e-4) return;
      var tx=dx/len, ty=dy/len, s=e.dir*(inv?-1:1), nx=-ty*s, ny=tx*s;
      var pt=function(u,v){ return {x:x1+tx*(u*len)+nx*(v*len), y:y1+ty*(u*len)+ny*(v*len)}; };
      var m=inv ? 1-e.pos : e.pos, h=e.h, hw=e.w, np=e.n;
      var p1=pt(m-np*1.45,0), c1=pt(m-np*.65,0), c2=pt(m-np*.45,h*.25), p2=pt(m-np,h*.36);
      var c3=pt(m-hw*1.18,h*.52), c4=pt(m-hw*1.05,h*1.02), p3=pt(m,h*1.02);
      var c5=pt(m+hw*1.05,h*1.02), c6=pt(m+hw*1.18,h*.52), p4=pt(m+np,h*.36);
      var c7=pt(m+np*.45,h*.25), c8=pt(m+np*.65,0), p5=pt(m+np*1.45,0);
      ctx.lineTo(p1.x,p1.y);
      ctx.bezierCurveTo(c1.x,c1.y,c2.x,c2.y,p2.x,p2.y);
      ctx.bezierCurveTo(c3.x,c3.y,c4.x,c4.y,p3.x,p3.y);
      ctx.bezierCurveTo(c5.x,c5.y,c6.x,c6.y,p4.x,p4.y);
      ctx.bezierCurveTo(c7.x,c7.y,c8.x,c8.y,p5.x,p5.y);
      ctx.lineTo(x2,y2);
    }

    function piecePath(row,col) {
      var path=new Path2D();
      var x0=0,y0=0,x1=cellW,y1=cellH;
      var top = row>0 ? topology.h[row-1][col] : null;
      var right = col<N-1 ? topology.v[row][col] : null;
      var bottom = row<N-1 ? topology.h[row][col] : null;
      var left = col>0 ? topology.v[row][col-1] : null;
      path.moveTo(x0,y0);
      edgePath(path,x0,y0,x1,y0,top,false);
      edgePath(path,x1,y0,x1,y1,right,false);
      edgePath(path,x1,y1,x0,y1,bottom,true);
      edgePath(path,x0,y1,x0,y0,left,true);
      path.closePath();
      return path;
    }

    function buildTopology() {
      topology.h=[]; topology.v=[];
      for (var r=0;r<N-1;r++){ topology.h[r]=[]; for(var c=0;c<N;c++) topology.h[r][c]=rndEdge(); }
      for (var r=0;r<N;r++){ topology.v[r]=[]; for(var c=0;c<N-1;c++) topology.v[r][c]=rndEdge(); }
    }

    function layout() {
      var w = wrap.clientWidth || 600;
      var ratio = img.width && img.height ? img.width/img.height : 4/3;
      boardW = Math.min(w, 640);
      boardH = boardW / ratio;
      canvas.width = boardW;
      canvas.height = boardH + 60;
      canvas.style.width = boardW + "px";
      canvas.style.height = (boardH + 60) + "px";
      cellW = boardW / N;
      cellH = boardH / N;
      offX = 0; offY = 20;
    }

    function build() {
      if (!img.width || !img.height) return;
      canvas.style.display = "none";
      layout();
      buildTopology();
      pieces = [];
      var pad = Math.ceil(Math.max(cellW,cellH)*0.4);
      var scaled = document.createElement("canvas");
      scaled.width = boardW; scaled.height = boardH;
      var sctx = scaled.getContext("2d");
      sctx.drawImage(img, 0, 0, boardW, boardH);
      for (var row=0; row<N; row++) for (var col=0; col<N; col++) {
        var pth = piecePath(row,col);
        var off = document.createElement("canvas");
        off.width = Math.ceil(cellW + pad*2);
        off.height = Math.ceil(cellH + pad*2);
        var pctx = off.getContext("2d");
        pctx.save();
        pctx.translate(pad, pad);
        pctx.clip(pth);
        pctx.drawImage(scaled, -col*cellW, -row*cellH);
        pctx.lineWidth = 1.2; pctx.strokeStyle = "rgba(15,23,42,.6)"; pctx.stroke(pth);
        pctx.restore();
        pieces.push({ row:row, col:col, x: col*cellW, y: offY + row*cellH, tx: col*cellW, ty: offY + row*cellH, canvas: off, path: pth, pad: pad, locked: false, w: cellW, h: cellH });
      }
      if (progressEl) progressEl.textContent = "0%";
    }

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "rgba(15,23,42,.12)";
      ctx.fillRect(offX, offY, boardW, boardH);
      ctx.strokeStyle = "rgba(148,163,184,.3)";
      ctx.lineWidth = 2;
      ctx.strokeRect(offX, offY, boardW, boardH);
      pieces.forEach(function (p) {
        ctx.drawImage(p.canvas, p.x - p.pad, p.y - p.pad);
        if (focused === p) {
          ctx.save();
          ctx.strokeStyle = "#fbbf24";
          ctx.lineWidth = 3;
          ctx.strokeRect(p.x - 2, p.y - 2, p.w + 4, p.h + 4);
          ctx.restore();
        }
      });
      var locked = pieces.filter(function (p) { return p.locked; }).length;
      if (progressEl) progressEl.textContent = Math.round((locked / pieces.length) * 100) + "%";
    }

    function pos(e) {
      var rect = canvas.getBoundingClientRect();
      var clientX = e.touches ? e.touches[0].clientX : e.clientX;
      var clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return {
        x: (clientX - rect.left) * (rect.width ? canvas.width / rect.width : 1),
        y: (clientY - rect.top) * (rect.height ? canvas.height / rect.height : 1),
      };
    }

    canvas.addEventListener("mousedown", down);
    canvas.addEventListener("touchstart", down, { passive: false });
    window.addEventListener("mousemove", move);
    window.addEventListener("touchmove", move, { passive: false });
    window.addEventListener("mouseup", up);
    window.addEventListener("touchend", up);

    var dragging = null;
    function down(e) {
      var p0 = pos(e);
      for (var i = pieces.length - 1; i >= 0; i--) {
        var p = pieces[i];
        if (p.locked) continue;
        var lx = p0.x - p.x, ly = p0.y - p.y;
        if (ctx.isPointInPath(p.path, lx, ly)) {
          focused = p;
          dragging = { p: p, dx: p0.x - p.x, dy: p0.y - p.y };
          pieces.splice(i, 1); pieces.push(p);
          e.preventDefault();
          draw();
          return;
        }
      }
    }
    function move(e) {
      if (!dragging) return;
      e.preventDefault();
      var p0 = pos(e);
      dragging.p.x = p0.x - dragging.dx;
      dragging.p.y = p0.y - dragging.dy;
      draw();
    }
    function up() {
      if (!dragging) return;
      var p = dragging.p;
      if (Math.abs(p.x - p.tx) < cellW * 0.25 && Math.abs(p.y - p.ty) < cellH * 0.25) {
        p.x = p.tx; p.y = p.ty; p.locked = true;
      }
      dragging = null;
      draw();
    }

    var shuffleBtn = box.querySelector(".px-pz-shuffle");
    if (shuffleBtn) shuffleBtn.addEventListener("click", function () {
      if (!pieces.length) return;
      var movable = pieces.filter(function (p) { return !p.locked; });
      var slots = movable.map(function (p) { return { x: p.tx, y: p.ty }; });
      for (var i = slots.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * i);
        var slot = slots[i];
        slots[i] = slots[j];
        slots[j] = slot;
      }
      movable.forEach(function (p, i) {
        p.x = slots[i].x;
        p.y = slots[i].y;
      });
      var preview = box.querySelector(".px-pz-preview");
      if (preview) preview.style.display = "none";
      canvas.style.display = "block";
      draw();
    });

    if (imgSrc) {
      img.onload = build;
      img.onerror = function () {
        var preview = box.querySelector(".px-pz-preview");
        if (preview) preview.style.display = "block";
      };
      img.src = imgSrc;
    }
  });
})();

`;
