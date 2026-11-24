import type { Resource } from "./resource";

/**
 * Miniaturas de demonstração geradas em SVG (offline-safe), em cores sólidas —
 * sem gradientes, seguindo a paleta do sesi-teste-dev.
 */
function thumb(cor: string, acento: string, rotulo: string, variante: number): string {
  const fundoClaro = cor === "#fcd19c" || cor === "#d9d9d9" || cor === "#ffffff";
  const tinta = fundoClaro ? "#0c0c0d" : "#ffffff";
  const opacidade = fundoClaro ? "0.16" : "0.14";

  /** Escolhe texto claro ou escuro conforme a luminância da faixa. */
  function contraste(hex: string) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const luminancia = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminancia > 0.62 ? "#0c0c0d" : "#ffffff";
  }

  const formas = [
    `<circle cx="650" cy="140" r="180" fill="${tinta}" opacity="${opacidade}"/>`,
    `<circle cx="650" cy="140" r="180" fill="${tinta}" opacity="${opacidade}"/><circle cx="650" cy="140" r="96" fill="${acento}"/>`,
    `<rect x="470" y="70" width="280" height="280" rx="48" fill="${tinta}" opacity="${opacidade}"/>`,
  ][variante % 3];

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600" role="img">
  <rect width="800" height="600" fill="${cor}"/>
  ${formas}
  <rect x="0" y="440" width="800" height="160" fill="${acento}"/>
  <g font-family="Open Sans, Segoe UI, sans-serif">
    <text x="56" y="92" font-size="19" font-weight="700" letter-spacing="6" fill="${tinta}">SESI</text>
    <text x="56" y="540" font-size="34" font-weight="700" fill="${contraste(acento)}">${rotulo}</text>
  </g>
</svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

const base: Resource[] = [
  {
    id: "demo-1",
    title: "Moça de pele morena com óculos sentada",
    description:
      "Ilustração vetorial de uma jovem de pele morena, óculos e cabelo cacheado, sentada em uma cadeira. Ideal para materiais de diversidade e inclusão.",
    type: "imagem",
    tags: ["mulher", "negra", "morena", "óculos", "sentada", "diversidade", "inclusão"],
    author: "Fabiano Souza",
    thumbnailUrl: thumb("#d42731", "#fcd19c", "Diversidade", 0),
    fileName: "moca-morena-oculos.png",
    sizeBytes: 2_480_000,
    dimensions: "3000 × 2400 px",
    createdAt: "2026-11-12T14:20:00.000Z",
    cues: ["comunicacao", "destaque"],
    notes:
      "Usar em capas de campanha e posts de abertura. A personagem foi criada para a coleção de diversidade; manter o recorte até os joelhos quando aplicada em cards.",
    prompt:
      "Ilustração vetorial de uma jovem de pele morena, óculos de armação fina e cabelo cacheado, sentada em uma cadeira, postura relaxada, estilo flat com traço limpo, paleta SESI (vermelho #D42731, bege #FCD19C, preto #0C0C0D), fundo branco, sem gradientes. Exportar em SVG com camadas nomeadas.",
    comments: [
      {
        author: "Marina Costa",
        text: "Ajustei o tom de pele para ficar mais próximo da referência enviada pelo time de diversidade.",
        at: "2026-11-13T09:30:00.000Z",
      },
      {
        author: "Vinícius Almeida",
        text: "Funciona bem no card 4:3 e no banner 16:9 — o recorte do cabelo não corta.",
        at: "2026-11-14T16:12:00.000Z",
      },
    ],
  },
  {
    id: "demo-2",
    title: "Mulher negra sentada com notebook",
    description:
      "Foto editorial de mulher negra trabalhando em um notebook, fundo neutro. Uso livre em campanhas educacionais.",
    type: "imagem",
    tags: ["mulher", "negra", "sentada", "notebook", "trabalho", "tecnologia"],
    author: "Vinícius Almeida",
    thumbnailUrl: thumb("#0c0c0d", "#d42731", "Trabalho", 1),
    fileName: "mulher-negra-notebook.jpg",
    sizeBytes: 4_120_000,
    dimensions: "4200 × 2800 px",
    createdAt: "2026-11-10T09:05:00.000Z",
    cues: ["comunicacao", "cuidados"],
    notes:
      "Foto com autorização de imagem assinada (arquivo em /juridico). Evitar recortes que escondam as mãos — elas aparecem no teclado.",
    prompt:
      "Fotografia editorial de uma mulher negra trabalhando em um notebook, luz natural suave vindo da esquerda, fundo cinza neutro, enquadramento horizontal 3:2, roupa em tons de vermelho e bege, expressão concentrada e acolhedora. Estilo documental, sem excesso de saturação.",
    comments: [
      {
        author: "Ana Beatriz Lima",
        text: "Essa é a melhor opção para a campanha de tecnologia. Já usei no banner do AVA.",
        at: "2026-11-11T11:40:00.000Z",
      },
    ],
  },
  {
    id: "demo-3",
    title: "Família diversa em roda de conversa",
    description:
      "Ilustração de uma família diversa em roda de conversa, representando diferentes gerações e configurações familiares.",
    type: "imagem",
    tags: ["família", "diversidade", "conversa", "gerações", "comunidade"],
    author: "Ana Beatriz Lima",
    thumbnailUrl: thumb("#980e08", "#fcd19c", "Família", 2),
    fileName: "familia-diversa.png",
    sizeBytes: 1_860_000,
    dimensions: "2400 × 1800 px",
    createdAt: "2026-11-08T16:40:00.000Z",
    cues: ["comunicacao", "destaque"],
    notes:
      "Boa para abertura de matérias sobre convivência. Cuidado ao espelhar a imagem: um dos personagens usa aliança na mão esquerda.",
    prompt:
      "Ilustração flat de uma família diversa em roda de conversa, diferentes gerações e configurações familiares, móveis simples, plantas ao fundo, paleta SESI com vermelho #D42731 e bege #FCD19C, fundo branco, sem gradientes.",
    comments: [
      {
        author: "Fabiano Souza",
        text: "Sugiro usar esta arte na coleção de diversidade e na home do catálogo.",
        at: "2026-11-09T10:05:00.000Z",
      },
    ],
  },
  {
    id: "demo-4",
    title: "Estudante em laboratório de ciências",
    description:
      "Estudante usando equipamentos de laboratório em aula prática de ciências. Foto com autorização de uso.",
    type: "imagem",
    tags: ["estudante", "laboratório", "ciências", "educação", "jovem"],
    author: "Fabiano Souza",
    thumbnailUrl: thumb("#fcd19c", "#d42731", "Ciências", 0),
    fileName: "estudante-laboratorio.jpg",
    sizeBytes: 3_560_000,
    dimensions: "3600 × 2400 px",
    createdAt: "2026-11-06T11:15:00.000Z",
    cues: ["comunicacao", "cuidados"],
    notes:
      "Equipamentos de vidro exigem legenda de segurança. O estudante está sem óculos de proteção na foto — usar apenas em materiais internos.",
    prompt:
      "Fotografia de estudante em laboratório de ciências, jaleco branco, vidrarias e bancada de madeira, luz lateral suave, fundo levemente desfocado, enquadramento 3:2, cores neutras com um detalhe vermelho na cena.",
    comments: [
      {
        author: "Marina Costa",
        text: "Marcar como uso interno por causa do EPI. Já sinalizei no time de segurança.",
        at: "2026-11-07T08:20:00.000Z",
      },
    ],
  },
  {
    id: "demo-5",
    title: "Crianças com deficiência brincando",
    description:
      "Conjunto de ilustrações de crianças com deficiência em situações de brincadeira, em estilo flat e cores da marca.",
    type: "vetor",
    tags: ["crianças", "deficiência", "inclusão", "brincadeira", "flat"],
    author: "Vinícius Almeida",
    thumbnailUrl: thumb("#d42731", "#fcd19c", "Inclusão", 1),
    fileName: "criancas-inclusao.svg",
    sizeBytes: 486_000,
    dimensions: "Vetor escalável",
    createdAt: "2026-11-04T08:30:00.000Z",
    cues: ["comunicacao", "destaque", "cuidados"],
    notes:
      "Kit com 8 cenas. Revisar com o time de acessibilidade antes de publicar: braile e Libras precisam aparecer corretamente.",
    prompt:
      "Conjunto de ilustrações vetoriais de crianças com deficiência brincando, estilo flat, formas arredondadas, paleta SESI (vermelho #D42731, bege #FCD19C, preto #0C0C0D), fundo branco, traço consistente, sem gradientes. Exportar cada cena em SVG separado.",
    comments: [
      {
        author: "Ana Beatriz Lima",
        text: "As cenas 3 e 5 são as mais fortes para campanha de inclusão.",
        at: "2026-11-05T14:00:00.000Z",
      },
    ],
  },
  {
    id: "demo-6",
    title: "Ícones de acessibilidade",
    description:
      "Pacote com 24 ícones de acessibilidade em traço fino: Libras, audiodescrição, braile, legendas e mobilidade.",
    type: "vetor",
    tags: ["ícones", "acessibilidade", "libras", "braile", "legendas", "svg"],
    author: "Marina Costa",
    thumbnailUrl: thumb("#0c0c0d", "#fcd19c", "Acessibilidade", 2),
    fileName: "icones-acessibilidade.svg",
    sizeBytes: 312_000,
    dimensions: "24 × 24 px (grid)",
    createdAt: "2026-11-02T13:00:00.000Z",
    cues: ["comunicacao", "alerta"],
    notes:
      "Grid de 24 px, traço de 1,5 px e área de respiro de 2 px. Não alterar a espessura ao reduzir para 16 px.",
    prompt:
      "Pacote de 24 ícones de acessibilidade em traço fino de 1,5 px, grid 24x24, cantos arredondados, monocromáticos em preto #0C0C0D, incluindo Libras, audiodescrição, braile, legendas e mobilidade reduzida. Exportar em SVG otimizado.",
    comments: [
      {
        author: "Fabiano Souza",
        text: "Padronizei o traço com o restante do design system.",
        at: "2026-11-03T09:10:00.000Z",
      },
    ],
  },
  {
    id: "demo-7",
    title: "Personagens infantis inclusivos",
    description:
      "Família de personagens infantis com diferentes tons de pele, cabelos e características físicas. Vetores organizados em camadas.",
    type: "vetor",
    tags: ["personagens", "crianças", "diversidade", "infantil", "vetor"],
    author: "Fabiano Souza",
    thumbnailUrl: thumb("#d42731", "#0c0c0d", "Personagens", 0),
    fileName: "personagens-infantis.svg",
    sizeBytes: 724_000,
    dimensions: "Vetor escalável",
    createdAt: "2026-10-30T10:45:00.000Z",
    cues: ["comunicacao", "destaque"],
    notes:
      "Cada personagem tem frente, perfil e costas. Manter a paleta de pele original ao criar novas poses.",
    prompt:
      "Família de personagens infantis inclusivos, diferentes tons de pele, cabelos e características físicas, estilo flat com contorno arredondado, paleta SESI, três poses por personagem (frente, perfil e costas), fundo transparente, sem gradientes.",
    comments: [],
  },
  {
    id: "demo-8",
    title: "Textura de papel reciclado",
    description:
      "Textura em alta resolução de papel reciclado para fundos de apresentações e materiais impressos.",
    type: "imagem",
    tags: ["textura", "papel", "reciclado", "fundo", "sustentabilidade"],
    author: "Marina Costa",
    thumbnailUrl: thumb("#d9d9d9", "#d42731", "Textura", 1),
    fileName: "textura-papel.jpg",
    sizeBytes: 5_240_000,
    dimensions: "5000 × 3500 px",
    createdAt: "2026-10-28T15:25:00.000Z",
    cues: ["comunicacao", "cuidados"],
    notes:
      "Textura clara: aplicar sobre ela apenas texto escuro. Não usar atrás de logotipo colorido.",
    prompt:
      "Textura de papel reciclado em alta resolução, fibras visíveis, tom bege claro uniforme, iluminação difusa, sem sombras fortes. Fotografia macro, 5000x3500 px.",
    comments: [
      {
        author: "Vinícius Almeida",
        text: "Usei no relatório de sustentabilidade e ficou ótimo com o vermelho por cima.",
        at: "2026-10-29T13:45:00.000Z",
      },
    ],
  },
  {
    id: "demo-9",
    title: "Manual de identidade SESI 2026",
    description:
      "Guia completo de aplicação da marca: cores, tipografia, grid, usos incorretos e exemplos. PDF atualizado.",
    type: "arquivo",
    tags: ["manual", "identidade", "marca", "pdf", "design system"],
    author: "Vinícius Almeida",
    thumbnailUrl: thumb("#0c0c0d", "#d42731", "Manual de marca", 2),
    fileName: "manual-identidade-sesi-2026.pdf",
    sizeBytes: 8_960_000,
    dimensions: "PDF · 84 páginas",
    createdAt: "2026-10-25T09:10:00.000Z",
    cues: ["comunicacao", "alerta"],
    notes:
      "Documento oficial: qualquer dúvida de aplicação da marca deve citar a página. Versão anterior (2024) foi arquivada.",
    prompt:
      "Organize um manual de identidade visual em PDF A4, capa vermelha #D42731 com logotipo branco, sumário, páginas de cores, tipografia e exemplos de uso correto e incorreto. Fonte Open Sans, grid de 12 colunas.",
    comments: [
      {
        author: "Marina Costa",
        text: "Atualizei as páginas 12 a 18 com as novas cores de destaque.",
        at: "2026-10-26T10:30:00.000Z",
      },
    ],
  },
  {
    id: "demo-10",
    title: "Kit de logos e selos SESI",
    description:
      "Pacote com logotipos em SVG, PNG e EPS, além de selos de certificação e versões monocromáticas.",
    type: "arquivo",
    tags: ["logo", "selos", "marca", "kit", "svg", "png"],
    author: "Fabiano Souza",
    thumbnailUrl: thumb("#980e08", "#fcd19c", "Kit de logos", 0),
    fileName: "kit-logos-sesi.zip",
    sizeBytes: 12_400_000,
    dimensions: "ZIP · 48 arquivos",
    createdAt: "2026-10-22T17:05:00.000Z",
    cues: ["destaque", "alerta"],
    notes:
      "Sempre usar o SVG original; não redesenhar o logo. Em fundos vermelhos, usar apenas a versão branca.",
    prompt:
      "Kit de logotipos institucionais em SVG, PNG e EPS, versões colorida, branca, preta e monocromática, área de proteção definida, sem distorção. Incluir selos de certificação em vetor.",
    comments: [],
  },
  {
    id: "demo-11",
    title: "Jovem com prótese praticando esporte",
    description:
      "Foto de jovem com prótese praticando corrida em pista de atletismo. Representatividade e superação.",
    type: "imagem",
    tags: ["jovem", "prótese", "esporte", "atletismo", "deficiência", "superação"],
    author: "Ana Beatriz Lima",
    thumbnailUrl: thumb("#0c0c0d", "#d42731", "Esporte", 1),
    fileName: "jovem-protese-esporte.jpg",
    sizeBytes: 3_980_000,
    dimensions: "3800 × 2600 px",
    createdAt: "2026-10-20T07:50:00.000Z",
    cues: ["destaque", "cuidados"],
    notes:
      "Evitar legendas que tratem a deficiência como obstáculo. Preferir textos sobre desempenho e conquista.",
    prompt:
      "Fotografia de jovem com prótese praticando corrida em pista de atletismo, movimento congelado, luz de fim de tarde, fundo desfocado, enquadramento horizontal, cores quentes com detalhe vermelho na pista.",
    comments: [
      {
        author: "Fabiano Souza",
        text: "Foto usada na campanha de esporte inclusivo — aprovada pelo comitê de diversidade.",
        at: "2026-10-21T15:00:00.000Z",
      },
    ],
  },
  {
    id: "demo-12",
    title: "Padrão de formas geométricas",
    description:
      "Padrão vetorial de formas geométricas nas cores da marca, com repetição contínua para fundos e embalagens.",
    type: "vetor",
    tags: ["padrão", "formas", "geométrico", "fundo", "pattern"],
    author: "Marina Costa",
    thumbnailUrl: thumb("#d42731", "#0c0c0d", "Padrão", 2),
    fileName: "padrao-geometrico.svg",
    sizeBytes: 268_000,
    dimensions: "Vetor escalável",
    createdAt: "2026-10-18T12:35:00.000Z",
    cues: ["destaque", "cuidados"],
    notes:
      "Repetição sem emenda em 600 × 600 px. Não usar atrás de texto pequeno — o contraste cai.",
    prompt:
      "Padrão vetorial contínuo de formas geométricas (círculos, retângulos arredondados e triângulos) em vermelho #D42731, bege #FCD19C e preto #0C0C0D sobre fundo branco, ritmo regular, repetição sem emenda em 600x600 px, sem gradientes.",
    comments: [],
  },
];

/** Histórias de personagem que acompanham cada peça. */
const HISTORIAS: Record<string, string> = {
  "demo-1":
    "Valentina tem 17 anos, cursa o 3º ano do ensino médio e sonha em ser arquiteta. Usa óculos de armação fina desde os 9 anos e adora desenhar nos intervalos. A pose sentada foi criada para transmitir calma e escuta — boa para materiais sobre acolhimento, diversidade e protagonismo juvenil.",
  "demo-2":
    "Cláudia é analista de dados e mentora de meninas em tecnologia. Na foto, trabalha em um notebook depois da aula, com a luz da janela batendo de lado. A imagem nasceu de uma campanha sobre mulheres na tecnologia e é liberada para uso em materiais internos e externos.",
  "demo-3":
    "Dona Marlene reúne os filhos e os netos todo domingo para o almoço. A ilustração mostra a roda de conversa que acontece depois — cada geração com seu jeito de falar. É a cena de abertura da coleção de diversidade.",
  "demo-5":
    "O projeto Brincar é para Todos criou sete crianças que brincam do jeito delas: com prótese, cadeira de rodas, Libras, braile e muita imaginação. Cada cena foi revisada com o time de acessibilidade antes de entrar no catálogo.",
  "demo-7":
    "Trio de personagens infantis criado para a coleção de diversidade: Nina, Téo e Ayô. Cada um tem três poses (frente, perfil e costas) e uma paleta de pele própria, que deve ser mantida em qualquer novo material.",
  "demo-9":
    "O manual de identidade reúne as regras da marca SESI para 2026. Foi escrito depois de uma rodada de escuta com as regionais e substitui a versão de 2024. Toda dúvida de aplicação deve citar a página do documento.",
  "demo-11":
    "Kauã tem 16 anos e treina atletismo cinco vezes por semana. A foto foi feita no fim da tarde, na pista da escola, e virou capa da campanha de esporte inclusivo. O combinado com o time de diversidade: falar de desempenho e conquista, nunca de obstáculo.",
};

const POSES: Record<string, number> = {
  "demo-5": 8,
  "demo-7": 12,
  "demo-6": 24,
  "demo-12": 0,
};

const PRONTOS_PARA_ANIMACAO = new Set(["demo-5", "demo-7"]);

function enriquecer(recurso: Resource, indice: number): Resource {
  const poses = POSES[recurso.id] ?? 0;
  const animationReady = PRONTOS_PARA_ANIMACAO.has(recurso.id);
  const arquivosExtras =
    recurso.id === "demo-1"
      ? [
          { id: "demo-1-f1", name: "moca-morena-oculos-pose-2.png", sizeBytes: 2_310_000, type: "imagem" as const },
          { id: "demo-1-f2", name: "moca-morena-oculos-pose-3.png", sizeBytes: 2_260_000, type: "imagem" as const },
        ]
      : recurso.id === "demo-5"
        ? [
            { id: "demo-5-f1", name: "criancas-inclusao-cena-2.svg", sizeBytes: 61_000, type: "vetor" as const },
            { id: "demo-5-f2", name: "criancas-inclusao-cena-3.svg", sizeBytes: 58_000, type: "vetor" as const },
            { id: "demo-5-f3", name: "criancas-inclusao-cena-4.svg", sizeBytes: 63_000, type: "vetor" as const },
          ]
        : [];

  const arquivos = [
    {
      id: `${recurso.id}-f0`,
      name: recurso.fileName ?? `${recurso.id}.png`,
      sizeBytes: recurso.sizeBytes,
      type: recurso.type,
    },
    ...arquivosExtras,
  ];

  const editadoEm = new Date(new Date(recurso.createdAt).getTime() + 26 * 60 * 60 * 1000).toISOString();
  const editors = [
    { author: recurso.author, action: "criação", at: recurso.createdAt },
    ...(indice % 3 === 0
      ? [{ author: "Marina Costa", action: "tags", at: editadoEm }]
      : indice % 3 === 1
        ? [{ author: "Vinícius Almeida", action: "história", at: editadoEm }]
        : []),
  ];

  return {
    ...recurso,
    story: HISTORIAS[recurso.id],
    poses,
    animationReady,
    animationFiles: animationReady ? Math.max(arquivos.length, 4) : 0,
    files: arquivos,
    editors,
    updatedAt: editadoEm,
    notes: recurso.notes,
  } as Resource;
}

export const recursosDemo: Resource[] = base.map(enriquecer);
