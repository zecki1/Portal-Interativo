// shared/schemas/index.ts
import { z } from "zod";

// --- Core ---
export const WorkspaceSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  ownerId: z.string(),
  plan: z.enum(["free", "pro", "enterprise", "lifetime"]).default("free"),
  createdAt: z.string(),
  updatedAt: z.string(),
  members: z.array(z.string()).default([]),
  deletedAt: z.string().optional(),
});
export type Workspace = z.infer<typeof WorkspaceSchema>;

export const UserSchema = z.object({
  id: z.string().min(1),
  email: z.string().email(),
  name: z.string().min(1),
  nickname: z.string().optional(),
  role: z.enum(["Editor", "Gestor", "Admin", "Convidado"]).default("Convidado"),
  subRole: z.enum(["Designer", "Audiovisual", "Dev", "Ilustrador", "Revisor"]).optional(),
  workspaceId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type User = z.infer<typeof UserSchema>;

// --- Recursos do catálogo ---
export const ResourceTypeSchema = z.enum(["image", "vector", "template", "audio", "video", "design", "document", "other"]);
export type ResourceType = z.infer<typeof ResourceTypeSchema>;

export const ResourceStatusSchema = z.enum(["draft", "in_review", "approved", "published", "archived", "rejected"]);
export type ResourceStatus = z.infer<typeof ResourceStatusSchema>;

export const LicenseSchema = z.enum(["free", "premium", "cc0", "cc-by", "custom"]);
export type License = z.infer<typeof LicenseSchema>;

export const ResourceSchema = z.object({
  id: z.string().min(1),
  workspaceId: z.string().min(1),
  title: z.string().min(1).max(200),
  slug: z.string().min(1),
  description: z.string().max(2000).optional(),
  type: ResourceTypeSchema,
  mimeType: z.string(),
  sizeBytes: z.number().int().nonnegative(),
  dimensions: z.object({ width: z.number().int().positive(), height: z.number().int().positive() }).optional(),
  tags: z.array(z.string().min(1).max(40)).default([]),
  aiGeneratedTags: z.array(z.string()).default([]),
  categoryId: z.string().optional(),
  license: LicenseSchema.default("free"),
  authorId: z.string(),
  lastEditedBy: z.string().optional(),
  lastEditedAt: z.string().optional(),
  status: ResourceStatusSchema.default("draft"),
  currentVersionId: z.string().optional(),
  folderId: z.string().optional(),
  projectId: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().optional(),
});
export type Resource = z.infer<typeof ResourceSchema>;

export const ResourceVersionSchema = z.object({
  id: z.string().min(1),
  resourceId: z.string().min(1),
  version: z.string().regex(/^v\d+(\.\d+)?$/),
  storageKey: z.string().min(1),
  thumbnailKey: z.string().optional(),
  checksum: z.string().min(1),
  sizeBytes: z.number().int().nonnegative(),
  changelog: z.string().max(500).optional(),
  createdBy: z.string(),
  createdAt: z.string(),
});
export type ResourceVersion = z.infer<typeof ResourceVersionSchema>;

export const CategorySchema = z.object({
  id: z.string().min(1),
  workspaceId: z.string().min(1),
  name: z.string().min(1).max(80),
  slug: z.string().min(1),
  description: z.string().max(300).optional(),
  parentId: z.string().optional(),
  createdAt: z.string(),
});
export type Category = z.infer<typeof CategorySchema>;

export const TagSchema = z.object({
  id: z.string().min(1),
  workspaceId: z.string().min(1),
  name: z.string().min(1).max(40),
  slug: z.string().min(1),
  usageCount: z.number().int().nonnegative().default(0),
});
export type Tag = z.infer<typeof TagSchema>;

// --- Projetos / Pastas / Arquivos ---
export const ProjectSchema = z.object({
  id: z.string().min(1),
  workspaceId: z.string().min(1),
  name: z.string().min(1).max(120),
  code: z.string().min(1),
  description: z.string().max(500).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Project = z.infer<typeof ProjectSchema>;

export const FolderSchema = z.object({
  id: z.string().min(1),
  projectId: z.string().min(1),
  parentId: z.string().optional(),
  name: z.string().min(1).max(120),
  path: z.string().min(1),
  createdAt: z.string(),
});
export type Folder = z.infer<typeof FolderSchema>;

export const AssetFileSchema = z.object({
  id: z.string().min(1),
  folderId: z.string().min(1),
  resourceId: z.string().min(1),
  type: z.enum(["source", "preview", "export"]).default("source"),
  fields: z.record(z.string(), z.any()).default({}),
  poseTags: z.array(z.string()).default([]),
  createdAt: z.string(),
});
export type AssetFile = z.infer<typeof AssetFileSchema>;

// --- Logs ---
export const TimeLogSchema = z.object({
  id: z.string().min(1),
  userId: z.string(),
  resourceId: z.string(),
  action: z.enum(["upload", "edit", "view", "download", "delete"]),
  durationSec: z.number().int().nonnegative(),
  createdAt: z.string(),
});
export type TimeLog = z.infer<typeof TimeLogSchema>;

export const AuditLogSchema = z.object({
  id: z.string().min(1),
  userId: z.string(),
  entityType: z.string(),
  entityId: z.string(),
  action: z.enum(["create", "update", "delete", "approve", "reject", "rollback", "publish"]),
  diff: z.record(z.string(), z.any()).optional(),
  ip: z.string().optional(),
  createdAt: z.string(),
});
export type AuditLog = z.infer<typeof AuditLogSchema>;

// --- Aprovação ---
export const ApprovalSchema = z.object({
  id: z.string().min(1),
  resourceId: z.string().min(1),
  requesterId: z.string(),
  approverId: z.string().optional(),
  status: z.enum(["pending", "approved", "rejected"]).default("pending"),
  comment: z.string().max(500).optional(),
  createdAt: z.string(),
  decidedAt: z.string().optional(),
});
export type Approval = z.infer<typeof ApprovalSchema>;

// --- Comentários / Notificações ---
export const CommentSchema = z.object({
  id: z.string().min(1),
  resourceId: z.string().min(1),
  authorId: z.string(),
  content: z.string().min(1).max(2000),
  mentions: z.array(z.string()).default([]),
  gifUrl: z.string().url().optional(),
  parentId: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
});
export type Comment = z.infer<typeof CommentSchema>;

export const NotificationSchema = z.object({
  id: z.string().optional(),
  userId: z.string(),
  type: z.string(),
  message: z.string(),
  createdAt: z.string(),
  read: z.boolean().default(false),
  resourceId: z.string().optional(),
  versionId: z.string().optional(),
  workspaceId: z.string().optional(),
});
export type Notification = z.infer<typeof NotificationSchema>;

// --- Personagens (PEP) ---
export const CharacterSchema = z.object({
  id: z.string().min(1),
  code: z.string().regex(/^P\d{3}$/),
  name: z.string().min(1),
  slug: z.string().min(1),
  gender: z.enum(["homem", "mulher", "outro"]),
  ethnicity: z.string(),
  ageGroup: z.enum(["estudante", "adulto", "idoso"]),
  schoolGrade: z.string().optional(),
  occupation: z.string().optional(),
  preparedForAnimation: z.boolean().default(false),
  animationPrompt: z.string().max(2000).optional(),
  positionCount: z.number().int().nonnegative().default(0),
  standardPositions: z.array(z.string()).default([]),
  specificities: z.array(z.string()).default([]),
  accessibility: z.array(z.string()).default([]),
  poseTags: z.array(z.string()).default([]),
  family: z.array(z.object({ toId: z.string(), relation: z.string() })).default([]),
  tags: z.array(z.string()).default([]),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Character = z.infer<typeof CharacterSchema>;

export const CharacterRelationSchema = z.object({
  id: z.string().min(1),
  fromId: z.string(),
  toId: z.string(),
  relationType: z.enum(["pai", "mae", "filho", "irmao", "primo", "tio", "avo", "neto", "gemeo"]),
});
export type CharacterRelation = z.infer<typeof CharacterRelationSchema>;

// --- Payloads ---
export const CreateResourcePayloadSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  type: ResourceTypeSchema,
  tags: z.array(z.string()).default([]),
  categoryId: z.string().optional(),
  license: LicenseSchema.optional(),
  folderId: z.string().optional(),
  projectId: z.string().optional(),
  externalUrl: z.string().url().optional(),
});
export type CreateResourcePayload = z.infer<typeof CreateResourcePayloadSchema>;

export const UpdateResourcePayloadSchema = CreateResourcePayloadSchema.partial().extend({
  status: ResourceStatusSchema.optional(),
});
export type UpdateResourcePayload = z.infer<typeof UpdateResourcePayloadSchema>;

export const SearchQuerySchema = z.object({
  q: z.string().optional(),
  type: ResourceTypeSchema.optional(),
  tags: z.array(z.string()).optional(),
  categoryId: z.string().optional(),
  authorId: z.string().optional(),
  status: ResourceStatusSchema.optional(),
  folderId: z.string().optional(),
  projectId: z.string().optional(),
  sort: z.enum(["relevance", "date", "downloads", "popular"]).default("relevance"),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(24),
});
export type SearchQuery = z.infer<typeof SearchQuerySchema>;

export const RollbackPayloadSchema = z.object({
  versionId: z.string().min(1),
  changelog: z.string().max(500).optional(),
});
export type RollbackPayload = z.infer<typeof RollbackPayloadSchema>;
