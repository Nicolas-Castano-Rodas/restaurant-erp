import { recordAudit } from "@/modules/audit/service";
import { randomUUID } from "node:crypto";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { fromMilli, InventoryError, toMilli } from "@/modules/inventory/service";
import { fromMinor, toMinor } from "@/modules/orders/money";

type Scope = { organizationId: string; branchId: string; membershipId: string };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function id(value: string) {
  if (!uuid.test(value)) throw new InventoryError("Identificador inválido.");
  return value;
}

function optional(value: string, max: number) {
  const text = value.trim();
  if (text.length > max) throw new InventoryError("Un campo supera la longitud permitida.");
  return text || null;
}

async function authorize(tx: Prisma.TransactionClient, scope: Scope) {
  const { organizationId, branchId, membershipId } = scope;
  const member = await tx.membership.findFirst({ where: { id: membershipId, organizationId, active: true, organization: { active: true }, user: { active: true }, role: { permissions: { some: { permissionCode: "inventory.manage" } } }, branches: { some: { branchId, branch: { active: true } } } }, select: { organization: { select: { currency: true } } } });
  if (!member) throw new InventoryError("No tienes autorización para gestionar compras en esta sucursal.");
  return member.organization.currency;
}

export function saveSupplier(db: PrismaClient, scope: Scope, input: { id?: string; name: string; taxId: string; phone: string; email: string; active: boolean }) {
  const name = optional(input.name, 120);
  if (!name) throw new InventoryError("El nombre del proveedor es obligatorio.");
  const email = optional(input.email, 254);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new InventoryError("Correo electrónico inválido.");
  const data = { name, taxId: optional(input.taxId, 40), phone: optional(input.phone, 40), email, active: input.active };
  return db.$transaction(async (tx) => {
    await authorize(tx, scope);
    if (!input.id) {
      const supplier = await tx.supplier.create({ data: { organizationId: scope.organizationId, ...data } });
      await recordAudit(tx, scope, "SUPPLIER_CREATED", "Supplier", supplier.id, { active: input.active });
      return supplier;
    }
    const result = await tx.supplier.updateMany({ where: { id: id(input.id), organizationId: scope.organizationId }, data });
    if (result.count !== 1) throw new InventoryError("Proveedor no encontrado.");
    await recordAudit(tx, scope, "SUPPLIER_UPDATED", "Supplier", input.id, { active: input.active });
  }, { isolationLevel: "Serializable" });
}

export function createPurchase(db: PrismaClient, scope: Scope, input: { supplierId: string; requestId: string; reference: string; note: string }) {
  const supplierId = id(input.supplierId);
  const requestId = id(input.requestId);
  const reference = optional(input.reference, 100);
  const note = optional(input.note, 500);
  const { organizationId, branchId, membershipId } = scope;
  return db.$transaction(async (tx) => {
    const currency = await authorize(tx, scope);
    const key = { organizationId, branchId, requestId };
    const previous = await tx.purchase.findUnique({ where: { organizationId_branchId_requestId: key } });
    if (previous) {
      if (previous.createdById !== membershipId || previous.supplierId !== supplierId || previous.reference !== reference || previous.note !== note) throw new InventoryError("La solicitud corresponde a otra compra.");
      return previous;
    }
    const supplier = await tx.supplier.findFirst({ where: { id: supplierId, organizationId, active: true } });
    if (!supplier) throw new InventoryError("Proveedor no disponible.");
    const purchase = await tx.purchase.create({ data: { ...key, supplierId, supplierName: supplier.name, createdById: membershipId, reference, note, currency } });
    await recordAudit(tx, scope, "PURCHASE_CREATED", "Purchase", purchase.id, { supplierId, currency });
    return purchase;
  }, { isolationLevel: "Serializable" });
}

async function getPurchase(tx: Prisma.TransactionClient, scope: Scope, purchaseId: string) {
  const purchase = await tx.purchase.findFirst({ where: { organizationId: scope.organizationId, branchId: scope.branchId, id: id(purchaseId) }, include: { lines: true } });
  if (!purchase) throw new InventoryError("Compra no encontrada en esta sucursal.");
  return purchase;
}

async function updateTotal(tx: Prisma.TransactionClient, scope: Scope, purchaseId: string) {
  const lines = await tx.purchaseLine.findMany({ where: { organizationId: scope.organizationId, branchId: scope.branchId, purchaseId }, select: { lineTotal: true } });
  const total = lines.reduce((sum, line) => sum + toMinor(line.lineTotal.toFixed(2)), 0n);
  if (total > 9999999999999999n) throw new InventoryError("El total supera el máximo permitido.");
  const result = await tx.purchase.updateMany({ where: { organizationId: scope.organizationId, branchId: scope.branchId, id: purchaseId, status: "DRAFT" }, data: { total: fromMinor(total) } });
  if (result.count !== 1) throw new InventoryError("La compra ya no está pendiente.");
}

export function savePurchaseLine(db: PrismaClient, scope: Scope, input: { purchaseId: string; ingredientId: string; quantity: string; unitCost: string }) {
  const quantity = toMilli(input.quantity);
  if (quantity === 0n || !/^\d{1,10}(\.\d{1,2})?$/.test(input.unitCost)) throw new InventoryError("Cantidad o costo unitario inválidos.");
  const cost = toMinor(input.unitCost);
  const total = (quantity * cost + 500n) / 1000n;
  if (total > 9999999999999999n) throw new InventoryError("El importe supera el máximo permitido.");
  const { organizationId, branchId } = scope;
  return db.$transaction(async (tx) => {
    await authorize(tx, scope);
    const purchase = await getPurchase(tx, scope, input.purchaseId);
    if (purchase.status !== "DRAFT") throw new InventoryError("Solo puedes editar compras pendientes.");
    const ingredient = await tx.ingredient.findFirst({ where: { id: id(input.ingredientId), organizationId, active: true } });
    if (!ingredient) throw new InventoryError("Ingrediente no disponible.");
    if (ingredient.unit === "UNIT" && quantity % 1000n !== 0n) throw new InventoryError("Las unidades deben ser enteras.");
    const key = { organizationId, branchId, purchaseId: purchase.id, ingredientId: ingredient.id };
    const data = { ingredientName: ingredient.name, unit: ingredient.unit, quantity: fromMilli(quantity), unitCost: fromMinor(cost), lineTotal: fromMinor(total) };
    const existing = purchase.lines.find((line) => line.ingredientId === ingredient.id);
    if (existing) await tx.purchaseLine.update({ where: { id: existing.id }, data });
    else {
      if (purchase.lines.length >= 100) throw new InventoryError("Máximo 100 ingredientes por compra.");
      await tx.purchaseLine.create({ data: { ...key, ...data } });
    }
    await updateTotal(tx, scope, purchase.id);
    await recordAudit(tx, scope, "PURCHASE_LINE_SAVED", "Purchase", purchase.id, { ingredientId: ingredient.id, beforeQuantity: existing?.quantity.toFixed(3) ?? null, quantity: fromMilli(quantity), beforeUnitCost: existing?.unitCost.toFixed(2) ?? null, unitCost: fromMinor(cost) });
  }, { isolationLevel: "Serializable" });
}

export function removePurchaseLine(db: PrismaClient, scope: Scope, purchaseId: string, lineId: string) {
  return db.$transaction(async (tx) => {
    await authorize(tx, scope);
    const purchase = await getPurchase(tx, scope, purchaseId);
    if (purchase.status !== "DRAFT") throw new InventoryError("Solo puedes editar compras pendientes.");
    const result = await tx.purchaseLine.deleteMany({ where: { id: id(lineId), organizationId: scope.organizationId, branchId: scope.branchId, purchaseId } });
    if (result.count !== 1) throw new InventoryError("Ingrediente no encontrado en la compra.");
    await updateTotal(tx, scope, purchaseId);
    await recordAudit(tx, scope, "PURCHASE_LINE_REMOVED", "Purchase", purchaseId, { lineId });
  }, { isolationLevel: "Serializable" });
}

export function finishPurchase(db: PrismaClient, scope: Scope, purchaseId: string, target: "RECEIVED" | "CANCELLED") {
  if (target !== "RECEIVED" && target !== "CANCELLED") throw new InventoryError("Operación inválida.");
  const { organizationId, branchId, membershipId } = scope;
  return db.$transaction(async (tx) => {
    const currency = await authorize(tx, scope);
    const purchase = await getPurchase(tx, scope, purchaseId);
    if (purchase.status === target) return;
    if (purchase.status !== "DRAFT") throw new InventoryError("La compra ya está cerrada.");
    if (target === "RECEIVED" && (!purchase.lines.length || purchase.currency !== currency)) throw new InventoryError("Agrega ingredientes y verifica la moneda antes de recibir.");
    const changed = await tx.purchase.updateMany({ where: { organizationId, branchId, id: purchase.id, status: "DRAFT" }, data: { status: target, closedAt: new Date(), closedById: membershipId } });
    if (changed.count !== 1) throw new InventoryError("La compra cambió. Actualiza la página.");
    await recordAudit(tx, scope, target === "RECEIVED" ? "PURCHASE_RECEIVED" : "PURCHASE_CANCELLED", "Purchase", purchase.id, { before: purchase.status, after: target, total: purchase.total.toFixed(2), currency, lines: purchase.lines.length });
    if (target === "CANCELLED") return;
    for (const line of purchase.lines.sort((a, b) => a.ingredientId.localeCompare(b.ingredientId))) {
      const ingredient = await tx.ingredient.findFirst({ where: { id: line.ingredientId, organizationId, active: true, unit: line.unit } });
      if (!ingredient) throw new InventoryError("Un ingrediente ya no está disponible.");
      const key = { organizationId, branchId, ingredientId: line.ingredientId };
      const previous = await tx.inventoryBalance.findUnique({ where: { organizationId_branchId_ingredientId: key } });
      const next = fromMilli(toMilli(previous?.quantity.toFixed(3) ?? "0") + toMilli(line.quantity.toFixed(3)));
      await tx.inventoryBalance.upsert({ where: { organizationId_branchId_ingredientId: key }, create: { ...key, quantity: next, unitCost: line.unitCost }, update: { quantity: next, unitCost: line.unitCost } });
      await tx.stockMovement.create({ data: { ...key, membershipId, requestId: randomUUID(), kind: "ENTRY", quantity: line.quantity, balanceAfter: next, unitCost: line.unitCost, purchaseId: purchase.id, reason: `Recepción de compra · #${purchase.id.slice(0, 8).toUpperCase()}` } });
    }
  }, { isolationLevel: "Serializable", timeout: 30000 });
}

export async function purchaseOverview(db: PrismaClient, organizationId: string, branchId: string) {
  const [suppliers, ingredients, drafts, history] = await Promise.all([
    db.supplier.findMany({ where: { organizationId }, orderBy: { name: "asc" } }),
    db.ingredient.findMany({ where: { organizationId, active: true }, orderBy: { name: "asc" }, select: { id: true, name: true, unit: true } }),
    db.purchase.findMany({ where: { organizationId, branchId, status: "DRAFT" }, orderBy: { createdAt: "desc" }, include: { lines: { orderBy: { ingredientName: "asc" } } } }),
    db.purchase.findMany({ where: { organizationId, branchId, status: { not: "DRAFT" } }, orderBy: { closedAt: "desc" }, take: 50, include: { lines: { orderBy: { ingredientName: "asc" } } } }),
  ]);
  return { suppliers, ingredients, drafts, history };
}
