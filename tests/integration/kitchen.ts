import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { getPrisma } from "../../src/lib/prisma";
import { advanceKitchen, listKitchenOrders } from "../../src/modules/kitchen/service";

async function main() {
  if (process.env.RUN_DB_TESTS !== "true") throw new Error("Use a disposable database");
  const db = getPrisma();
  const organizationId = randomUUID();
  const userId = randomUUID();
  try {
    await db.organization.create({ data: { id: organizationId, slug: organizationId, name: "Kitchen test" } });
    const branch = await db.branch.create({ data: { organizationId, name: "A", code: "A" } });
    const other = await db.branch.create({ data: { organizationId, name: "B", code: "B" } });
    const role = await db.role.create({ data: { organizationId, name: "Kitchen test" } });
    await db.permission.upsert({ where: { code: "kitchen.manage" }, create: { code: "kitchen.manage", description: "Kitchen" }, update: {} });
    await db.rolePermission.create({ data: { roleId: role.id, permissionCode: "kitchen.manage" } });
    await db.user.create({ data: { id: userId, email: `${userId}@example.invalid`, name: "Test" } });
    const member = await db.membership.create({ data: { organizationId, userId, roleId: role.id } });
    await db.membershipBranch.create({ data: { organizationId, membershipId: member.id, branchId: branch.id } });
    const order = await db.order.create({ data: { organizationId, branchId: branch.id, membershipId: member.id, requestId: randomUUID(), requestHash: "a".repeat(64), channel: "TAKEAWAY", currency: "COP", subtotal: "1000", total: "1000" } });
    const scope = { organizationId, branchId: branch.id, membershipId: member.id };
    assert.equal((await listKitchenOrders(db, organizationId, branch.id)).length, 1);
    assert.equal((await listKitchenOrders(db, organizationId, other.id)).length, 0);
    assert.equal(await advanceKitchen(db, scope, order.id, "READY"), false);
    assert.equal(await advanceKitchen(db, { ...scope, branchId: other.id }, order.id, "PENDING"), false);
    assert.equal(await advanceKitchen(db, scope, order.id, "PENDING"), true);
    assert.equal(await advanceKitchen(db, scope, order.id, "PENDING"), false);
    assert.equal(await advanceKitchen(db, scope, order.id, "PREPARING"), true);
    assert.equal(await advanceKitchen(db, scope, order.id, "READY"), true);
    const finished = await db.order.findUniqueOrThrow({ where: { id: order.id } });
    assert.equal(finished.kitchenStatus, "SERVED");
    assert.equal(finished.status, "OPEN");
    assert.ok(finished.preparingAt && finished.readyAt && finished.servedAt);
    assert.equal((await listKitchenOrders(db, organizationId, branch.id)).length, 0);
    console.log("Kitchen transition checks passed.");
  } finally {
    try {
      await db.order.deleteMany({ where: { organizationId } });
      await db.membershipBranch.deleteMany({ where: { organizationId } });
      await db.membership.deleteMany({ where: { organizationId } });
      await db.role.deleteMany({ where: { organizationId } });
      await db.user.deleteMany({ where: { id: userId } });
      await db.branch.deleteMany({ where: { organizationId } });
      await db.organization.deleteMany({ where: { id: organizationId } });
    } finally { await db.$disconnect(); }
  }
}
main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
