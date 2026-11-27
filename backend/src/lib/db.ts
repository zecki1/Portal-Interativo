import type { PrismaClient } from "@prisma/client";

/**
 * Banco é opcional: o conversor funciona só com arquivos. Quando há
 * DATABASE_URL, o client Prisma é gerado no servidor a partir do schema
 * incluído no pacote (SQLite ou SQL Server, conforme o ambiente).
 */
let instancia: PrismaClient | null = null;

export function temBanco(): boolean {
  return Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.trim());
}

export function getPrisma(): PrismaClient {
  if (!temBanco()) {
    throw new Error("DATABASE_URL não configurada: recursos e analytics indisponíveis.");
  }
  if (!instancia) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require("@prisma/client") as { PrismaClient: new () => PrismaClient };
    instancia = new mod.PrismaClient();
  }
  return instancia;
}
