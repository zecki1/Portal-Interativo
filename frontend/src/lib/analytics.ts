import { TYPE_LABELS, type Resource, type ResourceType } from "./resource";

export interface ResumoAcervo {
  total: number;
  comTags: number;
  semTags: number;
  mediaTags: number;
  tagsDistintas: number;
  comHistoria: number;
  semHistoria: number;
  comPrompt: number;
  comAnotacoes: number;
  prontosParaAnimacao: number;
  semAnimacao: number;
  arquivosAnimacao: number;
  poses: number;
  porTipo: { tipo: ResourceType; rotulo: string; total: number }[];
}

export interface ContagemTag {
  tag: string;
  total: number;
}

/** Números do acervo que alimentam o painel de análise e os relatórios. */
export function resumoDoAcervo(recursos: Resource[]): ResumoAcervo {
  const tags = new Set<string>();
  const porTipo = new Map<ResourceType, number>();
  let totalTags = 0;
  let comTags = 0;
  let comHistoria = 0;
  let comPrompt = 0;
  let comAnotacoes = 0;
  let prontosParaAnimacao = 0;
  let arquivosAnimacao = 0;
  let poses = 0;

  for (const recurso of recursos) {
    const lista = recurso.tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean);
    lista.forEach((tag) => tags.add(tag));
    totalTags += lista.length;
    if (lista.length > 0) comTags += 1;
    if (recurso.story?.trim()) comHistoria += 1;
    if (recurso.prompt?.trim()) comPrompt += 1;
    if (recurso.notes?.trim()) comAnotacoes += 1;
    if (recurso.animationReady) prontosParaAnimacao += 1;
    arquivosAnimacao += recurso.animationFiles ?? 0;
    poses += recurso.poses ?? 0;
    porTipo.set(recurso.type, (porTipo.get(recurso.type) ?? 0) + 1);
  }

  const total = recursos.length;

  return {
    total,
    comTags,
    semTags: total - comTags,
    mediaTags: total > 0 ? Number((totalTags / total).toFixed(2)) : 0,
    tagsDistintas: tags.size,
    comHistoria,
    semHistoria: total - comHistoria,
    comPrompt,
    comAnotacoes,
    prontosParaAnimacao,
    semAnimacao: total - prontosParaAnimacao,
    arquivosAnimacao,
    poses,
    porTipo: (["imagem", "vetor", "arquivo"] as ResourceType[]).map((tipo) => ({
      tipo,
      rotulo: TYPE_LABELS[tipo],
      total: porTipo.get(tipo) ?? 0,
    })),
  };
}

/** Quais tags aparecem mais — e quais recursos estão sem tag nenhuma. */
export function coberturaDeTags(recursos: Resource[], limite = 40): ContagemTag[] {
  const mapa = new Map<string, number>();
  recursos.forEach((recurso) => {
    recurso.tags.forEach((tag) => {
      const chave = tag.trim().toLowerCase();
      if (!chave) return;
      mapa.set(chave, (mapa.get(chave) ?? 0) + 1);
    });
  });
  return Array.from(mapa.entries())
    .map(([tag, total]) => ({ tag, total }))
    .sort((a, b) => b.total - a.total || a.tag.localeCompare(b.tag, "pt-BR"))
    .slice(0, limite);
}

export function recursosSemTags(recursos: Resource[]) {
  return recursos.filter((recurso) => recurso.tags.length === 0);
}

export function recursosSemHistoria(recursos: Resource[]) {
  return recursos.filter((recurso) => !recurso.story?.trim());
}

export function recursosProntosParaAnimacao(recursos: Resource[], minimoPoses = 6) {
  return recursos.filter((recurso) => recurso.animationReady || (recurso.poses ?? 0) >= minimoPoses);
}

export function arquivosParaAnimacao(recursos: Resource[]) {
  return recursos
    .filter((recurso) => (recurso.animationFiles ?? 0) > 0 || recurso.animationReady)
    .sort((a, b) => (b.animationFiles ?? 0) - (a.animationFiles ?? 0));
}

export interface Coluna {
  chave: string;
  rotulo: string;
}

/** Gera o CSV com BOM para abrir certo no Excel em português. */
export function gerarCsv(linhas: Record<string, unknown>[], colunas: Coluna[]) {
  const escapar = (valor: unknown) => {
    const texto = valor === null || valor === undefined ? "" : String(valor);
    return `"${texto.replace(/"/g, '""')}"`;
  };
  const cabecalho = colunas.map((coluna) => escapar(coluna.rotulo)).join(";");
  const corpo = linhas.map((linha) => colunas.map((coluna) => escapar(linha[coluna.chave])).join(";"));
  return `\uFEFF${[cabecalho, ...corpo].join("\r\n")}`;
}

export function baixarCsv(nome: string, linhas: Record<string, unknown>[], colunas: Coluna[]) {
  const blob = new Blob([gerarCsv(linhas, colunas)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nome.endsWith(".csv") ? nome : `${nome}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
