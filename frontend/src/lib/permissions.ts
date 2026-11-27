import { getUser } from "./auth";

export const ROLES = [
  "Administrador",
  "Editor",
  "Gestor",
  "Desenvolvedor",
  "Suporte",
  "Design",
  "Convidado",
] as const;
export type Role = (typeof ROLES)[number];

export const PERMISSIONS = ["visualizar", "criar", "editar", "exportar", "excluir", "reverter", "administrar"] as const;
export type Permission = (typeof PERMISSIONS)[number];

export const PERMISSION_LABELS: Record<Permission, string> = {
  visualizar: "Visualização",
  criar: "Criação",
  editar: "Edição",
  exportar: "Exportação",
  excluir: "Exclusão",
  reverter: "Rollback",
  administrar: "Administração",
};

export type PermissionMatrix = Record<string, Record<Permission, boolean>>;

const pad = (v: boolean[]): Record<Permission, boolean> => ({
  visualizar: v[0],
  criar: v[1],
  editar: v[2],
  exportar: v[3],
  excluir: v[4],
  reverter: v[5],
  administrar: v[6],
});

export const DEFAULT_MATRIX: PermissionMatrix = {
  Administrador: pad([true, true, true, true, true, true, true]),
  Gestor: pad([true, true, true, true, true, true, true]),
  Editor: pad([true, true, true, true, false, true, false]),
  Desenvolvedor: pad([true, true, true, true, false, true, false]),
  Design: pad([true, true, true, true, false, false, false]),
  Suporte: pad([true, false, false, false, false, false, false]),
  Convidado: pad([true, false, false, false, false, false, false]),
};

export function normalizeRole(role?: string): string {
  const value = String(role || "Convidado");
  if (value === "Admin") return "Administrador";
  return (ROLES as readonly string[]).includes(value) ? value : "Convidado";
}

export function currentRole(): string {
  return normalizeRole(getUser()?.role);
}

/** Cached do servidor, atualizado pela página de admin. */
let cached: PermissionMatrix | null = null;
export function setCachedMatrix(matrix: PermissionMatrix) {
  cached = matrix;
}
export function getCachedMatrix(): PermissionMatrix {
  return cached || DEFAULT_MATRIX;
}

export function can(permission: Permission): boolean {
  const role = currentRole();
  return Boolean(getCachedMatrix()[role]?.[permission] ?? DEFAULT_MATRIX[role]?.[permission]);
}

export function canAdministrate(): boolean {
  const role = currentRole();
  if (role === "Administrador" || role === "Gestor") return true;
  return can("administrar");
}
