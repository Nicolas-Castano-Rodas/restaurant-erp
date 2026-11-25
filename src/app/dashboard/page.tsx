import Link from "next/link";
import { redirect } from "next/navigation";
import { changeContext, logout } from "@/modules/auth/actions";
import { currentSession } from "@/modules/auth/request";
import { hasPermission } from "@/modules/auth/service";

const modules: { name: string; detail: string; permission: string; href?: string }[] = [
  { name: "Mesas", detail: "Distribución y capacidad", permission: "orders.manage", href: "/dashboard/tables" },
  { name: "Punto de venta", detail: "Pedidos y mesas", permission: "orders.manage", href: "/dashboard/pos" },
  { name: "Pedidos", detail: "Historial de pedidos", permission: "orders.manage", href: "/dashboard/orders" },
  { name: "Clientes", detail: "Registro e historial de consumo", permission: "orders.manage", href: "/dashboard/customers" },
  { name: "Domicilios", detail: "Repartidores y seguimiento de entregas", permission: "orders.manage", href: "/dashboard/deliveries" },
  { name: "Cocina", detail: "Comandas y preparación", permission: "kitchen.manage", href: "/dashboard/kitchen" },
  { name: "Inventario", detail: "Ingredientes y existencias", permission: "inventory.manage", href: "/dashboard/inventory" },
  { name: "Recetas", detail: "Ingredientes y costos de producción", permission: "inventory.manage", href: "/dashboard/recipes" },
  { name: "Compras", detail: "Proveedores y recepción de mercancía", permission: "inventory.manage", href: "/dashboard/purchases" },
  { name: "Caja", detail: "Cobros y turnos", permission: "cash.manage", href: "/dashboard/cash" },
  { name: "Catálogo", detail: "Productos y precios", permission: "catalog.manage", href: "/dashboard/catalog" },
  { name: "Analítica", detail: "Ventas, indicadores y costos registrados", permission: "reports.read", href: "/dashboard/analytics" },
  { name: "Reportes", detail: "Exportaciones de ventas, inventario, compras y caja", permission: "reports.read", href: "/dashboard/reports" },
  { name: "Administración", detail: "Organización y equipo", permission: "team.manage" },
];

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const session = await currentSession();
  if (!session) redirect("/login");
  const { error } = await searchParams;
  const { user, memberships, context } = session;
  const visibleModules = modules.filter((module) => hasPermission(context, module.permission));
  const options = memberships.flatMap((membership) => membership.branches.map(({ branch }) => ({
    value: `${membership.id}:${branch.id}`,
    label: `${membership.organization.name} · ${branch.name}`,
  })));
  return (
    <div className="min-h-screen bg-canvas lg:grid lg:grid-cols-[250px_1fr]">
      <aside className="bg-ink p-6 text-white">
        <Link href="/" className="flex items-center gap-3 font-bold">
          <span className="grid size-10 place-items-center rounded-lg bg-white text-ink" aria-hidden="true">R</span>
          Restaurant ERP
        </Link>
        <nav aria-label="Menú administrativo" className="mt-10">
          <Link href="/dashboard" aria-current="page" className="block rounded-lg bg-white/15 px-4 py-3 text-sm font-semibold">Resumen</Link>
          <p className="mb-3 mt-8 text-xs font-semibold uppercase tracking-widest text-slate-300">Módulos</p>
          {visibleModules.map((module) => (
            module.href ? <Link key={module.name} href={module.href} className="block rounded-lg px-4 py-2 text-sm text-white hover:bg-white/10">{module.name}</Link> : <p key={module.name} className="px-4 py-2 text-sm text-slate-300">{module.name}</p>
          ))}
        </nav>
        <form action={logout} className="mt-8">
          <button type="submit" className="w-full rounded-lg border border-white/30 px-4 py-3 text-left text-sm font-semibold hover:bg-white/10">Cerrar sesión</button>
        </form>
      </aside>
      <main className="min-w-0 p-6 md:p-10">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-brand">Espacio de trabajo</p>
            <h1 className="mt-2 text-3xl font-bold">Hola, {user.name}</h1>
            <p className="mt-2 text-sm text-muted">{context ? `${context.organization.name} · ${context.branch.name}` : "Selecciona una organización y una sucursal."}</p>
          </div>
          {context && <span className="rounded-full bg-success-soft px-4 py-2 text-sm font-semibold text-success">{context.role}</span>}
        </header>
        <section className="mt-6 rounded-xl border border-line bg-surface p-5">
          <h2 className="text-lg font-bold">Organización y sucursal</h2>
          {error === "permission" && <p role="alert" className="mt-3 text-sm text-danger">Selecciona una sucursal autorizada y verifica tus permisos.</p>}
          {error === "context" && <p role="alert" className="mt-3 text-sm text-danger">No tienes acceso a la selección solicitada.</p>}
          {options.length ? (
            <form action={changeContext} className="mt-4 flex flex-wrap items-end gap-3">
              <div className="min-w-0 flex-1">
                <label htmlFor="context" className="mb-2 block text-sm font-semibold">Seleccionar espacio de trabajo</label>
                <select id="context" name="context" required defaultValue={context ? `${context.membershipId}:${context.branch.id}` : ""} className="w-full rounded-lg border border-line bg-surface p-3">
                  <option value="" disabled>Seleccionar</option>
                  {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </div>
              <button type="submit" className="rounded-lg bg-brand px-5 py-3 font-semibold text-white hover:bg-brand-hover">Aplicar</button>
            </form>
          ) : <p className="mt-3 text-sm text-muted">No tienes sucursales asignadas. Contacta con el administrador.</p>}
        </section>
        {context && (
          <section className="mt-8">
            <h2 className="text-xl font-bold">Módulos de tu espacio de trabajo</h2>
            <p className="mt-2 text-sm text-muted">Accede a los módulos habilitados según tus permisos.</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {visibleModules.map((module) => (
                <article key={module.name} className="rounded-xl border border-line bg-surface p-5">
                  <span className="text-xs font-semibold text-brand">{module.href ? "Disponible" : "Próximamente"}</span>
                  <h3 className="mt-3 text-lg font-bold">{module.name}</h3>
                  <p className="mt-2 text-sm text-muted">{module.detail}</p>
                  {module.href && <Link href={module.href} className="mt-4 inline-block text-sm font-semibold text-brand hover:underline">Abrir módulo →</Link>}
                </article>
              ))}
            </div>
            {!visibleModules.length && <p className="mt-4 text-sm text-muted">Tu rol no tiene módulos asignados.</p>}
          </section>
        )}
      </main>
    </div>
  );
}
