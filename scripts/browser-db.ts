import "dotenv/config";
import { getPrisma } from "../src/lib/prisma";
import { createDemoFixture, requireDisposableDatabase } from "./demo-fixture";

async function main() {
  requireDisposableDatabase("test");
  const db = getPrisma();
  try {
    const [operation, organizationId, branchId, ingredientId] = process.argv.slice(2);
    if (operation === "seed") {
      console.log(JSON.stringify(await createDemoFixture("test", process.env.BROWSER_FIXTURE_PASSWORD ?? "")));
      return;
    }
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (operation !== "snapshot" || ![organizationId, branchId, ingredientId].every((value) => typeof value === "string" && uuid.test(value))) throw new Error("Invalid test scope.");
    const where = { organizationId, branchId };
    const balance = await db.inventoryBalance.findFirstOrThrow({ where: { ...where, ingredientId } });
    const order = await db.order.findFirst({ where, orderBy: { createdAt: "desc" }, include: { payment: true } });
    const shift = await db.cashShift.findFirst({ where, orderBy: { openedAt: "desc" } });
    console.log(JSON.stringify({ quantity: balance.quantity.toFixed(3), orderStatus: order?.status ?? null, payment: order?.payment?.amount.toFixed(2) ?? null, difference: shift?.difference?.toFixed(2) ?? null }));
  } finally { await db.$disconnect(); }
}
main().catch(() => { console.error("Browser fixture operation failed in the disposable database."); process.exitCode = 1; });
