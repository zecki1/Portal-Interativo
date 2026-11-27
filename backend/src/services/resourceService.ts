import { resourceRepository } from "../repositories/resourceRepository.js";
import { activityRepository } from "../repositories/activityRepository.js";

interface Ator {
  id?: string;
  nome: string;
}

/** Campos que o banco conhece — o resto (files, editors, comments) existe no app. */
const CAMPOS_EDITAVEIS = [
  "title",
  "description",
  "type",
  "tags",
  "story",
  "notes",
  "prompt",
  "poses",
  "animationReady",
  "animationFiles",
  "fileName",
  "mimeType",
  "sizeBytes",
  "dimensions",
  "thumbnailUrl",
  "status",
];

function somenteCamposConhecidos(data: Record<string, unknown>) {
  const limpo: Record<string, unknown> = {};
  for (const campo of CAMPOS_EDITAVEIS) {
    if (data[campo] !== undefined) limpo[campo] = data[campo];
  }
  return limpo;
}

function gerarSlug(titulo: string) {
  const base = titulo
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return `${base || "recurso"}-${Date.now().toString(36)}`;
}

export const resourceService = {
  async list() {
    return resourceRepository.findAll();
  },
  async get(id: string) {
    const r = await resourceRepository.findById(id);
    if (!r || r.deletedAt) throw new Error("Not found");
    return r;
  },
  async create(data: any, ator: Ator) {
    const recurso = await resourceRepository.create({
      ...somenteCamposConhecidos(data),
      slug: gerarSlug(String(data.title ?? "recurso")),
      mimeType: data.mimeType ?? "application/octet-stream",
      sizeBytes: data.sizeBytes ?? 0,
      authorId: ator.id ?? "sistema",
      status: "draft",
    });

    await activityRepository.log({
      resourceId: recurso.id,
      authorId: ator.id,
      authorName: ator.nome,
      action: "criação",
      detail: recurso.title,
    });

    return recurso;
  },
  async update(id: string, data: any, ator: Ator) {
    const r = await resourceRepository.findById(id);
    if (!r || r.deletedAt) throw new Error("Not found");

    // optimistic locking
    if (data.updatedAt && r.updatedAt.toISOString() !== data.updatedAt) {
      throw new Error("Conflict: resource was modified");
    }

    const { acao, ...campos } = data;
    const atualizado = await resourceRepository.update(id, {
      ...somenteCamposConhecidos(campos),
      lastEditedBy: ator.id ?? r.lastEditedBy,
    });

    await activityRepository.log({
      resourceId: id,
      authorId: ator.id,
      authorName: ator.nome,
      action: typeof acao === "string" && acao.trim() ? acao.trim() : "edição",
      detail: atualizado.title,
    });

    return atualizado;
  },
  async remove(id: string, ator?: Ator) {
    const removido = await resourceRepository.softDelete(id);
    if (ator) {
      await activityRepository.log({
        resourceId: id,
        authorId: ator.id,
        authorName: ator.nome,
        action: "exclusão",
        detail: removido.title,
      });
    }
    return removido;
  },
  async publish(id: string, ator?: Ator) {
    const publicado = await resourceRepository.update(id, { status: "published" });
    if (ator) {
      await activityRepository.log({
        resourceId: id,
        authorId: ator.id,
        authorName: ator.nome,
        action: "publicação",
        detail: publicado.title,
      });
    }
    return publicado;
  },
};
