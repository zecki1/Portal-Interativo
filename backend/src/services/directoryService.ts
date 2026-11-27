import bcrypt from "bcryptjs";
import { pbkdf2Sync, timingSafeEqual } from "node:crypto";
import { Op, QueryTypes } from "sequelize";
import { sequelizeExterna, temBancoExterno, temBancoLocal } from "../lib/sequelize.js";
import { buscarOverrideLocal, listarOverridesLocais, salvarOverrideLocal } from "./localOverrides.js";
import { GuestAccount, UserOverride, initModels } from "../models/index.js";
import {
  ExternalUserSchema,
  type DirectoryUser,
  type ExternalUser,
  type GuestAccountInput,
  type Role,
  type UserOverrideInput,
} from "../schemas/directory.js";

/** Nomes de tabela/coluna são validados antes de ir para o SQL. Aceita `dbo.auth_user`. */
const identifier = (value: string | undefined, fallback: string): string => {
  const name = value || fallback;
  if (!name.split(".").every((parte) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(parte))) {
    throw new Error("Nome de tabela/coluna inválido na configuração.");
  }
  return name;
};

const table = () => identifier(process.env.EXTERNAL_USERS_TABLE, "users");
const roleColumn = () => identifier(process.env.EXTERNAL_ROLE_COLUMN, "role");
const passwordColumn = () => identifier(process.env.EXTERNAL_PASSWORD_COLUMN, "password");

type ExternalAuthUser = ExternalUser & { password?: string };

/**
 * Verifica hash PBKDF2 armazenado como `pbkdf2_sha256<iterações>$<salt>$<hash>`.
 * Implementação com `node:crypto`: nenhum código/framework da aplicação de origem.
 */
export function verificarSenhaExterna(senha: string, armazenado: string): boolean {
  const partes = String(armazenado || "").trim().split("$");
  if (partes.length !== 4) return false;
  const [algoritmo, iteracoesTexto, salt, hash] = partes;
  const algoritmos: Record<string, "sha256" | "sha1"> = {
    pbkdf2_sha256: "sha256",
    pbkdf2_sha1: "sha1",
  };
  const digest = algoritmos[algoritmo];
  const iteracoes = Number(iteracoesTexto);
  if (!digest || !Number.isInteger(iteracoes) || iteracoes < 1 || iteracoes > 1_000_000) return false;
  if (!salt || salt.length > 512 || !hash || hash.length > 512) return false;
  const esperado = Buffer.from(hash, "base64");
  if (!esperado.length) return false;
  const calculado = pbkdf2Sync(senha, salt, iteracoes, esperado.length, digest);
  return calculado.length === esperado.length && timingSafeEqual(calculado, esperado);
}

/**
 * A base externa é somente leitura. A coluna de senha é lida apenas no login;
 * nunca é devolvida pelo diretório nem gravada no banco local.
 */
async function selectExternal(
  where?: string,
  replacements?: Record<string, unknown>,
  comSenha = false,
): Promise<ExternalAuthUser[]> {
  if (!temBancoExterno()) return [];
  const colunas = [
    "username",
    "first_name",
    "last_name",
    "email",
    "is_active",
    ...(process.env.EXTERNAL_ROLE_COLUMN ? [roleColumn()] : []),
    ...(comSenha ? [passwordColumn()] : []),
  ].join(", ");
  const sql = `SELECT ${colunas} FROM ${table()}${where ? ` WHERE ${where}` : ""} ORDER BY username`;
  const resultado = await sequelizeExterna().query(sql, {
    type: QueryTypes.SELECT,
    ...(replacements ? { replacements } : {}),
  });
  // QueryTypes.SELECT devolve as linhas diretamente; Some dialetos/devoluções
  // cruas trazem [linhas, metadata]. Normaliza os dois formatos.
  const rows = Array.isArray(resultado)
    ? Array.isArray(resultado[0])
      ? (resultado[0] as unknown[])
      : resultado
    : [];
  return (rows as Record<string, unknown>[]).flatMap((row) => {
    const parsed = ExternalUserSchema.safeParse(row);
    if (!parsed.success) return [];
    return [
      comSenha ? { ...parsed.data, password: String(row[passwordColumn()] ?? "") } : parsed.data,
    ];
  });
}

export async function listarUsuariosExternos(): Promise<ExternalUser[]> {
  return selectExternal();
}

export async function buscarUsuarioExterno(identifierValue: string): Promise<ExternalUser | undefined> {
  const rows = await selectExternal("username = :value OR email = :value", { value: identifierValue });
  return rows[0];
}

/**
 * Mapeamento opcional de cargo por usuário/e-mail, sem gravar no banco externo.
 * Formato: `EXTERNAL_ROLE_MAP=usuario1:Administrador,email@x:Editor`.
 */
function roleMapeado(username: string, email: string): string | undefined {
  for (const entrada of String(process.env.EXTERNAL_ROLE_MAP || "").split(",")) {
    const [chave, papel] = entrada.split(":").map((parte) => parte.trim());
    if (!chave || !papel) continue;
    const alvo = chave.toLowerCase();
    if (alvo === username.toLowerCase() || alvo === email.toLowerCase()) return papel;
  }
  return undefined;
}

function mesclar(external: ExternalUser, overrides?: Record<string, unknown> | null): DirectoryUser {
  const papel = (overrides?.role || roleMapeado(external.username, external.email) || external.role || "Convidado") as Role;
  const ativo = overrides?.isActive === undefined ? external.is_active : Boolean(overrides.isActive);
  return {
    id: external.username,
    username: external.username,
    first_name: external.first_name,
    last_name: external.last_name,
    email: external.email,
    is_active: external.is_active,
    role: papel,
    isActive: ativo,
    workgroup: (overrides?.workgroup as string | null) ?? null,
    team: (overrides?.team as string | null) ?? null,
    origin: "externo",
  };
}

/** Lista unificada: externos + ajustes locais + contas convidadas. */
export async function listarDiretorio(): Promise<DirectoryUser[]> {
  const [externos, overridesDb, overridesLocais, convidados] = await Promise.all([
    listarUsuariosExternos().catch(() => [] as ExternalUser[]),
    temBancoLocal() ? UserOverride.findAll({ raw: true }).catch(() => []) : Promise.resolve([]),
    listarOverridesLocais().catch(() => []),
    temBancoLocal() ? GuestAccount.findAll({ raw: true }).catch(() => []) : Promise.resolve([]),
  ]);

  const mapa = new Map<string, Record<string, unknown>>();
  // A tabela local em JSON é a origem quando o SQL local não está disponível;
  // se ele existir, o registro do banco tem precedência.
  for (const item of overridesLocais) {
    mapa.set(item.username.toLowerCase(), item as unknown as Record<string, unknown>);
  }
  for (const item of overridesDb as unknown as Array<Record<string, unknown>>) {
    mapa.set(String(item.username).toLowerCase(), item);
  }

  const usuarios: DirectoryUser[] = externos.map((externo) =>
    mesclar(externo, mapa.get(externo.username.toLowerCase())),
  );

  for (const item of convidados as unknown as Array<Record<string, unknown>>) {
    usuarios.push({
      id: String(item.id),
      username: String(item.username),
      first_name: String(item.firstName),
      last_name: String(item.lastName),
      email: String(item.email),
      is_active: Boolean(item.isActive),
      role: String(item.role) as Role,
      isActive: Boolean(item.isActive),
      workgroup: (item.workgroup as string) ?? null,
      team: (item.team as string) ?? null,
      origin: "convidado",
    });
  }
  return usuarios;
}

/** Cria ou atualiza o ajuste local de um usuário externo. */
export async function definirOverride(username: string, patch: UserOverrideInput): Promise<DirectoryUser> {
  const externo = await buscarUsuarioExterno(username);
  if (!externo) throw new Error("Usuário externo não encontrado.");
  if (temBancoLocal()) {
    try {
      const [override] = await UserOverride.upsert({
        username: externo.username,
        role: patch.role,
        isActive: patch.isActive,
        workgroup: patch.workgroup ?? null,
        team: patch.team ?? null,
        externalId: externo.username,
      } as never);
      return mesclar(externo, override?.toJSON?.() as Record<string, unknown> | undefined);
    } catch {
      // SQL local fora do ar: cai para a tabela própria do Portal.
    }
  }
  const salvo = await salvarOverrideLocal(externo.username, patch, externo.email);
  return mesclar(externo, salvo as unknown as Record<string, unknown>);
}

/** Papel efetivo de um usuário (override local → coluna externa → Convidado). */
export async function papelExterno(username: string): Promise<string | undefined> {
  const overrideDb = temBancoLocal()
    ? await UserOverride.findOne({ where: { username: { [Op.eq]: username } } }).catch(() => null)
    : null;
  if (overrideDb) return overrideDb.role;
  const local = await buscarOverrideLocal(username).catch(() => undefined);
  if (local?.role) return local.role;
  const externo = await buscarUsuarioExterno(username);
  if (!externo) return undefined;
  // O override pode ter sido gravado pelo username; a permissão consulta pelo e-mail.
  const localExterno =
    (await buscarOverrideLocal(externo.username).catch(() => undefined)) ||
    (await buscarOverrideLocal(externo.email).catch(() => undefined));
  if (localExterno?.role) return localExterno.role;
  return roleMapeado(externo.username, externo.email) || externo.role || undefined;
}

/**
 * Login externo por username ou e-mail. Usa a senha já existente na base
 * externa (PBKDF2) e respeita is_active e o override local.
 */
const aviso = (mensagem: string) => {
  if (process.env.NODE_ENV !== "production") console.warn(`[directory] ${mensagem}`);
};

export async function autenticarUsuarioExterno(
  login: string,
  senha: string,
): Promise<{ id: string; username: string; email: string; name: string; role: string } | undefined> {
  if (!temBancoExterno()) {
    aviso("DB_USER/DB_PASSWORD não configurados; login externo desativado.");
    return undefined;
  }
  const valor = login.trim().toLowerCase();
  if (!valor || !senha) return undefined;
  const [externo] = await selectExternal(
    "LOWER(username) = :value OR LOWER(email) = :value",
    { value: valor },
    true,
  );
  if (!externo) {
    aviso(`usuário externo não encontrado: ${valor}`);
    return undefined;
  }
  if (!externo.is_active) {
    aviso(`usuário externo inativo: ${valor}`);
    return undefined;
  }
  const armazenado = String(externo.password || "");
  if (!verificarSenhaExterna(senha, armazenado)) {
    // Só o prefixo do formato; nunca o salt, o hash ou a senha.
    aviso(`senha externa não conferiu para ${valor} (formato: ${armazenado.split("$")[0] || "vazio"}).`);
    return undefined;
  }
  const overrideDb = temBancoLocal()
    ? await UserOverride.findOne({
        where: { username: { [Op.eq]: externo.username } },
      }).catch(() => null)
    : null;
  const overrideLocal = overrideDb ? undefined : await buscarOverrideLocal(externo.username).catch(() => undefined);
  if (overrideDb?.isActive === false || overrideLocal?.isActive === false) {
    aviso(`override local desativou o usuário ${valor}.`);
    return undefined;
  }
  return {
    id: externo.username,
    username: externo.username,
    email: externo.email,
    name: `${externo.first_name} ${externo.last_name}`.trim(),
    role: overrideDb?.role || overrideLocal?.role || roleMapeado(externo.username, externo.email) || externo.role || "Convidado",
  };
}

export async function criarConvidado(input: GuestAccountInput, senhaTemporaria?: string): Promise<GuestAccount> {
  const passwordHash = senhaTemporaria ? await bcrypt.hash(senhaTemporaria, 10) : null;
  return GuestAccount.create({ ...input, passwordHash } as never);
}

/** Login de contas convidadas ( criadas apenas no nosso banco ). */
export async function autenticarConvidado(
  login: string,
  password: string,
): Promise<{ id: string; email: string; name: string; role: string } | undefined> {
  if (!process.env.DATABASE_URL) return undefined;
  const { sequelizeLocal } = await import("../lib/sequelize.js");
  initModels(sequelizeLocal());
  const conta = await GuestAccount.findOne({
    where: {
      [Op.or]: [
        { username: login.trim() },
        { email: login.trim().toLowerCase() },
      ],
    },
  }).catch(() => null);
  if (!conta || !conta.isActive || !conta.passwordHash) return undefined;
  if (!(await bcrypt.compare(password, conta.passwordHash))) return undefined;
  return {
    id: conta.id,
    email: conta.email,
    name: `${conta.firstName} ${conta.lastName}`.trim(),
    role: conta.role,
  };
}

export async function listarConvidados(): Promise<GuestAccount[]> {
  return GuestAccount.findAll({ order: [["workgroup", "ASC"], ["username", "ASC"]] });
}

export async function removerConvidado(id: string): Promise<boolean> {
  const count = await GuestAccount.destroy({ where: { id } });
  return count > 0;
}
