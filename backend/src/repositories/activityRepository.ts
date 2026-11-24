import { prisma } from "../lib/db.js";

export const activityRepository = {
  async log(data: {
    resourceId: string;
    authorId?: string | null;
    authorName: string;
    action: string;
    detail?: string | null;
  }) {
    return prisma.resourceActivity.create({
      data: {
        resourceId: data.resourceId,
        authorId: data.authorId ?? null,
        authorName: data.authorName,
        action: data.action,
        detail: data.detail ?? null,
      },
    });
  },
  async list(limit = 100) {
    return prisma.resourceActivity.findMany({
      orderBy: { createdAt: "desc" },
      take: Math.min(Math.max(limit, 1), 500),
    });
  },
  async byResource(resourceId: string) {
    return prisma.resourceActivity.findMany({
      where: { resourceId },
      orderBy: { createdAt: "desc" },
    });
  },
};
