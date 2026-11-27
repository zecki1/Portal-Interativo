import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import fsp from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

const ACCESS_EXPIRES = "15m";
const REFRESH_EXPIRES = "7d";
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH = process.env.JWT_REFRESH_SECRET;

export function getJwtSecret(): string {
  if (JWT_SECRET && JWT_SECRET.length >= 32) return JWT_SECRET;
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET ausente ou fraco (mín. 32 caracteres) em produção.");
  }
  // eslint-disable-next-line no-console
  console.warn("[auth] JWT_SECRET não definido; usando segredo de desenvolvimento. NÃO use em produção.");
  return "dev-secret-change-me-in-production-please-32chars";
}
export function getJwtRefresh(): string {
  if (JWT_REFRESH && JWT_REFRESH.length >= 32) return JWT_REFRESH;
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_REFRESH_SECRET ausente ou fraco (mín. 32 caracteres) em produção.");
  }
  // eslint-disable-next-line no-console
  console.warn("[auth] JWT_REFRESH_SECRET não definido; usando segredo de desenvolvimento. NÃO use em produção.");
  return "dev-refresh-secret-change-me-in-production-32chars";
}

interface Usuario {
  id: string;
  email: string;
  name: string;
  surname?: string;
  passwordHash: string;
  role: string;
}

/** Usuário de demonstração, sempre disponível. */
const DEMO = {
  id: "user-zecki1",
  email: "zecki1@hotmail.com",
  name: "zecki1",
  password: process.env.DEMO_PASSWORD || "Mudar@Sesi123",
  role: "Administrador",
};

/** Usuário de suporte designado. */
const SUPORTE = {
  id: "user-suporte-sesisp",
  email: "suporte.teste@sesisp.org.br",
  name: "Suporte SESI",
  password: process.env.DEMO_PASSWORD || "Mudar@Sesi123",
  role: "Suporte",
};

// Sem banco configurado no ambiente de dev: os cadastros ficam num arquivo local.
const ARQUIVO = path.join(process.env.DATA_DIR || path.join(process.cwd(), "data"), "usuarios.json");
let usuarios: Usuario[] | null = null;

async function salvar() {
  await fsp.mkdir(path.dirname(ARQUIVO), { recursive: true });
  await fsp.writeFile(ARQUIVO, JSON.stringify(usuarios ?? [], null, 2), "utf8");
}

async function carregar(): Promise<Usuario[]> {
  if (usuarios) return usuarios;
  try {
    const bruto = await fsp.readFile(ARQUIVO, "utf8");
    const lista = JSON.parse(bruto);
    usuarios = Array.isArray(lista) ? (lista as Usuario[]) : [];
  } catch {
    usuarios = [];
  }

  // O administrador institucional não é duplicado no cadastro local: o login
  // dele vem do SQL externo (evita sombrear a senha do banco).
  for (const seed of [DEMO, SUPORTE]) {
    if (!usuarios.some((u) => u.email.toLowerCase() === seed.email.toLowerCase())) {
      usuarios.push({
        id: seed.id,
        email: seed.email,
        name: seed.name,
        passwordHash: await bcrypt.hash(seed.password, 10),
        role: seed.role,
      });
      await salvar();
    }
  }

  return usuarios;
}

function publico(usuario: Usuario) {
  return {
    id: usuario.id,
    email: usuario.email,
    name: usuario.name,
    surname: usuario.surname,
    role: usuario.role,
  };
}

export async function register(email: string, password: string, name: string, surname?: string) {
  const lista = await carregar();
  const normalizado = email.trim().toLowerCase();

  if (lista.some((u) => u.email.toLowerCase() === normalizado)) {
    throw new Error("Este e-mail já está cadastrado.");
  }

  const usuario: Usuario = {
    id: randomUUID(),
    email: normalizado,
    name: name.trim(),
    surname: surname?.trim() || undefined,
    passwordHash: await bcrypt.hash(password, 10),
    role: "Convidado",
  };

  lista.push(usuario);
  await salvar();
  return publico(usuario);
}

export async function login(identifier: string, password: string, fingerprint?: string, ip = "", sid?: string) {
  const valor = identifier.trim().toLowerCase();
  const lista = await carregar();
  const local = lista.find(
    (u) => u.email.toLowerCase() === valor || u.name.toLowerCase() === valor,
  );
  let usuario: Usuario | undefined;

  // Um e-mail pode existir no cadastro local e no SQL externo. Senha local
  // incorreta não pode impedir a tentativa no diretório externo.
  if (local && (await bcrypt.compare(password, local.passwordHash))) {
    usuario = local;
  } else {
    const { autenticarConvidado, autenticarUsuarioExterno } = await import("./directoryService.js");
    const convidado = await autenticarConvidado(identifier.trim(), password).catch(() => undefined);
    if (convidado) {
      usuario = {
        id: convidado.id,
        email: convidado.email,
        name: convidado.name,
        passwordHash: "",
        role: convidado.role,
      };
    } else {
      const externo = await autenticarUsuarioExterno(identifier.trim(), password).catch((erro: unknown) => {
        if (process.env.NODE_ENV !== "production") {
          // Nunca registrar senha ou hash; apenas o motivo da falha.
          console.warn("[auth] login externo falhou:", erro instanceof Error ? erro.message : String(erro));
        }
        return undefined;
      });
      if (!externo) throw new Error("Usuário/e-mail ou senha inválidos.");
      usuario = {
        id: externo.id,
        email: externo.email,
        name: externo.name,
        passwordHash: "",
        role: externo.role,
      };
    }
  }

  const accessToken = jwt.sign(
    { sub: usuario.id, email: usuario.email, name: usuario.name, role: usuario.role, type: "access", fp: fingerprint || "", sid: sid || "" },
    getJwtSecret(),
    { expiresIn: ACCESS_EXPIRES, issuer: "portal-interativo", audience: "portal-interativo" }
  );
  const refreshToken = jwt.sign(
    { sub: usuario.id, email: usuario.email, type: "refresh", sid: sid || "", ip },
    getJwtRefresh(),
    {
      expiresIn: REFRESH_EXPIRES,
      issuer: "portal-interativo",
      audience: "portal-interativo",
    },
  );
  return { accessToken, refreshToken, user: publico(usuario) };
}

export async function refreshAccessToken(refreshToken: string, fingerprint?: string, ip = ""): Promise<{ accessToken: string }> {
  let payload: any;
  try {
    payload = jwt.verify(refreshToken, getJwtRefresh(), { issuer: "portal-interativo", audience: "portal-interativo" });
  } catch {
    throw new Error("Refresh token inválido ou expirado.");
  }
  if (payload?.type !== "refresh" || !payload.sub) throw new Error("Refresh token inválido.");
  if (payload.ip && ip && payload.ip !== ip) throw new Error("Sessão vinculada a outro endereço.");
  const lista = await carregar();
  let usuario = lista.find((u) => u.id === payload.sub);
  if (!usuario && payload.email) {
    const { buscarUsuarioExterno, papelExterno } = await import("./directoryService.js");
    const externo = await buscarUsuarioExterno(String(payload.email)).catch(() => undefined);
    if (externo) {
      usuario = {
        id: externo.username,
        email: externo.email,
        name: `${externo.first_name} ${externo.last_name}`.trim(),
        passwordHash: "",
        role: (await papelExterno(externo.username).catch(() => undefined)) || externo.role || "Convidado",
      };
    }
  }
  if (!usuario) throw new Error("Usuário não encontrado.");
  const accessToken = jwt.sign(
    { sub: usuario.id, email: usuario.email, name: usuario.name, role: usuario.role, type: "access", fp: fingerprint || "", sid: String(payload.sid || "") },
    getJwtSecret(),
    { expiresIn: ACCESS_EXPIRES, issuer: "portal-interativo", audience: "portal-interativo" }
  );
  return { accessToken };
}

export async function listarUsuarios() {
  const lista = await carregar();
  return lista.map(publico);
}

export async function buscarUsuarioPorEmail(email: string) {
  const lista = await carregar();
  return lista.find((u) => u.email.toLowerCase() === String(email).trim().toLowerCase());
}

/** Papel vigente do usuário: arquivo local, ajuste no SQL ou base externa. */
export async function papelAtual(email: string): Promise<string | undefined> {
  const usuario = await buscarUsuarioPorEmail(email);
  if (usuario) return usuario.role;
  try {
    const { papelExterno } = await import("./directoryService.js");
    const { temBancoLocal, sequelizeLocal } = await import("../lib/sequelize.js");
    const { initModels, GuestAccount } = await import("../models/index.js");
    const { Op } = await import("sequelize");
    if (temBancoLocal()) {
      initModels(sequelizeLocal());
      const convidado = await GuestAccount.findOne({ where: { email: { [Op.eq]: email.trim().toLowerCase() } } }).catch(() => null);
      if (convidado) return convidado.role;
    }
    // Inclui override gravado na tabela própria do Portal, mesmo sem SQL local.
    return await papelExterno(email.trim()).catch(() => undefined);
  } catch {
    return undefined;
  }
}

export async function atualizarPapel(id: string, role: string) {
  const lista = await carregar();
  const usuario = lista.find((u) => u.id === id);
  if (!usuario) throw new Error("Usuário não encontrado.");
  usuario.role = role;
  await salvar();
  return publico(usuario);
}

/**Redefine a senha e encerra todas as sessões do usuário. */
export async function redefinirSenha(id: string, novaSenha: string) {
  const lista = await carregar();
  const usuario = lista.find((u) => u.id === id);
  if (!usuario) throw new Error("Usuário não encontrado.");
  await salvarSenha(usuario, novaSenha);
  return publico(usuario);
}

export async function salvarSenha(usuario: Usuario, novaSenha: string) {
  usuario.passwordHash = await bcrypt.hash(novaSenha, 10);
  await salvar();
  const { revogarSessoesDoEmail } = await import("./sessions.js");
  await revogarSessoesDoEmail(usuario.email);
}

export async function usuarioPorEmail(email: string): Promise<Usuario | undefined> {
  const lista = await carregar();
  return lista.find((u) => u.email.toLowerCase() === String(email).trim().toLowerCase());
}
