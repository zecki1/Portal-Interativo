export type ResourceType = "imagem" | "bitmap" | "vetor" | "video" | "arquivo";

/** Sinais de uso indicados pelos designers ao publicar o recurso. */
export type CueKind = "comunicacao" | "alerta" | "destaque" | "cuidados";

export interface ResourceComment {
  author: string;
  text: string;
  at: string;
}

/** Um arquivo dentro do mesmo recurso (a "pasta" do personagem/peça). */
export interface ResourceFile {
  id: string;
  name: string;
  sizeBytes?: number;
  type?: ResourceType;
  url?: string;
  dimensions?: string;
}

/** Uma versão de um arquivo do recurso. */
export interface FileVersion {
  id: string;
  fileId: string;
  version: number;
  url?: string;
  name: string;
  sizeBytes?: number;
  uploadedBy: string;
  createdAt: string;
  isCurrent: boolean;
}

/** Registro de quem enviou e de quem editou. */
export interface ResourceEdit {
  author: string;
  action: string;
  at: string;
}

export interface Resource {
  id: string;
  title: string;
  description?: string;
  type: ResourceType;
  tags: string[];
  author: string;
  thumbnailUrl?: string;
  fileName?: string;
  sizeBytes?: number;
  dimensions?: string;
  createdAt: string;
  updatedAt?: string;
  /** Onde o recurso funciona melhor: comunicação, alerta, destaque, cuidados. */
  cues?: CueKind[];
  /** História do personagem/peça — contexto narrativo para reutilizar o recurso. */
  story?: string;
  /** Características do personagem/recurso (aparência, traços, tags descritivas). */
  characteristics?: string;
  /** Profissão do personagem/recurso. */
  profession?: string;
  /** Anotações livres da equipe (contexto, restrições, direitos de imagem). */
  notes?: string;
  /** Prompt usado para gerar a imagem ou animação — pronto para copiar. */
  prompt?: string;
  /** Quantidade de poses prontas do personagem. */
  poses?: number;
  /** Posições mapeadas do personagem/recurso (frente, verso, cima, baixo, sentado, etc). */
  posicoes?: string[];
  /** Se o recurso já pode seguir para animação. */
  animationReady?: boolean;
  /** Quantos arquivos de animação existem no mesmo endereço. */
  animationFiles?: number;
  /** Arquivos que compõem o recurso (capa + variações). */
  files?: ResourceFile[];
  /** Versões de arquivos agrupadas por fileId. */
  fileVersions?: Record<string, FileVersion[]>;
  comments?: ResourceComment[];
  /** Histórico de autorias: quem criou e quem editou. */
  editors?: ResourceEdit[];
}

export const TYPE_LABELS: Record<ResourceType, string> = {
  imagem: "Imagem",
  bitmap: "Bitmap",
  vetor: "Vetor",
  video: "Vídeo",
  arquivo: "Arquivo",
};

export const CUE_LABELS: Record<CueKind, string> = {
  comunicacao: "Comunicação",
  alerta: "Alerta",
  destaque: "Destaque",
  cuidados: "Cuidados",
};

export const CUE_DESCRIPTIONS: Record<CueKind, string> = {
  comunicacao: "Bom para peças informativas, posts e materiais de rotina.",
  alerta: "Chama atenção para avisos, prazos e mensagens urgentes.",
  destaque: "Funciona como elemento principal de campanhas e capas.",
  cuidados: "Exige revisão de contexto, acessibilidade ou direitos de imagem.",
};

/** Cores dos sinais de uso, com contraste nos dois temas. */
export const CUE_STYLES: Record<CueKind, string> = {
  comunicacao: "border-brand-red/30 bg-brand-red/10 text-brand-red-ink",
  alerta: "border-[#c98a00]/40 bg-[#fcd19c]/35 text-[#7a5200]",
  destaque: "border-brand-black/20 bg-brand-black/5 text-ink",
  cuidados: "border-line bg-surface-2 text-muted",
};

export function normalizarTipo(valor: unknown): ResourceType {
  const texto = String(valor ?? "").toLowerCase();
  const mime = texto;
  if (mime.includes("svg") || mime.includes("ai") || mime.includes("eps") || mime.includes("cdr") || mime.includes("vetor") || mime.includes("vector")) return "vetor";
  if (mime.includes("video") || mime.includes("mp4") || mime.includes("webm") || mime.includes("mov")) return "video";
  if (mime.includes("jpg") || mime.includes("jpeg") || mime.includes("png") || mime.includes("webp") || mime.includes("bmp") || mime.includes("tiff") || mime.includes("image")) return "imagem";
  if (
    mime.includes("audio") ||
    mime.includes("pdf") ||
    mime.includes("doc") ||
    mime.includes("xls") ||
    mime.includes("ppt") ||
    mime.includes("zip") ||
    mime.includes("arquivo") ||
    mime.includes("file")
  )
    return "arquivo";
  return "imagem";
}

/** Tipo efetivo do arquivo, considerando mime e extensão (dados antigos inclusos). */
export function tipoDoArquivo(arquivo: ResourceFile): ResourceType {
  return normalizarTipo(`${arquivo.type ?? ""} ${arquivo.name}`);
}

/** Se o arquivo pode ser exibido numa tag <img> (bitmap ou SVG). */
export function previavel(arquivo: { name?: string; type?: ResourceType }) {
  const tipo = normalizarTipo(`${arquivo.type ?? ""} ${arquivo.name ?? ""}`);
  if (tipo === "imagem" || tipo === "bitmap") return true;
  return tipo === "vetor" && /\.svg$/i.test(arquivo.name ?? "");
}

/**
 * Baixa um arquivo mantendo o nome original. Para URLs do backend acrescenta
 * `?download=1`, que faz o servidor responder com Content-Disposition e evita
 * carregar arquivos grandes (até 500 MB) na memória do navegador.
 */
export function baixarArquivo(url: string, nome: string) {
  const nomeFinal = nome?.trim() || "arquivo";
  const externo = /^https?:/i.test(url);
  const endereco = externo
    ? `${url}${url.includes("?") ? "&" : "?"}download=1`
    : url;

  const link = document.createElement("a");
  link.href = endereco;
  link.download = nomeFinal;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export function formatarTamanho(bytes?: number) {
  if (!bytes || bytes <= 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatarData(iso?: string) {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(
      new Date(iso)
    );
  } catch {
    return "—";
  }
}

export function formatarDataHora(iso?: string) {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return "—";
  }
}

export function iniciais(nome: string) {
  return nome
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte.charAt(0).toUpperCase())
    .join("");
}

/** "mulher, negra" → ["mulher", "negra"], sem duplicatas e sem vazios. */
export function separarTags(texto: string) {
  return Array.from(
    new Set(
      texto
        .split(/[,;\n]+/)
        .map((tag) => tag.trim().replace(/^#/, ""))
        .filter(Boolean)
    )
  );
}

export function totalDeArquivos(recurso: Resource) {
  return recurso.files?.length ?? (recurso.fileName ? 1 : 0);
}

/**
 * Texto pronto para copiar: usa o prompt cadastrado ou monta uma sugestão
 * a partir do título, tags e tipo do recurso.
 */
export function promptDoRecurso(recurso: Resource) {
  if (recurso.prompt?.trim()) return recurso.prompt.trim();

  const tema = recurso.tags.slice(0, 6).join(", ") || "diversidade e educação";
  if (recurso.type === "vetor") {
    return `Ilustração vetorial de ${recurso.title.toLowerCase()}, estilo flat, traço limpo, paleta SESI (vermelho #D42731, bege #FCD19C, preto #0C0C0D), fundo branco, formas simples e legíveis em tamanhos pequenos. Temas: ${tema}. Exportar em SVG com camadas nomeadas.`;
  }
  if (recurso.type === "arquivo") {
    return `Organize um material institucional sobre ${recurso.title.toLowerCase()} usando a identidade SESI: fonte Open Sans, vermelho #D42731 como destaque, bege #FCD19C nas áreas de apoio e muito espaço em branco. Temas: ${tema}.`;
  }
  return `Fotografia editorial de ${recurso.title.toLowerCase()}, luz natural suave, fundo neutro, enquadramento horizontal 3:2, pessoas diversas e representativas, cores da marca SESI no figurino e nos objetos. Temas: ${tema}. Evitar estereótipos e clichês.`;
}

/** Posições padronizadas disponíveis para os recursos/personagens */
export const POSICOES_PADRAO = [
  { id: "frente", label: "Frente" },
  { id: "verso", label: "Verso" },
  { id: "cima", label: "Cima" },
  { id: "baixo", label: "Baixo" },
  { id: "sentado", label: "Sentado" },
  { id: "andando", label: "Andando" },
  { id: "correndo", label: "Correndo" },
  { id: "deitado", label: "Deitado" },
  { id: "pulando", label: "Pulando" },
  { id: "apontando", label: "Apontando" },
] as const;

export type PosicaoId = (typeof POSICOES_PADRAO)[number]["id"];
