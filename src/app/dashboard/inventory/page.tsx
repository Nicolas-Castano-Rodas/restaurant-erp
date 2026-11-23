import { randomUUID } from "node:crypto";
import { ModulePage, inputStyle, buttonStyle } from "@/components/workspace/module-page";
import { getPrisma } from "@/lib/prisma";
import { requireWorkspace } from "@/modules/auth/workspace";
import { manageInventory } from "@/modules/inventory/actions";
import { inventoryOverview } from "@/modules/inventory/service";

const unitLabel = { KG: "kg", G: "g", L: "L", ML: "ml", UNIT: "ud." };
const movementLabel = { ENTRY: "Entrada", EXIT: "Salida", WASTE: "Merma" };
const number = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 3 });

export default async function InventoryPage({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string }> }) {
  const context = await requireWorkspace("inventory.manage");
  const { ingredients, movements } = await inventoryOverview(getPrisma(), context.organization.id, context.branch.id);
  const { error, saved } = await searchParams;
  const scope = `${context.organization.id}:${context.branch.id}`;
  const configured = ingredients.filter((ingredient) => ingredient.balances.length > 0);
  const empty = configured.filter((ingredient) => ingredient.balances[0].quantity.isZero()).length;
  const low = configured.filter((ingredient) => ingredient.balances[0].quantity.gt(0) && ingredient.balances[0].quantity.lte(ingredient.balances[0].minimum)).length;
  return <ModulePage title="Inventario" subtitle={`${context.organization.name} · ${context.branch.name}`}>
    {error && <p role="alert" className="mb-3 rounded-lg bg-danger-soft p-3 text-sm text-danger">{error}</p>}
    {saved && <output className="mb-3 block rounded-lg bg-success-soft p-3 text-sm text-success">Movimiento o configuración guardados.</output>}
    <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
      {[{ label: "Ingredientes en sucursal", value: configured.length, color: "text-ink" }, { label: "Stock bajo", value: low, color: "text-warning" }, { label: "Agotados", value: empty, color: "text-danger" }].map((item) => <section key={item.label} className="reference-card p-4"><h2 className="text-xs text-muted">{item.label}</h2><p className={`mt-1 text-3xl font-semibold tabular-nums ${item.color}`}>{item.value}</p></section>)}
    </div>
    <details className="reference-card reference-disclosure mb-3">
      <summary className="cursor-pointer rounded-xl px-4 py-3 text-sm font-semibold text-brand">+ Nuevo ingrediente</summary>
      <form action={manageInventory} className="grid gap-3 border-t border-line p-4 sm:grid-cols-2">
        <input type="hidden" name="scope" value={scope} /><input type="hidden" name="operation" value="create" />
        <label className="block text-xs text-muted">Nombre<input name="name" required maxLength={120} placeholder="Arroz" className={inputStyle} /></label>
        <label className="block text-xs text-muted">Unidad<select name="unit" className={inputStyle}><option value="KG">Kilogramos</option><option value="G">Gramos</option><option value="L">Litros</option><option value="ML">Mililitros</option><option value="UNIT">Unidades</option></select></label>
        <label className="block text-xs text-muted">Stock mínimo<input name="minimum" type="number" min="0" step="0.001" required defaultValue="0" className={inputStyle} /></label>
        <div className="self-end"><button type="submit" className={buttonStyle}>Crear ingrediente</button></div>
        <p className="text-xs text-muted sm:col-span-2">El inventario empieza en cero. Registra una entrada para cargar las existencias iniciales.</p>
      </form>
    </details>
    <section className="reference-card mb-3 p-4">
      <h2 className="font-semibold">Existencias</h2>
      <p className="mt-1 text-xs text-muted">Selecciona un ingrediente para registrar entradas, salidas o mermas.</p>
      <div className="mt-3 divide-y divide-line">
        {ingredients.map((ingredient) => {
          const balance = ingredient.balances[0];
          const status = !balance ? "Sin configurar" : balance.quantity.isZero() ? "Agotado" : balance.quantity.lte(balance.minimum) ? "Stock bajo" : "Disponible";
          const color = status === "Agotado" ? "bg-danger-soft text-danger" : status === "Stock bajo" ? "bg-warning-soft text-warning" : status === "Disponible" ? "bg-success-soft text-success" : "bg-neutral-soft text-muted";
          return <details key={ingredient.id} className="reference-disclosure">
            <summary className="flex cursor-pointer flex-wrap items-center gap-3 rounded-lg py-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-brand-soft text-sm font-bold text-brand" aria-hidden="true">{unitLabel[ingredient.unit]}</span>
              <span className="min-w-0 flex-1"><span className="block break-words text-sm font-semibold">{ingredient.name}</span><span className="mt-1 block text-xs text-muted">Mínimo: {balance ? number.format(Number(balance.minimum)) : "—"} {unitLabel[ingredient.unit]}</span></span>
              <span className="text-right"><span className="block font-bold tabular-nums">{balance ? number.format(Number(balance.quantity)) : "—"} {unitLabel[ingredient.unit]}</span><span className={`mt-1 inline-block rounded-lg px-2 py-1 text-xs ${color}`}>{status}</span></span>
            </summary>
            <div className="mb-3 space-y-4 rounded-lg border border-line bg-canvas p-3">
              {balance && <form action={manageInventory} className="grid gap-3 sm:grid-cols-2">
                <input type="hidden" name="scope" value={scope} /><input type="hidden" name="operation" value="movement" /><input type="hidden" name="ingredientId" value={ingredient.id} /><input type="hidden" name="requestId" value={randomUUID()} />
                <label className="block text-xs text-muted">Tipo<select name="kind" className={inputStyle}><option value="ENTRY">Entrada</option><option value="EXIT">Salida</option><option value="WASTE">Merma</option></select></label>
                <label className="block text-xs text-muted">Cantidad ({unitLabel[ingredient.unit]})<input name="quantity" type="number" min={ingredient.unit === "UNIT" ? "1" : "0.001"} step={ingredient.unit === "UNIT" ? "1" : "0.001"} required className={inputStyle} /></label>
                <label className="block text-xs text-muted sm:col-span-2">Motivo<textarea name="reason" required minLength={3} maxLength={500} rows={2} placeholder="Compra, consumo manual o desperdicio..." className={inputStyle} /></label>
                <div className="sm:col-span-2"><button type="submit" className={buttonStyle}>Registrar movimiento</button></div>
              </form>}
              <form action={manageInventory} className="flex flex-wrap items-end gap-3">
                <input type="hidden" name="scope" value={scope} /><input type="hidden" name="operation" value="configure" /><input type="hidden" name="ingredientId" value={ingredient.id} />
                <label className="min-w-0 flex-1 text-xs text-muted">Stock mínimo<input name="minimum" type="number" min="0" step={ingredient.unit === "UNIT" ? "1" : "0.001"} required defaultValue={balance?.minimum.toString() ?? "0"} className={inputStyle} /></label>
                <button type="submit" className="rounded-lg border border-line bg-surface px-4 py-2 text-sm font-semibold text-brand">{balance ? "Guardar mínimo" : "Habilitar en sucursal"}</button>
              </form>
            </div>
          </details>;
        })}
        {!ingredients.length && <p className="py-5 text-sm text-muted">Crea tu primer ingrediente para iniciar el control de inventario.</p>}
      </div>
    </section>
    <section className="reference-card p-4">
      <h2 className="font-semibold">Últimos movimientos</h2>
      <div className="mt-3 divide-y divide-line">{movements.map((movement) => <article key={movement.id} className="flex flex-wrap items-start justify-between gap-3 py-3"><div><h3 className="text-sm font-semibold">{movement.balance.ingredient.name} · {movementLabel[movement.kind]}</h3><p className="mt-1 text-xs text-muted">{movement.reason} · {movement.membership.user.name}</p><p className="mt-1 text-xs text-muted">{movement.createdAt.toLocaleString("es-CO", { timeZone: context.organization.timeZone })}</p></div><div className="text-right"><p className={movement.kind === "ENTRY" ? "font-semibold text-success" : "font-semibold text-danger"}>{movement.kind === "ENTRY" ? "+" : "−"}{number.format(Number(movement.quantity))} {unitLabel[movement.balance.ingredient.unit]}</p><p className="text-xs text-muted">Saldo: {number.format(Number(movement.balanceAfter))}</p></div></article>)}
      {!movements.length && <p className="py-3 text-sm text-muted">Aún no hay movimientos registrados.</p>}</div>
    </section>
    <p className="mt-3 text-xs text-muted">Las ventas todavía no descuentan ingredientes automáticamente. Las recetas y el consumo asociado a cocina se incorporarán en la siguiente etapa.</p>
  </ModulePage>;
}
