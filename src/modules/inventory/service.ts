import type { Prisma, PrismaClient } from "@/generated/prisma/client";

type Scope = { organizationId: string; branchId: string; membershipId: string };
type Unit = "KG" | "G" | "L" | "ML" | "UNIT";
type Kind = "ENTRY" | "EXIT" | "WASTE";
export class InventoryError extends Error {}
export const units = ["KG", "G", "L", "ML", "UNIT"] as const;
export const kinds = ["ENTRY", "EXIT", "WASTE"] as const;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX = 9999999999999999n;

export function toMilli(value: string): bigint {
  if (!/^\d{1,13}(\.\d{1,3})?$/.test(value)) throw new InventoryError("Cantidad inválida: usa hasta tres decimales y sin separadores de miles.");
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole) * 1000n + BigInt(fraction.padEnd(3, "0"));
}

export function fromMilli(value: bigint): string {
  if (value < 0n || value > MAX) throw new InventoryError("Cantidad fuera del rango permitido.");
  return `${value / 1000n}.${(value % 1000n).toString().padStart(3, "0")}`;
}

async function authorize(tx: Prisma.TransactionClient, scope: Scope) {
  const { organizationId, branchId, membershipId } = scope;
  const membership = await tx.membership.findFirst({
    where: { id: membershipId, organizationId, active: true, organization: { active: true }, user: { active: true }, role: { permissions: { some: { permissionCode: "inventory.manage" } } }, branches: { some: { branchId, branch: { active: true } } } },
    select: { id: true },
  });
  if (!membership) throw new InventoryError("No tienes autorización para gestionar el inventario de esta sucursal.");
}

function checkUnit(unit: Unit, quantity: bigint) {
  if (unit === "UNIT" && quantity % 1000n !== 0n) throw new InventoryError("Las unidades deben ser cantidades enteras.");
}

export function createIngredient(db: PrismaClient, scope: Scope, nameInput: string, unit: Unit, minimumInput: string) {
  const name = nameInput.trim();
  if (!name || name.length > 120 || !units.includes(unit)) throw new InventoryError("Nombre o unidad inválidos.");
  const minimum = toMilli(minimumInput);
  checkUnit(unit, minimum);
  return db.$transaction(async (tx) => {
    await authorize(tx, scope);
    const ingredient = await tx.ingredient.create({ data: { organizationId: scope.organizationId, name, unit } });
    await tx.inventoryBalance.create({ data: { organizationId: scope.organizationId, branchId: scope.branchId, ingredientId: ingredient.id, minimum: fromMilli(minimum) } });
    return ingredient;
  }, { isolationLevel: "Serializable" });
}

export function configureBalance(db: PrismaClient, scope: Scope, ingredientId: string, minimumInput: string, costInput?: string) {
  if (!uuid.test(ingredientId)) throw new InventoryError("Ingrediente inválido.");
  const minimum = toMilli(minimumInput);
  if (costInput !== undefined && costInput !== "" && !/^\d{1,10}(\.\d{1,2})?$/.test(costInput)) throw new InventoryError("Costo inválido: máximo dos decimales.");
  const cost = costInput === undefined ? {} : { unitCost: costInput === "" ? null : costInput };
  const { organizationId, branchId } = scope;
  return db.$transaction(async (tx) => {
    await authorize(tx, scope);
    const ingredient = await tx.ingredient.findFirst({ where: { id: ingredientId, organizationId, active: true } });
    if (!ingredient) throw new InventoryError("Ingrediente no disponible.");
    checkUnit(ingredient.unit, minimum);
    const key = { organizationId, branchId, ingredientId };
    return tx.inventoryBalance.upsert({ where: { organizationId_branchId_ingredientId: key }, create: { ...key, minimum: fromMilli(minimum), ...cost }, update: { minimum: fromMilli(minimum), ...cost } });
  }, { isolationLevel: "Serializable" });
}

export function recordMovement(db: PrismaClient, scope: Scope, input: { ingredientId: string; requestId: string; kind: Kind; quantity: string; reason: string }) {
  const { ingredientId, requestId, kind } = input;
  const reason = input.reason.trim();
  if (!uuid.test(ingredientId) || !uuid.test(requestId) || !kinds.includes(kind) || reason.length < 3 || reason.length > 500) throw new InventoryError("Datos del movimiento inválidos. Indica un motivo de 3 a 500 caracteres.");
  const quantity = toMilli(input.quantity);
  if (quantity === 0n) throw new InventoryError("La cantidad debe ser mayor que cero.");
  const { organizationId, branchId, membershipId } = scope;
  return db.$transaction(async (tx) => {
    await authorize(tx, scope);
    const previous = await tx.stockMovement.findUnique({ where: { organizationId_branchId_requestId: { organizationId, branchId, requestId } } });
    if (previous) {
      if (previous.membershipId !== membershipId || previous.ingredientId !== ingredientId || previous.kind !== kind || previous.reason !== reason || previous.quantity.toFixed(3) !== fromMilli(quantity)) throw new InventoryError("La solicitud ya corresponde a otro movimiento.");
      return previous;
    }
    const key = { organizationId, branchId, ingredientId };
    const balance = await tx.inventoryBalance.findUnique({ where: { organizationId_branchId_ingredientId: key }, include: { ingredient: true } });
    if (!balance || !balance.ingredient.active) throw new InventoryError("Configura primero el ingrediente en esta sucursal.");
    checkUnit(balance.ingredient.unit, quantity);
    const current = toMilli(balance.quantity.toFixed(3));
    const next = kind === "ENTRY" ? current + quantity : current - quantity;
    if (next < 0n) throw new InventoryError("Existencias insuficientes para esta salida.");
    const balanceAfter = fromMilli(next);
    await tx.inventoryBalance.update({ where: { organizationId_branchId_ingredientId: key }, data: { quantity: balanceAfter } });
    return tx.stockMovement.create({ data: { ...key, membershipId, requestId, kind, quantity: fromMilli(quantity), balanceAfter, reason } });
  }, { isolationLevel: "Serializable" });
}

export async function inventoryOverview(db: PrismaClient, organizationId: string, branchId: string) {
  const [ingredients, movements] = await Promise.all([
    db.ingredient.findMany({ where: { organizationId, active: true }, orderBy: { name: "asc" }, select: { id: true, name: true, unit: true, balances: { where: { organizationId, branchId }, select: { quantity: true, minimum: true, unitCost: true } } } }),
    db.stockMovement.findMany({ where: { organizationId, branchId }, orderBy: { createdAt: "desc" }, take: 50, select: { id: true, kind: true, quantity: true, balanceAfter: true, reason: true, orderId: true, unitCost: true, createdAt: true, balance: { select: { ingredient: { select: { name: true, unit: true } } } }, membership: { select: { user: { select: { name: true } } } } } }),
  ]);
  return { ingredients, movements };
}
