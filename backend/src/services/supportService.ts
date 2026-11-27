import fsp from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

export interface SupportTicket {
  id: string;
  descricao: string;
  tipo: "bug" | "duvida" | "sugestao";
  urgencia: "Baixa" | "Média" | "Alta" | "Crítica";
  screenshot?: string;
  autor: string;
  email: string;
  pagina: string;
  recurso?: string;
  url: string;
  userAgent: string;
  criadoEm: string;
  status: "Aberta" | "Em Análise" | "Concluída";
}

const ARQUIVO = path.join(process.env.DATA_DIR || path.join(process.cwd(), "data"), "suporte.json");
let tickets: SupportTicket[] | null = null;

async function carregar(): Promise<SupportTicket[]> {
  if (tickets) return tickets;
  try {
    const bruto = await fsp.readFile(ARQUIVO, "utf8");
    const lista = JSON.parse(bruto);
    tickets = Array.isArray(lista) ? (lista as SupportTicket[]) : [];
  } catch {
    tickets = [];
  }
  return tickets;
}

async function salvar() {
  await fsp.mkdir(path.dirname(ARQUIVO), { recursive: true });
  await fsp.writeFile(ARQUIVO, JSON.stringify(tickets ?? [], null, 2), "utf8");
}

export async function criar(ticket: Omit<SupportTicket, "id" | "criadoEm" | "status">) {
  const lista = await carregar();
  const novo: SupportTicket = {
    ...ticket,
    id: randomUUID(),
    criadoEm: new Date().toISOString(),
    status: "Aberta",
  };
  lista.unshift(novo);
  await salvar();
  return novo;
}

export async function listar() {
  return carregar();
}

export async function atualizarStatus(id: string, status: SupportTicket["status"]) {
  const lista = await carregar();
  const t = lista.find((x) => x.id === id);
  if (!t) throw new Error("Chamado não encontrado.");
  t.status = status;
  await salvar();
  return t;
}
