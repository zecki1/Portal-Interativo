import { z } from "zod";

/** Cargos do Portal (idênticos aos da matriz de permissões). */
export const ROLE_VALUES = [
  "Administrador",
  "Editor",
  "Gestor",
  "Desenvolvedor",
  "Suporte",
  "Design",
  "Convidado",
] as const;

export const RoleSchema = z.enum(ROLE_VALUES);
export type Role = z.infer<typeof RoleSchema>;

/** Usuário lido da base externa de login (SQL Server). `is_active` pode vir como bit, number ou string. */
export const ExternalUserSchema = z.object({
  username: z.string().min(1).max(256),
  first_name: z.string().max(256).default(""),
  last_name: z.string().max(256).default(""),
  email: z.string().email().max(320),
  is_active: z
    .union([z.boolean(), z.number(), z.string()])
    .transform((value) => value === true || value === 1 || value === "1" || value === "true"),
  role: z.string().nullable().optional(),
});

export type ExternalUser = z.infer<typeof ExternalUserSchema>;

/** Visão unificada: dados externos + decisões locais (cargo, ativo, time). */
export const DirectoryUserSchema = ExternalUserSchema.extend({
  role: RoleSchema.default("Convidado"),
  isActive: z.boolean().default(true),
  workgroup: z.string().max(128).nullable().optional(),
  team: z.string().max(128).nullable().optional(),
  origin: z.enum(["externo", "convidado"]).default("externo"),
  id: z.string().optional(),
});

export type DirectoryUser = z.infer<typeof DirectoryUserSchema>;

/** Ajustes que a editora pode fazer sobre um usuário externo. */
export const UserOverrideInputSchema = z.object({
  role: RoleSchema.optional(),
  isActive: z.boolean().optional(),
  workgroup: z.string().max(128).nullable().optional(),
  team: z.string().max(128).nullable().optional(),
});

export type UserOverrideInput = z.infer<typeof UserOverrideInputSchema>;

/** Conta convidada — existe apenas no nosso banco, separada por workgroup/time. */
export const GuestAccountInputSchema = z.object({
  username: z.string().min(3).max(256),
  firstName: z.string().min(1).max(256),
  lastName: z.string().min(1).max(256),
  email: z.string().email().max(320),
  role: RoleSchema.default("Convidado"),
  workgroup: z.string().min(1).max(128),
  team: z.string().max(128).nullable().default(null),
  isActive: z.boolean().default(true),
  createdBy: z.string().max(256).optional(),
});

export type GuestAccountInput = z.infer<typeof GuestAccountInputSchema>;

export const ResourceAssetStatusSchema = z.enum(["active", "deleted"]);
export type ResourceAssetStatus = z.infer<typeof ResourceAssetStatusSchema>;

/** Recurso enviado via API (SFTP/local/Azure), com metadados para auditoria/CRUD. */
export const ResourceAssetInputSchema = z.object({
  name: z.string().min(1).max(300),
  contentType: z.string().max(200).default("application/octet-stream"),
  size: z.number().int().min(0),
  workgroup: z.string().max(128).nullable().optional(),
  team: z.string().max(128).nullable().optional(),
  uploadedBy: z.string().max(256).optional(),
  category: z.string().max(128).nullable().optional(),
  kind: z.string().max(64).nullable().optional(),
  projectId: z.string().max(128).nullable().optional(),
});

export type ResourceAssetInput = z.infer<typeof ResourceAssetInputSchema>;

export const ResourceAssetUpdateSchema = z.object({
  name: z.string().min(1).max(300).optional(),
  category: z.string().max(128).nullable().optional(),
  kind: z.string().max(64).nullable().optional(),
  projectId: z.string().max(128).nullable().optional(),
  workgroup: z.string().max(128).nullable().optional(),
  team: z.string().max(128).nullable().optional(),
  status: ResourceAssetStatusSchema.optional(),
});
export type ResourceAssetUpdate = z.infer<typeof ResourceAssetUpdateSchema>;

export const ResourceAssetListQuerySchema = z.object({
  q: z.string().max(300).optional(),
  status: ResourceAssetStatusSchema.optional(),
  kind: z.string().max(64).optional(),
  category: z.string().max(128).optional(),
  projectId: z.string().max(128).optional(),
  workgroup: z.string().max(128).optional(),
  uploadedBy: z.string().max(256).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});
export type ResourceAssetListQuery = z.infer<typeof ResourceAssetListQuerySchema>;

/** Configuração de e-mail por SMTP (Nodemailer). */
export const MailConfigSchema = z.object({
  host: z.string().min(1).default(""),
  port: z.coerce.number().int().min(1).max(65535).default(587),
  user: z.string().min(1).default("apikey"),
  pass: z.string().min(1),
  from: z.string().email().default("no-reply-sesiead@sesisp.org.br"),
  fromName: z.string().min(1).default("SESI-SP Educação"),
  secure: z.boolean().default(false),
});

export type MailConfig = z.infer<typeof MailConfigSchema>;
