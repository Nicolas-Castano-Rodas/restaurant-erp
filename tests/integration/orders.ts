import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { getPrisma } from "../../src/lib/prisma";
import { createOrder, parseOrderInput } from "../../src/modules/orders/service";
import { listTables } from "../../src/modules/catalog/service";

async function main() {
  if (process.env.RUN_DB_TESTS !== "true") throw new Error("Use a disposable database");
  const db = getPrisma();
  const ids = [randomUUID(), randomUUID()];
  const userId = randomUUID();
  try {
    const [a, b] = await Promise.all(ids.map((id) => db.organization.create({ data: { id, name: "Test", slug: id } })));
    const branch = await db.branch.create({ data: { organizationId: a.id, name: "A", code: "A" } });
    const otherBranch = await db.branch.create({ data: { organizationId: b.id, name: "B", code: "B" } });
    const role = await db.role.create({ data: { organizationId: a.id, name: "Test" } });
    await db.permission.upsert({ where: { code: "orders.manage" }, create: { code: "orders.manage", description: "Orders" }, update: {} });
    await db.rolePermission.create({ data: { roleId: role.id, permissionCode: "orders.manage" } });
    await db.user.create({ data: { id: userId, email: `${userId}@example.invalid`, name: "Test" } });
    const membership = await db.membership.create({ data: { organizationId: a.id, userId, roleId: role.id } });
    await db.membershipBranch.create({ data: { organizationId: a.id, membershipId: membership.id, branchId: branch.id } });
    const table = await db.restaurantTable.create({ data: { organizationId: a.id, branchId: branch.id, name: "Mesa 1", capacity: 4 } });
    const otherTable = await db.restaurantTable.create({ data: { organizationId: b.id, branchId: otherBranch.id, name: "Mesa 2", capacity: 4 } });
    const category = await db.category.create({ data: { organizationId: a.id, name: "Test" } });
    const product = await db.product.create({ data: { organizationId: a.id, categoryId: category.id, name: "Arroz", price: "12500.50" } });
    const variant = await db.productVariant.create({ data: { organizationId: a.id, productId: product.id, name: "Grande", price: "18000.25" } });
    const scope = { organizationId: a.id, branchId: branch.id, membershipId: membership.id };
    const input = parseOrderInput({ requestId: randomUUID(), channel: "DINE_IN", tableId: table.id, note: "", items: [{ productId: product.id, variantId: variant.id, quantity: 3, price: "1" }] });
    const id = await createOrder(db, scope, input);
    assert.equal(await createOrder(db, scope, input), id);
    const order = await db.order.findUniqueOrThrow({ where: { id }, include: { lines: true } });
    assert.equal(order.total.toFixed(2), "54000.75");
    assert.equal(order.lines[0].productName, "Arroz");
    assert.equal((await listTables(db, a.id, branch.id))[0].occupied, true);
    await assert.rejects(createOrder(db, scope, { ...input, requestId: randomUUID() }), /pedido abierto/);
    await assert.rejects(createOrder(db, scope, { ...input, requestId: randomUUID(), tableId: otherTable.id }), /Mesa no disponible/);
    await assert.rejects(createOrder(db, scope, { ...input, note: "changed" }), /solicitud ya fue utilizada/);
    await db.product.update({ where: { id: product.id }, data: { name: "Changed", available: false } });
    assert.equal((await db.orderLine.findFirstOrThrow({ where: { orderId: id } })).productName, "Arroz");
    await assert.rejects(createOrder(db, scope, { ...input, requestId: randomUUID(), channel: "TAKEAWAY", tableId: null }), /ya no está disponible/);
    await assert.rejects(createOrder(db, { ...scope, branchId: otherBranch.id }, input), /autorización/);
    console.log("POS order integrity checks passed.");
  } finally {
    try {
      const where = { organizationId: { in: ids } };
      await db.orderLine.deleteMany({ where });
      await db.order.deleteMany({ where });
      await db.restaurantTable.deleteMany({ where });
      await db.productVariant.deleteMany({ where });
      await db.product.deleteMany({ where });
      await db.category.deleteMany({ where });
      await db.membershipBranch.deleteMany({ where });
      await db.membership.deleteMany({ where });
      await db.role.deleteMany({ where });
      await db.user.deleteMany({ where: { id: userId } });
      await db.branch.deleteMany({ where });
      await db.organization.deleteMany({ where: { id: { in: ids } } });
    } finally { await db.$disconnect(); }
  }
}
main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
