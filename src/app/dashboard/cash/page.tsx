import Link from "next/link";
import { ModulePage, inputStyle, buttonStyle } from "@/components/workspace/module-page";
import { getPrisma } from "@/lib/prisma";
import { requireWorkspace } from "@/modules/auth/workspace";
import { manageCash } from "@/modules/cash/actions";
import { cashOverview } from "@/modules/cash/service";
import { toMinor } from "@/modules/orders/money";

const channels = { DINE_IN: "En mesa", TAKEAWAY: "Para llevar", DELIVERY: "Domicilio" };
const kitchenStatus = { PENDING: "Pendiente", PREPARING: "En preparación", READY: "Listo", SERVED: "Entregado" };

export default async function CashPage({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string }> }) {
  const context = await requireWorkspace("cash.manage");
  const { shift, pending, history } = await cashOverview(getPrisma(), context.organization.id, context.branch.id);
  const { error, saved } = await searchParams;
  const scope = `${context.organization.id}:${context.branch.id}`;
  const money = (value: number, currency = context.organization.currency) => new Intl.NumberFormat("es-CO", { style: "currency", currency, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(value);
  const sum = (method: "CASH" | "CARD" | "TRANSFER") => shift?.payments.filter((p) => p.method === method).reduce((total, p) => total + toMinor(p.amount.toFixed(2)), 0n) ?? 0n;
  const expected = shift ? toMinor(shift.openingAmount.toFixed(2)) + sum("CASH") : 0n;
  return <ModulePage title="Caja" subtitle={`${context.organization.name} · ${context.branch.name}`}>
    {error && <p role="alert" className="mb-3 rounded-lg bg-danger-soft p-3 text-sm text-danger">{error}</p>}
    {saved && <output className="mb-3 block rounded-lg bg-success-soft p-3 text-sm text-success">Operación registrada correctamente.</output>}
    <section className="reference-card mb-3 p-4">
      <div className="flex items-center justify-between gap-2"><h2 className="font-semibold">Turno de caja</h2><span className={shift ? "rounded-lg bg-success-soft px-2 py-1 text-xs text-success" : "rounded-lg bg-neutral-soft px-2 py-1 text-xs text-muted"}>{shift ? "Abierto" : "Cerrado"}</span></div>
      {shift ? <>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {[["Base inicial", Number(shift.openingAmount)], ["Efectivo esperado", Number(expected) / 100], ["Tarjetas", Number(sum("CARD")) / 100], ["Transferencias", Number(sum("TRANSFER")) / 100]].map(([label, value]) => <div key={label} className="rounded-lg border border-line p-3"><p className="text-xs text-muted">{label}</p><p className="mt-2 text-lg font-bold tabular-nums">{money(Number(value), shift.currency)}</p></div>)}
        </div>
        <details className="mt-4 rounded-lg border border-line p-3"><summary className="cursor-pointer text-sm font-semibold text-brand">Cerrar turno y conciliar efectivo</summary><form action={manageCash} className="mt-3 space-y-3"><input type="hidden" name="scope" value={scope} /><input type="hidden" name="operation" value="close" /><input type="hidden" name="shiftId" value={shift.id} /><label className="block text-xs text-muted">Efectivo contado (incluye base)<input name="counted" type="number" min="0" step="0.01" required className={inputStyle} /></label><p className="text-xs text-muted">Se guardará la diferencia entre el efectivo contado y esperado.</p><button type="submit" className={buttonStyle}>Confirmar cierre</button></form></details>
      </> : <form action={manageCash} className="mt-4 max-w-md space-y-3"><input type="hidden" name="scope" value={scope} /><input type="hidden" name="operation" value="open" /><label className="block text-xs text-muted">Base inicial de efectivo<input name="opening" type="number" min="0" step="0.01" required defaultValue="0" className={inputStyle} /></label><button type="submit" className={buttonStyle}>Abrir caja</button></form>}
    </section>
    <section className="reference-card mb-3 p-4">
      <h2 className="font-semibold">Pedidos abiertos · {pending.length}</h2>
      <p className="mt-1 text-xs text-muted">El pedido debe estar entregado en cocina para cobrarlo. El cobro completo libera la mesa.</p>
      <div className="mt-3 divide-y divide-line">
        {pending.map((order) => <details key={order.id} className="reference-disclosure"><summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3 rounded-lg py-3"><span><span className="block text-sm font-semibold">{order.tableName ?? channels[order.channel]} · #{order.id.slice(0, 8).toUpperCase()}</span><span className="mt-1 block text-xs text-muted">{kitchenStatus[order.kitchenStatus]}</span></span><span className="font-bold tabular-nums">{money(Number(order.total), order.currency)}</span></summary>
          <div className="mb-3 space-y-3 rounded-lg border border-line bg-canvas p-3">
            {shift && order.kitchenStatus === "SERVED" ? <form action={manageCash} className="space-y-3"><input type="hidden" name="scope" value={scope} /><input type="hidden" name="operation" value="pay" /><input type="hidden" name="orderId" value={order.id} /><label className="block text-xs text-muted">Método de pago<select name="method" className={inputStyle}><option value="CASH">Efectivo</option><option value="CARD">Tarjeta</option><option value="TRANSFER">Transferencia</option></select></label><label className="block text-xs text-muted">Efectivo recibido (solo para efectivo)<input name="received" type="number" min="0" step="0.01" defaultValue={order.total.toFixed(2)} className={inputStyle} /></label><p className="text-xs text-muted">Registra únicamente pagos ya recibidos. No procesa transacciones bancarias.</p><button type="submit" className={buttonStyle}>Confirmar pago y cerrar pedido</button></form> : <p className="text-sm text-warning">{!shift ? "Abre caja para cobrar." : "Marca la comanda como entregada desde cocina."}</p>}
            <details className="rounded-lg border border-line bg-surface p-3"><summary className="cursor-pointer text-sm font-semibold text-danger">Cancelar pedido sin pago</summary><form action={manageCash} className="mt-3 space-y-3"><input type="hidden" name="scope" value={scope} /><input type="hidden" name="operation" value="cancel" /><input type="hidden" name="orderId" value={order.id} /><label className="block text-xs text-muted">Motivo<textarea name="reason" required minLength={3} maxLength={500} className={inputStyle} /></label><button type="submit" className="w-full rounded-lg border border-danger px-3 py-2 text-sm font-semibold text-danger">Confirmar cancelación</button></form></details>
          </div></details>)}
        {!pending.length && <p className="py-4 text-sm text-muted">Sin pedidos abiertos.</p>}
      </div>
      <Link href="/dashboard/orders" className="mt-3 inline-block text-sm font-semibold text-brand hover:underline">Consultar historial de pedidos →</Link>
    </section>
    <section className="reference-card p-4"><h2 className="font-semibold">Últimos cierres</h2><div className="mt-3 divide-y divide-line">{history.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"><span>#{item.id.slice(0, 8).toUpperCase()} · {item.closedAt?.toLocaleString("es-CO", { timeZone: context.organization.timeZone })}</span><span>Contado: {money(Number(item.countedAmount), item.currency)} · Diferencia: {money(Number(item.difference), item.currency)}</span></div>)}{!history.length && <p className="text-sm text-muted">Sin cierres registrados.</p>}</div></section>
  </ModulePage>;
}
