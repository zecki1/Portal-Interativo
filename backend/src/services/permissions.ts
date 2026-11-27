import fsp from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

export const ROLES = [
  "Administrador",
  "Editor",
  "Gestor",
  "Desenvolvedor",
  "Suporte",
  "Design",
  "Convidado",
] as const;
export type Role = (typeof ROLES)[number] | "Admin";

export const PERMISSIONS = [
  "visualizar",
  "criar",
  "editar",
  "exportar",
  "excluir",
  "reverter",
  "administrar",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

/** Papéis com acesso garantido à página de administração. */
export const ADMIN_ROLES = ["Administrador", "Gestor"];

export const permissionSchema = z.object({
  visualizar: z.boolean(),
  criar: z.boolean(),
  editar: z.boolean(),
  exportar: z.boolean(),
  excluir: z.boolean(),
  reverter: z.boolean(),
  administrar: z.boolean(),
});

export const matrixSchema = z.record(z.string(), permissionSchema);
export type PermissionMatrix = Record<string, z.infer<typeof permissionSchema>>;

const pad = (v: boolean[]): PermissionMatrix[string] => ({
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
  Admin: pad([true, true, true, true, true, true, true]), // legado
  Gestor: pad([true, true, true, true, true, true, true]),
  Editor: pad([true, true, true, true, false, true, false]),
  Desenvolvedor: pad([true, true, true, true, false, true, false]),
  Design: pad([true, true, true, true, false, false, false]),
  Suporte: pad([true, false, false, false, false, false, false]),
  Convidado: pad([true, false, false, false, false, false, false]),
};

interface HistoryEntry {
  matrix: PermissionMatrix;
  savedAt: string;
  savedBy: string;
}

function arquivo(): string {
  const base = process.env.DATA_DIR || path.join(process.cwd(), "data");
  return path.join(base, "permissions.json");
}
function arquivoHistorico(): string {
  const base = process.env.DATA_DIR || path.join(process.cwd(), "data");
  return path.join(base, "permissions.history.json");
}

let cache: PermissionMatrix | null = null;

function normalizar(raw: unknown): PermissionMatrix {
  const out: PermissionMatrix = JSON.parse(JSON.stringify(DEFAULT_MATRIX));
  const obj = raw && typeof raw === "object" ? (raw as Record<string, any>) : {};
  for (const role of Object.keys(out)) {
    if (!obj[role] || typeof obj[role] !== "object") continue;
    for (const p of PERMISSIONS) {
      if (typeof obj[role][p] === "boolean") out[role][p] = obj[role][p];
    }
  }
  return out;
}

export async function getMatrix(): Promise<PermissionMatrix> {
  if (cache) return cache;
  try {
    cache = normalizar(JSON.parse(await fsp.readFile(arquivo(), "utf8")));
  } catch {
    cache = normalizar(DEFAULT_MATRIX);
  }
  return cache;
}

async function lerHistorico(): Promise<HistoryEntry[]> {
  try {
    const lista = JSON.parse(await fsp.readFile(arquivoHistorico(), "utf8"));
    return Array.isArray(lista) ? (lista as HistoryEntry[]) : [];
  } catch {
    return [];
  }
}

export async function saveMatrix(matrix: PermissionMatrix, savedBy = "sistema"): Promise<PermissionMatrix> {
  const atual = await getMatrix();
  const validada = matrixSchema.parse(matrix);
  cache = normalizar(validada);

  const historico = await lerHistorico();
  historico.push({ matrix: atual, savedAt: new Date().toISOString(), savedBy });
  while (historico.length > 20) historico.shift();

  await fsp.mkdir(path.dirname(arquivo()), { recursive: true });
  await fsp.writeFile(arquivo(), JSON.stringify(cache, null, 2), "utf8");
  await fsp.writeFile(arquivoHistorico(), JSON.stringify(historico, null, 2), "utf8");
  return cache;
}

export async function getHistory(): Promise<Array<{ savedAt: string; savedBy: string }>> {
  return (await lerHistorico()).map((h) => ({ savedAt: h.savedAt, savedBy: h.savedBy }));
}

export async function rollbackMatrix(savedBy = "sistema"): Promise<PermissionMatrix | null> {
  const historico = await lerHistorico();
  const ultima = historico.pop();
  if (!ultima) return null;
  await fsp.writeFile(arquivoHistorico(), JSON.stringify(historico, null, 2), "utf8");
  return saveMatrix(ultima.matrix, `rollback:${savedBy}`);
}

export function normalizeRole(role: unknown): string {
  const value = String(role || "Convidado");
  if (value === "Admin") return "Administrador";
  return (ROLES as readonly string[]).includes(value) ? value : "Convidado";
}

export async function hasPermission(role: unknown, permission: Permission): Promise<boolean> {
  const matrix = await getMatrix();
  const papel = normalizeRole(role);
  return Boolean(matrix[papel]?.[permission] ?? DEFAULT_MATRIX[papel]?.[permission]);
}

export async function canAdministrate(role: unknown): Promise<boolean> {
  const papel = normalizeRole(role);
  if (ADMIN_ROLES.includes(papel as (typeof ADMIN_ROLES)[number])) return true;
  return hasPermission(papel, "administrar");
}
