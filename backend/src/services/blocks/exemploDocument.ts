import { randomUUID } from "node:crypto";
import type { Block, ProjectDocument, ProjectPage } from "../converterService.js";

/**
 * Documento-modelo demonstrativo: contém **um exemplo de cada bloco** do
 * editor (conteúdo básico + ProjetoX + exercícios), com mídias SVG geradas
 * localmente para funcionar sem depender de arquivos externos.
 *
 * Serve como referência viva: abra no editor, compare com o bloco desejado e
 * copie a estrutura. Também é o material usado para validar o build publicado.
 */

const assets = {
  "exemplo-capa.svg": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 675" role="img" aria-label="Ilustração de capa com folhas e um tucano estilizado">
  <rect width="1200" height="675" fill="#0f766e"/>
  <circle cx="1010" cy="130" r="78" fill="#fbbf24" opacity=".9"/>
  <path d="M-40 600 Q 240 420 520 585 T 1240 540 L 1240 700 L -40 700 Z" fill="#064e3b" opacity=".75"/>
  <path d="M840 470 q 90 -150 210 -120 q -30 70 -120 118 q 130 -18 178 62 q -120 46 -232 -8 q 36 92 -28 150 q -64 -92 -8 -202 z" fill="#f97316"/>
  <path d="M838 468 q 96 -40 172 -18" stroke="#111827" stroke-width="12" fill="none" stroke-linecap="round"/>
  <text x="90" y="270" font-family="Georgia, serif" font-size="76" fill="#ffffff">Fauna Brasileira</text>
  <text x="94" y="334" font-family="system-ui, sans-serif" font-size="30" fill="#d1fae5">Material demonstrativo com todos os blocos</text>
</svg>`,
  "exemplo-faixa.svg": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 520" role="img" aria-label="Faixa decorativa em tons de verde com silhuetas de árvores">
  <rect width="1600" height="520" fill="#134e4a"/>
  <g fill="#0b3b36">
    <path d="M120 520 L240 150 L360 520 Z"/><path d="M420 520 L520 230 L620 520 Z"/>
    <path d="M760 520 L900 120 L1040 520 Z"/><path d="M1140 520 L1260 200 L1380 520 Z"/>
    <path d="M1440 520 L1520 280 L1600 520 Z"/>
  </g>
  <circle cx="1320" cy="120" r="56" fill="#fbbf24" opacity=".85"/>
</svg>`,
  "exemplo-card.svg": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" role="img" aria-label="Ilustração estilizada de um tucano sobre um galho">
  <rect width="800" height="600" fill="#ecfdf5"/>
  <rect x="60" y="470" width="680" height="26" rx="13" fill="#92400e"/>
  <ellipse cx="360" cy="330" rx="150" ry="120" fill="#111827"/>
  <circle cx="380" cy="215" r="86" fill="#111827"/>
  <path d="M440 190 q 150 -30 236 22 q -110 46 -236 44 z" fill="#f59e0b"/>
  <path d="M440 190 q 150 -30 236 22 q -110 26 -236 22 z" fill="#ef4444" opacity=".85"/>
  <circle cx="404" cy="196" r="16" fill="#f8fafc"/><circle cx="406" cy="196" r="7" fill="#111827"/>
  <path d="M280 430 q 60 -60 120 -10" stroke="#facc15" stroke-width="18" fill="none" stroke-linecap="round"/>
  <text x="40" y="560" font-family="system-ui, sans-serif" font-size="26" fill="#065f46">Imagem + texto</text>
</svg>`,
  "exemplo-galeria-1.svg": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" role="img" aria-label="Padrão de folhas em tons de verde">
  <rect width="800" height="500" fill="#065f46"/>
  <g fill="#34d399" opacity=".8">${Array.from({ length: 6 }, (_, r) =>
    Array.from({ length: 9 }, (_, c) => `<circle cx="${60 + c * 85 + (r % 2) * 40}" cy="${50 + r * 80}" r="22"/>`).join("")
  ).join("")}</g>
</svg>`,
  "exemplo-galeria-2.svg": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" role="img" aria-label="Padrão de ondas em tons de azul">
  <rect width="800" height="500" fill="#0c4a6e"/>
  <g fill="none" stroke="#38bdf8" stroke-width="14" opacity=".85">${Array.from({ length: 5 }, (_, i) =>
    `<path d="M0 ${120 + i * 80} q 100 -60 200 0 t 200 0 t 200 0 t 200 0"/>`
  ).join("")}</g>
</svg>`,
} as const;

export type ExemploAsset = { fileName: string; content: string };

const id = () => randomUUID();

function page(pageNumber: number, title: string, blocks: Block[]): ProjectPage {
  return { id: id(), pageNumber, title, blocks };
}

function block(b: Record<string, unknown>): Block {
  return { ...b, id: (b.id as string) || id() } as Block;
}

export function buildExemploDocument(projectId: string): ProjectDocument {
  const agora = new Date().toISOString();

  const callouts = [
    {
      variant: "importante" as const,
      contentHtml: "<p>Guarde este material: ele reúne <strong>todos os blocos disponíveis</strong> para consulta rápida.</p>",
    },
    {
      variant: "saiba-mais" as const,
      contentHtml: "<p>Use as caixas para complementar o conteúdo sem interromper a leitura principal.</p>",
    },
    {
      variant: "dica" as const,
      contentHtml: "<p>No editor, selecione o bloco e troque a variante no inspetor à direita.</p>",
    },
    {
      variant: "voce-sabia" as const,
      contentHtml: "<p>O Brasil abriga cerca de <strong>20% de todas as espécies</strong> conhecidas do planeta.</p>",
    },
    {
      variant: "box-pdf" as const,
      contentHtml: '<p>Material complementar em PDF: <a href="#page-content">abrir anexo</a>.</p>',
    },
    {
      variant: "vamos-refletir" as const,
      contentHtml: "<p>Como as escolhas individuais afetam a preservação dos biomas?</p>",
    },
    { variant: "box" as const, contentHtml: "<p>Caixa livre, sem ícone, para textos de apoio.</p>" },
    { variant: "info" as const, contentHtml: "<p><strong>Informação:</strong> variante clássica para contextualizar um conceito.</p>" },
    { variant: "tip" as const, contentHtml: "<p><strong>Dica:</strong> oriente a leitura em grupo antes dos exercícios.</p>" },
    { variant: "warning" as const, contentHtml: "<p><strong>Atenção:</strong> revise as imagens vinculadas antes de exportar o pacote.</p>" },
    { variant: "curiosity" as const, contentHtml: "<p><strong>Curiosidade:</strong> o formato exportado funciona totalmente offline.</p>" },
  ];

  const capa = page(1, "Capa e apresentação", [
    block({
      type: "cover",
      data: {
        title: "Fauna Brasileira",
        subtitle: "Material demonstrativo com todos os blocos do editor",
        image: "assets/exemplo-capa.svg",
        ctaLabel: "Começar a ler",
        ctaHref: "#page-content",
        align: "left",
      },
    }),
    block({ type: "heading", data: { level: 1, text: "Guia completo de blocos (H1)" } }),
    block({
      type: "paragraph",
      data: {
        html: "Este documento de exemplo percorre os <strong>blocos de conteúdo</strong>, as <strong>boxes do ProjetoX</strong> e os <strong>exercícios interativos</strong>. Cada página funciona como vitrine: clique no bloco no editor para ver como ele é configurado.",
      },
    }),
    block({ type: "heading", data: { level: 3, text: "O que você encontra aqui (H3)" } }),
    block({
      type: "paragraph",
      data: {
        html: "<ul><li><strong>Texto e estrutura:</strong> títulos H1/H2/H3, parágrafos, listas e destaques.</li><li><strong>Mídia e interação:</strong> imagens com zoom, link externo e zonas de clique, galeria, vídeo e embed.</li><li><strong>ProjetoX e jogos:</strong> flipcard, linha do tempo, tabela, código e 8 tipos de exercício.</li></ul>",
      },
    }),
    block({
      type: "highlight",
      data: {
        title: "Leia com atenção",
        html: "<p>As palavras <mark>destacadas</mark> marcam conceitos-chave. No editor, use <code>==palavra==</code> no texto.</p><p>Segundo parágrafo com ==dois destaques== para conferir a renderização.</p>",
        legend: "Destaques em amarelo indicam termos importantes.",
      },
    }),
    block({ type: "callout", data: callouts[0] }),
    block({
      type: "image",
      data: {
        src: "assets/exemplo-capa.svg",
        alt: "Ilustração de um tucano estilizado sobre folhagem verde",
        caption: "Imagem interativa: clique nos pontos para abrir a explicação.",
        enableZoom: true,
        hotspots: [
          {
            id: id(),
            x: 64,
            y: 12,
            w: 12,
            h: 18,
            title: "Sol",
            contentHtml: "<p>O sol aparece na composição para indicar clima tropical.</p>",
          },
          {
            id: id(),
            x: 66,
            y: 66,
            w: 22,
            h: 22,
            title: "Tucano",
            contentHtml: "<p>A ave representa a fauna da Mata Atlântica.</p>",
          },
        ],
      },
    }),
    block({
      type: "accordion",
      data: {
        title: "Tópicos de aprofundamento",
        items: [
          {
            id: id(),
            title: "O que é biodiversidade?",
            contentHtml: "<p>É a variedade de seres vivos e de ecossistemas de uma região.</p>",
            defaultOpen: true,
          },
          {
            id: id(),
            title: "Por que preservar?",
            contentHtml: "<p>Porque cada espécie participa do equilíbrio ecológico.</p>",
            defaultOpen: false,
          },
        ],
      },
    }),
    block({
      type: "tabs",
      data: {
        items: [
          { id: id(), label: "Mata Atlântica", contentHtml: "<p>Bioma costeiro com alta diversidade e forte pressão urbana.</p>" },
          { id: id(), label: "Cerrado", contentHtml: "<p>Savana brasileira, berço das grandes bacias hidrográficas.</p>" },
          { id: id(), label: "Amazônia", contentHtml: "<p>Maior floresta tropical do mundo e maior reserva de água doce.</p>" },
        ],
      },
    }),
  ]);

  const conteudo = page(2, "Conteúdo e mídia", [
    block({ type: "heading", data: { level: 2, text: "Recursos de leitura (H2)" } }),
    block({
      type: "paragraph",
      data: {
        html: "Os blocos abaixo combinam imagem, texto, dados e interação. São a base para transformar um material estático em uma experiência de leitura.",
      },
    }),
    block({
      type: "parallax",
      data: {
        image: "assets/exemplo-faixa.svg",
        title: "Separe os conteúdos",
        subtitle: "A faixa marca uma nova parte do material.",
        height: 280,
      },
    }),
    block({
      type: "image-text-card",
      data: {
        image: "assets/exemplo-card.svg",
        title: "Imagem e texto lado a lado (esquerda)",
        html: "<p>O card equilibra uma imagem explicativa com o texto de apoio. No celular, a imagem vai para cima do texto.</p>",
        layout: "left",
      },
    }),
    block({
      type: "image-text-card",
      data: {
        image: "assets/exemplo-card.svg",
        title: "Imagem e texto lado a lado (direita)",
        html: "<p>A variação com a imagem à direita ajuda a alternar o ritmo visual entre seções.</p>",
        layout: "right",
      },
    }),
    block({
      type: "image",
      data: {
        src: "assets/exemplo-card.svg",
        alt: "Ilustração estilizada de um tucano sobre um galho",
        caption: "Imagem com link externo configurado.",
        enableZoom: false,
        linkUrl: "https://www.icmbio.gov.br/",
      },
    }),
    block({
      type: "image",
      data: {
        src: "",
        alt: "Exemplo de imagem vinculada pendente",
        caption: "Placeholder de imagem vinculada ausente (vincule na aba Mídias).",
        missing: true,
        fileName: "ilustracao-pendente.png",
        enableZoom: true,
      },
    }),
    block({
      type: "gallery",
      data: {
        items: [
          { id: id(), src: "assets/exemplo-galeria-1.svg", caption: "Padrão de folhas" },
          { id: id(), src: "assets/exemplo-galeria-2.svg", caption: "Padrão de ondas" },
        ],
      },
    }),
    block({
      type: "table",
      data: {
        caption: "Biomas e características",
        headers: ["Bioma", "Clima", "Destaque"],
        rows: [
          ["Amazônia", "Equatorial úmido", "Maior floresta tropical"],
          ["Cerrado", "Tropical sazonal", "Berço das águas"],
          ["Caatinga", "Semiárido", "Só no Brasil"],
        ],
        striped: true,
      },
    }),
    block({
      type: "timeline",
      data: {
        title: "Linha do tempo da preservação",
        items: [
          { id: id(), title: "1934", contentHtml: "<p>Primeiro Código Florestal brasileiro.</p>", icon: "1" },
          { id: id(), title: "1988", contentHtml: "<p>A Constituição dedica um capítulo ao meio ambiente.</p>", icon: "2" },
          { id: id(), title: "2012", contentHtml: "<p>Novo Código Florestal e cadastro ambiental rural.</p>", icon: "3" },
        ],
      },
    }),
    block({
      type: "flipcard",
      data: {
        title: "Você sabia?",
        image: "assets/exemplo-card.svg",
        frontHtml: "<p>Clique para descobrir uma curiosidade sobre o tucano.</p>",
        backHtml: "<p>O bico do tucano é leve e ajuda a <strong>regular a temperatura</strong> do corpo.</p>",
        hint: "Clique para virar",
      },
    }),
    block({
      type: "video",
      data: {
        source: "youtube",
        url: "https://www.youtube.com/watch?v=aqz-KE-bpKQ",
        title: "Vídeo de apoio",
        caption: "Exemplo de vídeo incorporado com legenda descritiva.",
      },
    }),
    block({
      type: "external-embed",
      data: {
        embedUrl: "https://phet.colorado.edu/sims/html/forces-and-motion-basics/latest/forces-and-motion-basics_all.html",
        title: "Simulador interativo (PhET)",
      },
    }),
    block({
      type: "code",
      data: {
        filename: "fauna.js",
        language: "javascript",
        code: "const biomas = [\"Amazônia\", \"Cerrado\", \"Caatinga\"];\nconsole.log(`Total: ${biomas.length}`);",
      },
    }),
    ...callouts.slice(1).map((c) => block({ type: "callout", data: { variant: c.variant, contentHtml: c.contentHtml } })),
    block({
      type: "quiz",
      data: {
        question: "Qual bioma existe apenas no Brasil?",
        options: [
          { id: id(), text: "Caatinga", isCorrect: true, feedback: "Exato: a Caatinga é exclusivamente brasileira." },
          { id: id(), text: "Amazônia", isCorrect: false },
          { id: id(), text: "Cerrado", isCorrect: false },
        ],
        explanation: "A Caatinga é o único bioma exclusivamente brasileiro.",
      },
    }),
  ]);

  const exercicios = page(4, "Exercícios interativos", [
    block({ type: "heading", data: { level: 2, text: "Pratique o que aprendeu" } }),
    block({
      type: "paragraph",
      data: { html: "Todos os exercícios corrigem na hora, mostram o gabarito e podem ser respondidos pelo teclado." },
    }),
    block({
      type: "multiple-choice",
      data: {
        question: "Quais destes são biomas brasileiros? (mais de uma resposta)",
        options: [
          { id: "mc-a", text: "Amazônia" },
          { id: "mc-b", text: "Saara" },
          { id: "mc-c", text: "Cerrado" },
          { id: "mc-d", text: "Pampa" },
        ],
        correctIds: ["mc-a", "mc-c", "mc-d"],
        attempts: 2,
        explanation: "Amazônia, Cerrado e Pampa são biomas brasileiros; o Saara é um deserto africano.",
      },
    }),
    block({
      type: "true-false",
      data: {
        question: "Classifique as afirmações em verdadeiro ou falso.",
        statements: [
          { id: id(), text: "A Mata Atlântica cobre a maior parte do território brasileiro.", answer: false },
          { id: id(), text: "O Cerrado é conhecido como berço das águas.", answer: true },
          { id: id(), text: "A Caatinga é um bioma exclusivamente brasileiro.", answer: true },
        ],
        attempts: 2,
      },
    }),
    block({
      type: "fill-blanks",
      data: {
        question: "Complete as lacunas com o nome do bioma.",
        sentences: [
          { id: id(), text: "O ____ é a maior floresta tropical do mundo.", answers: ["amazonia", "amazônia"] },
          { id: id(), text: "A ____ é o único bioma exclusivamente brasileiro.", answers: ["caatinga"] },
        ],
        attempts: 2,
      },
    }),
    block({
      type: "ordering",
      data: {
        question: "Coloque os marcos da preservação na ordem cronológica.",
        items: [
          { id: id(), text: "1934 — Primeiro Código Florestal" },
          { id: id(), text: "1988 — Capítulo na Constituição" },
          { id: id(), text: "2012 — Novo Código Florestal" },
        ],
        attempts: 2,
      },
    }),
    block({
      type: "matching",
      data: {
        question: "Relacione cada bioma à sua característica.",
        pairs: [
          { id: id(), left: "Amazônia", right: "Maior floresta tropical" },
          { id: id(), left: "Cerrado", right: "Berço das águas" },
          { id: id(), left: "Caatinga", right: "Exclusivo do Brasil" },
          { id: id(), left: "Pampa", right: "Campos do Sul" },
        ],
        attempts: 2,
      },
    }),
    block({
      type: "memory-game",
      data: {
        title: "Encontre os pares",
        pairs: [
          { id: "m1", a: "Tucano", b: "Bico grande" },
          { id: "m2", a: "Onça", b: "Pelagem pintada" },
          { id: "m3", a: "Arara", b: "Penas coloridas" },
          { id: "m4", a: "Peixe-boi", b: "Água doce" },
        ],
        columns: 4,
      },
    }),
    block({
      type: "word-search",
      data: { title: "Encontre os animais", words: ["TUCANO", "ONCA", "ARARA", "PAMPA", "CERRADO"], size: 12 },
    }),
    block({
      type: "crossword",
      data: {
        title: "Palavras cruzadas",
        entries: [
          { id: id(), answer: "BIOMA", clue: "Grande comunidade ecológica com clima e vegetação próprios." },
          { id: id(), answer: "TUCANO", clue: "Ave de bico grande e colorido." },
          { id: id(), answer: "ONCA", clue: "Maior felino das Américas." },
          { id: id(), answer: "ARARA", clue: "Ave símbolo das florestas tropicais." },
        ],
      },
    }),
  ]);

  return {
    id: projectId,
    title: "Material demonstrativo — todos os blocos",
    sourceFormat: "MANUAL",
    locale: "pt-BR",
    createdAt: agora,
    updatedAt: agora,
    theme: {
      primaryColor: "#d42731",
      fontFamily: "system-ui, -apple-system, sans-serif",
      mode: "light",
    },
    assets: Object.keys(assets).map((fileName, i) => ({
      id: `exemplo-asset-${i + 1}`,
      fileName,
      path: `assets/${fileName}`,
      mimeType: "image/svg+xml",
      altText: fileName.replace(/^exemplo-|\.svg$/g, "").replace(/-/g, " "),
    })),
    pages: [capa, conteudo, exercicios].map((p, i) => ({ ...p, pageNumber: i + 1 })),
  };
}

/** Arquivos de mídia que acompanham o documento-modelo. */
export function exemploAssets(): ExemploAsset[] {
  return Object.entries(assets).map(([fileName, content]) => ({ fileName, content }));
}
