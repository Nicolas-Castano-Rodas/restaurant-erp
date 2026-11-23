import { buttonStyle, FormFeedback, inputStyle, ModulePage } from "@/components/workspace/module-page";
import { EditIcon, FoodIcon } from "@/components/workspace/operation-icons";
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
      <label className="block text-xs font-medium text-muted">Nombre de categoría
        <input name="name" required maxLength={120} defaultValue={category?.name} className={inputStyle} />
      </label>
      <label className="flex items-center gap-2 text-sm text-ink"><input type="checkbox" className="accent-success" name="active" defaultChecked={category?.active ?? true} /> Activa</label>
      <button className={buttonStyle} type="submit">{category ? "Guardar categoría" : "Crear categoría"}</button>
    </form>
  );
}

function ProductForm({ scope, categories, categoryId, product }: { scope: string; categories: Category[]; categoryId?: string; product?: Product }) {
  return (
    <form action={saveProduct} className="space-y-3">
      <input type="hidden" name="scope" value={scope} />
      {product && <input type="hidden" name="id" value={product.id} />}
      <label className="block text-xs font-medium text-muted">Categoría
        <select required name="categoryId" defaultValue={categoryId ?? ""} className={inputStyle}>
          <option value="" disabled>Seleccionar</option>
          {categories.map((category) => <option key={category.id} value={category.id}>{category.name}{category.active ? "" : " (inactiva)"}</option>)}
        </select>
      </label>
      <label className="block text-xs font-medium text-muted">Nombre del producto
        <input name="name" required maxLength={120} defaultValue={product?.name} className={inputStyle} />
      </label>
      <label className="block text-xs font-medium text-muted">Precio base
        <input name="price" type="number" min="0" max="9999999999.99" step="0.01" required defaultValue={product?.price.toString()} className={inputStyle} />
      </label>
      <details className="rounded-lg text-sm">
        <summary className="cursor-pointer text-xs font-medium text-muted">Descripción y disponibilidad</summary>
        <div className="mt-3 space-y-3">
          <label className="block text-xs font-medium text-muted">Descripción
            <textarea name="description" maxLength={500} defaultValue={product?.description ?? ""} className={inputStyle} rows={2} />
          </label>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm text-ink"><input type="checkbox" className="accent-success" name="active" defaultChecked={product?.active ?? true} /> Activo</label>
            <label className="flex items-center gap-2 text-sm text-ink"><input type="checkbox" className="accent-success" name="available" defaultChecked={product?.available ?? true} /> Disponible</label>
          </div>
        </div>
      </details>
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
      <label className="block text-xs font-medium text-muted">Variante
        <input name="name" required maxLength={120} defaultValue={variant?.name} placeholder="Grande" className={inputStyle} />
      </label>
      <label className="block text-xs font-medium text-muted">Precio
        <input name="price" type="number" min="0" max="9999999999.99" step="0.01" required defaultValue={variant?.price.toString()} className={inputStyle} />
      </label>
      <label className="flex items-center gap-2 text-sm text-ink"><input type="checkbox" className="accent-success" name="active" defaultChecked={variant?.active ?? true} /> Activa</label>
      <button className={buttonStyle} type="submit">{variant ? "Guardar variante" : "Agregar variante"}</button>
    </form>
  );
}

export default async function CatalogPage({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string }> }) {
  const context = await requireWorkspace("catalog.manage");
  const scope = context.organization.id;
  const categories = await listCatalog(getPrisma(), scope);
  const feedback = await searchParams;
  const format = new Intl.NumberFormat("es-CO", { style: "currency", currency: context.organization.currency, minimumFractionDigits: 0, maximumFractionDigits: 2 });
  return (
    <ModulePage title="Catálogo" subtitle="Administración de productos, categorías y precios.">
      <FormFeedback {...feedback} />
      <div className="mb-3 grid gap-2 sm:grid-cols-2">
        <section className="reference-card p-3 sm:p-4">
          <h2 className="mb-4 text-base font-semibold">Nueva categoría</h2>
          <CategoryForm scope={scope} />
        </section>
        <section className="reference-card p-3 sm:p-4">
          <h2 className="mb-3 text-base font-semibold">Nuevo producto</h2>
          {categories.length ? <ProductForm scope={scope} categories={categories} categoryId={categories.find((category) => category.active)?.id ?? categories[0]?.id} /> : <p className="text-sm text-muted">Crea una categoría primero.</p>}
        </section>
      </div>
      <div className="space-y-3">
        {categories.map((category) => (
          <section key={category.id} className="reference-card p-3 sm:p-4">
            <details className="reference-disclosure group">
              <summary className="flex cursor-pointer items-center justify-between gap-2 rounded-md py-1">
                <span className="font-semibold">{category.name}{!category.active && <span className="ml-2 rounded-lg bg-neutral-soft px-2 py-1 text-xs text-neutral-status">Inactiva</span>}</span>
                <span className="flex items-center gap-2 text-muted"><span className="sr-only">Editar categoría {category.name}</span><EditIcon /></span>
              </summary>
              <div className="my-3 rounded-lg border border-line p-3"><CategoryForm scope={scope} category={category} /></div>
            </details>
            <div className="mt-2 divide-y divide-line">
              {category.products.map((product) => {
                const available = product.active && product.available && category.active;
                return (
                  <details key={product.id} className="reference-disclosure group">
                    <summary className="flex cursor-pointer items-center gap-2 rounded-md py-4 sm:gap-3">
                      <FoodIcon />
                      <span className="min-w-0 flex-1">
                        <span className="block break-words text-sm font-semibold">{product.name}</span>
                        <span className={available ? "mt-1 block text-xs text-success" : "mt-1 block text-xs text-neutral-status"}>{available ? "Disponible" : "No disponible"}</span>
                      </span>
                      <span className="shrink-0 text-right text-sm font-semibold tabular-nums">{format.format(Number(product.price))}</span>
                      <span className="shrink-0 text-muted"><span className="sr-only">Editar producto {product.name}</span><EditIcon /></span>
                    </summary>
                    <div className="mb-4 space-y-4 rounded-lg border border-line bg-canvas p-4">
                      <h3 className="text-sm font-semibold">Editar producto</h3>
                      <ProductForm scope={scope} categories={categories} categoryId={category.id} product={product} />
                      <div className="border-t border-line pt-3">
                        <h4 className="text-sm font-semibold">Variantes</h4>
                        {product.variants.map((variant) => <details key={variant.id} className="mt-3"><summary className="cursor-pointer text-sm">{variant.name} · {format.format(Number(variant.price))}{variant.active ? "" : " · Inactiva"}</summary><div className="mt-3"><VariantForm scope={scope} productId={product.id} variant={variant} /></div></details>)}
                        <details className="mt-3"><summary className="cursor-pointer text-sm font-semibold text-brand">Nueva variante</summary><div className="mt-3"><VariantForm scope={scope} productId={product.id} /></div></details>
                      </div>
                    </div>
                  </details>
                );
              })}
              {!category.products.length && <p className="py-3 text-sm text-muted">Sin productos.</p>}
            </div>
          </section>
        ))}
        {!categories.length && <p className="reference-card p-4 text-sm text-muted">Tu catálogo aún está vacío. Crea una categoría para comenzar.</p>}
      </div>
      <p className="mt-3 text-xs text-muted">{context.organization.name} · Precios en {context.organization.currency}</p>
    </ModulePage>
  );
}
