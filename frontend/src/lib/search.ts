import { CUE_LABELS, type Resource } from "./resource";

/**
 * Palavras que ligam frases mas não ajudam a encontrar nada.
 * "diversidade em familia" precisa se comportar como "diversidade familia".
 */
const PALAVRAS_VAZIAS = new Set([
  "a", "o", "as", "os", "um", "uma", "uns", "umas",
  "de", "da", "do", "das", "dos", "em", "no", "na", "nos", "nas",
  "com", "sem", "por", "para", "pra", "ao", "aos", "à", "às",
  "e", "ou", "que", "se", "sobre", "the", "of", "and", "in", "on", "with",
]);

/** Remove acentos e normaliza para comparação. */
export function normalizarBusca(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function palavrasRelevantes(texto: string) {
  const palavras = normalizarBusca(texto).split(/\s+/).filter(Boolean);
  const relevantes = palavras.filter((palavra) => !PALAVRAS_VAZIAS.has(palavra));
  return relevantes.length > 0 ? relevantes : palavras;
}

/** Tudo que pode ser encontrado em um recurso (tags, autor, história, notas e prompt). */
export function campoDeBusca(resource: Resource) {
  return normalizarBusca(
    [
      resource.title,
      resource.description ?? "",
      resource.story ?? "",
      resource.characteristics ?? "",
      resource.profession ?? "",
      resource.author,
      ...(resource.editors ?? []).map((editor) => editor.author),
      resource.notes ?? "",
      resource.prompt ?? "",
      ...(resource.cues ?? []).map((cue) => CUE_LABELS[cue] ?? cue),
      ...resource.tags,
    ].join(" ")
  );
}

/**
 * Pontua o quanto um recurso combina com a consulta.
 *
 * - vírgulas separam alternativas (OR);
 * - dentro de uma alternativa, cada palavra encontrada soma pontos;
 * - palavras vazias ("de", "em", "com") são ignoradas;
 * - quando todas as palavras aparecem juntas na mesma ordem, ganha bônus.
 *
 * Assim "diversidade em familia" encontra recursos de diversidade E de
 * família, colocando primeiro os que têm as duas tags.
 */
export function pontuarBusca(resource: Resource, consulta: string): number {
  const grupos = consulta
    .split(/[,;]+/)
    .map((grupo) => palavrasRelevantes(grupo))
    .filter((grupo) => grupo.length > 0);

  if (grupos.length === 0) return 0;

  const campo = campoDeBusca(resource);
  let melhor = 0;

  for (const termos of grupos) {
    const acertos = termos.filter((termo) => campo.includes(termo)).length;
    if (acertos === 0) continue;

    const proporcao = acertos / termos.length;
    const frase = termos.join(" ");
    const bonus = termos.length > 1 && campo.includes(frase) ? 0.35 : 0;
    melhor = Math.max(melhor, proporcao + bonus);
  }

  return Number(melhor.toFixed(3));
}

/**
 * Compatível com as telas que só precisam saber se o recurso entra ou não
 * no resultado. Consulta vazia aceita tudo.
 */
export function combinarBusca(resource: Resource, consulta: string) {
  if (!consulta.trim()) return true;
  return pontuarBusca(resource, consulta) > 0;
}
