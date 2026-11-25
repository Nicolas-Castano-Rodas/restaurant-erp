import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { analyticsOverview, reportRange } from "@/modules/analytics/service";
import { MAX_ROWS, reportTypes, type Column, type Report, type ReportTable, type ReportType, type Row } from "./types";

type Scope = { organizationId: string; branchId: string; organization: string; branch: string; currency: string; timeZone: string };
type Range = { from: string; to: string };
type Raw = Record<string, string | number | null>;
export class ReportError extends Error {}
const cols = (...labels: string[]): Column[] => labels.map((label) => ({ label }));
const num = (label: string): Column => ({ label, numeric: true });
const units: Record<string, string> = { KG: "kg", G: "g", L: "L", ML: "ml", UNIT: "ud." };
const methods: Record<string, string> = { CASH: "Efectivo", CARD: "Tarjeta", TRANSFER: "Transferencia" };
const channels: Record<string, string> = { DINE_IN: "En mesa", TAKEAWAY: "Para llevar", DELIVERY: "Domicilio" };
const states: Record<string, string> = { DRAFT: "Pendiente", RECEIVED: "Recibida", CANCELLED: "Cancelada" };
const kinds: Record<string, string> = { ENTRY: "Entrada", EXIT: "Salida", WASTE: "Merma" };

function table(title: string, columns: Column[], rows: Row[]): ReportTable {
  if (rows.length > MAX_ROWS) throw new ReportError("El reporte supera 2.000 filas en una tabla. Reduce el período o solicita una exportación administrativa.");
  if (rows.some((row) => row.length !== columns.length)) throw new Error("Invalid report columns");
  return { title, columns, rows };
}

export async function buildReport(db: PrismaClient, scope: Scope, type: ReportType, range: Range): Promise<Report> {
  const valid = reportRange(scope.timeZone, range.from, range.to);
  if (valid.invalid || valid.from !== range.from || valid.to !== range.to) throw new ReportError("Selecciona un período válido de hasta 90 días.");
  const { organizationId, branchId, currency, timeZone } = scope;
  const nextDay = new Date(Date.parse(`${range.to}T00:00:00Z`) + 86400000).toISOString().slice(0, 10);
  const lower = Prisma.sql`((${range.from}::date::timestamp AT TIME ZONE ${timeZone}) AT TIME ZONE 'UTC')`;
  const upper = Prisma.sql`((${nextDay}::date::timestamp AT TIME ZONE ${timeZone}) AT TIME ZONE 'UTC')`;
  const report: Report = { title: reportTypes.find((entry) => entry.id === type)?.title ?? "Reporte", organization: scope.organization, branch: scope.branch, ...range, currency, timeZone, generatedAt: new Date().toISOString(), notes: ["Documento interno de gestión. No constituye factura electrónica ni estado financiero.", "Importes según la moneda indicada; no se convierten divisas."], tables: [] };

  if (type === "sales" || type === "products") {
    const data = await analyticsOverview(db, scope, range);
    const s = data.summary;
    report.notes.push("Indicadores de pedidos completados con pago, por fecha de pago y moneda de la organización.", `Pagos de otras monedas excluidos de los indicadores: ${s.otherCurrency}.`);
    if (type === "sales") {
      report.tables.push(
        table("Resumen", [ ...cols("Indicador"), num("Valor") ], [["Ingresos cobrados", s.revenue], ["Pedidos pagados", s.orders], ["Ingresos de envío incluidos", s.shipping], ["Impuestos incluidos", s.tax], ["Descuentos", s.discounts]]),
        table("Ingresos diarios", [...cols("Fecha"), num("Pedidos"), num("Ingresos")], data.days.map((row) => [row.label, row.count, row.amount])),
        table("Métodos de pago", [...cols("Método"), num("Pedidos"), num("Ingresos")], data.methods.map((row) => [methods[row.label] ?? row.label, row.count, row.amount])),
        table("Tipos de servicio", [...cols("Servicio"), num("Pedidos"), num("Ingresos")], data.channels.map((row) => [channels[row.label] ?? row.label, row.count, row.amount])),
      );
      const rows = await db.$queryRaw<Raw[]>`
        SELECT o."id"::text AS id, TO_CHAR((p."createdAt" AT TIME ZONE 'UTC') AT TIME ZONE ${timeZone}, 'YYYY-MM-DD HH24:MI:SS') AS date,
          o."channel"::text AS channel, p."method"::text AS method, o."subtotal"::text AS subtotal, o."deliveryFee"::text AS fee, p."amount"::text AS amount, p."currency" AS currency
        FROM "Payment" p JOIN "Order" o ON o."id" = p."orderId" AND o."organizationId" = p."organizationId" AND o."branchId" = p."branchId"
        WHERE p."organizationId" = ${organizationId}::uuid AND p."branchId" = ${branchId}::uuid AND p."currency" = ${currency} AND o."status" = 'COMPLETED'
          AND p."createdAt" >= ${lower} AND p."createdAt" < ${upper}
        ORDER BY p."createdAt", p."id" LIMIT ${MAX_ROWS + 1}`;
      report.tables.push(table("Detalle de pagos", [...cols("Pedido", "Fecha local", "Servicio", "Método"), num("Productos"), num("Envío"), num("Cobrado"), ...cols("Moneda")], rows.map((row) => [row.id, row.date, channels[String(row.channel)], methods[String(row.method)], row.subtotal, row.fee, row.amount, row.currency])));
      report.notes.push("El detalle se consulta después del resumen; si se registran pagos durante la generación, pueden existir diferencias momentáneas.");
    } else {
      report.tables.push(
        table("Ranking de productos (top 10)", [...cols("Producto"), num("Unidades"), num("Importe de líneas")], data.products.map((row) => [row.name, row.units, row.amount])),
        table("Costos registrados", [...cols("Indicador"), num("Valor")], [["Costo histórico conocido", s.cost], ["Pedidos pagados", s.orders], ["Pedidos con movimientos valorados", s.costedOrders], ["Ingresos de productos comparables", s.costedProductRevenue], ["Costo comparable", s.comparableCost], ["Diferencia parcial", s.costedOrders ? (Number(s.costedProductRevenue) - Number(s.comparableCost)).toFixed(2) : null]]),
      );
      report.notes.push("El importe de productos es anterior a impuestos, descuentos y envío. Los costos se obtienen de movimientos históricos valorados. Puede haber productos sin receta. No representa utilidad neta ni incluye gastos indirectos, mermas manuales o reparto.");
    }
    return report;
  }

  await db.$transaction(async (tx) => {
    if (type === "inventory") {
      const balances = await tx.inventoryBalance.findMany({ where: { organizationId, branchId }, include: { ingredient: { select: { name: true, unit: true, active: true } } }, orderBy: { ingredient: { name: "asc" } }, take: MAX_ROWS + 1 });
      report.tables.push(table("Existencias actuales", [...cols("Ingrediente", "Unidad", "Estado"), num("Existencia"), num("Mínimo"), num("Costo unitario")], balances.map((row) => [row.ingredient.name, units[row.ingredient.unit], row.ingredient.active ? "Activo" : "Inactivo", row.quantity.toFixed(3), row.minimum.toFixed(3), row.unitCost?.toFixed(2) ?? null])));
      const rows = await tx.$queryRaw<Raw[]>`
        SELECT TO_CHAR((s."createdAt" AT TIME ZONE 'UTC') AT TIME ZONE ${timeZone}, 'YYYY-MM-DD HH24:MI:SS') AS date, i."name" AS ingredient, i."unit"::text AS unit, s."kind"::text AS kind, s."quantity"::text AS quantity, s."balanceAfter"::text AS balance, s."unitCost"::text AS cost,
          CASE WHEN s."orderId" IS NOT NULL THEN 'Pedido' WHEN s."purchaseId" IS NOT NULL THEN 'Compra' ELSE 'Manual' END AS origin
        FROM "StockMovement" s JOIN "Ingredient" i ON i."id" = s."ingredientId" AND i."organizationId" = s."organizationId"
        WHERE s."organizationId" = ${organizationId}::uuid AND s."branchId" = ${branchId}::uuid AND s."createdAt" >= ${lower} AND s."createdAt" < ${upper}
        ORDER BY s."createdAt", s."id" LIMIT ${MAX_ROWS + 1}`;
      report.tables.push(table("Movimientos del período", [...cols("Fecha local", "Ingrediente", "Unidad", "Tipo", "Origen"), num("Cantidad"), num("Saldo posterior"), num("Costo unitario")], rows.map((row) => [row.date, row.ingredient, units[String(row.unit)], kinds[String(row.kind)], row.origin, row.quantity, row.balance, row.cost])));
      report.notes.push("Las existencias son una fotografía actual, no un saldo al cierre del período. El costo unitario actual es la referencia vigente, no una valoración contable. Se excluyen motivos libres y datos de responsables.");
    } else if (type === "purchases") {
      const rows = await tx.$queryRaw<Raw[]>`
        SELECT p."id"::text AS id, p."supplierName" AS supplier, p."status"::text AS status,
          TO_CHAR((p."createdAt" AT TIME ZONE 'UTC') AT TIME ZONE ${timeZone}, 'YYYY-MM-DD HH24:MI') AS date,
          p."total"::text AS total, p."currency" AS currency
        FROM "Purchase" p WHERE p."organizationId" = ${organizationId}::uuid AND p."branchId" = ${branchId}::uuid
          AND p."createdAt" >= ${lower} AND p."createdAt" < ${upper}
        ORDER BY p."createdAt", p."id" LIMIT ${MAX_ROWS + 1}`;
      report.tables.push(table("Órdenes de compra", [...cols("Compra", "Proveedor", "Fecha local", "Estado"), num("Total"), ...cols("Moneda")], rows.map((row) => [row.id, row.supplier, row.date, states[String(row.status)], row.total, row.currency])));
      const lines = await tx.$queryRaw<Raw[]>`
        SELECT p."id"::text AS id, l."ingredientName" AS ingredient, l."unit"::text AS unit, l."quantity"::text AS quantity, l."unitCost"::text AS cost, l."lineTotal"::text AS total, p."currency" AS currency
        FROM "PurchaseLine" l JOIN "Purchase" p ON p."id" = l."purchaseId" AND p."organizationId" = l."organizationId" AND p."branchId" = l."branchId"
        WHERE p."organizationId" = ${organizationId}::uuid AND p."branchId" = ${branchId}::uuid AND p."createdAt" >= ${lower} AND p."createdAt" < ${upper}
        ORDER BY p."createdAt", p."id", l."ingredientName", l."id" LIMIT ${MAX_ROWS + 1}`;
      report.tables.push(table("Detalle de ingredientes", [...cols("Compra", "Ingrediente", "Unidad"), num("Cantidad"), num("Costo unitario"), num("Importe"), ...cols("Moneda")], lines.map((row) => [row.id, row.ingredient, units[String(row.unit)], row.quantity, row.cost, row.total, row.currency])));
      report.notes.push("Compras según fecha de creación y estado actual. No representa pagos a proveedores. No incluye datos de contacto.");
    } else if (type === "cash") {
      const rows = await tx.$queryRaw<Raw[]>`
        SELECT c."id"::text AS id, TO_CHAR((c."openedAt" AT TIME ZONE 'UTC') AT TIME ZONE ${timeZone}, 'YYYY-MM-DD HH24:MI') AS opened,
          TO_CHAR((c."closedAt" AT TIME ZONE 'UTC') AT TIME ZONE ${timeZone}, 'YYYY-MM-DD HH24:MI') AS closed,
          c."openingAmount"::text AS opening, c."expectedAmount"::text AS expected, c."countedAmount"::text AS counted, c."difference"::text AS difference, c."currency" AS currency
        FROM "CashShift" c WHERE c."organizationId" = ${organizationId}::uuid AND c."branchId" = ${branchId}::uuid AND c."status" = 'CLOSED'
          AND c."closedAt" >= ${lower} AND c."closedAt" < ${upper}
        ORDER BY c."closedAt", c."id" LIMIT ${MAX_ROWS + 1}`;
      report.tables.push(table("Turnos cerrados", [...cols("Turno", "Apertura", "Cierre"), num("Base inicial"), num("Esperado"), num("Contado"), num("Diferencia"), ...cols("Moneda")], rows.map((row) => [row.id, row.opened, row.closed, row.opening, row.expected, row.counted, row.difference, row.currency])));
      const payments = await tx.$queryRaw<Raw[]>`
        SELECT c."id"::text AS id, p."method"::text AS method, p."currency" AS currency, COUNT(*)::int AS count, SUM(p."amount")::text AS total
        FROM "CashShift" c JOIN "Payment" p ON p."shiftId" = c."id" AND p."organizationId" = c."organizationId" AND p."branchId" = c."branchId"
        WHERE c."organizationId" = ${organizationId}::uuid AND c."branchId" = ${branchId}::uuid AND c."status" = 'CLOSED' AND c."closedAt" >= ${lower} AND c."closedAt" < ${upper}
        GROUP BY c."id", p."method", p."currency" ORDER BY c."id", p."method", p."currency" LIMIT ${MAX_ROWS + 1}`;
      report.tables.push(table("Pagos por turno y método", [...cols("Turno", "Método", "Moneda"), num("Pagos"), num("Importe")], payments.map((row) => [row.id, methods[String(row.method)], row.currency, row.count, row.total])));
      report.notes.push("Turnos según fecha de cierre. Los pagos corresponden a todo el turno aunque su apertura sea anterior al período. La diferencia es efectivo contado menos esperado.");
    }
  }, { isolationLevel: "RepeatableRead", timeout: 20000 });
  return report;
}
