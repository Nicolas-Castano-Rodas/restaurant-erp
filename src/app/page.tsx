const modules = [
  {
    number: "01",
    title: "Punto de venta",
    description: "Pedidos en mesa, para llevar y a domicilio.",
  },
  {
    number: "02",
    title: "Operación de cocina",
    description: "Comandas y seguimiento de preparación.",
  },
  {
    number: "03",
    title: "Inventario",
    description: "Ingredientes, recetas y movimientos de existencias.",
  },
  {
    number: "04",
    title: "Administración",
    description: "Sucursales, usuarios y análisis del negocio.",
  },
];

export default function Home() {
  return (
    <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-6 md:px-12">
      <header className="flex items-center justify-between border-b border-white/10 py-6">
        <a className="flex items-center gap-3 font-bold" href="/">
          <span className="grid size-10 place-items-center rounded-xl bg-lime-300 text-emerald-950">
            R
          </span>
          Restaurant ERP
        </a>
        <a className="text-sm text-emerald-100" href="#modulos">
          Módulos
        </a>
      </header>
      <main className="flex-1">
        <section className="grid items-center gap-12 py-20 lg:grid-cols-2 lg:py-28">
          <div>
            <p className="mb-6 text-xs font-bold uppercase tracking-widest text-lime-300">
              Plataforma en desarrollo
            </p>
            <h1 className="max-w-2xl text-5xl font-bold leading-tight tracking-tight md:text-7xl">
              Tu restaurante, en un solo sistema.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-emerald-100/75">
              Una plataforma diseñada para conectar ventas, cocina, inventario
              y administración de negocios gastronómicos.
            </p>
            <a
              className="mt-8 inline-block rounded-xl bg-lime-300 px-6 py-4 font-bold text-emerald-950"
              href="#modulos"
            >
              Explorar el alcance
            </a>
          </div>
          <div className="rounded-3xl border border-white/10 bg-emerald-950/60 p-6 md:p-9">
            <p className="text-xs font-bold uppercase tracking-widest text-lime-300">
              Visión del producto
            </p>
            <h2 className="mt-4 text-3xl font-bold">Operaciones conectadas</h2>
            <p className="mt-3 text-sm leading-relaxed text-emerald-100/75">
              Concepto inicial de los flujos previstos. No representa datos
              reales ni módulos operativos.
            </p>
            <ol className="mt-8 space-y-3">
              {["Tomar pedido", "Preparar en cocina", "Registrar pago", "Analizar resultados"].map(
                (step, index) => (
                  <li
                    className="flex items-center gap-4 rounded-xl border border-white/10 bg-black/20 p-4"
                    key={step}
                  >
                    <span className="text-sm font-bold text-lime-300">
                      0{index + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ),
              )}
            </ol>
          </div>
        </section>
        <section className="border-t border-white/10 py-16" id="modulos">
          <p className="text-xs font-bold uppercase tracking-widest text-lime-300">
            Alcance previsto
          </p>
          <h2 className="mt-3 text-3xl font-bold">Módulos del sistema</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {modules.map((module) => (
              <article
                className="rounded-2xl border border-white/10 p-6"
                key={module.number}
              >
                <p className="text-sm font-bold text-lime-300">{module.number}</p>
                <h3 className="mt-4 text-xl font-bold">{module.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-emerald-100/75">
                  {module.description}
                </p>
              </article>
            ))}
          </div>
        </section>
      </main>
      <footer className="border-t border-white/10 py-6 text-sm text-emerald-100/75">
        Restaurant ERP · EL IMPERIO — Los Reyes del Software
      </footer>
    </div>
  );
}
