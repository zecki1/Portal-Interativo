/**
 * Log de atividades editoriais. Diferente de `audit.log` (segurança/autenticação),
 * aqui guardamos o estado restaurável de cada projeto criado, editado ou excluído.
 * O arquivo fica fora da pasta pública e nunca contém senhas.
 */

import fsp from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { ProjectDocument } from "./converterService.js";

export type AcaoAtividade = "criar" | "editar" | "excluir" | "renomear" | "reverter";

export interface ActivityEntry {
  id: string;
  quando: string;
  ator: string;
  acao: AcaoAtividade;
  recurso: string;
  projetoId: string;
  titulo: string;
  detalhe?: string;
  /** Documento completo no estado que deve ser recomposto ao "refazer". */
  snapshot?: ProjectDocument;
  /** Flag de presença do snapshot (a listagem não devolve o documento inteiro). */
  temSnapshot?: boolean;
}

function baseDir(): string {
  return process.env.DATA_DIR || path.join(process.cwd(), "data");
}

function arquivo(): string {
  return path.join(baseDir(), "activity.log");
}

function backupDir(id: string): string {
  return path.join(baseDir(), "activity-assets", id);
}

export { backupDir };

async function guardarAssets(id: string, projectDir: string): Promise<void> {
  const origem = path.join(projectDir, "assets");
  const destino = path.join(backupDir(id), "assets");
  await fsp.cp(origem, destino, { recursive: true, force: true });
}

/** Evita que snapshots de PDFs grandes ocupem o disco indefinidamente. */
async function limitarBackups(maximo = 15): Promise<void> {
  const raiz = path.join(baseDir(), "activity-assets");
  const itens = await fsp.readdir(raiz, { withFileTypes: true }).catch(() => []);
  if (itens.length <= maximo) return;
  const ordenados = await Promise.all(
    itens.filter((i) => i.isDirectory()).map(async (i) => ({
      nome: i.name,
      mtime: (await fsp.stat(path.join(raiz, i.name)).catch(() => null))?.mtimeMs || 0,
    })),
  );
  ordenados.sort((a, b) => b.mtime - a.mtime);
  for (const item of ordenados.slice(maximo)) {
    await fsp.rm(path.join(raiz, item.nome), { recursive: true, force: true }).catch(() => {});
  }
}

export async function registrarAtividade(entry: {
  ator: string;
  acao: AcaoAtividade;
  recurso: string;
  projetoId: string;
  titulo: string;
  detalhe?: string;
  snapshot?: ProjectDocument;
  /** Diretório do projeto; os binários são copiados para permitir restauração. */
  assetDir?: string;
}): Promise<ActivityEntry> {
  const { assetDir, ...dados } = entry;
  const linha: ActivityEntry = {
    id: randomUUID(),
    quando: new Date().toISOString(),
    ...dados,
  };
  try {
    await fsp.mkdir(path.dirname(arquivo()), { recursive: true });
    await fsp.appendFile(arquivo(), JSON.stringify(linha) + "\n", "utf8");
    if (assetDir) {
      await guardarAssets(linha.id, assetDir);
      await limitarBackups();
    }
  } catch {
    // Registrar nunca deve derrubar a operação principal.
  }
  return linha;
}

export async function listarAtividades(opts: {
  limit?: number;
  acao?: string;
  projetoId?: string;
} = {}): Promise<ActivityEntry[]> {
  try {
    const texto = await fsp.readFile(arquivo(), "utf8");
    const limite = Math.min(Math.max(opts.limit || 100, 1), 500);
    return texto
      .split("\n")
      .filter(Boolean)
      .map((l) => JSON.parse(l) as ActivityEntry)
      .reverse()
      .filter((e) => (opts.acao ? e.acao === opts.acao : true))
      .filter((e) => (opts.projetoId ? e.projetoId === opts.projetoId : true))
      .slice(0, limite)
      // O snapshot pode ser grande; a listagem só precisa dos metadados.
      .map(({ snapshot, ...resto }) => ({ ...resto, temSnapshot: Boolean(snapshot) }));
  } catch {
    return [];
  }
}

export async function buscarAtividade(id: string): Promise<ActivityEntry | undefined> {
  try {
    const texto = await fsp.readFile(arquivo(), "utf8");
    const linhas = texto.split("\n").filter(Boolean).reverse();
    for (const linha of linhas) {
      const entry = JSON.parse(linha) as ActivityEntry;
      if (entry.id === id) return entry;
    }
  } catch {
    // Sem log ainda.
  }
  return undefined;
}
