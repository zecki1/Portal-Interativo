import type { BlockType } from "../types/project";

/** Nome legível de cada tipo de bloco (usado em rótulos acessíveis). */
export const BLOCK_TYPE_LABELS: Record<BlockType, string> = {
  heading: "Título",
  paragraph: "Parágrafo",
  image: "Imagem",
  accordion: "Sanfona",
  tabs: "Abas",
  callout: "Caixa de destaque",
  video: "Vídeo",
  quiz: "Quiz",
  "external-embed": "Recurso externo",
  flipcard: "Cartão que vira",
  timeline: "Linha do tempo",
  table: "Tabela",
  cover: "Capa",
  parallax: "Faixa parallax",
  gallery: "Galeria",
  "image-text-card": "Imagem e texto",
  highlight: "Texto destacado",
  code: "Bloco de código",
  "multiple-choice": "Múltipla escolha",
  "true-false": "Verdadeiro ou falso",
  "fill-blanks": "Completar lacunas",
  ordering: "Ordenar itens",
  matching: "Relacionar colunas",
  "memory-game": "Jogo da memória",
  "word-search": "Caça-palavras",
  crossword: "Palavras cruzadas",
  puzzle: "Quebra-cabeça",
  divider: "Divisor",
  spacer: "Quebra / Espaço",
  audio: "Áudio",
  "html-custom": "HTML Customizado",
  columns: "Colunas",
  glossary: "Glossário",
  footnotes: "Notas de rodapé",
  math: "Fórmula matemática",
};

export function blockLabel(type: BlockType | string): string {
  return BLOCK_TYPE_LABELS[type as BlockType] || String(type);
}
