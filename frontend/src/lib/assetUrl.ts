/**
 * Monta a URL de um asset do projeto no preview do backend.
 *
 * - URLs externas (http/https), data: e blob: passam direto.
 * - Caminhos relativos (assets/...) recebem o prefixo do preview e têm os
 *   segmentos codificados — nomes com espaço/acento funcionam.
 */
export function assetUrl(apiBase: string, projectId: string, src?: string): string {
  const value = String(src || "").trim();
  if (!value) return "";
  if (/^(https?:|data:|blob:)/i.test(value)) return value;

  const base = apiBase.replace(/\/$/, "");
  const safe = value
    .replace(/^\/+/, "")
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
  return `${base}/projects/${encodeURIComponent(projectId)}/preview/${safe}`;
}
