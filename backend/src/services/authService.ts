import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import fsp from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

const ACCESS_EXPIRES = "15m";
const REFRESH_EXPIRES = "7d";
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const JWT_REFRESH = process.env.JWT_REFRESH_SECRET || "dev-refresh-secret-change-me";

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
  password: "Mudar123@-",
  role: "Admin",
};

// Sem banco configurado no ambiente de dev: os cadastros ficam num arquivo local.
const ARQUIVO = path.join(process.cwd(), "data", "usuarios.json");
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

  if (!usuarios.some((u) => u.email.toLowerCase() === DEMO.email.toLowerCase())) {
    usuarios.push({
      id: DEMO.id,
      email: DEMO.email,
      name: DEMO.name,
      passwordHash: await bcrypt.hash(DEMO.password, 10),
      role: DEMO.role,
    });
    await salvar();
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

export async function login(email: string, password: string) {
  const lista = await carregar();
  const usuario = lista.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());

  if (!usuario || !(await bcrypt.compare(password, usuario.passwordHash))) {
    throw new Error("E-mail ou senha inválidos.");
  }

  const accessToken = jwt.sign(
    { sub: usuario.id, email: usuario.email, name: usuario.name, role: usuario.role },
    JWT_SECRET,
    { expiresIn: ACCESS_EXPIRES }
  );
  const refreshToken = jwt.sign({ sub: usuario.id }, JWT_REFRESH, { expiresIn: REFRESH_EXPIRES });
  return { accessToken, refreshToken, user: publico(usuario) };
}

export async function listarUsuarios() {
  const lista = await carregar();
  return lista.map(publico);
}

export async function atualizarPapel(id: string, role: string) {
  const lista = await carregar();
  const usuario = lista.find((u) => u.id === id);
  if (!usuario) throw new Error("Usuário não encontrado.");
  usuario.role = role;
  await salvar();
  return publico(usuario);
}
