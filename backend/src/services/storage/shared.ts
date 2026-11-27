import { createHash } from "node:crypto";
import type { ResourceAssetInput } from "../../schemas/directory.js";

export type StorageDriverName = "sftp" | "local" | "azure";

export interface StorageObjectMeta {
  blobName: string;
  kind: string;
  category: string;
  projectId: string | null;
  originalName: string;
  checksumSha256: string;
}

export function safeSegment(name: string, max = 120): string {
  return (
    String(name || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, max) || "arquivo"
  );
}

export function kindFromMime(contentType: string, name: string): string {
  const ct = String(contentType || "").toLowerCase();
  const ext = String(name.split(".").pop() || "").toLowerCase();
  if (ct.startsWith("image/") || /^(png|jpg|jpeg|gif|webp|svg|avif)$/.test(ext)) return "image";
  if (ct.startsWith("video/") || /^(mp4|webm|mov|m4v)$/.test(ext)) return "video";
  if (ct.startsWith("audio/") || /^(mp3|wav|ogg|m4a)$/.test(ext)) return "audio";
  if (ct === "application/pdf" || ext === "pdf") return "document";
  if (/^(json|xml|html|css|js|ts|txt|md|csv)$/.test(ext)) return "text";
  return "other";
}

export function checksumSha256(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

export function buildStorageObject(
  input: ResourceAssetInput,
  buffer: Buffer,
  now = new Date(),
): StorageObjectMeta {
  const kind = safeSegment(input.kind || kindFromMime(input.contentType, input.name), 64);
  const category = safeSegment(input.category || "geral", 128);
  const projectId = input.projectId ? safeSegment(input.projectId, 128) : null;
  const projectSeg = projectId || "sem-projeto";
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  const stamp = now.toISOString().replace(/[:.]/g, "-");
  const originalName = String(input.name || "arquivo").slice(0, 300);
  const blobName = [
    kind,
    category,
    `y=${y}`,
    `m=${m}`,
    `d=${d}`,
    projectSeg,
    `${stamp}_${safeSegment(originalName)}`,
  ].join("/");
  return {
    blobName,
    kind,
    category,
    projectId,
    originalName,
    checksumSha256: checksumSha256(buffer),
  };
}

export function storageDriverName(): StorageDriverName {
  const value = String(process.env.STORAGE_DRIVER || "sftp").toLowerCase();
  return value === "local" || value === "azure" ? value : "sftp";
}

export function storageConfigured(): boolean {
  const driver = storageDriverName();
  if (driver === "azure") {
    return Boolean(process.env.AZURE_BLOB_CONNECTION_STRING)
      || (String(process.env.AZURE_USE_MANAGED_IDENTITY || "").toLowerCase() === "true"
        && Boolean(process.env.AZURE_STORAGE_ACCOUNT));
  }
  if (driver === "sftp") return Boolean(process.env.SFTP_HOST && process.env.SFTP_USER);
  return true;
}
