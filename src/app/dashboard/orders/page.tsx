import Link from "next/link";
import { ModulePage } from "@/components/workspace/module-page";
import { getPrisma } from "@/lib/prisma";
import { requireWorkspace } from "@/modules/auth/workspace";
import { listOrders } from "@/modules/orders/service";

const methods = { CASH: "Efectivo", CARD: "Tarjeta", TRANSFER: "Transferencia" };
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
          return <details key={order.id} className="reference-disclosure"><summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3 rounded-lg p-3"><div><p className="font-semibold">#{order.id.slice(0, 8).toUpperCase()} · {order.tableName ?? channelName[order.channel]}</p><p className="mt-1 text-xs text-muted">{date.format(order.createdAt)}</p></div><div className="flex items-center gap-3"><span className={order.status === "OPEN" ? "rounded-lg bg-warning-soft px-2 py-1 text-xs text-warning" : "rounded-lg bg-neutral-soft px-2 py-1 text-xs text-neutral-status"}>{statusName[order.status]}</span><span className="text-sm font-semibold tabular-nums">{format.format(Number(order.total))}</span></div></summary><div className="space-y-2 p-3">{order.lines.map((line) => <div key={line.id} className="flex justify-between gap-3 text-sm"><span>{line.quantity} × {line.productName}{line.variantName ? ` · ${line.variantName}` : ""}</span><span>{format.format(Number(line.lineTotal))}</span></div>)}{order.delivery && <p className="text-sm text-muted">Envío: {format.format(Number(order.deliveryFee))} · <Link href="/dashboard/deliveries" className="font-semibold text-brand underline">Consultar domicilio</Link></p>}{order.customer && <p className="text-sm font-semibold">Cliente: {order.customer.name}</p>}{order.note && <p className="text-xs text-muted">Observaciones: {order.note}</p>}<p className="text-xs font-semibold text-muted">Cocina: {kitchenName[order.kitchenStatus]}</p>{order.payment && <div className="rounded-lg bg-success-soft p-3 text-sm text-success"><p className="font-semibold">Comprobante interno · No es factura electrónica</p><p>Pago: {methods[order.payment.method]} · {format.format(Number(order.payment.amount))}</p><p>Recibido: {format.format(Number(order.payment.received))} · Cambio: {format.format(Number(order.payment.change))}</p><p>{date.format(order.payment.createdAt)}</p></div>}{order.cancelReason && <p className="text-sm text-danger">Cancelado: {order.cancelReason}</p>}{order.status === "OPEN" && context.permissions.includes("cash.manage") && <Link href="/dashboard/cash" className="text-sm font-semibold text-brand underline">Ir a caja</Link>}</div></details>;
        })}
        {!orders.length && <p className="p-4 text-sm text-muted">Aún no hay pedidos registrados en esta sucursal.</p>}
      </div>
    </ModulePage>
  );
}
