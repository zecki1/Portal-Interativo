import { pbkdf2Sync } from "node:crypto";
import { describe, it, expect } from "vitest";
import { verificarSenhaExterna } from "./directoryService.js";
import {
  ExternalUserSchema,
  GuestAccountInputSchema,
  UserOverrideInputSchema,
  RoleSchema,
} from "../schemas/directory.js";

describe("Diretório SQL Server / schemas Zod", () => {
  it("valida usuário externo e normaliza is_active", () => {
    const user = ExternalUserSchema.parse({
      username: "maria.silva",
      first_name: "Maria",
      last_name: "Silva",
      email: "maria@sesisp.org.br",
      is_active: 1,
    });
    expect(user.is_active).toBe(true);
    expect(ExternalUserSchema.parse({ ...user, is_active: "false" }).is_active).toBe(false);
  });

  it("não aceita campos de senha da base externa", () => {
    const user = ExternalUserSchema.parse({
      username: "maria.silva",
      first_name: "Maria",
      last_name: "Silva",
      email: "maria@sesisp.org.br",
      is_active: 1,
      password_hash: "pbkdf2_sha256$10$salt$hash",
    });
    expect(user).not.toHaveProperty("password_hash");
  });

  it("rejeita e-mail inválido e papel desconhecido", () => {
    expect(() =>
      ExternalUserSchema.parse({
        username: "x",
        first_name: "X",
        last_name: "Y",
        email: "invalido",
        is_active: true,
      }),
    ).toThrow();
    expect(RoleSchema.safeParse("Diretor").success).toBe(false);
    expect(() => UserOverrideInputSchema.parse({ role: "Diretor" })).toThrow();
  });

  it("verifica senha PBKDF2 da base externa sem importar código de outra aplicação", () => {
    const salt = "c2FsdHNhbHRzYWx0";
    const iteracoes = 1000;
    const hash = pbkdf2Sync("Senha123", salt, iteracoes, 32, "sha256").toString("base64");
    const armazenado = `pbkdf2_sha256$${iteracoes}$${salt}$${hash}`;
    expect(verificarSenhaExterna("Senha123", armazenado)).toBe(true);
    expect(verificarSenhaExterna("errada", armazenado)).toBe(false);
    expect(verificarSenhaExterna("Senha123", "pbkdf2_sha256$0$abc$def")).toBe(false);
    expect(verificarSenhaExterna("Senha123", "sha256$abc$def")).toBe(false);
  });

  it("conta convidada exige workgroup e dá default em Convidado", () => {
    const guest = GuestAccountInputSchema.parse({
      username: "convidado1",
      firstName: "João",
      lastName: "Lima",
      email: "joao@sesisp.org.br",
      workgroup: "Editora",
    });
    expect(guest.role).toBe("Convidado");
    expect(guest.isActive).toBe(true);
    expect(guest.team).toBeNull();
  });
});
