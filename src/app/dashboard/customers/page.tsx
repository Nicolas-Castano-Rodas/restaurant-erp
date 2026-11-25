import Link from "next/link";
import { ModulePage, inputStyle, buttonStyle } from "@/components/workspace/module-page";
import { getPrisma } from "@/lib/prisma";
import { requireWorkspace } from "@/modules/auth/workspace";
import { manageCustomer } from "@/modules/customers/actions";
import { customerHistory, searchCustomers } from "@/modules/customers/service";

type Customer = { id: string; name: string; phone: string | null; email: string | null; active: boolean };
const channels = { DINE_IN: "En mesa", TAKEAWAY: "Para llevar", DELIVERY: "Domicilio" };
const statuses = { OPEN: "Abierto", COMPLETED: "Completado", CANCELLED: "Cancelado" };
const money = (value: number, currency: string) => new Intl.NumberFormat("es-CO", { style: "currency", currency, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(value);

function CustomerForm({ scope, customer }: { scope: string; customer?: Customer }) {
  return <form action={manageCustomer} className="space-y-3">
    <input type="hidden" name="scope" value={scope} /><input type="hidden" name="id" value={customer?.id ?? ""} />
    <label className="block text-sm text-muted">Nombre<input name="name" required maxLength={120} defaultValue={customer?.name ?? ""} className={inputStyle} /></label>
    <label className="block text-sm text-muted">Teléfono (opcional)<input name="phone" type="tel" maxLength={40} defaultValue={customer?.phone ?? ""} className={inputStyle} /></label>
    <label className="block text-sm text-muted">Correo electrónico (opcional)<input name="email" type="email" maxLength={254} defaultValue={customer?.email ?? ""} className={inputStyle} /></label>
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={customer?.active ?? true} className="accent-success" /> Activo</label>
    <button type="submit" className={buttonStyle}>{customer ? "Guardar cambios" : "Registrar cliente"}</button>
  </form>;
}

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string; customer?: string; error?: string; saved?: string }> }) {
  const context = await requireWorkspace("orders.manage");
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.slice(0, 120) : "";
  const selected = typeof params.customer === "string" ? params.customer : "";
  const db = getPrisma();
  const { id: organizationId, name, timeZone } = context.organization;
  const branchId = context.branch.id;
  const scope = `${organizationId}:${branchId}`;
  const [customers, history] = await Promise.all([searchCustomers(db, organizationId, branchId, q), customerHistory(db, organizationId, branchId, selected)]);
  const date = new Intl.DateTimeFormat("es-CO", { dateStyle: "short", timeStyle: "short", timeZone });
  return <ModulePage title="Clientes" subtitle={`${name} · ${context.branch.name}`}>
    {params.error && <p role="alert" className="mb-3 rounded-lg bg-danger-soft p-3 text-sm text-danger">{params.error}</p>}
    {params.saved && <output className="mb-3 block rounded-lg bg-success-soft p-3 text-sm text-success">Cliente guardado correctamente.</output>}
    <div className="mb-3 grid items-start gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
      <section className="reference-card p-4"><h2 className="mb-3 font-semibold">Nuevo cliente</h2><CustomerForm scope={scope} /><p className="mt-3 text-xs text-muted">Solicita únicamente los datos necesarios y autorizados. El registro es opcional para vender.</p></section>
      <section className="reference-card p-4"><h2 className="mb-3 font-semibold">Directorio de clientes</h2>
        <form method="get" className="flex flex-wrap items-end gap-2"><label className="min-w-0 flex-1 text-xs text-muted">Buscar por nombre, teléfono o correo<input name="q" defaultValue={q} maxLength={120} className={inputStyle} /></label><button type="submit" className="rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white">Buscar</button></form>
        <p className="mt-3 text-xs text-muted">Hasta 100 coincidencias. Usa la búsqueda para localizar otros clientes.</p>
        <div className="mt-2 divide-y divide-line">{customers.map((customer) => <Link key={customer.id} href={`/dashboard/customers?customer=${customer.id}&q=${encodeURIComponent(q)}`} className={`flex items-center gap-3 rounded-lg py-3 ${customer.id === selected ? "bg-canvas" : "hover:bg-canvas"}`}>
          <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-soft font-semibold text-brand">{customer.name.slice(0, 1).toUpperCase()}</span><span className="min-w-0 flex-1"><span className="block break-words text-sm font-semibold">{customer.name}</span><span className="block break-words text-xs text-muted">{customer.phone || customer.email || "Sin datos de contacto"}</span></span><span className={customer.active ? "text-xs text-success" : "text-xs text-muted"}>{customer.active ? "Activo" : "Inactivo"}</span>
        </Link>)}{!customers.length && <p className="py-4 text-sm text-muted">No hay clientes que coincidan.</p>}</div>
      </section>
    </div>
    {history && <section className="reference-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">{history.customer.name}</h2><p className="text-xs text-muted">{history.customer.active ? "Cliente activo" : "Cliente inactivo"}</p></div>{history.customer.active && <Link href={`/dashboard/pos?customer=${history.customer.id}`} className="rounded-lg bg-brand px-4 py-3 text-sm font-semibold text-white">+ Nuevo pedido</Link>}</div>
      <details className="mt-3 rounded-lg border border-line p-3"><summary className="cursor-pointer text-sm font-semibold text-brand">Editar datos del cliente</summary><div className="mt-3"><CustomerForm scope={scope} customer={history.customer} /></div></details>
      <div className="mt-4 grid gap-2 sm:grid-cols-2"><div className="rounded-xl border border-line p-3"><p className="text-xs text-muted">Pedidos pagados (histórico)</p><p className="mt-1 text-2xl font-semibold tabular-nums">{history.paid.reduce((total, entry) => total + entry._count._all, 0)}</p></div><div className="rounded-xl border border-line p-3"><p className="text-xs text-muted">Consumo pagado por moneda</p>{history.paid.map((entry) => <p key={entry.currency} className="mt-1 text-xl font-semibold tabular-nums">{money(Number(entry._sum.total), entry.currency)} <span className="text-xs text-muted">{entry.currency}</span></p>)}{!history.paid.length && <p className="mt-1 text-xl font-semibold">Sin pagos</p>}</div></div>
      <h3 className="mt-5 font-semibold">Últimos 50 pedidos</h3><div className="mt-2 divide-y divide-line">{history.orders.map((order) => <details key={order.id} className="reference-disclosure"><summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3 rounded-lg py-3"><span><span className="block text-sm font-semibold">#{order.id.slice(0, 8).toUpperCase()} · {channels[order.channel]}</span><span className="block text-xs text-muted">{date.format(order.createdAt)} · {statuses[order.status]}</span></span><span className="font-semibold tabular-nums">{money(Number(order.total), order.currency)}</span></summary><div className="space-y-2 pb-3 text-sm text-muted">{order.lines.map((line) => <p key={line.id}>{line.quantity} × {line.productName}{line.variantName ? ` · ${line.variantName}` : ""}</p>)}</div></details>)}{!history.orders.length && <p className="py-3 text-sm text-muted">Este cliente todavía no tiene pedidos vinculados.</p>}</div>
    </section>}
    {selected && !history && <p className="reference-card p-4 text-sm text-muted">Cliente no encontrado en la sucursal actual.</p>}
  </ModulePage>;
}
