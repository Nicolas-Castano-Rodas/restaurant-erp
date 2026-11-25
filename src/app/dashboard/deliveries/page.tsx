import Link from "next/link";
import { ModulePage, inputStyle, buttonStyle } from "@/components/workspace/module-page";
import { getPrisma } from "@/lib/prisma";
import { requireWorkspace } from "@/modules/auth/workspace";
import { manageDelivery } from "@/modules/deliveries/actions";
import { deliveryOverview } from "@/modules/deliveries/service";
import { LiveRefresh } from "@/modules/kitchen/live-refresh";

const stages = [
  { status: "PENDING", name: "Sin asignar", color: "bg-warning-soft text-warning" },
  { status: "ASSIGNED", name: "Asignados", color: "bg-brand-soft text-brand" },
  { status: "DISPATCHED", name: "En camino", color: "bg-info-soft text-info" },
  { status: "DELIVERED", name: "Entregados", color: "bg-success-soft text-success" },
] as const;
const kitchen = { PENDING: "Pendiente", PREPARING: "En preparación", READY: "Listo", SERVED: "Entregado a despacho" };
type Courier = { id: string; name: string; phone: string | null; active: boolean };
function CourierForm({ scope, courier }: { scope: string; courier?: Courier }) {
  return <form action={manageDelivery} className="space-y-3"><input type="hidden" name="scope" value={scope} /><input type="hidden" name="operation" value="courier" /><input type="hidden" name="id" value={courier?.id ?? ""} /><label className="block text-sm text-muted">Nombre<input name="name" required maxLength={120} defaultValue={courier?.name ?? ""} className={inputStyle} /></label><label className="block text-sm text-muted">Teléfono (opcional)<input name="phone" type="tel" maxLength={40} defaultValue={courier?.phone ?? ""} className={inputStyle} /></label><label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={courier?.active ?? true} className="accent-success" /> Activo</label><button type="submit" className={buttonStyle}>{courier ? "Guardar domiciliario" : "Registrar domiciliario"}</button></form>;
}
export default async function DeliveriesPage({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string }> }) {
  const context = await requireWorkspace("orders.manage");
  const { error, saved } = await searchParams;
  const { couriers, active, history, legacy } = await deliveryOverview(getPrisma(), context.organization.id, context.branch.id);
  const scope = `${context.organization.id}:${context.branch.id}`;
  const money = (value: number, currency: string) => new Intl.NumberFormat("es-CO", { style: "currency", currency, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(value);
  const date = new Intl.DateTimeFormat("es-CO", { dateStyle: "short", timeStyle: "short", timeZone: context.organization.timeZone });
  return <ModulePage title="Domicilios" subtitle={`${context.organization.name} · ${context.branch.name}`}>
    {error && <p role="alert" className="mb-3 rounded-lg bg-danger-soft p-3 text-sm text-danger">{error}</p>}
    {saved && <output className="mb-3 block rounded-lg bg-success-soft p-3 text-sm text-success">Operación registrada.</output>}
    <div className="mb-3 flex flex-wrap items-center justify-between gap-3"><Link href="/dashboard/pos" className="rounded-lg bg-brand px-4 py-3 text-sm font-semibold text-white">+ Nuevo pedido</Link><LiveRefresh /></div>
    {legacy > 0 && <p className="mb-3 rounded-lg bg-warning-soft p-3 text-sm text-warning">{legacy} pedidos antiguos de domicilio no tienen datos de reparto. Se gestionan desde pedidos y caja con el flujo anterior.</p>}
    <div className="mb-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{stages.map((stage) => <section key={stage.status} className="reference-card p-3"><h2 className="text-xs text-muted">{stage.name}</h2><p className="mt-2 text-2xl font-semibold tabular-nums">{active.filter((delivery) => delivery.status === stage.status).length}</p></section>)}</div>
    <div className="mb-3 grid items-start gap-3 md:grid-cols-2">{stages.map((stage) => {
      const deliveries = active.filter((delivery) => delivery.status === stage.status);
      return <section key={stage.status} className="reference-card overflow-hidden"><h2 className={`px-4 py-3 font-semibold ${stage.color}`}>{stage.name}</h2><div className="space-y-3 p-3">
        {deliveries.map((delivery) => <article key={delivery.id} className="rounded-xl border border-line p-3">
          <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">{delivery.recipient}</h3><span className="font-bold tabular-nums">{money(Number(delivery.order.total), delivery.order.currency)}</span></div>
          <p className="mt-1 text-xs text-muted">#{delivery.orderId.slice(0, 8).toUpperCase()} · {date.format(delivery.createdAt)}</p>
          <p className="mt-3 break-words text-sm">{delivery.address}</p><p className="mt-1 text-sm text-muted">{delivery.phone}</p>{delivery.instructions && <p className="mt-2 break-words rounded-lg bg-canvas p-2 text-xs">{delivery.instructions}</p>}
          <p className="mt-2 text-xs text-muted">Cocina: {kitchen[delivery.order.kitchenStatus]} · Envío: {money(Number(delivery.order.deliveryFee), delivery.order.currency)}</p>
          {delivery.courier && <p className="mt-2 text-sm font-semibold">Domiciliario: {delivery.courier.name}</p>}
          {(delivery.status === "PENDING" || delivery.status === "ASSIGNED") && <form action={manageDelivery} className="mt-3 space-y-2"><input type="hidden" name="scope" value={scope} /><input type="hidden" name="id" value={delivery.id} /><input type="hidden" name="operation" value="assign" /><label className="block text-xs text-muted">Asignar domiciliario<select name="courierId" defaultValue={delivery.courierId ?? ""} required className={inputStyle}><option value="">Seleccionar</option>{couriers.filter((courier) => courier.active).map((courier) => <option key={courier.id} value={courier.id}>{courier.name}</option>)}</select></label><button type="submit" className={buttonStyle}>Guardar asignación</button></form>}
          {delivery.status === "ASSIGNED" && <form action={manageDelivery} className="mt-3"><input type="hidden" name="scope" value={scope} /><input type="hidden" name="id" value={delivery.id} /><input type="hidden" name="operation" value="dispatch" /><button type="submit" disabled={delivery.order.kitchenStatus !== "SERVED"} className="min-h-11 w-full rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Confirmar salida</button>{delivery.order.kitchenStatus !== "SERVED" && <p className="mt-1 text-xs text-muted">Espera la entrega a despacho desde cocina.</p>}</form>}
          {delivery.status === "DISPATCHED" && <form action={manageDelivery} className="mt-3"><input type="hidden" name="scope" value={scope} /><input type="hidden" name="id" value={delivery.id} /><input type="hidden" name="operation" value="deliver" /><button type="submit" className="min-h-11 w-full rounded-lg bg-success px-3 py-2 text-sm font-semibold text-white">Confirmar entrega al cliente</button></form>}
          {delivery.status === "DELIVERED" && <p className="mt-3 text-sm font-semibold text-success">Entregado · Pendiente de cobro{context.permissions.includes("cash.manage") && <> · <Link href="/dashboard/cash" className="underline">Ir a caja</Link></>}</p>}
        </article>)}
        {!deliveries.length && <p className="py-4 text-center text-sm text-muted">Sin domicilios</p>}
      </div></section>;
    })}</div>
    <div className="mb-3 grid items-start gap-3 md:grid-cols-2"><section className="reference-card p-4"><h2 className="mb-3 font-semibold">Nuevo domiciliario</h2><CourierForm scope={scope} /></section><section className="reference-card p-4"><h2 className="mb-3 font-semibold">Domiciliarios registrados</h2><div className="divide-y divide-line">{couriers.map((courier) => <details key={courier.id} className="reference-disclosure"><summary className="flex cursor-pointer justify-between gap-3 py-3"><span className="font-semibold">{courier.name}</span><span className={courier.active ? "text-xs text-success" : "text-xs text-muted"}>{courier.active ? "Activo" : "Inactivo"}</span></summary><div className="pb-3"><CourierForm scope={scope} courier={courier} /></div></details>)}{!couriers.length && <p className="text-sm text-muted">Sin domiciliarios registrados.</p>}</div></section></div>
    <section className="reference-card p-4"><h2 className="font-semibold">Últimos domicilios cerrados</h2><div className="mt-3 divide-y divide-line">{history.map((delivery) => <article key={delivery.id} className="flex flex-wrap justify-between gap-3 py-3"><div><p className="text-sm font-semibold">#{delivery.orderId.slice(0, 8).toUpperCase()} · {delivery.courier?.name ?? "Sin asignar"}</p><p className="text-xs text-muted">{date.format(delivery.updatedAt)} · {delivery.order.status === "CANCELLED" ? "Cancelado" : "Cerrado y pagado"}</p></div><span className="font-semibold">{money(Number(delivery.order.total), delivery.order.currency)}</span></article>)}{!history.length && <p className="text-sm text-muted">Sin domicilios cerrados.</p>}</div></section>
    <p className="mt-3 text-xs text-muted">Seguimiento manual por estados, sin GPS ni envío de notificaciones. Los pagos se registran en caja después de confirmar la entrega.</p>
  </ModulePage>;
}
