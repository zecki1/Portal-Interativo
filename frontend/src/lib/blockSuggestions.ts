import type { Block, BlockType } from "../types/project";
import { newId } from "./ids";

export interface ConversionSuggestion {
  type: BlockType;
  label: string;
  action: () => Block;
}

const stripHtml = (html: string): string =>
  html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export function isImageSkeletonBlock(block: Block): boolean {
  if (block.type === "image") {
    return Boolean(block.data.missing || !block.data.src);
  }
  if (block.type === "callout") {
    const title = (block.data.title || "").toLowerCase();
    const content = (block.data.contentHtml || "").toLowerCase();
    return title.includes("arte vetorial") || content.includes("não pôde ser rasterizado");
  }
  return false;
}

export function extractVectorFileName(block: Block): string {
  if (block.type === "image") return block.data.fileName || block.data.alt || "imagem";
  if (block.type === "callout") {
    const m = block.data.contentHtml.match(/<strong>([^<]+)<\/strong>/i);
    if (m) return m[1];
  }
  return "imagem";
}

export function getImageSuggestions(
  block: Block,
  fallbackAssetSrc = ""
): ConversionSuggestion[] {
  const src = (block.type === "image" && block.data.src) || fallbackAssetSrc;
  const label = extractVectorFileName(block).replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ");
  const layout = block.layout ? { layout: block.layout } : {};

  return [
    {
      type: "image",
      label: "Imagem Interativa",
      action: () => ({
        id: block.id,
        type: "image",
        ...layout,
        data: {
          src,
          alt: label || "Imagem interativa",
          caption: "Clique nos pontos destacados para explorar.",
          enableZoom: true,
          missing: !src,
          fileName: src ? undefined : extractVectorFileName(block),
          hotspots: [
            {
              id: newId("hotspot"),
              x: 40,
              y: 40,
              w: 18,
              h: 18,
              title: "Ponto de destaque",
              contentHtml: "<p>Descreva este detalhe da imagem.</p>",
            },
          ],
        },
      }),
    },
    {
      type: "parallax",
      label: "Parallax",
      action: () => ({
        id: block.id,
        type: "parallax",
        ...layout,
        data: {
          image: src,
          title: label || "Seção visual",
          subtitle: "Faixa com imagem de fundo fixa.",
          height: 280,
        },
      }),
    },
    {
      type: "flipcard",
      label: "Flipcard",
      action: () => ({
        id: block.id,
        type: "flipcard",
        ...layout,
        data: {
          title: label || "Cartão interativo",
          image: src || undefined,
          frontHtml: "<p>Observe a imagem e clique para virar.</p>",
          backHtml: "<p>Explicação ou resposta no verso do cartão.</p>",
          hint: "Clique para virar",
        },
      }),
    },
    {
      type: "image-text-card",
      label: "Imagem + Texto",
      action: () => ({
        id: block.id,
        type: "image-text-card",
        ...layout,
        data: {
          image: src,
          title: label || "Imagem e texto",
          html: "<p>Texto explicativo ao lado da imagem.</p>",
          layout: "left",
        },
      }),
    },
    {
      type: "gallery",
      label: "Galeria",
      action: () => ({
        id: block.id,
        type: "gallery",
        ...layout,
        data: {
          items: [
            { id: newId("img"), src, caption: label || "Imagem 1" },
          ],
          autoplay: false,
        },
      }),
    },
  ];
}

const GAME_PATTERN =
  /quebra[-\s]?cabe[cç]a|ca[cç]a[-\s]?palavras|palavras\s+cruzadas|jogo\s+da\s+mem[oó]ria|atividade\s+interativa|\bjogo\b|\bquiz\b|\bgame\b/i;

export function detectStaticGameTitle(block: Block): string | null {
  if (block.type === "paragraph") {
    const raw = stripHtml(block.data.html || "");
    if (!GAME_PATTERN.test(raw)) return null;
    const withoutUrl = raw.replace(/https?:\/\/\S+/gi, "").trim();
    const afterColon = withoutUrl.split(/:\s*/).slice(1).join(": ").trim();
    return (afterColon || withoutUrl).slice(0, 80) || "Atividade interativa";
  }
  if (block.type === "callout") {
    const combined = `${block.data.title || ""} ${stripHtml(block.data.contentHtml || "")}`.trim();
    if (!GAME_PATTERN.test(combined)) return null;
    return (block.data.title || "Atividade interativa").slice(0, 80);
  }
  return null;
}

export function getGameSuggestions(block: Block, topicTitle: string): ConversionSuggestion[] {
  const layout = block.layout ? { layout: block.layout } : {};
  const cleanTopic = topicTitle.trim() || "Atividade interativa";
  const words = cleanTopic
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .split(/[^A-Z0-9]+/)
    .filter((w) => w.length >= 4)
    .slice(0, 4);
  const wordList = words.length >= 2 ? words : ["BRINQUEDO", "ANTIGO", "NOVO", "JOGO"];

  return [
    {
      type: "memory-game",
      label: "Jogo da Memória",
      action: () => ({
        id: block.id,
        type: "memory-game",
        ...layout,
        data: {
          title: cleanTopic,
          pairs: [
            { id: newId("m"), a: "Item 1", b: "Par correspondente 1" },
            { id: newId("m"), a: "Item 2", b: "Par correspondente 2" },
            { id: newId("m"), a: "Item 3", b: "Par correspondente 3" },
            { id: newId("m"), a: "Item 4", b: "Par correspondente 4" },
          ],
          columns: 4,
        },
      }),
    },
    {
      type: "matching",
      label: "Relacionar Colunas",
      action: () => ({
        id: block.id,
        type: "matching",
        ...layout,
        data: {
          question: cleanTopic,
          pairs: [
            { id: newId("p"), left: "Elemento A", right: "Característica A" },
            { id: newId("p"), left: "Elemento B", right: "Característica B" },
            { id: newId("p"), left: "Elemento C", right: "Característica C" },
          ],
          attempts: 2,
        },
      }),
    },
    {
      type: "word-search",
      label: "Caça-Palavras",
      action: () => ({
        id: block.id,
        type: "word-search",
        ...layout,
        data: { title: cleanTopic, words: wordList, size: 12 },
      }),
    },
    {
      type: "crossword",
      label: "Palavras Cruzadas",
      action: () => ({
        id: block.id,
        type: "crossword",
        ...layout,
        data: {
          title: cleanTopic,
          entries: wordList.map((w, i) => ({
            id: newId("cw"),
            answer: w,
            clue: `Dica ${i + 1} relacionada a ${cleanTopic}.`,
          })),
        },
      }),
    },
    {
      type: "ordering",
      label: "Ordenar Itens",
      action: () => ({
        id: block.id,
        type: "ordering",
        ...layout,
        data: {
          question: `${cleanTopic}: coloque na ordem correta`,
          items: [
            { id: newId("o"), text: "Passo 1" },
            { id: newId("o"), text: "Passo 2" },
            { id: newId("o"), text: "Passo 3" },
          ],
          attempts: 2,
        },
      }),
    },
    {
      type: "fill-blanks",
      label: "Completar Lacunas",
      action: () => ({
        id: block.id,
        type: "fill-blanks",
        ...layout,
        data: {
          question: cleanTopic,
          sentences: [
            { id: newId("fb"), text: "Complete esta frase com a ____ correta.", answers: ["palavra"] },
          ],
          attempts: 2,
        },
      }),
    },
    {
      type: "multiple-choice",
      label: "Múltipla Escolha",
      action: () => {
        const opt1 = newId("mc");
        return {
          id: block.id,
          type: "multiple-choice",
          ...layout,
          data: {
            question: cleanTopic,
            options: [
              { id: opt1, text: "Alternativa correta" },
              { id: newId("mc"), text: "Alternativa incorreta" },
            ],
            correctIds: [opt1],
            attempts: 2,
          },
        };
      },
    },
    {
      type: "true-false",
      label: "Verdadeiro ou Falso",
      action: () => ({
        id: block.id,
        type: "true-false",
        ...layout,
        data: {
          question: cleanTopic,
          statements: [
            { id: newId("tf"), text: "Primeira afirmação verdadeira.", answer: true },
            { id: newId("tf"), text: "Segunda afirmação falsa.", answer: false },
          ],
          attempts: 2,
        },
      }),
    },
  ];
}
