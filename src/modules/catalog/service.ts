import type { PrismaClient } from "@/generated/prisma/client";

export function listCatalog(db: PrismaClient, organizationId: string, sellableOnly = false) {
  return db.category.findMany({
    where: { organizationId, ...(sellableOnly ? { active: true } : {}) },
    orderBy: { name: "asc" },
    select: {
      id: true, name: true, active: true,
      products: {
        where: { organizationId, ...(sellableOnly ? { active: true, available: true } : {}) },
        orderBy: { name: "asc" },
        select: {
          id: true, name: true, description: true, price: true, active: true, available: true,
          variants: {
            where: { organizationId, ...(sellableOnly ? { active: true } : {}) },
            orderBy: { name: "asc" },
            select: { id: true, name: true, price: true, active: true },
          },
        },
      },
    },
  });
}

export function listTables(db: PrismaClient, organizationId: string, branchId: string) {
  return db.restaurantTable.findMany({
    where: { organizationId, branchId },
    orderBy: { name: "asc" },
    select: { id: true, name: true, capacity: true, active: true },
  });
}

export function validPrice(value: string): boolean {
  return /^(0|[1-9]\d{0,9})(\.\d{1,2})?$/.test(value);
}
