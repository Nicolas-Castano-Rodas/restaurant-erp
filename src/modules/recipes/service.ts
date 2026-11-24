import { randomUUID } from "node:crypto";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { fromMilli, InventoryError, toMilli } from "@/modules/inventory/service";
import { toMinor } from "@/modules/orders/money";

type Scope = { organizationId: string; branchId: string; membershipId: string };
type RecipeInput = { productId: string; variantId: string | null; ingredientId: string; quantity: string };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function authorize(tx: Prisma.TransactionClient, scope: Scope) {
  const { organizationId, branchId, membershipId } = scope;
  const member = await tx.membership.findFirst({ where: { id: membershipId, organizationId, active: true, user: { active: true }, organization: { active: true }, role: { permissions: { some: { permissionCode: "inventory.manage" } } }, branches: { some: { branchId, branch: { active: true } } } }, select: { id: true } });
  if (!member) throw new InventoryError("No tienes autorización para editar recetas.");
}

export function saveRecipeLine(db: PrismaClient, scope: Scope, input: RecipeInput) {
  const { productId, variantId, ingredientId } = input;
  if (!uuid.test(productId) || !uuid.test(ingredientId) || (variantId !== null && !uuid.test(variantId))) throw new InventoryError("Producto o ingrediente inválido.");
  const quantity = toMilli(input.quantity);
  if (quantity === 0n) throw new InventoryError("La cantidad debe ser mayor que cero.");
  const organizationId = scope.organizationId;
  return db.$transaction(async (tx) => {
    await authorize(tx, scope);
    const product = await tx.product.findFirst({ where: { id: productId, organizationId, active: true }, select: { id: true } });
    const ingredient = await tx.ingredient.findFirst({ where: { id: ingredientId, organizationId, active: true }, select: { unit: true } });
    if (!product || !ingredient) throw new InventoryError("Producto o ingrediente no disponible.");
    if (variantId && !await tx.productVariant.findFirst({ where: { id: variantId, organizationId, productId, active: true }, select: { id: true } })) throw new InventoryError("Variante inválida.");
    if (ingredient.unit === "UNIT" && quantity % 1000n !== 0n) throw new InventoryError("Las unidades deben ser enteras.");
    const key = { organizationId, productId, variantId, ingredientId };
    const existing = await tx.recipeLine.findFirst({ where: key });
    if (existing) return tx.recipeLine.update({ where: { id: existing.id }, data: { quantity: fromMilli(quantity) } });
    return tx.recipeLine.create({ data: { ...key, quantity: fromMilli(quantity) } });
  }, { isolationLevel: "Serializable" });
}

export function removeRecipeLine(db: PrismaClient, scope: Scope, id: string) {
  if (!uuid.test(id)) throw new InventoryError("Receta inválida.");
  return db.$transaction(async (tx) => {
    await authorize(tx, scope);
    const result = await tx.recipeLine.deleteMany({ where: { id, organizationId: scope.organizationId } });
    if (result.count !== 1) throw new InventoryError("El ingrediente ya no forma parte de la receta.");
  }, { isolationLevel: "Serializable" });
}

export async function recipeOverview(db: PrismaClient, organizationId: string, branchId: string) {
  const [products, ingredients] = await Promise.all([
    db.product.findMany({ where: { organizationId, active: true }, orderBy: { name: "asc" }, select: { id: true, name: true, price: true, variants: { where: { active: true }, select: { id: true, name: true, price: true }, orderBy: { name: "asc" } }, recipeLines: { select: { id: true, variantId: true, ingredientId: true, quantity: true } } } }),
    db.ingredient.findMany({ where: { organizationId, active: true }, orderBy: { name: "asc" }, select: { id: true, name: true, unit: true, balances: { where: { organizationId, branchId }, select: { unitCost: true, quantity: true } } } }),
  ]);
  return { products, ingredients };
}

export function estimateCost(lines: { quantity: { toFixed(digits: number): string }; ingredientId: string }[], costs: Map<string, string>): bigint | null {
  if (!lines.length) return null;
  let total = 0n;
  for (const line of lines) {
    const cost = costs.get(line.ingredientId);
    if (cost === undefined) return null;
    total += toMilli(line.quantity.toFixed(3)) * toMinor(cost);
  }
  return (total + 500n) / 1000n;
}

// Called only within the authorized kitchen state transition, in the same transaction.
export async function consumeRecipeIngredients(tx: Prisma.TransactionClient, scope: Scope, orderId: string) {
  const { organizationId, branchId, membershipId } = scope;
  const order = await tx.order.findFirst({ where: { id: orderId, organizationId, branchId, status: "OPEN", kitchenStatus: "PREPARING" }, select: { lines: { select: { productId: true, variantId: true, quantity: true } } } });
  if (!order) throw new InventoryError("Pedido no disponible.");
  const recipe = await tx.recipeLine.findMany({ where: { organizationId, productId: { in: order.lines.map((line) => line.productId) } }, select: { productId: true, variantId: true, ingredientId: true, quantity: true } });
  const totals = new Map<string, bigint>();
  for (const line of order.lines) {
    const base = recipe.filter((r) => r.productId === line.productId && r.variantId === null);
    const variant = line.variantId ? recipe.filter((r) => r.productId === line.productId && r.variantId === line.variantId) : [];
    for (const item of variant.length ? variant : base) {
      totals.set(item.ingredientId, (totals.get(item.ingredientId) ?? 0n) + toMilli(item.quantity.toFixed(3)) * BigInt(line.quantity));
    }
  }
  for (const ingredientId of [...totals.keys()].sort()) {
    const quantity = totals.get(ingredientId) ?? 0n;
    const key = { organizationId, branchId, ingredientId };
    const balance = await tx.inventoryBalance.findUnique({ where: { organizationId_branchId_ingredientId: key }, include: { ingredient: true } });
    if (!balance || !balance.ingredient.active) throw new InventoryError("Hay ingredientes de la receta sin configurar en esta sucursal. Revisa inventario.");
    if (balance.ingredient.unit === "UNIT" && quantity % 1000n !== 0n) throw new InventoryError("La receta contiene una cantidad de unidades inválida.");
    const current = toMilli(balance.quantity.toFixed(3));
    if (quantity > current) throw new InventoryError(`Existencias insuficientes: ${balance.ingredient.name}. Revisa inventario.`);
    const balanceAfter = fromMilli(current - quantity);
    await tx.inventoryBalance.update({ where: { organizationId_branchId_ingredientId: key }, data: { quantity: balanceAfter } });
    await tx.stockMovement.create({ data: { ...key, membershipId, orderId, requestId: randomUUID(), kind: "EXIT", quantity: fromMilli(quantity), balanceAfter, unitCost: balance.unitCost, reason: `Consumo de cocina · Pedido #${orderId.slice(0, 8).toUpperCase()}` } });
  }
}
