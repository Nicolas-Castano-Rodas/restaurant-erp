import Link from "next/link";
import { ModulePage } from "@/components/workspace/module-page";
import { getPrisma } from "@/lib/prisma";
import { requireWorkspace } from "@/modules/auth/workspace";
import { listOrders } from "@/modules/orders/service";

const channelName = { DINE_IN: "En mesa", TAKEAWAY: "Para llevar", DELIVERY: "Domicilio" };
const kitchenName = { PENDING: "Pendiente", PREPARING: "En preparación", READY: "Listo", SERVED: "Entregado" };
const statusName = { OPEN: "Abierto", COMPLETED: "Completado", CANCELLED: "Cancelado" };

export default async function OrdersPage() {
  const context = await requireWorkspace("orders.manage");
  const orders = await listOrders(getPrisma(), context.organization.id, context.branch.id);
  const date = new Intl.DateTimeFormat("es-CO", { dateStyle: "short", timeStyle: "short", timeZone: context.organization.timeZone });
  return (
    <ModulePage title="Pedidos" subtitle={`${context.organization.name} · ${context.branch.name} · Últimos 50 pedidos`}>
      <Link href="/dashboard/pos" className="mb-3 inline-block rounded-lg bg-brand px-4 py-3 text-sm font-semibold text-white hover:bg-brand-hover">+ Nuevo pedido</Link>
      <div className="reference-card divide-y divide-line p-3">
        {orders.map((order) => {
          const format = new Intl.NumberFormat("es-CO", { style: "currency", currency: order.currency, minimumFractionDigits: 0, maximumFractionDigits: 2 });
          return <details key={order.id} className="reference-disclosure"><summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3 rounded-lg p-3"><div><p className="font-semibold">#{order.id.slice(0, 8).toUpperCase()} · {order.tableName ?? channelName[order.channel]}</p><p className="mt-1 text-xs text-muted">{date.format(order.createdAt)}</p></div><div className="flex items-center gap-3"><span className={order.status === "OPEN" ? "rounded-lg bg-warning-soft px-2 py-1 text-xs text-warning" : "rounded-lg bg-neutral-soft px-2 py-1 text-xs text-neutral-status"}>{statusName[order.status]}</span><span className="text-sm font-semibold tabular-nums">{format.format(Number(order.total))}</span></div></summary><div className="space-y-2 p-3">{order.lines.map((line) => <div key={line.id} className="flex justify-between gap-3 text-sm"><span>{line.quantity} × {line.productName}{line.variantName ? ` · ${line.variantName}` : ""}</span><span>{format.format(Number(line.lineTotal))}</span></div>)}{order.note && <p className="text-xs text-muted">Observaciones: {order.note}</p>}<p className="text-xs font-semibold text-muted">Cocina: {kitchenName[order.kitchenStatus]}</p><p className="text-xs text-muted">Cobro y cierre pendientes de la fase de caja.</p></div></details>;
        })}
        {!orders.length && <p className="p-4 text-sm text-muted">Aún no hay pedidos registrados en esta sucursal.</p>}
      </div>
    </ModulePage>
  );
}
