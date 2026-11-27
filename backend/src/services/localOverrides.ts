/**
 * Ajustes de cargo dos usuários externos gravados no próprio Portal.
 * Usado quando o SQL local (tabela user_overrides) não está disponível:
 * a atribuição continua persistida e sincronizada com o diretório externo.
 */

import fsp from "node:fs/promises";
import path from "node:path";
import type { UserOverrideInput } from "../schemas/directory.js";

export interface OverrideLocal {
  username: string;
  email: string | null;
  role: string;
  isActive: boolean;
  workgroup: string | null;
  team: string | null;
  externalId: string | null;
  updatedAt: string;
}

function arquivo(): string {
  return path.join(process.env.DATA_DIR || path.join(process.cwd(), "data"), "user-overrides.json");
}

let cache: Record<string, OverrideLocal> | null = null;

async function carregar(): Promise<Record<string, OverrideLocal>> {
  if (cache) return cache;
  try {
    const bruto = await fsp.readFile(arquivo(), "utf8");
    const dados = JSON.parse(bruto);
    cache = dados && typeof dados === "object" && !Array.isArray(dados) ? (dados as Record<string, OverrideLocal>) : {};
  } catch {
    cache = {};
  }
  return cache;
}

async function salvar(): Promise<void> {
  await fsp.mkdir(path.dirname(arquivo()), { recursive: true });
  await fsp.writeFile(arquivo(), JSON.stringify(cache ?? {}, null, 2), "utf8");
}

const chave = (username: string) => username.trim().toLowerCase();

export async function listarOverridesLocais(): Promise<OverrideLocal[]> {
  return Object.values(await carregar());
}

/** Aceita username ou e-mail: as permissões consultam pelo e-mail do token. */
export async function buscarOverrideLocal(login: string): Promise<OverrideLocal | undefined> {
  const alvo = chave(login);
  const ajustes = await carregar();
  return (
    ajustes[alvo] ||
    Object.values(ajustes).find((item) => item.email?.trim().toLowerCase() === alvo)
  );
}

export async function salvarOverrideLocal(
  username: string,
  patch: UserOverrideInput,
  email?: string,
): Promise<OverrideLocal> {
  const ajustes = await carregar();
  const anterior = ajustes[chave(username)];
  const registro: OverrideLocal = {
    username: username.trim(),
    email: email?.trim().toLowerCase() || anterior?.email || null,
    role: patch.role || anterior?.role || "Convidado",
    isActive: patch.isActive ?? anterior?.isActive ?? true,
    workgroup: patch.workgroup ?? anterior?.workgroup ?? null,
    team: patch.team ?? anterior?.team ?? null,
    externalId: patch.role ? anterior?.externalId ?? username.trim() : anterior?.externalId ?? null,
    updatedAt: new Date().toISOString(),
  };
  ajustes[chave(username)] = registro;
  await salvar();
  return registro;
}
