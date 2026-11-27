import { Sequelize } from "sequelize";

/**
 * Duas conexões Sequelize:
 * - local: banco do Portal Interativo (SQL Server) — grava cargos, convidados e ativos.
 * - externa: banco de login/usuários da outra aplicação, somente leitura.
 *
 * A conexão externa usa o driver Tabular (tedious), compatível com o ODBC
 * Driver 18 configurado na raiz (.env). Nenhuma senha fica no código.
 */

let local: Sequelize | null = null;
let external: Sequelize | null = null;

interface ParsedUrl {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
}

function parseSqlServerUrl(url: string): ParsedUrl {
  if (/^sqlserver:\/\//i.test(url)) {
    const rest = url.replace(/^sqlserver:\/\//i, "");
    const [hostPort, ...parts] = rest.split(";");
    const [host, port] = hostPort.split(":");
    const params: Record<string, string> = {};
    for (const part of parts) {
      const idx = part.indexOf("=");
      if (idx > 0) params[part.slice(0, idx).trim().toLowerCase()] = part.slice(idx + 1).trim();
    }
    return {
      host: host || "127.0.0.1",
      port: Number(port || 1433),
      database: params.database || params.initial_catalog || "",
      username: params.user || params.uid || "",
      password: params.password || params.pwd || "",
    };
  }
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: Number(parsed.port || 1433),
    database: parsed.pathname.replace(/^\//, ""),
    username: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
  };
}

export function temBancoLocal(): boolean {
  return Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.trim());
}

export function externalDbName(): string {
  return process.env.DB_NAME || "optimize";
}

export function temBancoExterno(): boolean {
  return Boolean(process.env.DB_USER && process.env.DB_PASSWORD);
}

export function sequelizeLocal(): Sequelize {
  if (!local) {
    if (!temBancoLocal()) throw new Error("DATABASE_URL não configurada.");
    const parsed = parseSqlServerUrl(process.env.DATABASE_URL!);
    local = new Sequelize(parsed.database, parsed.username, parsed.password, {
      dialect: "mssql",
      host: parsed.host,
      port: parsed.port,
      logging: false,
      dialectOptions: {
        options: { encrypt: true, trustServerCertificate: true },
      },
      pool: { max: 5, min: 0, idle: 10000 },
    });
  }
  return local;
}

export function sequelizeExterna(): Sequelize {
  if (!external) {
    if (!temBancoExterno()) {
      throw new Error("Credenciais da base externa (DB_USER/DB_PASSWORD/DB_NAME) não configuradas.");
    }
    external = new Sequelize(
      externalDbName(),
      process.env.DB_USER!,
      process.env.DB_PASSWORD!,
      {
        dialect: "mssql",
        host: process.env.DB_SERVER || process.env.EXTERNAL_DB_SERVER || "127.0.0.1",
        port: Number(process.env.DB_PORT || 1433),
        logging: false,
        dialectOptions: {
          options: { encrypt: true, trustServerCertificate: true },
        },
        pool: { max: 3, min: 0, idle: 10000 },
      },
    );
  }
  return external;
}

export async function testarConexoes(): Promise<{ local: boolean; externa: boolean }> {
  const result = { local: false, externa: false };
  try {
    if (temBancoLocal()) {
      await sequelizeLocal().authenticate();
      result.local = true;
    }
  } catch {
    result.local = false;
  }
  try {
    if (temBancoExterno()) {
      await sequelizeExterna().authenticate();
      result.externa = true;
    }
  } catch {
    result.externa = false;
  }
  return result;
}
