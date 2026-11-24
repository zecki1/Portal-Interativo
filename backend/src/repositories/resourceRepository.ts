import { prisma } from "../lib/db.js";

export const resourceRepository = {
  async findAll() {
    return prisma.resource.findMany({ where: { deletedAt: null }, orderBy: { createdAt: "desc" } });
  },
  async findById(id: string) {
    return prisma.resource.findUnique({ where: { id } });
  },
  async create(data: any) {
    return prisma.resource.create({ data });
  },
  async update(id: string, data: any) {
    return prisma.resource.update({ where: { id }, data });
  },
  async softDelete(id: string) {
    return prisma.resource.update({ where: { id }, data: { deletedAt: new Date() } });
  },
};
