import Link from "next/link";
import { ModulePage, inputStyle, buttonStyle } from "@/components/workspace/module-page";
import { FoodIcon } from "@/components/workspace/operation-icons";
import { getPrisma } from "@/lib/prisma";
import { requireWorkspace } from "@/modules/auth/workspace";
import { manageRecipe } from "@/modules/recipes/actions";
import { estimateCost, recipeOverview } from "@/modules/recipes/service";
import { toMinor } from "@/modules/orders/money";

const units = { KG: "kg", G: "g", L: "L", ML: "ml", UNIT: "ud." };
const number = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 3 });

export default async function RecipesPage({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string }> }) {
  const context = await requireWorkspace("inventory.manage");
  const { products, ingredients } = await recipeOverview(getPrisma(), context.organization.id, context.branch.id);
  const { error, saved } = await searchParams;
  const scope = `${context.organization.id}:${context.branch.id}`;
  const money = new Intl.NumberFormat("es-CO", { style: "currency", currency: context.organization.currency, minimumFractionDigits: 0, maximumFractionDigits: 2 });
  const costs = new Map(ingredients.flatMap((ingredient) => {
    const cost = ingredient.balances[0]?.unitCost;
    return cost == null ? [] : [[ingredient.id, cost.toFixed(2)] as const];
  }));
  const names = new Map(ingredients.map((ingredient) => [ingredient.id, ingredient]));
  return <ModulePage title="Recetas y costos" subtitle={`${context.organization.name} · ${context.branch.name}`}>
    {error && <p role="alert" className="mb-3 rounded-lg bg-danger-soft p-3 text-sm text-danger">{error}</p>}
    {saved && <output className="mb-3 block rounded-lg bg-success-soft p-3 text-sm text-success">Receta actualizada.</output>}
    <div className="mb-3 flex flex-wrap items-center gap-3 text-sm font-semibold text-brand"><Link href="/dashboard/inventory" className="underline">Inventario y costos unitarios</Link><Link href="/dashboard/catalog" className="underline">Catálogo</Link></div>
    <section className="reference-card mb-3 p-4"><h2 className="font-semibold">Productos del catálogo</h2><p className="mt-2 text-sm text-muted">Define la cantidad por porción en la unidad registrada del ingrediente. Una variante con receta propia reemplaza toda la receta base; sin receta propia utiliza la base.</p></section>
    <div className="space-y-3">
      {products.map((product) => {
        const base = product.recipeLines.filter((line) => line.variantId === null);
        const targets = [{ id: null, name: "Receta base", price: product.price }, ...product.variants];
        return <section key={product.id} className="reference-card p-4">
          <div className="mb-3 flex items-center gap-3"><FoodIcon /><div><h2 className="font-semibold">{product.name}</h2><p className="text-xs text-muted">{money.format(Number(product.price))}</p></div></div>
          <div className="divide-y divide-line">
            {targets.map((target) => {
              const own = product.recipeLines.filter((line) => line.variantId === target.id);
              const inherited = target.id !== null && !own.length;
              const effective = inherited ? base : own;
              const cost = estimateCost(effective, costs);
              const margin = cost === null ? null : toMinor(target.price.toFixed(2)) - cost;
              return <details key={target.id ?? "base"} className="reference-disclosure py-2">
                <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 rounded-lg p-2"><span className="font-semibold text-sm">{target.name}</span><span className="text-xs text-muted">{effective.length ? `${effective.length} ingredientes${inherited ? " · Heredada" : ""}` : "Sin receta"} · {cost === null ? "Costo sin definir" : money.format(Number(cost) / 100)}</span></summary>
                <div className="mt-2 space-y-3 rounded-xl border border-line bg-canvas p-3">
                  <div className="grid gap-2 sm:grid-cols-2"><div className="reference-card p-3"><p className="text-xs text-muted">Costo estimado por porción</p><p className="mt-1 text-lg font-semibold">{cost === null ? "Sin definir" : money.format(Number(cost) / 100)}</p></div><div className="reference-card p-3"><p className="text-xs text-muted">Precio menos ingredientes</p><p className="mt-1 text-lg font-semibold">{margin === null ? "Sin definir" : money.format(Number(margin) / 100)}</p></div></div>
                  {inherited && <p className="text-xs text-muted">Usa la receta base. Al agregar el primer ingrediente propio, esta variante dejará de heredarla.</p>}
                  {effective.map((line) => {
                    const ingredient = names.get(line.ingredientId);
                    return <div key={line.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-surface p-3"><span className="text-sm font-medium">{ingredient?.name ?? "Ingrediente inactivo"} · {number.format(Number(line.quantity))} {ingredient ? units[ingredient.unit] : ""}</span>{!inherited && <form action={manageRecipe}><input type="hidden" name="scope" value={scope} /><input type="hidden" name="operation" value="remove" /><input type="hidden" name="id" value={line.id} /><button type="submit" className="text-xs font-semibold text-danger underline">Quitar</button></form>}</div>;
                  })}
                  {!effective.length && <p className="text-xs text-muted">Este producto no descuenta ingredientes automáticamente.</p>}
                  {ingredients.length > 0 && <form action={manageRecipe} className="reference-card space-y-3 p-3"><input type="hidden" name="scope" value={scope} /><input type="hidden" name="operation" value="save" /><input type="hidden" name="productId" value={product.id} /><input type="hidden" name="variantId" value={target.id ?? ""} /><label className="block text-xs text-muted">Ingrediente<select name="ingredientId" required className={inputStyle}>{ingredients.map((ingredient) => <option key={ingredient.id} value={ingredient.id}>{ingredient.name} ({units[ingredient.unit]})</option>)}</select></label><label className="block text-xs text-muted">Cantidad por porción (en la unidad del ingrediente)<input name="quantity" type="number" min="0.001" step="0.001" required className={inputStyle} /></label><button type="submit" className={buttonStyle}>Agregar o actualizar ingrediente</button></form>}
                </div>
              </details>;
            })}
          </div>
        </section>;
      })}
      {!products.length && <p className="reference-card p-4 text-sm text-muted">Crea productos en el catálogo para configurar sus recetas.</p>}
    </div>
    <p className="mt-3 text-xs text-muted">Los costos son estimaciones de ingredientes según los valores configurados en esta sucursal. No incluyen mano de obra, impuestos, servicios ni gastos indirectos. El consumo se registra al iniciar la preparación, usando la receta vigente en ese momento.</p>
  </ModulePage>;
}
