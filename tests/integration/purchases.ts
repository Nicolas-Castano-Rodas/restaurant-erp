import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { getPrisma } from "../../src/lib/prisma";
import { createIngredient, recordMovement } from "../../src/modules/inventory/service";
import { createPurchase, finishPurchase, removePurchaseLine, savePurchaseLine, saveSupplier } from "../../src/modules/purchases/service";

async function main() {
  if (process.env.RUN_DB_TESTS !== "true") throw new Error("Use a disposable database");
  const db = getPrisma();
  const organizationId = randomUUID();
  const userId = randomUUID();
  const where = { organizationId };
  try {
    await db.organization.create({ data: { id: organizationId, slug: organizationId, name: "Purchase test" } });
    const branch = await db.branch.create({ data: { ...where, name: "Main", code: "MAIN" } });
    const other = await db.branch.create({ data: { ...where, name: "Other", code: "OTHER" } });
    const role = await db.role.create({ data: { ...where, name: "Test" } });
    await db.permission.upsert({ where: { code: "inventory.manage" }, create: { code: "inventory.manage", description: "Inventory" }, update: {} });
    await db.rolePermission.create({ data: { roleId: role.id, permissionCode: "inventory.manage" } });
    await db.user.create({ data: { id: userId, name: "Test", email: `${userId}@example.invalid` } });
    const member = await db.membership.create({ data: { ...where, userId, roleId: role.id } });
    await db.membershipBranch.create({ data: { ...where, membershipId: member.id, branchId: branch.id } });
    const scope = { ...where, branchId: branch.id, membershipId: member.id };
    const rice = await createIngredient(db, scope, "Rice", "KG", "1");
    const eggs = await createIngredient(db, scope, "Eggs", "UNIT", "0");
    await recordMovement(db, scope, { ingredientId: rice.id, requestId: randomUUID(), kind: "ENTRY", quantity: "5", reason: "Initial stock" });
    await saveSupplier(db, scope, { name: "Test supplier", taxId: "", phone: "", email: "", active: true });
    const supplier = await db.supplier.findFirstOrThrow({ where });
    const input = { supplierId: supplier.id, requestId: randomUUID(), reference: "TEST", note: "" };
    const purchase = await createPurchase(db, scope, input);
    assert.equal((await createPurchase(db, scope, input)).id, purchase.id);
    await assert.rejects(finishPurchase(db, scope, purchase.id, "RECEIVED"), /Agrega/);
    const line = { purchaseId: purchase.id, ingredientId: rice.id, quantity: "2.125", unitCost: "4000.50" };
    await savePurchaseLine(db, scope, line);
    await savePurchaseLine(db, scope, line);
    await assert.rejects(savePurchaseLine(db, scope, { ...line, ingredientId: eggs.id, quantity: "0.5" }), /enteras/);
    await savePurchaseLine(db, scope, { ...line, ingredientId: eggs.id, quantity: "2", unitCost: "700" });
    const balance = (ingredientId: string) => db.inventoryBalance.findUniqueOrThrow({ where: { organizationId_branchId_ingredientId: { ...where, branchId: branch.id, ingredientId } } });
    assert.equal((await balance(rice.id)).quantity.toFixed(3), "5.000");
    assert.equal((await db.purchase.findUniqueOrThrow({ where: { id: purchase.id } })).total.toFixed(2), "9901.06");
    await assert.rejects(finishPurchase(db, { ...scope, branchId: other.id }, purchase.id, "RECEIVED"), /autorización/);
    await db.ingredient.update({ where: { id: eggs.id }, data: { active: false } });
    await assert.rejects(finishPurchase(db, scope, purchase.id, "RECEIVED"), /disponible/);
    assert.equal((await balance(rice.id)).quantity.toFixed(3), "5.000");
    assert.equal((await db.purchase.findUniqueOrThrow({ where: { id: purchase.id } })).status, "DRAFT");
    assert.equal(await db.stockMovement.count({ where: { ...where, purchaseId: purchase.id } }), 0);
    assert.equal(await db.auditEvent.count({ where: { ...where, entityId: purchase.id, action: "PURCHASE_RECEIVED" } }), 0);
    await db.ingredient.update({ where: { id: eggs.id }, data: { active: true } });
    await finishPurchase(db, scope, purchase.id, "RECEIVED");
    await finishPurchase(db, scope, purchase.id, "RECEIVED");
    assert.equal((await balance(rice.id)).quantity.toFixed(3), "7.125");
    assert.equal((await balance(rice.id)).unitCost?.toFixed(2), "4000.50");
    assert.equal((await balance(eggs.id)).quantity.toFixed(3), "2.000");
    assert.equal(await db.stockMovement.count({ where: { ...where, purchaseId: purchase.id } }), 2);
    assert.equal(await db.auditEvent.count({ where: { ...where, entityId: purchase.id, action: "PURCHASE_RECEIVED" } }), 1);
    await assert.rejects(savePurchaseLine(db, scope, line), /pendientes/);
    await assert.rejects(finishPurchase(db, scope, purchase.id, "CANCELLED"), /cerrada/);
    const cancelled = await createPurchase(db, scope, { ...input, requestId: randomUUID() });
    await savePurchaseLine(db, scope, { ...line, purchaseId: cancelled.id });
    const removable = await db.purchaseLine.findFirstOrThrow({ where: { purchaseId: cancelled.id } });
    await removePurchaseLine(db, scope, cancelled.id, removable.id);
    assert.equal((await db.purchase.findUniqueOrThrow({ where: { id: cancelled.id } })).total.toFixed(2), "0.00");
    await finishPurchase(db, scope, cancelled.id, "CANCELLED");
    assert.equal(await db.stockMovement.count({ where: { ...where, purchaseId: cancelled.id } }), 0);
    console.log("Purchase receipt, cost, rollback and idempotency checks passed.");
  } finally {
    try {
      await db.stockMovement.deleteMany({ where });
      await db.purchaseLine.deleteMany({ where });
      await db.purchase.deleteMany({ where });
      await db.supplier.deleteMany({ where });
      await db.inventoryBalance.deleteMany({ where });
      await db.ingredient.deleteMany({ where });
      await db.membershipBranch.deleteMany({ where });
      await db.auditEvent.deleteMany({ where });
      await db.membership.deleteMany({ where });
      await db.role.deleteMany({ where });
      await db.user.deleteMany({ where: { id: userId } });
      await db.branch.deleteMany({ where });
      await db.organization.deleteMany({ where: { id: organizationId } });
    } finally { await db.$disconnect(); }
  }
}
main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
