import { Prisma, type PrismaClient } from "@/generated/prisma/client";

const DAY = 86400000;
function parseDay(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return NaN;
  const ms = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(ms) && new Date(ms).toISOString().slice(0, 10) === value ? ms : NaN;
}

export function reportRange(timeZone: string, from?: string, to?: string, now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const part = (key: string) => parts.find((p) => p.type === key)?.value;
  const today = `${part("year")}-${part("month")}-${part("day")}`;
  const defaultFrom = new Date(parseDay(today) - 6 * DAY).toISOString().slice(0, 10);
  const start = from === undefined ? defaultFrom : from;
  const end = to === undefined ? today : to;
  const a = parseDay(start);
  const b = parseDay(end);
  if (!Number.isFinite(a) || !Number.isFinite(b) || b < a || b - a > 89 * DAY || end > today) {
    return { from: defaultFrom, to: today, invalid: true };
  }
  return { from: start, to: end, invalid: false };
}

type Scope = { organizationId: string; branchId: string; currency: string; timeZone: string };
type AmountRow = { label: string; amount: string; count: number };
type Summary = { revenue: string; orders: number; shipping: string; tax: string; discounts: string; cost: string; costedOrders: number; costedProductRevenue: string; comparableCost: string; otherCurrency: number };
type ProductRow = { name: string; units: number; amount: string };
type DeliveryRow = { delivered: number; averageMinutes: number | null };

export async function analyticsOverview(db: PrismaClient, scope: Scope, range: { from: string; to: string }) {
  const { organizationId, branchId, currency, timeZone } = scope;
  const start = parseDay(range.from);
  const end = parseDay(range.to);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start || end - start > 89 * DAY) throw new Error("Invalid report range");
  const nextDay = new Date(end + DAY).toISOString().slice(0, 10);
  const lower = Prisma.sql`((${range.from}::date::timestamp AT TIME ZONE ${timeZone}) AT TIME ZONE 'UTC')`;
  const upper = Prisma.sql`((${nextDay}::date::timestamp AT TIME ZONE ${timeZone}) AT TIME ZONE 'UTC')`;
  const paid = Prisma.sql`WITH all_paid AS (
    SELECT p."orderId", p."amount", p."method", p."currency", p."createdAt",
      o."channel", o."subtotal", o."discount", o."tax", o."deliveryFee"
    FROM "Payment" p JOIN "Order" o ON o."id" = p."orderId" AND o."organizationId" = p."organizationId" AND o."branchId" = p."branchId"
    WHERE p."organizationId" = ${organizationId}::uuid AND p."branchId" = ${branchId}::uuid
      AND p."createdAt" >= ${lower} AND p."createdAt" < ${upper} AND o."status" = 'COMPLETED'
  ), paid AS (SELECT * FROM all_paid WHERE "currency" = ${currency})`;
  return db.$transaction(async (tx) => {
    const [summary] = await tx.$queryRaw<Summary[]>`${paid}, costs AS (
      SELECT p."orderId", COUNT(s."id") AS movement_count,
        COUNT(s."unitCost") AS priced_count,
        COALESCE(SUM(s."quantity" * s."unitCost"), 0) AS known_cost
      FROM paid p LEFT JOIN "StockMovement" s ON s."orderId" = p."orderId"
        AND s."organizationId" = ${organizationId}::uuid AND s."branchId" = ${branchId}::uuid AND s."kind" = 'EXIT'
      GROUP BY p."orderId"
    )
    SELECT COALESCE(SUM(p."amount"), 0)::text AS revenue, COUNT(*)::int AS orders,
      COALESCE(SUM(p."deliveryFee"), 0)::text AS shipping,
      COALESCE(SUM(p."tax"), 0)::text AS tax,
      COALESCE(SUM(p."discount"), 0)::text AS discounts,
      ROUND(COALESCE(SUM(c.known_cost), 0), 2)::text AS cost,
      COUNT(*) FILTER (WHERE c.movement_count > 0 AND c.movement_count = c.priced_count)::int AS "costedOrders",
      COALESCE(SUM(p."subtotal" - p."discount") FILTER (WHERE c.movement_count > 0 AND c.movement_count = c.priced_count), 0)::text AS "costedProductRevenue",
      ROUND(COALESCE(SUM(c.known_cost) FILTER (WHERE c.movement_count > 0 AND c.movement_count = c.priced_count), 0), 2)::text AS "comparableCost",
      (SELECT COUNT(*)::int FROM all_paid WHERE "currency" <> ${currency}) AS "otherCurrency"
    FROM paid p JOIN costs c ON c."orderId" = p."orderId"`;
    const daily = await tx.$queryRaw<AmountRow[]>`${paid}
      SELECT TO_CHAR(("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE ${timeZone}, 'YYYY-MM-DD') AS label,
      SUM("amount")::text AS amount, COUNT(*)::int AS count FROM paid GROUP BY 1 ORDER BY 1`;
    const methods = await tx.$queryRaw<AmountRow[]>`${paid}
      SELECT "method"::text AS label, SUM("amount")::text AS amount, COUNT(*)::int AS count FROM paid GROUP BY 1 ORDER BY 1`;
    const channels = await tx.$queryRaw<AmountRow[]>`${paid}
      SELECT "channel"::text AS label, SUM("amount")::text AS amount, COUNT(*)::int AS count FROM paid GROUP BY 1 ORDER BY 1`;
    const products = await tx.$queryRaw<ProductRow[]>`${paid}
      SELECT l."productName" AS name, SUM(l."quantity")::int AS units, SUM(l."lineTotal")::text AS amount
      FROM paid p JOIN "OrderLine" l ON l."orderId" = p."orderId" AND l."organizationId" = ${organizationId}::uuid
      GROUP BY l."productId", l."productName" ORDER BY units DESC, name ASC LIMIT 10`;
    const [delivery] = await tx.$queryRaw<DeliveryRow[]>`
      SELECT COUNT(*)::int AS delivered, AVG(EXTRACT(EPOCH FROM (d."deliveredAt" - d."dispatchedAt")) / 60)::double precision AS "averageMinutes"
      FROM "Delivery" d JOIN "Order" o ON o."id" = d."orderId" AND o."organizationId" = d."organizationId" AND o."branchId" = d."branchId"
      WHERE d."organizationId" = ${organizationId}::uuid AND d."branchId" = ${branchId}::uuid
        AND d."status" = 'DELIVERED' AND o."status" <> 'CANCELLED'
        AND d."deliveredAt" >= ${lower} AND d."deliveredAt" < ${upper}`;
    const [operations] = await tx.$queryRaw<{ opened: number; cancelled: number }[]>`
      SELECT COUNT(*) FILTER (WHERE "status" = 'OPEN')::int AS opened, COUNT(*) FILTER (WHERE "status" = 'CANCELLED')::int AS cancelled
      FROM "Order" WHERE "organizationId" = ${organizationId}::uuid AND "branchId" = ${branchId}::uuid
        AND "createdAt" >= ${lower} AND "createdAt" < ${upper}`;
    const byDay = new Map(daily.map((row) => [row.label, row]));
    const days = Array.from({ length: (end - start) / DAY + 1 }, (_, index) => {
      const label = new Date(start + index * DAY).toISOString().slice(0, 10);
      return byDay.get(label) ?? { label, amount: "0", count: 0 };
    });
    return { summary, days, methods, channels, products, delivery, operations };
  }, { isolationLevel: "RepeatableRead", timeout: 20000 });
}
