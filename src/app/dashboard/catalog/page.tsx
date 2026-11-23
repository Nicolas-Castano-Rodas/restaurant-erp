import { buttonStyle, FormFeedback, inputStyle, ModulePage } from "@/components/workspace/module-page";
import { getPrisma } from "@/lib/prisma";
import { requireWorkspace } from "@/modules/auth/workspace";
import { saveCategory, saveProduct, saveVariant } from "@/modules/catalog/actions";
import { listCatalog } from "@/modules/catalog/service";

type Category = Awaited<ReturnType<typeof listCatalog>>[number];
type Product = Category["products"][number];
type Variant = Product["variants"][number];

function CategoryForm({ scope, category }: { scope: string; category?: Category }) {
  return (
    <form action={saveCategory} className="space-y-3">
      <input type="hidden" name="scope" value={scope} />
      {category && <input type="hidden" name="id" value={category.id} />}
      <label className="block text-sm font-medium">Nombre de categoría
        <input name="name" required maxLength={120} defaultValue={category?.name} className={inputStyle} />
      </label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={category?.active ?? true} /> Activa</label>
      <button className={buttonStyle} type="submit">{category ? "Guardar categoría" : "Crear categoría"}</button>
    </form>
  );
}

function ProductForm({ scope, categories, categoryId, product }: { scope: string; categories: Category[]; categoryId?: string; product?: Product }) {
  return (
    <form action={saveProduct} className="space-y-3">
      <input type="hidden" name="scope" value={scope} />
      {product && <input type="hidden" name="id" value={product.id} />}
      <label className="block text-sm font-medium">Categoría
        <select required name="categoryId" defaultValue={categoryId ?? ""} className={inputStyle}>
          <option value="" disabled>Seleccionar</option>
          {categories.map((category) => <option key={category.id} value={category.id}>{category.name}{category.active ? "" : " (inactiva)"}</option>)}
        </select>
      </label>
      <label className="block text-sm font-medium">Nombre del producto
        <input name="name" required maxLength={120} defaultValue={product?.name} className={inputStyle} />
      </label>
      <label className="block text-sm font-medium">Descripción
        <textarea name="description" maxLength={500} defaultValue={product?.description ?? ""} className={inputStyle} rows={2} />
      </label>
      <label className="block text-sm font-medium">Precio base
        <input name="price" type="number" min="0" max="9999999999.99" step="0.01" required defaultValue={product?.price.toString()} className={inputStyle} />
      </label>
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={product?.active ?? true} /> Activo</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="available" defaultChecked={product?.available ?? true} /> Disponible</label>
      </div>
      <button className={buttonStyle} type="submit">{product ? "Guardar producto" : "Crear producto"}</button>
    </form>
  );
}

function VariantForm({ scope, productId, variant }: { scope: string; productId: string; variant?: Variant }) {
  return (
    <form action={saveVariant} className="grid items-end gap-3 sm:grid-cols-2">
      <input type="hidden" name="scope" value={scope} />
      <input type="hidden" name="productId" value={productId} />
      {variant && <input type="hidden" name="id" value={variant.id} />}
      <label className="block text-sm font-medium">Variante
        <input name="name" required maxLength={120} defaultValue={variant?.name} placeholder="Grande" className={inputStyle} />
      </label>
      <label className="block text-sm font-medium">Precio
        <input name="price" type="number" min="0" max="9999999999.99" step="0.01" required defaultValue={variant?.price.toString()} className={inputStyle} />
      </label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={variant?.active ?? true} /> Activa</label>
      <button className={buttonStyle} type="submit">{variant ? "Guardar variante" : "Agregar variante"}</button>
    </form>
  );
}

export default async function CatalogPage({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string }> }) {
  const context = await requireWorkspace("catalog.manage");
  const scope = context.organization.id;
  const categories = await listCatalog(getPrisma(), scope);
  const feedback = await searchParams;
  const format = new Intl.NumberFormat("es-CO", { style: "currency", currency: context.organization.currency });
  return (
    <ModulePage title="Catálogo" subtitle={`${context.organization.name} · Precios en ${context.organization.currency}`}>
      <FormFeedback {...feedback} />
      <div className="mb-8 grid gap-5 lg:grid-cols-2">
        <section className="rounded-xl border border-line bg-surface p-6">
          <h2 className="mb-4 text-xl font-bold">Nueva categoría</h2>
          <CategoryForm scope={scope} />
        </section>
        <section className="rounded-xl border border-line bg-surface p-6">
          <h2 className="mb-4 text-xl font-bold">Nuevo producto</h2>
          {categories.length ? <ProductForm scope={scope} categories={categories} /> : <p className="text-sm text-muted">Crea una categoría primero.</p>}
        </section>
      </div>
      <div className="space-y-6">
        {categories.map((category) => (
          <section key={category.id} className="rounded-xl border border-line bg-surface p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-bold">{category.name}</h2>
              <span className={category.active ? "rounded-full bg-success-soft px-3 py-1 text-sm text-success" : "rounded-full bg-neutral-soft px-3 py-1 text-sm text-neutral-status"}>{category.active ? "Activa" : "Inactiva"}</span>
            </div>
            <details className="mt-4 rounded-lg border border-line p-4">
              <summary className="cursor-pointer text-sm font-semibold text-brand">Editar categoría</summary>
              <div className="mt-4"><CategoryForm scope={scope} category={category} /></div>
            </details>
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              {category.products.map((product) => (
                <article key={product.id} className="rounded-xl border border-line p-4">
                  <div className="flex flex-wrap justify-between gap-2">
                    <h3 className="font-bold">{product.name}</h3>
                    <p className="font-bold tabular-nums">{format.format(Number(product.price))}</p>
                  </div>
                  <p className="mt-2 text-sm text-muted">{product.description || "Sin descripción"} · {product.active && product.available && category.active ? "Disponible" : "No disponible"}</p>
                  <details className="mt-4"><summary className="cursor-pointer text-sm font-semibold text-brand">Editar producto</summary><div className="mt-3"><ProductForm scope={scope} categories={categories} categoryId={category.id} product={product} /></div></details>
                  <div className="mt-4 border-t border-line pt-4">
                    <h4 className="text-sm font-bold">Variantes</h4>
                    {product.variants.map((variant) => <details key={variant.id} className="mt-3"><summary className="cursor-pointer text-sm">{variant.name} · {format.format(Number(variant.price))}{variant.active ? "" : " · Inactiva"}</summary><div className="mt-3"><VariantForm scope={scope} productId={product.id} variant={variant} /></div></details>)}
                    <details className="mt-4"><summary className="cursor-pointer text-sm font-semibold text-brand">Nueva variante</summary><div className="mt-3"><VariantForm scope={scope} productId={product.id} /></div></details>
                  </div>
                </article>
              ))}
              {!category.products.length && <p className="text-sm text-muted">Sin productos.</p>}
            </div>
          </section>
        ))}
        {!categories.length && <p className="rounded-xl border border-line bg-surface p-6 text-muted">Tu catálogo aún está vacío.</p>}
      </div>
    </ModulePage>
  );
}
