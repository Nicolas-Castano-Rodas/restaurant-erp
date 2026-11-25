import { recordAudit } from "@/modules/audit/service";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";
type Scope = { organizationId: string; branchId: string; membershipId: string };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export class DeliveryError extends Error {}
async function authorize(tx: Prisma.TransactionClient, scope: Scope) {
  const { organizationId, branchId, membershipId } = scope;
  const member = await tx.membership.findFirst({ where: { id: membershipId, organizationId, active: true, user: { active: true }, organization: { active: true }, role: { permissions: { some: { permissionCode: "orders.manage" } } }, branches: { some: { branchId, branch: { active: true } } } }, select: { id: true } });
  if (!member) throw new DeliveryError("No tienes autorización para esta sucursal.");
}
export function saveCourier(db: PrismaClient, scope: Scope, input: { id?: string; name: string; phone: string; active: boolean }) {
  const name = input.name.trim();
  const phone = input.phone.trim();
  if (!name || name.length > 120 || phone.length > 40 || (input.id && !uuid.test(input.id))) throw new DeliveryError("Datos del domiciliario inválidos.");
  const { organizationId, branchId } = scope;
  return db.$transaction(async (tx) => {
    await authorize(tx, scope);
    const data = { name, phone: phone || null, active: input.active };
    if (!input.id) {
      const courier = await tx.courier.create({ data: { organizationId, branchId, ...data } });
      await recordAudit(tx, scope, "COURIER_CREATED", "Courier", courier.id, { active: input.active });
      return courier;
    }
    const courier = await tx.courier.findFirst({ where: { id: input.id, organizationId, branchId } });
    if (!courier) throw new DeliveryError("Domiciliario no disponible.");
    if (!input.active && await tx.delivery.findFirst({ where: { organizationId, branchId, courierId: courier.id, status: { in: ["ASSIGNED", "DISPATCHED"] }, order: { status: "OPEN" } } })) throw new DeliveryError("El domiciliario tiene entregas activas.");
    const updated = await tx.courier.update({ where: { id: courier.id }, data });
    await recordAudit(tx, scope, "COURIER_UPDATED", "Courier", courier.id, { beforeActive: courier.active, active: input.active });
    return updated;
  }, { isolationLevel: "Serializable" });
}
export function assignCourier(db: PrismaClient, scope: Scope, deliveryId: string, courierId: string) {
  if (!uuid.test(deliveryId) || !uuid.test(courierId)) throw new DeliveryError("Selecciona un domiciliario válido.");
  const { organizationId, branchId } = scope;
  return db.$transaction(async (tx) => {
    await authorize(tx, scope);
    if (!await tx.courier.findFirst({ where: { id: courierId, organizationId, branchId, active: true } })) throw new DeliveryError("Domiciliario no disponible.");
    const changed = await tx.delivery.updateMany({ where: { id: deliveryId, organizationId, branchId, status: { in: ["PENDING", "ASSIGNED"] }, order: { status: "OPEN", channel: "DELIVERY" } }, data: { courierId, status: "ASSIGNED", assignedAt: new Date() } });
    if (changed.count !== 1) throw new DeliveryError("Solo puedes asignar pedidos sin despachar.");
    await recordAudit(tx, scope, "DELIVERY_ASSIGNED", "Delivery", deliveryId, { courierId, after: "ASSIGNED" });
  }, { isolationLevel: "Serializable" });
}
export function advanceDelivery(db: PrismaClient, scope: Scope, deliveryId: string, target: "DISPATCHED" | "DELIVERED") {
  if (!uuid.test(deliveryId) || (target !== "DISPATCHED" && target !== "DELIVERED")) throw new DeliveryError("Operación inválida.");
  const { organizationId, branchId } = scope;
  return db.$transaction(async (tx) => {
    await authorize(tx, scope);
    const delivery = await tx.delivery.findFirst({ where: { id: deliveryId, organizationId, branchId, order: { status: "OPEN", channel: "DELIVERY" } }, include: { order: { select: { kitchenStatus: true } }, courier: { select: { active: true } } } });
    if (!delivery) throw new DeliveryError("Domicilio no disponible.");
    if (delivery.status === target) return;
    const expected = target === "DISPATCHED" ? "ASSIGNED" : "DISPATCHED";
    if (delivery.status !== expected) throw new DeliveryError("El estado del domicilio no permite esta operación.");
    if (target === "DISPATCHED" && (delivery.order.kitchenStatus !== "SERVED" || !delivery.courier?.active)) throw new DeliveryError("Confirma la entrega desde cocina y el domiciliario activo antes del despacho.");
    const result = await tx.delivery.updateMany({ where: { id: deliveryId, organizationId, branchId, status: expected, order: { status: "OPEN" } }, data: { status: target, ...(target === "DISPATCHED" ? { dispatchedAt: new Date() } : { deliveredAt: new Date() }) } });
    if (result.count !== 1) throw new DeliveryError("El domicilio cambió. Actualiza la página.");
    await recordAudit(tx, scope, "DELIVERY_TRANSITION", "Delivery", deliveryId, { before: expected, after: target });
  }, { isolationLevel: "Serializable" });
}
export async function deliveryOverview(db: PrismaClient, organizationId: string, branchId: string) {
  const where = { organizationId, branchId };
  const include = { courier: { select: { name: true } }, order: { select: { id: true, status: true, kitchenStatus: true, total: true, deliveryFee: true, currency: true } } } as const;
  const [couriers, active, history, legacy] = await Promise.all([
    db.courier.findMany({ where, orderBy: { name: "asc" } }),
    db.delivery.findMany({ where: { ...where, order: { status: "OPEN" } }, include, orderBy: { createdAt: "asc" } }),
    db.delivery.findMany({ where: { ...where, order: { status: { not: "OPEN" } } }, include, orderBy: { updatedAt: "desc" }, take: 50 }),
    db.order.count({ where: { ...where, channel: "DELIVERY", status: "OPEN", delivery: null } }),
  ]);
  return { couriers, active, history, legacy };
}
