import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { getPrisma } from "../../src/lib/prisma";
import { listCatalog, listTables, validPrice } from "../../src/modules/catalog/service";

async function main() {
  if (process.env.RUN_DB_TESTS !== "true") throw new Error("Use a disposable database");
  const db = getPrisma();
  const ids = [randomUUID(), randomUUID()];
  try {
    const [a, b] = await Promise.all(ids.map((id) => db.organization.create({ data: { id, slug: id, name: "Test" } })));
    const catA = await db.category.create({ data: { organizationId: a.id, name: "Food" } });
    const catB = await db.category.create({ data: { organizationId: b.id, name: "Food" } });
    await assert.rejects(db.product.create({ data: { organizationId: a.id, categoryId: catB.id, name: "Invalid", price: "1" } }), { code: "P2003" });
    const product = await db.product.create({ data: { organizationId: a.id, categoryId: catA.id, name: "Rice", price: "12500.50" } });
    await db.productVariant.create({ data: { organizationId: a.id, productId: product.id, name: "Large", price: "18000" } });
    await assert.rejects(db.productVariant.create({ data: { organizationId: b.id, productId: product.id, name: "Invalid", price: "1" } }), { code: "P2003" });
    assert.equal((await listCatalog(db, a.id, true))[0].products[0].price.toString(), "12500.5");
    assert.equal((await listCatalog(db, b.id, true))[0].products.length, 0);
    await db.product.update({ where: { id: product.id }, data: { available: false } });
    assert.equal((await listCatalog(db, a.id, true))[0].products.length, 0);
    assert.equal((await listCatalog(db, a.id))[0].products.length, 1);
    const branchA = await db.branch.create({ data: { organizationId: a.id, name: "Main", code: "MAIN" } });
    const branchB = await db.branch.create({ data: { organizationId: b.id, name: "Main", code: "MAIN" } });
    await assert.rejects(db.restaurantTable.create({ data: { organizationId: a.id, branchId: branchB.id, name: "Invalid", capacity: 4 } }), { code: "P2003" });
    await db.restaurantTable.create({ data: { organizationId: a.id, branchId: branchA.id, name: "Table 1", capacity: 4 } });
    assert.equal((await listTables(db, a.id, branchA.id)).length, 1);
    assert.equal((await listTables(db, b.id, branchB.id)).length, 0);
    assert.equal(validPrice("12500.50"), true);
    assert.equal(validPrice("-1"), false);
    assert.equal(validPrice("1.123"), false);
    console.log("Catalog and table isolation checks passed.");
  } finally {
    try {
      await db.restaurantTable.deleteMany({ where: { organizationId: { in: ids } } });
      await db.productVariant.deleteMany({ where: { organizationId: { in: ids } } });
      await db.product.deleteMany({ where: { organizationId: { in: ids } } });
      await db.category.deleteMany({ where: { organizationId: { in: ids } } });
      await db.branch.deleteMany({ where: { organizationId: { in: ids } } });
      await db.organization.deleteMany({ where: { id: { in: ids } } });
    } finally {
      await db.$disconnect();
    }
  }
}
main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
