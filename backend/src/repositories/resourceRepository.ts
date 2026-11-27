import { getPrisma } from "../lib/db.js";

export const resourceRepository = {
  async findAll() {
    return getPrisma().resource.findMany({ where: { deletedAt: null }, orderBy: { createdAt: "desc" } });
  },
  async findById(id: string) {
    return getPrisma().resource.findUnique({ where: { id } });
  },
  async create(data: any) {
    return getPrisma().resource.create({ data });
  },
  async update(id: string, data: any) {
    return getPrisma().resource.update({ where: { id }, data });
  },
  async softDelete(id: string) {
    return getPrisma().resource.update({ where: { id }, data: { deletedAt: new Date() } });
  },
};
