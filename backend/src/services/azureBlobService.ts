import { BlobServiceClient, BlobSASPermissions } from "@azure/storage-blob";
import { ResourceAsset } from "../models/index.js";
import type { ResourceAssetInput } from "../schemas/directory.js";
import { buildStorageObject, safeSegment } from "./storage/shared.js";

function azureConfig() {
  const connectionString = process.env.AZURE_BLOB_CONNECTION_STRING?.trim();
  const account = process.env.AZURE_STORAGE_ACCOUNT?.trim();
  const container = (process.env.AZURE_BLOB_CONTAINER || "interativo").trim();
  const useManagedIdentity = String(process.env.AZURE_USE_MANAGED_IDENTITY || "").toLowerCase() === "true";
  if (!connectionString && !(useManagedIdentity && account)) {
    throw new Error(
      "Azure não configurado. Defina AZURE_BLOB_CONNECTION_STRING ou AZURE_USE_MANAGED_IDENTITY=true + AZURE_STORAGE_ACCOUNT.",
    );
  }
  return { connectionString, account, container, useManagedIdentity };
}

async function client(): Promise<{ service: BlobServiceClient; container: string; account: string }> {
  const cfg = azureConfig();
  if (cfg.connectionString) {
    const service = BlobServiceClient.fromConnectionString(cfg.connectionString);
    return { service, container: cfg.container, account: service.accountName };
  }

  // Managed Identity path: only loaded when configured, keeping local/dev simple.
  const mod = await import("@azure/identity").catch(() => null);
  if (!mod?.DefaultAzureCredential) {
    throw new Error(
      "AZURE_USE_MANAGED_IDENTITY=true requer @azure/identity instalado no backend.",
    );
  }
  const credential = new mod.DefaultAzureCredential();
  const service = new BlobServiceClient(`https://${cfg.account}.blob.core.windows.net`, credential);
  return { service, container: cfg.container, account: cfg.account! };
}

export interface UploadResult {
  asset: ResourceAsset;
  url: string;
}

/** Envia o arquivo para o Blob e registra os metadados no SQL Server. */
export async function upload(buffer: Buffer, input: ResourceAssetInput): Promise<UploadResult> {
  const { service, container, account } = await client();
  const meta = buildStorageObject(input, buffer);
  const containerClient = service.getContainerClient(container);
  await containerClient.createIfNotExists();
  const blockBlobClient = containerClient.getBlockBlobClient(meta.blobName);
  await blockBlobClient.uploadData(buffer, {
    blobHTTPHeaders: { blobContentType: input.contentType || "application/octet-stream" },
    metadata: {
      kind: meta.kind,
      category: meta.category,
      projectId: meta.projectId || "sem-projeto",
      uploadedBy: safeSegment(input.uploadedBy || "anonimo", 256),
      originalName: safeSegment(meta.originalName),
      checksumSha256: meta.checksumSha256,
    },
  });

  const blobUrl = blockBlobClient.url || `https://${account}.blob.core.windows.net/${container}/${meta.blobName}`;
  const asset = await ResourceAsset.create({
    name: input.name,
    originalName: meta.originalName,
    blobName: meta.blobName,
    container,
    blobUrl,
    contentType: input.contentType || "application/octet-stream",
    size: input.size,
    checksumSha256: meta.checksumSha256,
    workgroup: input.workgroup ?? null,
    team: input.team ?? null,
    uploadedBy: input.uploadedBy ?? null,
    updatedBy: input.uploadedBy ?? null,
    kind: meta.kind,
    category: meta.category,
    projectId: meta.projectId,
    status: "active",
    deletedAt: null,
    deletedBy: null,
  } as never);
  return { asset, url: blobUrl };
}

export async function download(blobName: string): Promise<Buffer> {
  const { service, container } = await client();
  return service.getContainerClient(container).getBlockBlobClient(blobName).downloadToBuffer();
}

export async function remover(id: string, actor?: string | null): Promise<boolean> {
  const asset = await ResourceAsset.findByPk(id);
  if (!asset) return false;
  const { service } = await client();
  await service.getContainerClient(asset.container).getBlockBlobClient(asset.blobName).deleteIfExists();
  asset.status = "deleted";
  asset.deletedAt = new Date();
  asset.deletedBy = actor ?? null;
  asset.updatedBy = actor ?? null;
  await asset.save();
  return true;
}

/** URL assinada (SAS) de leitura — permite compartilhar com outra aplicação. */
export async function urlAssinada(id: string, horas = 24): Promise<string | null> {
  const asset = await ResourceAsset.findByPk(id);
  if (!asset || asset.status === "deleted") return null;
  const { service } = await client();
  const blobClient = service
    .getContainerClient(asset.container)
    .getBlockBlobClient(asset.blobName);
  try {
    return await blobClient.generateSasUrl({
      permissions: BlobSASPermissions.parse("r"),
      startsOn: new Date(Date.now() - 60_000),
      expiresOn: new Date(Date.now() + Math.min(Math.max(horas, 1), 24 * 7) * 3600_000),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/SharedKey|credential|SAS/i.test(msg)) {
      throw new Error("SAS indisponível para este tipo de credencial. Use connection string com chave ou gere SAS por delegação de usuário.");
    }
    throw err;
  }
}
