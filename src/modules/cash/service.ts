import { recordAudit } from "@/modules/audit/service";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { fromMinor, toMinor } from "@/modules/orders/money";

type Scope = { organizationId: string; branchId: string; membershipId: string };
type Method = "CASH" | "CARD" | "TRANSFER";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export class CashError extends Error {}

function amount(value: string) {
  if (!/^\d{1,14}(\.\d{1,2})?$/.test(value)) throw new CashError("Introduce un importe válido, sin separadores de miles.");
  return toMinor(value);
}

function signed(value: bigint) {
  return value < 0n ? `-${fromMinor(-value)}` : fromMinor(value);
}

async function authorize(tx: Prisma.TransactionClient, scope: Scope) {
  const { organizationId, branchId, membershipId } = scope;
  const member = await tx.membership.findFirst({
    where: { organizationId, id: membershipId, active: true, user: { active: true }, organization: { active: true }, role: { permissions: { some: { permissionCode: "cash.manage" } } }, branches: { some: { branchId, branch: { active: true } } } },
    select: { organization: { select: { currency: true } } },
  });
  if (!member) throw new CashError("No tienes autorización para gestionar caja.");
  return member.organization.currency;
}

export function openShift(db: PrismaClient, scope: Scope, opening: string) {
  const openingAmount = fromMinor(amount(opening));
  const { organizationId, branchId, membershipId } = scope;
  return db.$transaction(async (tx) => {
    const currency = await authorize(tx, scope);
    if (await tx.cashShift.findFirst({ where: { organizationId, branchId, status: "OPEN" } })) throw new CashError("Ya existe una caja abierta.");
    const shift = await tx.cashShift.create({ data: { organizationId, branchId, openedById: membershipId, currency, openingAmount } });
    await recordAudit(tx, scope, "SHIFT_OPENED", "CashShift", shift.id, { openingAmount, currency });
    return shift;
  }, { isolationLevel: "Serializable" });
}

export function payOrder(db: PrismaClient, scope: Scope, orderId: string, method: Method, receivedInput: string) {
  if (!uuid.test(orderId) || !["CASH", "CARD", "TRANSFER"].includes(method)) throw new CashError("Pedido o método de pago inválido.");
  const { organizationId, branchId, membershipId } = scope;
  return db.$transaction(async (tx) => {
    const currency = await authorize(tx, scope);
    const order = await tx.order.findFirst({ where: { id: orderId, organizationId, branchId }, include: { payment: true, delivery: true } });
    if (!order) throw new CashError("Pedido no encontrado.");
    if (order.payment) {
      const received = method === "CASH" ? fromMinor(amount(receivedInput)) : order.total.toFixed(2);
      if (order.payment.method !== method || order.payment.received.toFixed(2) !== received) throw new CashError("El pedido ya tiene un pago registrado.");
      return order.payment;
    }
    if (order.status !== "OPEN" || order.kitchenStatus !== "SERVED") throw new CashError("Entrega el pedido desde cocina antes de cobrarlo.");
    if (order.delivery && order.delivery.status !== "DELIVERED") throw new CashError("Confirma la entrega del domicilio antes de cobrarlo.");
    const shift = await tx.cashShift.findFirst({ where: { organizationId, branchId, status: "OPEN" } });
    if (!shift) throw new CashError("Abre un turno de caja antes de cobrar.");
    if (shift.currency !== currency || order.currency !== currency) throw new CashError("La moneda del pedido no coincide con la caja.");
    const total = toMinor(order.total.toFixed(2));
    const received = method === "CASH" ? amount(receivedInput) : total;
    if (received < total) throw new CashError("El efectivo recibido es insuficiente.");
    const changed = await tx.order.updateMany({ where: { id: orderId, organizationId, branchId, status: "OPEN", kitchenStatus: "SERVED" }, data: { status: "COMPLETED", closedAt: new Date(), closedById: membershipId } });
    if (changed.count !== 1) throw new CashError("El pedido cambió. Actualiza la página.");
    const payment = await tx.payment.create({ data: { organizationId, branchId, orderId, shiftId: shift.id, membershipId, currency, method, amount: fromMinor(total), received: fromMinor(received), change: fromMinor(received - total) } });
    await recordAudit(tx, scope, "ORDER_PAID", "Order", orderId, { paymentId: payment.id, method, amount: fromMinor(total), currency, shiftId: shift.id });
    return payment;
  }, { isolationLevel: "Serializable" });
}

export function cancelOrder(db: PrismaClient, scope: Scope, orderId: string, reason: string) {
  if (!uuid.test(orderId) || reason.trim().length < 3 || reason.length > 500) throw new CashError("Indica el motivo de cancelación (3 a 500 caracteres).");
  const { organizationId, branchId, membershipId } = scope;
  return db.$transaction(async (tx) => {
    await authorize(tx, scope);
    const changed = await tx.order.updateMany({ where: { id: orderId, organizationId, branchId, status: "OPEN", payment: null }, data: { status: "CANCELLED", closedAt: new Date(), closedById: membershipId, cancelReason: reason.trim() } });
    if (changed.count !== 1) throw new CashError("Solo puedes cancelar un pedido abierto sin pago.");
    await recordAudit(tx, scope, "ORDER_CANCELLED", "Order", orderId, { before: "OPEN", after: "CANCELLED" });
  }, { isolationLevel: "Serializable" });
}

export function closeShift(db: PrismaClient, scope: Scope, shiftId: string, countedInput: string) {
  if (!uuid.test(shiftId)) throw new CashError("Turno inválido.");
  const counted = amount(countedInput);
  const { organizationId, branchId, membershipId } = scope;
  return db.$transaction(async (tx) => {
    await authorize(tx, scope);
    const shift = await tx.cashShift.findFirst({ where: { id: shiftId, organizationId, branchId, status: "OPEN" } });
    if (!shift) throw new CashError("El turno ya está cerrado o no está disponible.");
    const payments = await tx.payment.aggregate({ where: { organizationId, branchId, shiftId, method: "CASH" }, _sum: { amount: true } });
    const expected = toMinor(shift.openingAmount.toFixed(2)) + toMinor(payments._sum.amount?.toFixed(2) ?? "0");
    if (expected > 9999999999999999n) throw new CashError("El saldo supera el máximo permitido.");
    const changed = await tx.cashShift.updateMany({ where: { id: shiftId, organizationId, branchId, status: "OPEN" }, data: { status: "CLOSED", closedById: membershipId, closedAt: new Date(), expectedAmount: fromMinor(expected), countedAmount: fromMinor(counted), difference: signed(counted - expected) } });
    if (changed.count !== 1) throw new CashError("El turno cambió. Actualiza la página.");
    await recordAudit(tx, scope, "SHIFT_CLOSED", "CashShift", shiftId, { expected: fromMinor(expected), counted: fromMinor(counted), difference: signed(counted - expected), currency: shift.currency });
  }, { isolationLevel: "Serializable" });
}

export async function cashOverview(db: PrismaClient, organizationId: string, branchId: string) {
  const where = { organizationId, branchId };
  return db.$transaction(async (tx) => {
    const [shift, pending, history] = await Promise.all([
      tx.cashShift.findFirst({ where: { ...where, status: "OPEN" } }),
      tx.order.findMany({ where: { ...where, status: "OPEN" }, orderBy: [{ createdAt: "asc" }, { id: "asc" }], select: { id: true, tableName: true, channel: true, kitchenStatus: true, delivery: { select: { status: true } }, total: true, currency: true } }),
      tx.cashShift.findMany({ where: { ...where, status: "CLOSED" }, orderBy: [{ closedAt: "desc" }, { id: "desc" }], take: 10 }),
    ]);
    const totals = { CASH: "0.00", CARD: "0.00", TRANSFER: "0.00" };
    if (shift) {
      const grouped = await tx.payment.groupBy({ by: ["method"], where: { ...where, shiftId: shift.id }, _sum: { amount: true } });
      for (const entry of grouped) totals[entry.method] = entry._sum.amount?.toFixed(2) ?? "0.00";
    }
    return { shift, pending, history, totals };
  }, { isolationLevel: "RepeatableRead" });
}
