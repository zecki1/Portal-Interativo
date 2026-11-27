import { resourceRepository } from "../repositories/resourceRepository.js";
import { activityRepository } from "../repositories/activityRepository.js";

function lerTags(bruto: unknown): string[] {
  if (Array.isArray(bruto)) return bruto.map(String);
  try {
    const valor = JSON.parse(String(bruto ?? "[]"));
    return Array.isArray(valor) ? valor.map(String) : [];
  } catch {
    return [];
  }
}

/** Métricas do acervo usadas pelo painel de análise e pelos relatórios. */
export const analyticsService = {
  async summary() {
    const recursos = await resourceRepository.findAll();

    const porTipo = new Map<string, number>();
    let comTags = 0;
    let comHistoria = 0;
    let comPrompt = 0;
    let comAnotacoes = 0;
    let prontosParaAnimacao = 0;
    let arquivosAnimacao = 0;
    let poses = 0;
    const tags = new Set<string>();

    for (const recurso of recursos) {
      const lista = lerTags(recurso.tags);
      lista.forEach((tag) => tags.add(tag.toLowerCase()));

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
    const totalTags = recursos.reduce((soma, recurso) => soma + lerTags(recurso.tags).length, 0);

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
      porTipo: Array.from(porTipo.entries()).map(([tipo, quantidade]) => ({ tipo, quantidade })),
      atualizadoEm: new Date().toISOString(),
    };
  },

  async logs(limit = 100) {
    return activityRepository.list(limit);
  },
};
