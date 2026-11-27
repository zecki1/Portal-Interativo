import type { ProjectTheme } from "../lib/theme";

export type BlockType =
  // Conteúdo básico
  | "heading"
  | "paragraph"
  | "image"
  | "accordion"
  | "tabs"
  | "callout"
  | "video"
  | "quiz"
  | "external-embed"
  // Conteúdo ProjetoX
  | "flipcard"
  | "timeline"
  | "table"
  | "cover"
  | "parallax"
  | "gallery"
  | "image-text-card"
  | "highlight"
  | "code"
  // Exercícios ProjetoX
  | "multiple-choice"
  | "true-false"
  | "fill-blanks"
  | "ordering"
  | "matching"
  | "memory-game"
  | "word-search"
  | "crossword"
  | "puzzle"
  | "divider"
  | "spacer"
  | "audio"
  | "html-custom"
  | "columns"
  | "glossary"
  | "footnotes"
  | "math";

export interface BlockLayout {
  x: number;
  y: number;
  w: number;
  h: number;
  frameId?: string;
  frameBg?: string;
}

export interface BlockStyle {
  padding?: number;
  background?: string;
  radius?: number;
  spacing?: number;
  animation?: "none" | "fade" | "slide";
}

export interface BaseBlock {
  id: string;
  type: BlockType;
  layout?: BlockLayout;
  style?: BlockStyle;
}

export interface HeadingBlock extends BaseBlock {
  type: "heading";
  data: {
    level: 1 | 2 | 3;
    text: string;
  };
}

export interface ParagraphBlock extends BaseBlock {
  type: "paragraph";
  data: {
    html: string;
    /** Texto posicionado sobre a página importada do PDF. */
    pdfText?: boolean;
    pdfPage?: number;
    pdfRegion?: string;
    fontSize?: number;
    fontName?: string;
    edited?: boolean;
  };
}

export interface ImageHotspot {
  id: string;
  /** Posição/tamanho em % da imagem (0–100). */
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  contentHtml: string;
  active?: boolean;
  shape?: "rect" | "square" | "circle" | "triangle" | "diamond";
}

export interface ImageBlock extends BaseBlock {
  type: "image";
  data: {
    src: string;
    alt: string;
    caption?: string;
    enableZoom?: boolean;
    linkUrl?: string;
    /** Zonas de clique: abrem um modal com título + conteúdo. */
    hotspots?: ImageHotspot[];
    /** Referência do InDesign cujo arquivo não veio no pacote. */
    missing?: boolean;
    fileName?: string;
    /** Imagem ilustrativa (PNLD 7.7.3): alt vazio + role="presentation". */
    decorative?: boolean;
    /** Equivalente textual de QR Code (PNLD 7.7.4). */
    textAlternative?: string;
  };
}

export interface AccordionBlock extends BaseBlock {
  type: "accordion";
  data: {
    title?: string;
    items: Array<{
      id: string;
      title: string;
      contentHtml: string;
      defaultOpen?: boolean;
    }>;
  };
}

export interface TabsBlock extends BaseBlock {
  type: "tabs";
  data: {
    items: Array<{
      id: string;
      label: string;
      contentHtml: string;
    }>;
  };
}

export interface CalloutBlock extends BaseBlock {
  type: "callout";
  data: {
    variant:
      | "info"
      | "tip"
      | "warning"
      | "curiosity"
      | "saiba-mais"
      | "importante"
      | "voce-sabia"
      | "dica"
      | "box-pdf"
      | "vamos-refletir"
      | "box";
    title?: string;
    contentHtml: string;
  };
}

export interface VideoBlock extends BaseBlock {
  type: "video";
  data: {
    source: "youtube" | "vimeo" | "local";
    url: string;
    title?: string;
    caption?: string;
    localSrc?: string;
    captions?: string;
    audioDescription?: string;
    transcript?: string;
    signLanguage?: string;
  };
}

export interface QuizBlock extends BaseBlock {
  type: "quiz";
  data: {
    question: string;
    options: Array<{
      id: string;
      text: string;
      isCorrect: boolean;
      feedback?: string;
    }>;
    explanation?: string;
  };
}

export interface ExternalEmbedBlock extends BaseBlock {
  type: "external-embed";
  data: {
    embedUrl: string;
    title?: string;
  };
}

/* ------------------------------------------------------------------ */
/* Conteúdo no padrão ProjetoX                                         */
/* ------------------------------------------------------------------ */

export interface FlipcardBlock extends BaseBlock {
  type: "flipcard";
  data: {
    title?: string;
    frontHtml: string;
    backHtml: string;
    image?: string;
    hint?: string;
  };
}

export interface TimelineBlock extends BaseBlock {
  type: "timeline";
  data: {
    title?: string;
    items: Array<{ id: string; title: string; contentHtml: string; icon?: string }>;
  };
}

export interface TableBlock extends BaseBlock {
  type: "table";
  data: {
    caption?: string;
    headers: string[];
    rows: string[][];
    striped?: boolean;
    rowHeaders?: boolean;
    textAlternative?: string;
  };
}

export interface CoverBlock extends BaseBlock {
  type: "cover";
  data: {
    title: string;
    subtitle?: string;
    image?: string;
    ctaLabel?: string;
    ctaHref?: string;
    align?: "left" | "center";
  };
}

export interface ParallaxBlock extends BaseBlock {
  type: "parallax";
  data: {
    image: string;
    title?: string;
    subtitle?: string;
    height?: number;
  };
}

export interface GalleryBlock extends BaseBlock {
  type: "gallery";
  data: {
    items: Array<{ id: string; src: string; caption?: string }>;
    autoplay?: boolean;
  };
}

export interface ImageTextCardBlock extends BaseBlock {
  type: "image-text-card";
  data: {
    image: string;
    title: string;
    html: string;
    layout?: "left" | "right";
  };
}

export interface HighlightBlock extends BaseBlock {
  type: "highlight";
  data: {
    title?: string;
    html: string;
    legend?: string;
  };
}

export interface CodeBlock extends BaseBlock {
  type: "code";
  data: {
    code: string;
    language?: string;
    filename?: string;
  };
}

/* ------------------------------------------------------------------ */
/* Exercícios no padrão ProjetoX                                       */
/* ------------------------------------------------------------------ */

export interface MultipleChoiceBlock extends BaseBlock {
  type: "multiple-choice";
  data: {
    question: string;
    options: Array<{ id: string; text: string }>;
    correctIds: string[];
    attempts?: number;
    explanation?: string;
  };
}

export interface TrueFalseBlock extends BaseBlock {
  type: "true-false";
  data: {
    question?: string;
    statements: Array<{ id: string; text: string; answer: boolean }>;
    attempts?: number;
    explanation?: string;
  };
}

export interface FillBlanksBlock extends BaseBlock {
  type: "fill-blanks";
  data: {
    question?: string;
    sentences: Array<{ id: string; text: string; answers: string[] }>;
    attempts?: number;
  };
}

export interface OrderingBlock extends BaseBlock {
  type: "ordering";
  data: {
    question?: string;
    items: Array<{ id: string; text: string }>;
    attempts?: number;
  };
}

export interface MatchingBlock extends BaseBlock {
  type: "matching";
  data: {
    question?: string;
    pairs: Array<{ id: string; left: string; right: string }>;
    attempts?: number;
  };
}

export interface MemoryGameBlock extends BaseBlock {
  type: "memory-game";
  data: {
    title?: string;
    pairs: Array<{ id: string; a: string; b: string }>;
    columns?: number;
  };
}

export interface WordSearchBlock extends BaseBlock {
  type: "word-search";
  data: {
    title?: string;
    words: string[];
    size?: number;
  };
}

export interface CrosswordBlock extends BaseBlock {
  type: "crossword";
  data: {
    title?: string;
    entries: Array<{ id: string; answer: string; clue: string }>;
  };
}

export interface PuzzleBlock extends BaseBlock {
  type: "puzzle";
  data: { title?: string; image: string; size?: number };
}

export interface DividerBlock extends BaseBlock {
  type: "divider";
  data: { style?: "solid" | "dashed" | "dotted"; color?: string };
}

export interface SpacerBlock extends BaseBlock {
  type: "spacer";
  data: { height?: number };
}

export interface AudioBlock extends BaseBlock {
  type: "audio";
  data: {
    title?: string;
    src: string;
    caption?: string;
    localSrc?: string;
    transcript?: string;
  };
}

export interface HtmlCustomBlock extends BaseBlock {
  type: "html-custom";
  data: { html: string };
}

export interface ColumnsBlock extends BaseBlock {
  type: "columns";
  data: { columns: Array<{ html: string }>; gap?: number };
}

/** Glossário PNLD (Anexo 03, 7.3.2). */
export interface GlossaryBlock extends BaseBlock {
  type: "glossary";
  data: {
    title?: string;
    items: Array<{ term: string; definition: string; refId?: string }>;
  };
}

/** Notas de rodapé PNLD (Anexo 03, 7.3.3). */
export interface FootnotesBlock extends BaseBlock {
  type: "footnotes";
  data: {
    title?: string;
    items: Array<{ contentHtml: string; refId?: string }>;
  };
}

/** Fórmula MathML com descrição alternativa (Anexo 03, 7.11/7.12). */
export interface MathBlock extends BaseBlock {
  type: "math";
  data: {
    mathml?: string;
    text?: string;
    description: string;
    display?: "block" | "inline";
  };
}

export type Block =
  | HeadingBlock
  | ParagraphBlock
  | ImageBlock
  | AccordionBlock
  | TabsBlock
  | CalloutBlock
  | VideoBlock
  | QuizBlock
  | ExternalEmbedBlock
  | FlipcardBlock
  | TimelineBlock
  | TableBlock
  | CoverBlock
  | ParallaxBlock
  | GalleryBlock
  | ImageTextCardBlock
  | HighlightBlock
  | CodeBlock
  | MultipleChoiceBlock
  | TrueFalseBlock
  | FillBlanksBlock
  | OrderingBlock
  | MatchingBlock
  | MemoryGameBlock
  | WordSearchBlock
  | CrosswordBlock
  | PuzzleBlock
  | DividerBlock
  | SpacerBlock
  | AudioBlock
  | HtmlCustomBlock
  | ColumnsBlock
  | GlossaryBlock
  | FootnotesBlock
  | MathBlock;

export type PageRole =
  | "conteudo"
  | "capa"
  | "segunda-capa"
  | "terceira-capa"
  | "quarta-capa"
  | "subcapa"
  | "atividade"
  | "encerramento"
  | "creditos"
  | "apresentacao"
  | "ficha-catalografica"
  | "lista-ods"
  | "lista-urls"
  | "sumario";

export interface ProjectPage {
  id: string;
  pageNumber: number;
  title: string;
  width?: number;
  height?: number;
  /** Papel visual da página no material publicado. */
  role?: PageRole;
  /** Fundo da página do PDF no modo "página de referência". */
  backgroundImage?: string;
  /** Páginas unidas: cada camada mantém sua largura original em pontos. */
  backgroundLayers?: Array<{ src: string; width: number; height: number }>;
  blocks: Block[];
}

export interface ProjectVersion {
  id: string;
  label: string;
  kind: "auto" | "manual" | "rollback";
  createdAt: string;
  pageCount: number;
  blockCount: number;
}

export interface ProjectAsset {
  id: string;
  fileName: string;
  path: string;
  mimeType: string;
  altText: string;
}

export interface ProjectDocument {
  id: string;
  title: string;
  sourceFormat: "PDF" | "IDML" | "MANUAL";
  createdAt: string;
  updatedAt: string;
  /** Tema do projeto: preset da biblioteca + overrides + CSS livre. */
  theme: ProjectTheme;
  assets: ProjectAsset[];
  pages: ProjectPage[];
  /** Idioma do conteúdo publicado (atributo `lang` do HTML). */
  locale?: string;
  /** "idml" preserva a composição em colunas/frames do IDML no desktop; "flow" empilha linearmente. */
  layoutMode?: "flow" | "idml" | "pdf";
  useIdmlLayout?: boolean;
  /** Exibe a navegação lateral (sumário de páginas) no material publicado. Padrão: true. */
  showNav?: boolean;
  /** Exibe a barra superior (título, tema, imprimir) no material publicado. Padrão: true. */
  showTopbar?: boolean;
  /** Metadados PNLD usados no head e no content.opf. */
  description?: string;
  author?: string;
  publisher?: string;
  fonts?: Array<{ family: string; url: string; weight?: string; style?: string; format?: string }>;
  urlList?: Array<{ label?: string; original: string; short: string }>;
}

export interface ProjectMeta {
  id: string;
  name: string;
  sourceFormat: string;
  createdAt: string;
  updatedAt: string;
  pageCount: number;
  blockCount: number;
  assetCount: number;
}
