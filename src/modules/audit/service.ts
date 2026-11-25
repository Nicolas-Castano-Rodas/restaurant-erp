import type { Prisma, PrismaClient } from "@/generated/prisma/client";
type Scope = { organizationId: string; branchId: string; membershipId: string };
type Details = Record<string, string | number | boolean | null | string[]>;

// Only explicit non-secret metadata from authorized service operations.
export async function recordAudit(tx: Prisma.TransactionClient, scope: Scope, action: string, entity: string, entityId: string, details: Details) {
  const actor = await tx.membership.findFirstOrThrow({ where: { id: scope.membershipId, organizationId: scope.organizationId }, select: { user: { select: { name: true } }, role: { select: { name: true } } } });
  await tx.auditEvent.create({ data: { ...scope, actorName: actor.user.name, actorRole: actor.role.name, action, entity, entityId, details } });
}

export const auditLabels: Record<string, string> = {
  CATEGORY_CREATED: "Categoría creada", CATEGORY_UPDATED: "Categoría actualizada", PRODUCT_CREATED: "Producto creado", PRODUCT_UPDATED: "Producto actualizado",
  VARIANT_CREATED: "Variante creada", VARIANT_UPDATED: "Variante actualizada", TABLE_CREATED: "Mesa creada", TABLE_UPDATED: "Mesa actualizada",
  ORDER_CREATED: "Pedido registrado", ORDER_PAID: "Pedido cobrado", ORDER_CANCELLED: "Pedido cancelado",
  KITCHEN_TRANSITION: "Estado de cocina", SHIFT_OPENED: "Apertura de caja", SHIFT_CLOSED: "Cierre de caja",
  INGREDIENT_CREATED: "Ingrediente registrado", INVENTORY_CONFIGURED: "Stock mínimo y costo configurados", STOCK_MOVED: "Movimiento manual",
  ROLE_CREATED: "Rol creado", ROLE_UPDATED: "Rol actualizado", MEMBER_CREATED: "Usuario registrado", MEMBER_ACCESS_UPDATED: "Acceso de usuario modificado",
  BRANCH_CREATED: "Sucursal creada", BRANCH_UPDATED: "Sucursal actualizada", SUPPLIER_CREATED: "Proveedor registrado", SUPPLIER_UPDATED: "Proveedor actualizado",
  PURCHASE_CREATED: "Compra registrada", PURCHASE_LINE_SAVED: "Ingrediente de compra guardado", PURCHASE_LINE_REMOVED: "Ingrediente de compra retirado", PURCHASE_RECEIVED: "Compra recibida", PURCHASE_CANCELLED: "Compra cancelada",
  RECIPE_LINE_SAVED: "Receta actualizada", RECIPE_LINE_REMOVED: "Ingrediente de receta retirado", CUSTOMER_CREATED: "Cliente registrado", CUSTOMER_UPDATED: "Cliente actualizado",
  COURIER_CREATED: "Domiciliario registrado", COURIER_UPDATED: "Domiciliario actualizado", DELIVERY_ASSIGNED: "Domicilio asignado", DELIVERY_TRANSITION: "Estado de domicilio"
};

export async function listAudit(db: PrismaClient, scope: Scope, filters: { action?: string; branchId?: string; page: number }) {
  return db.$transaction(async (tx) => {
    const owner = await tx.membership.findFirst({ where: { id: scope.membershipId, organizationId: scope.organizationId, active: true, user: { active: true }, organization: { active: true }, role: { name: "Propietario", permissions: { some: { permissionCode: "team.manage" } } }, branches: { some: { branchId: scope.branchId, branch: { active: true } } } }, select: { id: true } });
    if (!owner) throw new Error("Acceso denegado");
    const where = { organizationId: scope.organizationId, ...(filters.branchId ? { branchId: filters.branchId } : {}), ...(filters.action ? { action: filters.action } : {}) };
    const [events, count, branches] = await Promise.all([
      tx.auditEvent.findMany({ where, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (filters.page - 1) * 50, take: 50, include: { branch: { select: { name: true } } } }),
      tx.auditEvent.count({ where }),
      tx.branch.findMany({ where: { organizationId: scope.organizationId }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    ]);
    return { events, count, branches };
  }, { isolationLevel: "RepeatableRead" });
}
