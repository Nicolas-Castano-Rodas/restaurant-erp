import { FormFeedback, ModulePage } from "@/components/workspace/module-page";
import { getPrisma } from "@/lib/prisma";
import { requireWorkspace } from "@/modules/auth/workspace";
import { moveKitchenOrder } from "@/modules/kitchen/actions";
import { LiveRefresh } from "@/modules/kitchen/live-refresh";
import { listKitchenOrders } from "@/modules/kitchen/service";

const stages = [
  { status: "PENDING", title: "Pendientes", color: "bg-warning-soft text-warning", action: "Iniciar preparación" },
  { status: "PREPARING", title: "En preparación", color: "bg-brand-soft text-brand", action: "Marcar listo" },
  { status: "READY", title: "Listos", color: "bg-success-soft text-success", action: "Marcar entregado" },
] as const;
const channel = { DINE_IN: "En mesa", TAKEAWAY: "Para llevar", DELIVERY: "Domicilio" };

export default async function KitchenPage({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string }> }) {
  const context = await requireWorkspace("kitchen.manage");
  const orders = await listKitchenOrders(getPrisma(), context.organization.id, context.branch.id);
  const feedback = await searchParams;
  const now = Date.now();
  const scope = `${context.organization.id}:${context.branch.id}`;
  return (
    <ModulePage title="Cocina" subtitle={`${context.organization.name} · ${context.branch.name}`}>
      <FormFeedback saved={feedback.saved} />
      {feedback.error && <p role="alert" className="mb-3 rounded-lg bg-danger-soft p-3 text-sm text-danger">{feedback.error === "1" ? "No se pudo actualizar la comanda." : feedback.error}</p>}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold">{orders.length} comandas activas</p>
        <LiveRefresh />
      </div>
      <div className="grid items-start gap-3 lg:grid-cols-3">
        {stages.map((stage) => {
          const current = orders.filter((order) => order.kitchenStatus === stage.status);
          return <section key={stage.status} className="reference-card overflow-hidden">
            <header className={`flex items-center justify-between gap-2 px-4 py-3 ${stage.color}`}><h2 className="font-bold">{stage.title}</h2><span className="rounded-lg bg-white/80 px-2 py-1 text-sm font-semibold tabular-nums">{current.length}</span></header>
            <div className="space-y-3 p-3">
              {current.map((order) => <article key={order.id} className="rounded-xl border border-line bg-surface p-3">
                <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-bold">{order.tableName ?? channel[order.channel]}</h3><span className="text-xs font-semibold text-muted">{Math.max(0, Math.floor((now - order.createdAt.getTime()) / 60000))} min</span></div>
                <p className="mt-1 text-xs text-muted">#{order.id.slice(0, 8).toUpperCase()}</p>
                <ul className="my-3 space-y-2 border-y border-line py-3">{order.lines.map((line) => <li key={line.id} className="flex gap-2 text-sm"><span className="font-bold tabular-nums">{line.quantity}×</span><span>{line.productName}{line.variantName ? ` · ${line.variantName}` : ""}</span></li>)}</ul>
                {order.note && <p className="mb-3 rounded-lg bg-warning-soft p-2 text-xs text-warning">{order.note}</p>}
                <form action={moveKitchenOrder}><input type="hidden" name="scope" value={scope} /><input type="hidden" name="id" value={order.id} /><input type="hidden" name="expected" value={stage.status} /><button type="submit" className="min-h-11 w-full rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-hover">{stage.action}</button></form>
              </article>)}
              {!current.length && <p className="rounded-lg border border-dashed border-line p-4 text-center text-xs text-muted">Sin comandas</p>}
            </div>
          </section>;
        })}
      </div>
      <p className="mt-3 text-xs text-muted">Entregar una comanda no cobra el pedido ni libera la mesa. El cierre comercial se realiza en caja.</p>
    </ModulePage>
  );
}
