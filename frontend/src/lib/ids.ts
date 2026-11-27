/**
 * Geração de ids únicos para páginas, blocos, itens e zonas de clique.
 *
 * Usa `crypto.randomUUID` quando disponível e cai para um contador + timestamp
 * (chamadas no mesmo milissegundo não colidem mais, evitando o warning
 * "Encountered two children with the same key" no React).
 */

let counter = 0;

export function newId(prefix?: string): string {
  const base =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${(counter++).toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  return prefix ? `${prefix}-${base}` : base;
}
