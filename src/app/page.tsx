const modules = [
  {
    number: "01",
    title: "Punto de venta",
    description: "Agiliza la toma de pedidos y conecta cada canal de venta.",
    label: "Ventas",
  },
  {
    number: "02",
    title: "Operación de cocina",
    description: "Organiza comandas y supervisa el avance de cada preparación.",
    label: "Operación",
  },
  {
    number: "03",
    title: "Inventario",
    description: "Controla ingredientes, recetas y movimientos de existencias.",
    label: "Control",
  },
  {
    number: "04",
    title: "Administración",
    description: "Gestiona sucursales, equipos y los indicadores del negocio.",
    label: "Gestión",
  },
];

const workflow = [
  { title: "Pedido recibido", description: "Punto de venta", status: "Confirmado", style: "bg-info-soft text-info" },
  { title: "Preparación", description: "Estación de cocina", status: "En curso", style: "bg-brand-soft text-brand" },
  { title: "Cobro", description: "Caja y pagos", status: "Pendiente", style: "bg-warning-soft text-warning" },
  { title: "Cierre de operación", description: "Reporte de ventas", status: "Ejemplo de cierre", style: "bg-success-soft text-success" },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-canvas text-ink">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-surface focus:p-4"
      >
        Saltar al contenido
      </a>
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-5 md:px-12">
          <a className="flex items-center gap-3 font-bold" href="/">
            <span className="grid size-11 place-items-center rounded-xl bg-ink text-lg text-white" aria-hidden="true">
              R
            </span>
            <span>Restaurant <span className="text-brand">ERP</span></span>
          </a>
          <nav aria-label="Navegación principal">
            <a className="text-sm font-semibold text-muted hover:text-brand" href="#modulos">
              Módulos
            </a>
          </nav>
        </div>
      </header>
      <main id="contenido" className="mx-auto max-w-7xl px-6 md:px-12">
        <section className="grid items-center gap-12 py-16 lg:grid-cols-2 lg:py-24">
          <div>
            <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-2 text-xs font-semibold uppercase tracking-wide text-brand">
              <span aria-hidden="true" className="size-2 rounded-full bg-brand" />
              Tecnología para la gastronomía
            </p>
            <h1 className="max-w-2xl text-5xl font-bold leading-tight tracking-tight md:text-6xl">
              Gestiona mejor.
              <span className="block text-brand">Sirve mejor.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
              Un sistema diseñado para conectar ventas, cocina, inventario y
              administración, desde un único espacio de trabajo.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <a className="rounded-lg bg-brand px-6 py-4 font-semibold text-white transition-colors hover:bg-brand-hover" href="#modulos">
                Explorar el sistema
              </a>
              <span className="text-sm text-muted">Producto en desarrollo</span>
            </div>
            <p className="mt-10 border-t border-line pt-5 text-sm font-semibold text-muted">
              Restaurantes · Cafeterías · Negocios gastronómicos
            </p>
          </div>
          <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-xl shadow-slate-900/5">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-ink px-6 py-5 text-white">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-300">Flujo operativo</p>
                <h2 className="mt-1 text-xl font-bold">Del pedido a la gestión</h2>
              </div>
              <span className="rounded-full border border-white/30 px-3 py-1 text-xs">Concepto</span>
            </div>
            <div className="p-5 md:p-7">
              <p className="mb-5 text-sm leading-relaxed text-muted">
                Ejemplo ilustrativo del flujo previsto. Los módulos aún no son operativos.
              </p>
              <ol className="space-y-3">
                {workflow.map((step, index) => (
                  <li key={step.title} className="flex flex-wrap items-center gap-3 rounded-xl border border-line p-4">
                    <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-canvas text-sm font-bold text-ink" aria-hidden="true">
                      0{index + 1}
                    </span>
                    <div className="min-w-28 flex-1">
                      <p className="font-semibold">{step.title}</p>
                      <p className="mt-1 text-xs text-muted">{step.description}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${step.style}`}>
                      {step.status}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>
        <section className="border-t border-line py-16" id="modulos">
          <p className="text-xs font-bold uppercase tracking-widest text-brand">Alcance previsto</p>
          <h2 className="mt-3 text-3xl font-bold">Un sistema. Toda la operación.</h2>
          <p className="mt-3 max-w-2xl text-muted">Módulos diseñados alrededor de las necesidades de cada equipo.</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {modules.map((module) => (
              <article key={module.number} className="rounded-xl border border-line bg-surface p-6">
                <div className="flex items-center justify-between gap-2">
                  <span className="grid size-11 place-items-center rounded-lg bg-brand-soft text-sm font-bold text-brand">{module.number}</span>
                  <span className="text-xs font-semibold text-muted">{module.label}</span>
                </div>
                <h3 className="mt-5 text-xl font-bold">{module.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted">{module.description}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
      <footer className="bg-ink text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-6 py-7 text-sm md:px-12">
          <span className="font-semibold">Restaurant ERP</span>
          <span className="text-slate-300">EL IMPERIO — Los Reyes del Software</span>
        </div>
      </footer>
    </div>
  );
}
