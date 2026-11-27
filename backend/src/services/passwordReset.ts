import fsp from "node:fs/promises";
import path from "node:path";
import { randomBytes, randomUUID } from "node:crypto";

interface Pedido {
  id: string;
  email: string;
  nome: string;
  status: "pendente" | "aprovado" | "usado" | "recusado";
  token?: string;
  criadoEm: string;
  decididoEm?: string;
  decididoPor?: string;
  usadoEm?: string;
  motivo?: string;
}

function arquivo(): string {
  const base = process.env.DATA_DIR || path.join(process.cwd(), "data");
  return path.join(base, "password-resets.json");
}

let cache: Pedido[] | null = null;

async function carregar(): Promise<Pedido[]> {
  if (cache) return cache;
  try {
    const lista = JSON.parse(await fsp.readFile(arquivo(), "utf8"));
    cache = Array.isArray(lista) ? (lista as Pedido[]) : [];
  } catch {
    cache = [];
  }
  return cache;
}

async function salvar(): Promise<void> {
  await fsp.mkdir(path.dirname(arquivo()), { recursive: true });
  await fsp.writeFile(arquivo(), JSON.stringify(cache ?? [], null, 2), "utf8");
}

function publico(p: Pedido) {
  return {
    id: p.id,
    email: p.email,
    nome: p.nome,
    status: p.status,
    criadoEm: p.criadoEm,
    decididoEm: p.decididoEm,
    decididoPor: p.decididoPor,
    usadoEm: p.usadoEm,
    motivo: p.motivo,
  };
}

export async function solicitar(email: string, nome = ""): Promise<{ id: string }> {
  const lista = await carregar();
  const normalizado = email.trim().toLowerCase();
  if (!normalizado) throw new Error("E-mail obrigatório.");

  // Evita pedidos duplicados pendentes para o mesmo e-mail.
  if (lista.some((p) => p.email === normalizado && p.status === "pendente")) {
    throw new Error("Já existe uma solicitação pendente para este e-mail.");
  }

  const pedido: Pedido = {
    id: randomUUID(),
    email: normalizado,
    nome: nome.trim() || normalizado,
    status: "pendente",
    criadoEm: new Date().toISOString(),
  };
  lista.push(pedido);
  await salvar();
  return { id: pedido.id };
}

export async function listar(status?: string) {
  const lista = await carregar();
  return lista
    .filter((p) => !status || p.status === status)
    .slice()
    .reverse()
    .map(publico);
}

/** Gestor/admin aprova e gera um token de uso único (24 h). */
export async function aprovar(id: string, decididoPor: string): Promise<{ token: string }> {
  const lista = await carregar();
  const pedido = lista.find((p) => p.id === id);
  if (!pedido) throw new Error("Solicitação não encontrada.");
  if (pedido.status !== "pendente") throw new Error("Solicitação já foi decidida.");

  pedido.status = "aprovado";
  pedido.token = randomBytes(24).toString("hex");
  pedido.decididoEm = new Date().toISOString();
  pedido.decididoPor = decididoPor;
  await salvar();
  return { token: pedido.token };
}

export async function recusar(id: string, decididoPor: string, motivo = ""): Promise<void> {
  const lista = await carregar();
  const pedido = lista.find((p) => p.id === id);
  if (!pedido) throw new Error("Solicitação não encontrada.");
  pedido.status = "recusado";
  pedido.decididoEm = new Date().toISOString();
  pedido.decididoPor = decididoPor;
  pedido.motivo = motivo;
  await salvar();
}

/** Valida o token sem consumir — seguro para recarregar a página. */
export async function validar(token: string): Promise<{ email: string }> {
  const lista = await carregar();
  const pedido = lista.find((p) => p.token === token && p.status === "aprovado");
  if (!pedido) throw new Error("Link inválido ou já utilizado.");
  if (Date.parse(pedido.decididoEm || pedido.criadoEm) + 24 * 60 * 60 * 1000 < Date.now()) {
    throw new Error("Link expirado. Solicite uma nova redefinição.");
  }
  return { email: pedido.email };
}

/** Consome o token (uso único) no momento da redefinição. */
export async function consumir(token: string): Promise<{ email: string }> {
  const lista = await carregar();
  const pedido = lista.find((p) => p.token === token && p.status === "aprovado");
  if (!pedido) throw new Error("Link inválido ou já utilizado.");
  if (Date.parse(pedido.decididoEm || pedido.criadoEm) + 24 * 60 * 60 * 1000 < Date.now()) {
    throw new Error("Link expirado. Solicite uma nova redefinição.");
  }
  pedido.status = "usado";
  pedido.usadoEm = new Date().toISOString();
  await salvar();
  return { email: pedido.email };
}
