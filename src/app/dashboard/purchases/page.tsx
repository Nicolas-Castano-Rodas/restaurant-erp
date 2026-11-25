import { randomUUID } from "node:crypto";
import Link from "next/link";
import { ModulePage, inputStyle, buttonStyle } from "@/components/workspace/module-page";
import { getPrisma } from "@/lib/prisma";
import { requireWorkspace } from "@/modules/auth/workspace";
import { managePurchase } from "@/modules/purchases/actions";
import { purchaseOverview } from "@/modules/purchases/service";

const units = { KG: "kg", G: "g", L: "L", ML: "ml", UNIT: "ud." };
const quantity = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 3 });

type Supplier = { id: string; name: string; taxId: string | null; phone: string | null; email: string | null; active: boolean };
function SupplierForm({ scope, supplier }: { scope: string; supplier?: Supplier }) {
  return <form action={managePurchase} className="grid gap-3 sm:grid-cols-2">
    <input type="hidden" name="scope" value={scope} /><input type="hidden" name="operation" value="supplier" /><input type="hidden" name="supplierId" value={supplier?.id ?? ""} />
    <label className="block text-sm text-muted">Nombre<input name="name" required maxLength={120} defaultValue={supplier?.name} className={inputStyle} /></label>
    <label className="block text-sm text-muted">NIT o identificación<input name="taxId" maxLength={40} defaultValue={supplier?.taxId ?? ""} className={inputStyle} /></label>
    <label className="block text-sm text-muted">Teléfono<input name="phone" type="tel" maxLength={40} defaultValue={supplier?.phone ?? ""} className={inputStyle} /></label>
    <label className="block text-sm text-muted">Correo<input name="email" type="email" maxLength={254} defaultValue={supplier?.email ?? ""} className={inputStyle} /></label>
    <label className="flex items-center gap-2 text-sm"><input name="active" type="checkbox" defaultChecked={supplier?.active ?? true} className="accent-success" /> Activo</label>
    <div><button type="submit" className={buttonStyle}>{supplier ? "Guardar proveedor" : "Registrar proveedor"}</button></div>
  </form>;
}

export default async function PurchasesPage({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string; purchase?: string }> }) {
  const context = await requireWorkspace("inventory.manage");
  const { suppliers, ingredients, drafts, history } = await purchaseOverview(getPrisma(), context.organization.id, context.branch.id);
  const feedback = await searchParams;
  const scope = `${context.organization.id}:${context.branch.id}`;
  const active = suppliers.filter((supplier) => supplier.active);
  const money = (value: number, currency = context.organization.currency) => new Intl.NumberFormat("es-CO", { style: "currency", currency, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(value);
  return <ModulePage title="Compras y proveedores" subtitle={`${context.organization.name} · ${context.branch.name}`}>
    {feedback.error && <p role="alert" className="mb-3 rounded-lg bg-danger-soft p-3 text-sm text-danger">{feedback.error}</p>}
    {feedback.saved && <output className="mb-3 block rounded-lg bg-success-soft p-3 text-sm text-success">Operación guardada correctamente.</output>}
    <div className="mb-3 grid grid-cols-3 gap-2">{[{ name: "Proveedores activos", value: active.length }, { name: "Compras pendientes", value: drafts.length }, { name: "Recepciones recientes", value: history.filter((item) => item.status === "RECEIVED").length }].map((item) => <section key={item.name} className="reference-card p-3"><h2 className="text-xs text-muted">{item.name}</h2><p className="mt-2 text-2xl font-semibold tabular-nums">{item.value}</p></section>)}</div>
    <div className="mb-3 grid items-start gap-3 lg:grid-cols-2">
      <section className="reference-card p-4"><h2 className="mb-3 font-semibold">Nuevo proveedor</h2><SupplierForm scope={scope} /></section>
      <section className="reference-card p-4"><h2 className="mb-3 font-semibold">Nueva orden de compra</h2>
        {active.length ? <form action={managePurchase} className="space-y-3">
          <input type="hidden" name="scope" value={scope} /><input type="hidden" name="operation" value="create" /><input type="hidden" name="requestId" value={randomUUID()} />
          <label className="block text-sm text-muted">Proveedor<select name="supplierId" required className={inputStyle}>{active.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></label>
          <label className="block text-sm text-muted">Referencia de factura o remisión (opcional)<input name="reference" maxLength={100} className={inputStyle} /></label>
          <label className="block text-sm text-muted">Observaciones<textarea name="note" maxLength={500} rows={2} className={inputStyle} /></label>
          <button type="submit" className={buttonStyle}>Crear orden de compra</button>
        </form> : <p className="text-sm text-muted">Registra primero un proveedor activo.</p>}
      </section>
    </div>
    <section className="reference-card mb-3 p-4"><h2 className="font-semibold">Compras pendientes</h2><p className="mt-1 text-xs text-muted">Las existencias solo cambian al confirmar la recepción completa.</p>
      <div className="mt-3 divide-y divide-line">{drafts.map((purchase) => <details key={purchase.id} open={feedback.purchase === purchase.id ? true : undefined} className="reference-disclosure">
        <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 rounded-lg py-4"><span><span className="block font-semibold">{purchase.supplierName} · #{purchase.id.slice(0, 8).toUpperCase()}</span><span className="mt-1 block text-xs text-muted">{purchase.reference || "Sin referencia"} · {purchase.lines.length} ingredientes</span></span><span className="text-right"><span className="block font-semibold">{money(Number(purchase.total), purchase.currency)}</span><span className="text-xs text-warning">Pendiente</span></span></summary>
        <div className="mb-3 space-y-3 rounded-xl border border-line bg-canvas p-3">
          {purchase.note && <p className="text-sm text-muted">{purchase.note}</p>}
          {purchase.lines.map((line) => <div key={line.id} className="reference-card flex flex-wrap items-center justify-between gap-3 p-3"><div><p className="font-semibold text-sm">{line.ingredientName}</p><p className="text-xs text-muted">{quantity.format(Number(line.quantity))} {units[line.unit]} × {money(Number(line.unitCost), purchase.currency)}</p></div><span className="text-sm font-semibold">{money(Number(line.lineTotal), purchase.currency)}</span><form action={managePurchase}><input type="hidden" name="scope" value={scope} /><input type="hidden" name="operation" value="remove" /><input type="hidden" name="purchaseId" value={purchase.id} /><input type="hidden" name="lineId" value={line.id} /><button type="submit" className="text-xs font-semibold text-danger underline">Quitar</button></form></div>)}
          {ingredients.length ? <form action={managePurchase} className="reference-card grid gap-3 p-3 sm:grid-cols-2"><input type="hidden" name="scope" value={scope} /><input type="hidden" name="operation" value="line" /><input type="hidden" name="purchaseId" value={purchase.id} />
            <label className="block text-sm text-muted sm:col-span-2">Ingrediente<select name="ingredientId" className={inputStyle} required>{ingredients.map((ingredient) => <option key={ingredient.id} value={ingredient.id}>{ingredient.name} ({units[ingredient.unit]})</option>)}</select></label>
            <label className="block text-sm text-muted">Cantidad recibida prevista<input name="quantity" type="number" min="0.001" step="0.001" required className={inputStyle} /></label>
            <label className="block text-sm text-muted">Costo por unidad de medida<input name="unitCost" type="number" min="0" max="9999999999.99" step="0.01" required className={inputStyle} /></label>
            <div className="sm:col-span-2"><button type="submit" className={buttonStyle}>Agregar o actualizar ingrediente</button></div>
          </form> : <p className="text-sm text-muted">Crea ingredientes desde <Link href="/dashboard/inventory" className="font-semibold text-brand underline">Inventario</Link>.</p>}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3"><span className="font-semibold">Total de compra</span><span className="text-xl font-bold">{money(Number(purchase.total), purchase.currency)}</span></div>
          <form action={managePurchase} className="space-y-2"><input type="hidden" name="scope" value={scope} /><input type="hidden" name="operation" value="receive" /><input type="hidden" name="purchaseId" value={purchase.id} /><label className="flex items-start gap-2 text-xs text-muted"><input type="checkbox" required className="mt-1 accent-success" /> Confirmo que recibí todas las cantidades indicadas y comprobé sus costos.</label><button type="submit" disabled={!purchase.lines.length} className="min-h-12 w-full rounded-lg bg-success px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">Confirmar recepción e ingresar al inventario</button></form>
          <details><summary className="cursor-pointer text-sm text-danger">Cancelar compra pendiente</summary><form action={managePurchase} className="mt-2"><input type="hidden" name="scope" value={scope} /><input type="hidden" name="operation" value="cancel" /><input type="hidden" name="purchaseId" value={purchase.id} /><button type="submit" className="rounded-lg border border-danger px-3 py-2 text-sm font-semibold text-danger">Confirmar cancelación</button></form></details>
        </div>
      </details>)}{!drafts.length && <p className="py-3 text-sm text-muted">No hay compras pendientes.</p>}</div>
    </section>
    <section className="reference-card mb-3 p-4"><h2 className="font-semibold">Proveedores registrados</h2><div className="mt-3 divide-y divide-line">{suppliers.map((supplier) => <details key={supplier.id} className="reference-disclosure"><summary className="flex cursor-pointer items-center justify-between gap-3 py-3"><span className="font-semibold text-sm">{supplier.name}</span><span className={supplier.active ? "text-xs text-success" : "text-xs text-muted"}>{supplier.active ? "Activo" : "Inactivo"}</span></summary><div className="mb-3 rounded-lg border border-line p-3"><SupplierForm scope={scope} supplier={supplier} /></div></details>)}{!suppliers.length && <p className="text-sm text-muted">Sin proveedores.</p>}</div></section>
    <section className="reference-card p-4"><h2 className="font-semibold">Últimas compras cerradas</h2><div className="mt-3 divide-y divide-line">{history.map((purchase) => <details key={purchase.id} className="reference-disclosure"><summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3 py-4"><span><span className="block text-sm font-semibold">{purchase.supplierName} · #{purchase.id.slice(0, 8).toUpperCase()}</span><span className="text-xs text-muted">{purchase.closedAt?.toLocaleString("es-CO", { timeZone: context.organization.timeZone })} · {purchase.reference || "Sin referencia"}</span></span><span className="text-right"><span className="block font-semibold">{money(Number(purchase.total), purchase.currency)}</span><span className={purchase.status === "RECEIVED" ? "text-xs text-success" : "text-xs text-danger"}>{purchase.status === "RECEIVED" ? "Recibida" : "Cancelada"}</span></span></summary><div className="mb-3 space-y-2 rounded-lg bg-canvas p-3">{purchase.lines.map((line) => <div key={line.id} className="flex justify-between gap-3 text-sm"><span>{line.ingredientName} · {quantity.format(Number(line.quantity))} {units[line.unit]}</span><span>{money(Number(line.lineTotal), purchase.currency)}</span></div>)}</div></details>)}{!history.length && <p className="text-sm text-muted">Sin compras cerradas.</p>}</div></section>
    <p className="mt-3 text-xs text-muted">Cada recepción actualiza el costo unitario al último precio de compra. No es un promedio ponderado. No se registran pagos a proveedores, impuestos ni recepciones parciales en esta versión.</p>
  </ModulePage>;
}
