import Link from "next/link";
import { ModulePage, inputStyle } from "@/components/workspace/module-page";
import { getPrisma } from "@/lib/prisma";
import { requireWorkspace } from "@/modules/auth/workspace";
import { analyticsOverview, reportRange } from "@/modules/analytics/service";

const methodLabels: Record<string, string> = { CASH: "Efectivo", CARD: "Tarjeta", TRANSFER: "Transferencia" };
const channelLabels: Record<string, string> = { DINE_IN: "En mesa", TAKEAWAY: "Para llevar", DELIVERY: "Domicilio" };

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const context = await requireWorkspace("reports.read");
  const { from, to } = await searchParams;
  const { id: organizationId, currency, timeZone } = context.organization;
  const range = reportRange(timeZone, typeof from === "string" ? from : undefined, typeof to === "string" ? to : undefined);
  const data = await analyticsOverview(getPrisma(), { organizationId, branchId: context.branch.id, currency, timeZone }, range);
  const { summary, delivery, operations } = data;
  const format = new Intl.NumberFormat("es-CO", { style: "currency", currency, minimumFractionDigits: 0, maximumFractionDigits: 2 });
  const money = (value: string | number) => format.format(Number(value));
  const revenue = Number(summary.revenue);
  const maxDay = Math.max(1, ...data.days.map((day) => Number(day.amount)));
  const difference = Number(summary.costedProductRevenue) - Number(summary.comparableCost);
  const metrics = [
    { name: "Ingresos cobrados", value: money(summary.revenue), hint: currency, color: "text-success" },
    { name: "Pedidos pagados", value: summary.orders, hint: "Fecha del pago", color: "text-ink" },
    { name: "Ticket promedio", value: money(summary.orders ? revenue / summary.orders : 0), hint: "Por pedido pagado", color: "text-ink" },
    { name: "Ingresos de envío", value: money(summary.shipping), hint: "Incluidos en ingresos", color: "text-brand" },
  ];
  return <ModulePage title="Analítica de ventas" subtitle={`${context.organization.name} · ${context.branch.name} · ${currency}`}>
    <Link href={`/dashboard/reports?from=${range.from}&to=${range.to}`} className="mb-3 inline-block rounded-lg bg-brand px-4 py-3 text-sm font-semibold text-white">Exportar reportes →</Link>
    <section className="reference-card mb-3 p-4">
      <form method="get" className="flex flex-wrap items-end gap-3">
        <label className="min-w-0 flex-1 text-sm text-muted">Desde<input type="date" name="from" defaultValue={range.from} required className={inputStyle} /></label>
        <label className="min-w-0 flex-1 text-sm text-muted">Hasta<input type="date" name="to" defaultValue={range.to} required className={inputStyle} /></label>
        <button type="submit" className="rounded-lg bg-brand px-4 py-3 text-sm font-semibold text-white">Consultar período</button>
        <Link href="/dashboard/analytics" className="px-2 py-3 text-sm font-semibold text-brand underline">Últimos 7 días</Link>
      </form>
      <p className="mt-2 text-xs text-muted">Hasta 90 días, fechas inclusivas en {timeZone}. Ingresos según fecha de pago.</p>
      {range.invalid && <p role="alert" className="mt-2 text-sm text-warning">Período inválido. Se muestran los últimos siete días.</p>}
      {summary.otherCurrency > 0 && <p className="mt-2 text-sm text-warning">{summary.otherCurrency} pagos en otra moneda se excluyen de los indicadores monetarios.</p>}
    </section>
    <div className="compact-metrics mb-3 grid grid-cols-2 gap-2 lg:grid-cols-4">{metrics.map((metric) => <section key={metric.name} className="reference-card min-w-0 p-3"><h2 className="text-xs text-muted">{metric.name}</h2><p className={`mt-2 break-words text-xl font-bold tabular-nums ${metric.color}`}>{metric.value}</p><p className="mt-1 text-xs text-muted">{metric.hint}</p></section>)}</div>
    <section className="reference-card mb-3 p-4">
      <h2 className="font-semibold">Ingresos diarios</h2><p className="mt-1 text-xs text-muted">Valores cobrados por día, incluidos domicilios.</p>
      <div className="mt-4 overflow-x-auto" aria-hidden="true"><div className="flex h-44 min-w-full items-end gap-2" style={{ minWidth: Math.max(280, data.days.length * 38) }}>{data.days.map((day) => <div key={day.label} className="flex h-full min-w-0 flex-1 flex-col justify-end gap-1 text-center"><div className="flex flex-1 items-end justify-center"><div className="w-full max-w-10 rounded-t-md bg-brand" style={{ height: `${Number(day.amount) / maxDay * 100}%` }} title={`${day.label}: ${money(day.amount)}`} /></div><span className="text-[10px] text-muted">{day.label.slice(5)}</span></div>)}</div></div>
      <details className="mt-3 rounded-lg border border-line p-3"><summary className="cursor-pointer text-sm font-semibold text-brand">Ver cifras por día</summary><div className="mt-2 divide-y divide-line">{data.days.map((day) => <div key={day.label} className="flex flex-wrap justify-between gap-2 py-2 text-sm"><span>{day.label} · {day.count} pedidos</span><span className="font-semibold">{money(day.amount)}</span></div>)}</div></details>
    </section>
    <div className="mb-3 grid gap-3 md:grid-cols-2">
      {[{ title: "Ingresos por método de pago", rows: data.methods, labels: methodLabels }, { title: "Ingresos por tipo de servicio", rows: data.channels, labels: channelLabels }].map((group) => <section key={group.title} className="reference-card p-4"><h2 className="font-semibold">{group.title}</h2><div className="mt-4 space-y-4">{group.rows.map((row) => <div key={row.label}><div className="flex flex-wrap justify-between gap-2 text-sm"><span>{group.labels[row.label] ?? row.label} · {row.count}</span><span className="font-semibold">{money(row.amount)}</span></div><div className="mt-2 h-2 rounded-full bg-canvas"><div className="h-full rounded-full bg-success" style={{ width: `${revenue ? Number(row.amount) / revenue * 100 : 0}%` }} /></div></div>)}{!group.rows.length && <p className="text-sm text-muted">Sin pagos en este período.</p>}</div></section>)}
    </div>
    <section className="reference-card mb-3 p-4"><h2 className="font-semibold">10 productos más vendidos</h2><p className="mt-1 text-xs text-muted">Por unidades en pedidos pagados; importe de líneas antes de descuentos, impuestos y envío. Los nombres históricos se conservan.</p><div className="mt-3 divide-y divide-line">{data.products.map((product, index) => <div key={`${product.name}:${index}`} className="flex items-center gap-3 py-3"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-soft text-sm font-semibold text-brand">{index + 1}</span><div className="min-w-0 flex-1"><p className="break-words text-sm font-semibold">{product.name}</p><p className="text-xs text-muted">{product.units} unidades</p></div><span className="text-sm font-semibold">{money(product.amount)}</span></div>)}{!data.products.length && <p className="py-3 text-sm text-muted">Sin productos vendidos en el período.</p>}</div></section>
    <section className="reference-card mb-3 p-4"><h2 className="font-semibold">Costos registrados y margen parcial</h2><p className="mt-1 text-xs text-muted">Costos históricos de ingredientes de pedidos pagados. No representan el costo completo ni la utilidad neta.</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <div className="rounded-xl border border-line p-3"><p className="text-xs text-muted">Costo conocido registrado</p><p className="mt-1 text-xl font-bold">{money(summary.cost)}</p></div>
        <div className="rounded-xl border border-line p-3"><p className="text-xs text-muted">Pedidos con movimientos y costos registrados</p><p className="mt-1 text-xl font-bold">{summary.costedOrders} / {summary.orders}</p></div>
        <div className="rounded-xl border border-line p-3"><p className="text-xs text-muted">Ingresos de productos de esos pedidos</p><p className="mt-1 text-xl font-bold">{money(summary.costedProductRevenue)}</p></div>
        <div className="rounded-xl border border-line p-3"><p className="text-xs text-muted">Diferencia frente al costo registrado</p><p className="mt-1 text-xl font-bold">{summary.costedOrders ? money(difference) : "Sin datos suficientes"}</p></div>
      </div>
      <p className="mt-3 rounded-lg bg-warning-soft p-3 text-xs text-warning">Un pedido puede tener productos sin receta aunque todos sus movimientos registrados tengan costo. No se incluyen gastos indirectos, mano de obra, mermas manuales ni costos de reparto. La diferencia solo usa pedidos con al menos un movimiento y todos sus movimientos valorados; excluye envío e impuestos.</p>
    </section>
    <section className="reference-card p-4"><h2 className="font-semibold">Operación y domicilios</h2><div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">{[{ name: "Pedidos aún abiertos", value: operations.opened }, { name: "Pedidos cancelados", value: operations.cancelled }, { name: "Domicilios entregados", value: delivery.delivered }, { name: "Tiempo medio de reparto", value: delivery.averageMinutes === null ? "Sin datos" : `${Math.round(delivery.averageMinutes)} min` }].map((item) => <div key={item.name} className="rounded-lg border border-line p-3"><p className="text-xs text-muted">{item.name}</p><p className="mt-2 text-lg font-semibold">{item.value}</p></div>)}</div><p className="mt-3 text-xs text-muted">Abiertos y cancelados según fecha de creación; domicilios según fecha de entrega, de salida a llegada. Incluye todas las monedas para estos indicadores operativos.</p></section>
  </ModulePage>;
}
