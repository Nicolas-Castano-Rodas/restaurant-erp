import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { getPrisma } from "../../src/lib/prisma";
import { createIngredient, configureBalance, recordMovement } from "../../src/modules/inventory/service";
import { advanceKitchen } from "../../src/modules/kitchen/service";
import { estimateCost, saveRecipeLine, removeRecipeLine } from "../../src/modules/recipes/service";

async function main() {
  if (process.env.RUN_DB_TESTS !== "true") throw new Error("Use a disposable database");
  const db = getPrisma();
  const organizationId = randomUUID();
  const userId = randomUUID();
  const where = { organizationId };
  try {
    await db.organization.create({ data: { id: organizationId, slug: organizationId, name: "Recipe test" } });
    const branch = await db.branch.create({ data: { ...where, name: "Main", code: "MAIN" } });
    const other = await db.branch.create({ data: { ...where, name: "Other", code: "OTHER" } });
    const role = await db.role.create({ data: { ...where, name: "Test" } });
    for (const code of ["inventory.manage", "kitchen.manage"]) {
      await db.permission.upsert({ where: { code }, create: { code, description: code }, update: {} });
      await db.rolePermission.create({ data: { roleId: role.id, permissionCode: code } });
    }
    await db.user.create({ data: { id: userId, name: "Test", email: `${userId}@example.invalid` } });
    const member = await db.membership.create({ data: { ...where, userId, roleId: role.id } });
    await db.membershipBranch.create({ data: { ...where, membershipId: member.id, branchId: branch.id } });
    const scope = { ...where, branchId: branch.id, membershipId: member.id };
    const rice = await createIngredient(db, scope, "Rice", "KG", "1");
    const oil = await createIngredient(db, scope, "Oil", "L", "0");
    await configureBalance(db, scope, rice.id, "1", "4000");
    await configureBalance(db, scope, oil.id, "0", "10000");
    const entry = (ingredientId: string, quantity: string) => recordMovement(db, scope, { ingredientId, requestId: randomUUID(), kind: "ENTRY", quantity, reason: "Initial stock" });
    await entry(rice.id, "5");
    const category = await db.category.create({ data: { ...where, name: "Food" } });
    const product = await db.product.create({ data: { ...where, categoryId: category.id, name: "Rice bowl", price: "12000" } });
    const variant = await db.productVariant.create({ data: { ...where, productId: product.id, name: "Large", price: "15000" } });
    const base = { productId: product.id, variantId: null, ingredientId: rice.id, quantity: "0.250" };
    const line = await saveRecipeLine(db, scope, base);
    assert.equal((await saveRecipeLine(db, scope, base)).id, line.id);
    assert.equal(estimateCost([line], new Map([[rice.id, "4000.00"]])), 100000n);
    assert.equal(estimateCost([line], new Map()), null);
    await assert.rejects(saveRecipeLine(db, { ...scope, branchId: other.id }, base), /autorización/);
    await saveRecipeLine(db, scope, { ...base, ingredientId: oil.id, quantity: "0.020" });
    const large = await saveRecipeLine(db, scope, { ...base, variantId: variant.id, quantity: "0.500" });
    const order = await db.order.create({ data: { ...scope, requestId: randomUUID(), requestHash: "a".repeat(64), channel: "TAKEAWAY", currency: "COP", subtotal: "39000", total: "39000" } });
    await db.orderLine.createMany({ data: [
      { ...where, orderId: order.id, productId: product.id, productName: product.name, quantity: 2, unitPrice: "12000", lineTotal: "24000" },
      { ...where, orderId: order.id, productId: product.id, productName: product.name, variantId: variant.id, variantName: variant.name, quantity: 1, unitPrice: "15000", lineTotal: "15000" },
    ] });
    const balance = (ingredientId: string) => db.inventoryBalance.findUniqueOrThrow({ where: { organizationId_branchId_ingredientId: { ...where, branchId: branch.id, ingredientId } } });
    await assert.rejects(advanceKitchen(db, scope, order.id, "PENDING"), /insuficientes/);
    assert.equal((await balance(rice.id)).quantity.toFixed(3), "5.000");
    assert.equal((await db.order.findUniqueOrThrow({ where: { id: order.id } })).kitchenStatus, "PENDING");
    assert.equal(await db.stockMovement.count({ where: { ...where, orderId: order.id } }), 0);
    await entry(oil.id, "1");
    assert.equal(await advanceKitchen(db, scope, order.id, "PENDING"), true);
    assert.equal(await advanceKitchen(db, scope, order.id, "PENDING"), false);
    assert.equal((await balance(rice.id)).quantity.toFixed(3), "4.000");
    assert.equal((await balance(oil.id)).quantity.toFixed(3), "0.960");
    const movements = await db.stockMovement.findMany({ where: { ...where, orderId: order.id } });
    assert.equal(movements.length, 2);
    assert.equal(movements.find((m) => m.ingredientId === rice.id)?.unitCost?.toFixed(2), "4000.00");
    await removeRecipeLine(db, scope, large.id);
    assert.equal(await db.recipeLine.count({ where: { ...where, variantId: variant.id } }), 0);
    console.log("Recipe cost, stock consumption, rollback and idempotency checks passed.");
  } finally {
    try {
      await db.stockMovement.deleteMany({ where });
      await db.orderLine.deleteMany({ where });
      await db.order.deleteMany({ where });
      await db.recipeLine.deleteMany({ where });
      await db.inventoryBalance.deleteMany({ where });
      await db.ingredient.deleteMany({ where });
      await db.productVariant.deleteMany({ where });
      await db.product.deleteMany({ where });
      await db.category.deleteMany({ where });
      await db.membershipBranch.deleteMany({ where });
      await db.membership.deleteMany({ where });
      await db.role.deleteMany({ where });
      await db.user.deleteMany({ where: { id: userId } });
      await db.branch.deleteMany({ where });
      await db.organization.deleteMany({ where: { id: organizationId } });
    } finally { await db.$disconnect(); }
  }
}
main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
