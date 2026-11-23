import { buttonStyle, FormFeedback, inputStyle, ModulePage } from "@/components/workspace/module-page";
import { getPrisma } from "@/lib/prisma";
import { requireWorkspace } from "@/modules/auth/workspace";
import { saveTable } from "@/modules/catalog/actions";
import { listTables } from "@/modules/catalog/service";

type Table = Awaited<ReturnType<typeof listTables>>[number];

function TableForm({ scope, table }: { scope: string; table?: Table }) {
  return (
    <form action={saveTable} className="space-y-3">
      <input type="hidden" name="scope" value={scope} />
      {table && <input type="hidden" name="id" value={table.id} />}
      <label className="block text-sm font-medium">Nombre de mesa
        <input name="name" required maxLength={120} defaultValue={table?.name} placeholder="Mesa 01" className={inputStyle} />
      </label>
      <label className="block text-sm font-medium">Capacidad
        <input name="capacity" type="number" min={1} max={100} required defaultValue={table?.capacity ?? 4} className={inputStyle} />
      </label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={table?.active ?? true} /> Habilitada</label>
      <button type="submit" className={buttonStyle}>{table ? "Guardar cambios" : "Crear mesa"}</button>
    </form>
  );
}

export default async function TablesPage({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string }> }) {
  const context = await requireWorkspace("orders.manage");
  const tables = await listTables(getPrisma(), context.organization.id, context.branch.id);
  const scope = `${context.organization.id}:${context.branch.id}`;
  const feedback = await searchParams;
  return (
    <ModulePage title="Mesas" subtitle={`${context.organization.name} · ${context.branch.name}`}>
      <FormFeedback {...feedback} />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {[["Mesas registradas", tables.length], ["Habilitadas", tables.filter((t) => t.active).length], ["Capacidad habilitada", tables.filter((t) => t.active).reduce((sum, t) => sum + t.capacity, 0)]].map(([label, value]) => (
          <section key={label} className="rounded-xl border border-line bg-surface p-5"><h2 className="text-sm text-muted">{label}</h2><p className="mt-2 text-3xl font-bold tabular-nums">{value}</p></section>
        ))}
      </div>
      <section className="mb-8 max-w-lg rounded-xl border border-line bg-surface p-6">
        <h2 className="mb-4 text-xl font-bold">Nueva mesa</h2>
        <TableForm scope={scope} />
      </section>
      <h2 className="mb-4 text-xl font-bold">Distribución de mesas</h2>
      <p className="mb-4 text-sm text-muted">El estado muestra habilitación administrativa, no ocupación en tiempo real.</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tables.map((table) => (
          <article key={table.id} className="rounded-xl border border-line bg-surface p-5">
            <div className="flex flex-wrap justify-between gap-2"><h3 className="text-lg font-bold">{table.name}</h3><span className={table.active ? "rounded-full bg-success-soft px-3 py-1 text-xs text-success" : "rounded-full bg-neutral-soft px-3 py-1 text-xs text-neutral-status"}>{table.active ? "Habilitada" : "Inactiva"}</span></div>
            <p className="mt-3 text-sm text-muted">{table.capacity} personas</p>
            <details className="mt-5"><summary className="cursor-pointer text-sm font-semibold text-brand">Editar mesa</summary><div className="mt-4"><TableForm scope={scope} table={table} /></div></details>
          </article>
        ))}
      </div>
      {!tables.length && <p className="rounded-xl border border-line bg-surface p-6 text-muted">Todavía no hay mesas en esta sucursal.</p>}
    </ModulePage>
  );
}
