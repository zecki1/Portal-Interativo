import fsp from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

export interface AuditEntry {
  id: string;
  quando: string;
  ator: string;
  acao: string;
  recurso: string;
  ip: string;
  detalhe?: string;
  /** Cargo do ator no momento do evento. */
  cargo?: string;
  /** Permissões ativas do cargo no momento do evento. */
  permissoes?: Record<string, boolean>;
}

function arquivo(): string {
  const base = process.env.DATA_DIR || path.join(process.cwd(), "data");
  return path.join(base, "audit.log");
}

/** Auditoria em JSONL, fora da pasta pública. Nunca registra segredos. */
export async function auditar(entry: Omit<AuditEntry, "id" | "quando" | "cargo" | "permissoes">): Promise<void> {
  const linha: AuditEntry = {
    id: randomUUID(),
    quando: new Date().toISOString(),
    ...entry,
  };

  // Snapshot de quem era o ator e o que podia fazer naquele instante.
  try {
    const { papelAtual } = await import("./authService.js");
    const { getMatrix } = await import("./permissions.js");
    const cargo = await papelAtual(entry.ator);
    if (cargo) {
      linha.cargo = cargo === "Admin" ? "Administrador" : cargo;
      const matrix = await getMatrix();
      linha.permissoes = { ...(matrix[cargo] || matrix.Convidado || {}) };
    }
  } catch {
    // Auditoria nunca derruba a requisição principal.
  }

  try {
    await fsp.mkdir(path.dirname(arquivo()), { recursive: true });
    await fsp.appendFile(arquivo(), JSON.stringify(linha) + "\n", "utf8");
  } catch {
    // Ignora falha de escrita.
  }
}

export async function lerAuditoria(limit = 200): Promise<AuditEntry[]> {
  try {
    const texto = await fsp.readFile(arquivo(), "utf8");
    return texto
      .split("\n")
      .filter(Boolean)
      .map((l) => JSON.parse(l) as AuditEntry)
      .reverse()
      .slice(0, Math.min(limit, 1000));
  } catch {
    return [];
  }
}
