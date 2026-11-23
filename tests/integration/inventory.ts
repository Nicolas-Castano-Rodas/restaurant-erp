import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { getPrisma } from "../../src/lib/prisma";
import { configureBalance, createIngredient, inventoryOverview, recordMovement } from "../../src/modules/inventory/service";

async function main() {
  if (process.env.RUN_DB_TESTS !== "true") throw new Error("Use a disposable database");
  const db = getPrisma();
  const organizationId = randomUUID();
  const userId = randomUUID();
  try {
    await db.organization.create({ data: { id: organizationId, slug: organizationId, name: "Inventory test" } });
    const branch = await db.branch.create({ data: { organizationId, name: "Main", code: "MAIN" } });
    const other = await db.branch.create({ data: { organizationId, name: "Other", code: "OTHER" } });
    const role = await db.role.create({ data: { organizationId, name: "Inventory" } });
    await db.permission.upsert({ where: { code: "inventory.manage" }, create: { code: "inventory.manage", description: "Inventory" }, update: {} });
    await db.rolePermission.create({ data: { roleId: role.id, permissionCode: "inventory.manage" } });
    await db.user.create({ data: { id: userId, name: "Test", email: `${userId}@example.invalid` } });
    const member = await db.membership.create({ data: { organizationId, userId, roleId: role.id } });
    await db.membershipBranch.create({ data: { organizationId, membershipId: member.id, branchId: branch.id } });
    const scope = { organizationId, branchId: branch.id, membershipId: member.id };
    const rice = await createIngredient(db, scope, "Rice", "KG", "2.500");
    const input = { ingredientId: rice.id, requestId: randomUUID(), kind: "ENTRY" as const, quantity: "10.125", reason: "Initial stock" };
    const movement = await recordMovement(db, scope, input);
    assert.equal((await recordMovement(db, scope, input)).id, movement.id);
    await assert.rejects(recordMovement(db, scope, { ...input, quantity: "20" }), /otro movimiento/);
    await recordMovement(db, scope, { ...input, requestId: randomUUID(), kind: "EXIT", quantity: "3.250", reason: "Manual use" });
    await recordMovement(db, scope, { ...input, requestId: randomUUID(), kind: "WASTE", quantity: "0.125", reason: "Spoilage" });
    await assert.rejects(recordMovement(db, scope, { ...input, requestId: randomUUID(), kind: "EXIT", quantity: "7" }), /insuficientes/);
    await assert.rejects(configureBalance(db, { ...scope, branchId: other.id }, rice.id, "1"), /autorización/);
    const overview = await inventoryOverview(db, organizationId, branch.id);
    assert.equal(overview.ingredients[0].balances[0].quantity.toFixed(3), "6.750");
    assert.equal(overview.movements.length, 3);
    assert.equal((await inventoryOverview(db, organizationId, other.id)).ingredients[0].balances.length, 0);
    assert.equal((await inventoryOverview(db, organizationId, other.id)).movements.length, 0);
    const eggs = await createIngredient(db, scope, "Eggs", "UNIT", "2");
    await assert.rejects(recordMovement(db, scope, { ...input, ingredientId: eggs.id, requestId: randomUUID(), quantity: "0.5" }), /enteras/);
    await configureBalance(db, scope, rice.id, "7");
    assert.equal((await db.inventoryBalance.findUniqueOrThrow({ where: { organizationId_branchId_ingredientId: { organizationId, branchId: branch.id, ingredientId: rice.id } } })).minimum.toFixed(3), "7.000");
    console.log("Inventory precision, authorization and stock checks passed.");
  } finally {
    try {
      const where = { organizationId };
      await db.stockMovement.deleteMany({ where });
      await db.inventoryBalance.deleteMany({ where });
      await db.ingredient.deleteMany({ where });
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
