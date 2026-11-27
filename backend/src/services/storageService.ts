import fsp from "node:fs/promises";
import path from "node:path";
import { Op } from "sequelize";
import SftpClient from "ssh2-sftp-client";
import { ResourceAsset } from "../models/index.js";
import type { ResourceAssetInput, ResourceAssetListQuery, ResourceAssetUpdate } from "../schemas/directory.js";
import {
  buildStorageObject,
  storageConfigured as storageConfiguredShared,
  storageDriverName,
  type StorageDriverName,
} from "./storage/shared.js";

/**
 * Armazenamento de arquivos da API. Suporta sftp/local/azure com metadados no SQL.
 * Azure pode usar connection string ou Managed Identity (quando AZURE_USE_MANAGED_IDENTITY=true).
 */
export type StorageDriver = StorageDriverName;
export const storageDriver = storageDriverName;
export const storageConfigured = storageConfiguredShared;

interface SftpSettings {
  host: string;
  port: number;
  user: string;
  password?: string;
  privateKeyPath?: string;
  baseDir: string;
  publicBaseUrl?: string;
}

function sftpSettings(): SftpSettings {
  const host = process.env.SFTP_HOST;
  const user = process.env.SFTP_USER;
  if (!host || !user) throw new Error("SFTP_HOST e SFTP_USER são obrigatórios para o driver sftp.");
  return {
    host,
    port: Number(process.env.SFTP_PORT || 22),
    user,
    password: process.env.SFTP_PASSWORD,
    privateKeyPath: process.env.SFTP_PRIVATE_KEY_PATH,
    baseDir: (process.env.SFTP_BASE_DIR || "/portal-interativo").replace(/\/+$/, ""),
    publicBaseUrl: process.env.SFTP_PUBLIC_BASE_URL?.replace(/\/+$/, ""),
  };
}

async function withSftp<T>(fn: (client: SftpClient, settings: SftpSettings) => Promise<T>): Promise<T> {
  const settings = sftpSettings();
  const client = new SftpClient();
  await client.connect({
    host: settings.host,
    port: settings.port,
    username: settings.user,
    ...(settings.password ? { password: settings.password } : {}),
    ...(settings.privateKeyPath ? { privateKey: await fsp.readFile(settings.privateKeyPath) } : {}),
  });
  try {
    return await fn(client, settings);
  } finally {
    await client.end();
  }
}

function localRoot(): string {
  return path.resolve(process.env.STORAGE_LOCAL_DIR || path.join(process.cwd(), "data", "assets"));
}

function localFile(objectNameValue: string): string {
  const file = path.resolve(localRoot(), objectNameValue);
  if (!file.startsWith(localRoot() + path.sep)) throw new Error("Caminho de arquivo inválido.");
  return file;
}

/** URL pública do arquivo. Sem base pública, a API serve o conteúdo autenticado. */
function publicUrl(driver: StorageDriver, objectNameValue: string, assetId?: string): string {
  if (driver === "sftp") {
    const base = sftpSettings().publicBaseUrl;
    if (base) return `${base}/${objectNameValue.split("/").map(encodeURIComponent).join("/")}`;
  }
  return `/api/v1/blob/resources/${assetId || ""}/content`;
}

export interface UploadResult {
  asset: ResourceAsset;
  url: string;
}

function auditActor(input?: string | null) {
  return input?.trim() || null;
}

export async function upload(buffer: Buffer, input: ResourceAssetInput): Promise<UploadResult> {
  const driver = storageDriver();
  const meta = buildStorageObject(input, buffer);

  if (driver === "azure") {
    const { upload: uploadAzure } = await import("./azureBlobService.js");
    return uploadAzure(buffer, input);
  }

  if (driver === "sftp") {
    await withSftp(async (client, settings) => {
      await client.mkdir(`${settings.baseDir}/${path.posix.dirname(meta.blobName)}`, true);
      await client.put(buffer, `${settings.baseDir}/${meta.blobName}`);
    });
  } else {
    const file = localFile(meta.blobName);
    await fsp.mkdir(path.dirname(file), { recursive: true });
    await fsp.writeFile(file, buffer);
  }

  const asset = await ResourceAsset.create({
    name: input.name,
    originalName: meta.originalName,
    blobName: meta.blobName,
    container: driver,
    blobUrl: "",
    contentType: input.contentType || "application/octet-stream",
    size: input.size,
    checksumSha256: meta.checksumSha256,
    workgroup: input.workgroup ?? null,
    team: input.team ?? null,
    uploadedBy: auditActor(input.uploadedBy),
    updatedBy: auditActor(input.uploadedBy),
    kind: meta.kind,
    category: meta.category,
    projectId: meta.projectId,
    status: "active",
    deletedAt: null,
    deletedBy: null,
  } as never);
  asset.blobUrl = publicUrl(driver, meta.blobName, asset.id);
  await asset.save();
  return { asset, url: asset.blobUrl };
}

export async function listarRecursos(query: ResourceAssetListQuery = { limit: 50, offset: 0 } as any) {
  const where: any = {};
  if (query.status) where.status = query.status;
  if (query.kind) where.kind = query.kind;
  if (query.category) where.category = query.category;
  if (query.projectId) where.projectId = query.projectId;
  if (query.workgroup) where.workgroup = query.workgroup;
  if (query.uploadedBy) where.uploadedBy = query.uploadedBy;
  if (query.q) {
    where[Op.or] = [
      { name: { [Op.like]: `%${query.q}%` } },
      { originalName: { [Op.like]: `%${query.q}%` } },
      { blobName: { [Op.like]: `%${query.q}%` } },
    ];
  }
  const from = query.from ? new Date(query.from) : null;
  const to = query.to ? new Date(query.to) : null;
  if ((from && !Number.isNaN(from.getTime())) || (to && !Number.isNaN(to.getTime()))) {
    where.createdAt = {};
    if (from && !Number.isNaN(from.getTime())) where.createdAt[Op.gte] = from;
    if (to && !Number.isNaN(to.getTime())) where.createdAt[Op.lte] = to;
  }
  const limit = Math.min(Math.max(Number(query.limit || 50), 1), 200);
  const offset = Math.max(Number(query.offset || 0), 0);
  const { rows, count } = await ResourceAsset.findAndCountAll({
    where,
    order: [["createdAt", "DESC"]],
    limit,
    offset,
  });
  return { items: rows, total: count, limit, offset };
}

export async function buscarRecurso(id: string): Promise<ResourceAsset | null> {
  return ResourceAsset.findByPk(id);
}

export async function baixar(id: string): Promise<{ asset: ResourceAsset; buffer: Buffer } | null> {
  const asset = await ResourceAsset.findByPk(id);
  if (!asset || asset.status === "deleted") return null;
  if (asset.container === "azure") {
    const { download } = await import("./azureBlobService.js");
    return { asset, buffer: await download(asset.blobName) };
  }
  const buffer =
    asset.container === "sftp"
      ? await withSftp(async (client, settings) =>
          (await client.get(`${settings.baseDir}/${asset.blobName}`)) as Buffer,
        )
      : await fsp.readFile(localFile(asset.blobName));
  return { asset, buffer };
}

export async function atualizarMetadados(id: string, patch: ResourceAssetUpdate, actor?: string | null): Promise<ResourceAsset | null> {
  const asset = await ResourceAsset.findByPk(id);
  if (!asset) return null;
  if (patch.name !== undefined) asset.name = patch.name;
  if (patch.category !== undefined) asset.category = patch.category;
  if (patch.kind !== undefined) asset.kind = patch.kind;
  if (patch.projectId !== undefined) asset.projectId = patch.projectId;
  if (patch.workgroup !== undefined) asset.workgroup = patch.workgroup;
  if (patch.team !== undefined) asset.team = patch.team;
  if (patch.status !== undefined) {
    asset.status = patch.status;
    asset.deletedAt = patch.status === "deleted" ? asset.deletedAt || new Date() : null;
    asset.deletedBy = patch.status === "deleted" ? auditActor(actor) : null;
  }
  asset.updatedBy = auditActor(actor);
  await asset.save();
  return asset;
}

export async function restaurar(id: string, actor?: string | null): Promise<ResourceAsset | null> {
  return atualizarMetadados(id, { status: "active" }, actor);
}

export async function remover(id: string, actor?: string | null): Promise<boolean> {
  const asset = await ResourceAsset.findByPk(id);
  if (!asset) return false;
  if (asset.status === "deleted") return true;

  if (asset.container === "azure") {
    const { remover: removerAzure } = await import("./azureBlobService.js");
    await removerAzure(id, actor);
    return true;
  }
  if (asset.container === "sftp") {
    await withSftp((client, settings) => client.delete(`${settings.baseDir}/${asset.blobName}`)).catch(() => undefined);
  } else {
    await fsp.unlink(localFile(asset.blobName)).catch(() => undefined);
  }
  asset.status = "deleted";
  asset.deletedAt = new Date();
  asset.deletedBy = auditActor(actor);
  asset.updatedBy = auditActor(actor);
  await asset.save();
  return true;
}

export async function urlAssinada(id: string, horas = 24): Promise<string | null> {
  const asset = await ResourceAsset.findByPk(id);
  if (!asset || asset.status === "deleted") return null;
  if (asset.container === "azure") {
    const { urlAssinada: urlAzure } = await import("./azureBlobService.js");
    return urlAzure(id, horas);
  }
  return publicUrl(asset.container as StorageDriver, asset.blobName, asset.id);
}
