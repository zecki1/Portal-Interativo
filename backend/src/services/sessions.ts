import fsp from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

interface Sessao {
  sid: string;
  email: string;
  ip: string;
  criadaEm: string;
  expiraEm: string;
  revogadaEm?: string;
}

function arquivo(): string {
  const base = process.env.DATA_DIR || path.join(process.cwd(), "data");
  return path.join(base, "sessoes.json");
}

let cache: Sessao[] | null = null;

async function carregar(): Promise<Sessao[]> {
  if (cache) return cache;
  try {
    const lista = JSON.parse(await fsp.readFile(arquivo(), "utf8"));
    cache = Array.isArray(lista) ? (lista as Sessao[]) : [];
  } catch {
    cache = [];
  }
  return cache;
}

async function salvar(): Promise<void> {
  await fsp.mkdir(path.dirname(arquivo()), { recursive: true });
  await fsp.writeFile(arquivo(), JSON.stringify(cache ?? [], null, 2), "utf8");
}

/** IP real quando atrás do Apache (ProxyPreserveHost + X-Forwarded-For). */
export function ipDaRequisicao(req: any): string {
  const xff = String(req.headers?.["x-forwarded-for"] || "");
  if (xff) return xff.split(",")[0].trim();
  return String(req.ip || req.socket?.remoteAddress || "");
}

export async function criarSessao(email: string, ip: string): Promise<string> {
  const sessoes = await carregar();
  const sid = randomUUID();
  const agora = Date.now();
  sessoes.push({
    sid,
    email: email.toLowerCase(),
    ip,
    criadaEm: new Date(agora).toISOString(),
    expiraEm: new Date(agora + 7 * 24 * 60 * 60 * 1000).toISOString(),
  });
  // Mantém só sessões recentes.
  while (sessoes.length > 500) sessoes.shift();
  await salvar();
  return sid;
}

/** Ajusta a sessão ao e-mail real do usuário após o login por username. */
export async function vincularSessaoEmail(sid: string, email: string): Promise<void> {
  const sessoes = await carregar();
  const sessao = sessoes.find((x) => x.sid === sid);
  if (sessao) {
    sessao.email = String(email).toLowerCase();
    await salvar();
  }
}

export async function sessaoValida(sid: string, email: string, ip: string): Promise<boolean> {
  const sessoes = await carregar();
  const s = sessoes.find((x) => x.sid === sid && x.email === String(email).toLowerCase());
  if (!s || s.revogadaEm) return false;
  if (Date.parse(s.expiraEm) < Date.now()) return false;
  // Mesmo IP da sessão (comparação exata; X-Forwarded-For do Apache).
  return !s.ip || !ip || s.ip === ip;
}

export async function revogarSessao(sid: string): Promise<void> {
  const sessoes = await carregar();
  const s = sessoes.find((x) => x.sid === sid);
  if (s) {
    s.revogadaEm = new Date().toISOString();
    await salvar();
  }
}

export async function revogarSessoesDoEmail(email: string): Promise<void> {
  const sessoes = await carregar();
  for (const s of sessoes) {
    if (s.email === String(email).toLowerCase() && !s.revogadaEm) {
      s.revogadaEm = new Date().toISOString();
    }
  }
  await salvar();
}
