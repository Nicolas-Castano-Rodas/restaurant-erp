import Link from "next/link";
import { randomUUID } from "node:crypto";
import { ModulePage } from "@/components/workspace/module-page";
import { getPrisma } from "@/lib/prisma";
import { requireWorkspace } from "@/modules/auth/workspace";
import { listCatalog, listTables } from "@/modules/catalog/service";
import { PosTerminal } from "@/modules/orders/pos-terminal";

export default async function PosPage() {
  const context = await requireWorkspace("orders.manage");
  const db = getPrisma();
  const [categories, tables] = await Promise.all([
    listCatalog(db, context.organization.id, true),
    listTables(db, context.organization.id, context.branch.id),
  ]);
  const products = categories.flatMap((category) => category.products.map((product) => ({
    id: product.id, category: category.name, name: product.name, description: product.description,
    price: product.price.toFixed(2),
    variants: product.variants.map((variant) => ({ id: variant.id, name: variant.name, price: variant.price.toFixed(2) })),
  })));
  return (
    <ModulePage title="Punto de venta" subtitle={`${context.organization.name} · ${context.branch.name}`}>
      <div className="mb-3 flex flex-wrap gap-4 text-sm font-semibold text-brand">
        <Link href="/dashboard/orders" className="hover:underline">Consultar pedidos →</Link>
        <Link href="/dashboard/tables" className="hover:underline">Ver mesas →</Link>
      </div>
      <PosTerminal key={`${context.organization.id}:${context.branch.id}`} products={products} tables={tables.filter((table) => table.active && !table.occupied)} currency={context.organization.currency} scope={`${context.organization.id}:${context.branch.id}`} initialRequestId={randomUUID()} />
    </ModulePage>
  );
}
