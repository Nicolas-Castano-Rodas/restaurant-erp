import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { getPrisma } from "../../src/lib/prisma";
import { cashOverview, cancelOrder, closeShift, openShift, payOrder } from "../../src/modules/cash/service";
import { listTables } from "../../src/modules/catalog/service";

async function main() {
  if (process.env.RUN_DB_TESTS !== "true") throw new Error("Use a disposable database");
  const db = getPrisma();
  const organizationId = randomUUID();
  const userId = randomUUID();
  try {
    await db.organization.create({ data: { id: organizationId, slug: organizationId, name: "Cash test" } });
    const branch = await db.branch.create({ data: { organizationId, name: "Main", code: "MAIN" } });
    const other = await db.branch.create({ data: { organizationId, name: "Other", code: "OTHER" } });
    const role = await db.role.create({ data: { organizationId, name: "Cashier" } });
    await db.permission.upsert({ where: { code: "cash.manage" }, create: { code: "cash.manage", description: "Cash" }, update: {} });
    await db.rolePermission.create({ data: { roleId: role.id, permissionCode: "cash.manage" } });
    await db.user.create({ data: { id: userId, name: "Test", email: `${userId}@example.invalid` } });
    const member = await db.membership.create({ data: { organizationId, userId, roleId: role.id } });
    await db.membershipBranch.create({ data: { organizationId, membershipId: member.id, branchId: branch.id } });
    const scope = { organizationId, branchId: branch.id, membershipId: member.id };
    const table = await db.restaurantTable.create({ data: { organizationId, branchId: branch.id, name: "Mesa 1", capacity: 4 } });
    const makeOrder = () => db.order.create({ data: { ...scope, tableId: table.id, tableName: table.name, requestId: randomUUID(), requestHash: "a".repeat(64), channel: "DINE_IN", currency: "COP", subtotal: "10000.50", total: "10000.50" } });
    const order = await makeOrder();
    await assert.rejects(payOrder(db, scope, order.id, "CASH", "15000"), /Entrega/);
    await db.order.update({ where: { id: order.id }, data: { kitchenStatus: "SERVED" } });
    await assert.rejects(payOrder(db, scope, order.id, "CASH", "15000"), /Abre/);
    const shift = await openShift(db, scope, "50000");
    await assert.rejects(openShift(db, scope, "0"), /abierta/);
    await assert.rejects(payOrder(db, { ...scope, branchId: other.id }, order.id, "CASH", "15000"), /autorización/);
    await assert.rejects(payOrder(db, scope, order.id, "CASH", "1"), /insuficiente/);
    const payment = await payOrder(db, scope, order.id, "CASH", "15000");
    assert.equal(payment.change.toFixed(2), "4999.50");
    const overview = await cashOverview(db, organizationId, branch.id);
    assert.equal(overview.totals.CASH, "10000.50");
    assert.equal(overview.totals.CARD, "0.00");
    assert.equal(overview.totals.TRANSFER, "0.00");
    assert.equal((await cashOverview(db, organizationId, other.id)).totals.CASH, "0.00");
    assert.equal((await payOrder(db, scope, order.id, "CASH", "15000")).id, payment.id);
    await assert.rejects(payOrder(db, scope, order.id, "CARD", ""), /ya tiene/);
    assert.equal((await listTables(db, organizationId, branch.id))[0].occupied, false);
    const next = await makeOrder();
    await cancelOrder(db, scope, next.id, "Prueba de cancelación");
    assert.equal((await listTables(db, organizationId, branch.id))[0].occupied, false);
    await assert.rejects(cancelOrder(db, scope, order.id, "Cancelado"), /sin pago/);
    await closeShift(db, scope, shift.id, "60000");
    const closed = await db.cashShift.findUniqueOrThrow({ where: { id: shift.id } });
    assert.equal(closed.expectedAmount?.toFixed(2), "60000.50");
    assert.equal(closed.difference?.toFixed(2), "-0.50");
    assert.equal(await db.payment.count({ where: { organizationId } }), 1);
    console.log("Cash payment and table release checks passed.");
  } finally {
    try {
      const where = { organizationId };
      await db.payment.deleteMany({ where });
      await db.cashShift.deleteMany({ where });
      await db.order.deleteMany({ where });
      await db.restaurantTable.deleteMany({ where });
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
