import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { getPrisma } from "../../src/lib/prisma";
import ExcelJS from "exceljs";
import { PDFDocument } from "pdf-lib";
import { buildReport } from "../../src/modules/reports/service";
import { renderExcel, renderPdf } from "../../src/modules/reports/render";
import { analyticsOverview, reportRange } from "../../src/modules/analytics/service";

async function main() {
  if (process.env.RUN_DB_TESTS !== "true") throw new Error("Use a disposable database");
  const db = getPrisma();
  const organizationId = randomUUID();
  const userId = randomUUID();
  const where = { organizationId };
  try {
    await db.organization.create({ data: { id: organizationId, slug: organizationId, name: "Analytics" } });
    const branch = await db.branch.create({ data: { ...where, name: "Main", code: "MAIN" } });
    const other = await db.branch.create({ data: { ...where, name: "Other", code: "OTHER" } });
    const role = await db.role.create({ data: { ...where, name: "Test" } });
    await db.user.create({ data: { id: userId, email: `${userId}@example.invalid`, name: "Test" } });
    const member = await db.membership.create({ data: { ...where, userId, roleId: role.id } });
    const scope = { ...where, branchId: branch.id, membershipId: member.id };
    const category = await db.category.create({ data: { ...where, name: "Food" } });
    const product = await db.product.create({ data: { ...where, categoryId: category.id, name: "Rice", price: "12000" } });
    const ingredient = await db.ingredient.create({ data: { ...where, name: "Rice", unit: "KG" } });
    await db.inventoryBalance.create({ data: { ...where, branchId: branch.id, ingredientId: ingredient.id, quantity: "5" } });
    const shift = await db.cashShift.create({ data: { ...where, branchId: branch.id, openedById: member.id, currency: "COP", openingAmount: "0" } });
    const time = new Date("2026-11-25T04:30:00Z"); // Nov 24 in Bogota.
    const order = await db.order.create({ data: { ...scope, requestId: randomUUID(), requestHash: "a".repeat(64), channel: "TAKEAWAY", status: "COMPLETED", kitchenStatus: "SERVED", currency: "COP", subtotal: "24000", total: "24000", createdAt: time, closedAt: time, closedById: member.id } });
    await db.orderLine.create({ data: { ...where, orderId: order.id, productId: product.id, productName: "Rice", quantity: 2, unitPrice: "12000", lineTotal: "24000" } });
    await db.payment.create({ data: { ...scope, orderId: order.id, shiftId: shift.id, method: "CASH", currency: "COP", amount: "24000", received: "25000", change: "1000", createdAt: time } });
    await db.stockMovement.create({ data: { ...scope, ingredientId: ingredient.id, requestId: randomUUID(), kind: "EXIT", quantity: "0.500", balanceAfter: "5", reason: "Test consumption", orderId: order.id, unitCost: "4000" } });
    await db.order.create({ data: { ...scope, requestId: randomUUID(), requestHash: "b".repeat(64), channel: "TAKEAWAY", currency: "COP", subtotal: "10000", total: "10000", createdAt: time } });
    const reportScope = { ...where, branchId: branch.id, currency: "COP", timeZone: "America/Bogota" };
    const range = { from: "2026-11-24", to: "2026-11-24" };
    const report = await analyticsOverview(db, reportScope, range);
    assert.equal(Number(report.summary.revenue), 24000);
    assert.equal(report.summary.orders, 1);
    assert.equal(Number(report.summary.cost), 2000);
    assert.equal(report.summary.costedOrders, 1);
    assert.equal(Number(report.summary.costedProductRevenue), 24000);
    assert.equal(report.days[0].label, "2026-11-24");
    assert.equal(report.products[0].units, 2);
    assert.equal(report.operations.opened, 1);
    assert.equal((await analyticsOverview(db, { ...reportScope, branchId: other.id }, range)).summary.orders, 0);
    assert.equal((await analyticsOverview(db, reportScope, { from: "2026-11-25", to: "2026-11-25" })).summary.orders, 0);
    await db.stockMovement.updateMany({ where: { ...where, orderId: order.id }, data: { unitCost: null } });
    assert.equal((await analyticsOverview(db, reportScope, range)).summary.costedOrders, 0);
    assert.equal(reportRange("America/Bogota", "2026-02-30", "2026-11-24", time).invalid, true);
    assert.equal(reportRange("America/Bogota", undefined, undefined, time).to, "2026-11-24");
    const exportScope = { ...reportScope, organization: "Restaurante de prueba", branch: "Principal" };
    // Fixed fixture date is in the past when this version runs.
    for (const type of ["sales", "inventory", "purchases", "cash", "products"] as const) {
      const exported = await buildReport(db, exportScope, type, range);
      const workbook = new ExcelJS.Workbook();
      const xlsx = await renderExcel(exported);
      assert.equal(String.fromCharCode(...xlsx.slice(0, 2)), "PK");
      await workbook.xlsx.load(xlsx.buffer as Parameters<typeof workbook.xlsx.load>[0]);
      assert.equal(workbook.worksheets.length, exported.tables.length + 1);
      const pdf = await PDFDocument.load(await renderPdf(exported));
      assert.ok(pdf.getPageCount() >= 1);
    }
    const sales = await buildReport(db, exportScope, "sales", range);
    assert.equal(sales.tables[4].rows.length, 1);
    assert.equal(Number(sales.tables[4].rows[0][6]), 24000);
    const empty = await buildReport(db, { ...exportScope, branchId: other.id }, "sales", range);
    assert.equal(empty.tables[4].rows.length, 0);
    console.log("Analytics and report formats, scope, payment, date boundary and cost coverage checks passed.");
  } finally {
    try {
      await db.stockMovement.deleteMany({ where });
      await db.payment.deleteMany({ where });
      await db.cashShift.deleteMany({ where });
      await db.orderLine.deleteMany({ where });
      await db.order.deleteMany({ where });
      await db.inventoryBalance.deleteMany({ where });
      await db.ingredient.deleteMany({ where });
      await db.product.deleteMany({ where });
      await db.category.deleteMany({ where });
      await db.membership.deleteMany({ where });
      await db.role.deleteMany({ where });
      await db.user.deleteMany({ where: { id: userId } });
      await db.branch.deleteMany({ where });
      await db.organization.deleteMany({ where: { id: organizationId } });
    } finally { await db.$disconnect(); }
  }
}
main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
