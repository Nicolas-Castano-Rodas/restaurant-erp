import { buttonStyle, FormFeedback, inputStyle, ModulePage } from "@/components/workspace/module-page";
import { EditIcon, TableIcon } from "@/components/workspace/operation-icons";
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
      <label className="block text-xs font-medium text-muted">Nombre de mesa
        <input name="name" required maxLength={120} defaultValue={table?.name} placeholder="Mesa 01" className={inputStyle} />
      </label>
      <label className="block text-xs font-medium text-muted">Capacidad
        <input name="capacity" type="number" min={1} max={100} required defaultValue={table?.capacity ?? 4} className={inputStyle} />
      </label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-success" name="active" defaultChecked={table?.active ?? true} /> Habilitada</label>
      <button type="submit" className={buttonStyle}>{table ? "Guardar cambios" : "Crear mesa"}</button>
    </form>
  );
}

export default async function TablesPage({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string }> }) {
  const context = await requireWorkspace("orders.manage");
  const tables = await listTables(getPrisma(), context.organization.id, context.branch.id);
  const scope = `${context.organization.id}:${context.branch.id}`;
  const feedback = await searchParams;
  const enabled = tables.filter((table) => table.active);
  return (
    <ModulePage title="Distribución de mesas" subtitle={context.branch.name} showEyebrow={false}>
      <FormFeedback {...feedback} />
      <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {[["Mesas registradas", tables.length], ["Habilitadas", enabled.length], ["Capacidad habilitada", enabled.reduce((sum, table) => sum + table.capacity, 0)]].map(([label, value]) => (
          <section key={label} className="reference-card p-4">
            <h2 className="text-sm font-normal text-muted">{label}</h2>
            <p className="mt-1 text-3xl font-semibold tabular-nums">{value}</p>
          </section>
        ))}
      </div>
      <div className="grid grid-cols-1 items-start gap-2 min-[400px]:grid-cols-2 md:grid-cols-3">
        {tables.map((table) => (
          <details key={table.id} className="reference-card reference-disclosure group">
            <summary className="relative flex min-h-48 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl p-4 text-center">
              <span className="absolute right-3 top-3 text-muted"><span className="sr-only">Editar {table.name}</span><EditIcon /></span>
              <TableIcon name={table.name} capacity={table.capacity} active={table.active} />
              <span className="text-base font-bold">{table.name}</span>
              <span className="text-sm text-muted">{table.capacity} personas</span>
              <span className={table.active ? "rounded-lg bg-success-soft px-2 py-1 text-xs text-success" : "rounded-lg bg-neutral-soft px-2 py-1 text-xs text-neutral-status"}>{table.active ? "Habilitada" : "Inactiva"}</span>
            </summary>
            <div className="border-t border-line p-4"><TableForm scope={scope} table={table} /></div>
          </details>
        ))}
      </div>
      {!tables.length && <p className="reference-card p-5 text-sm text-muted">Todavía no hay mesas en esta sucursal. Registra la primera mesa para comenzar.</p>}
      <details className="reference-card reference-disclosure mt-3">
        <summary className="flex cursor-pointer items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold text-brand">
          <span>+ Nueva mesa</span><span aria-hidden="true" className="text-muted">⌄</span>
        </summary>
        <div className="border-t border-line p-4"><TableForm scope={scope} /></div>
      </details>
      <p className="mt-3 text-xs text-muted">El estado indica habilitación administrativa, no ocupación en tiempo real. Selecciona una mesa para editarla.</p>
    </ModulePage>
  );
}
