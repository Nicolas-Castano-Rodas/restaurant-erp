import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: {
      id: session.userId,
    },
    include: {
      organization: true,
      branch: true,
      role: true,
    },
  });

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Restaurant ERP</h1>

            <p className="text-sm text-slate-500">{user.organization.name}</p>
          </div>

          <div className="text-right">
            <p className="font-medium text-slate-900">{user.name}</p>

            <p className="text-sm text-slate-500">
              {user.role?.name ?? "Sin rol"}
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-slate-900">Dashboard</h2>

          <p className="mt-2 text-slate-500">
            Bienvenido al sistema de gestión de tu restaurante.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <DashboardCard
            title="Ventas"
            value="$0"
            description="Ventas de hoy"
          />

          <DashboardCard
            title="Pedidos"
            value="0"
            description="Pedidos de hoy"
          />

          <DashboardCard
            title="Productos"
            value="0"
            description="Productos activos"
          />

          <DashboardCard
            title="Inventario"
            value="$0"
            description="Valor del inventario"
          />
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">
              Organización
            </h3>

            <div className="mt-4 space-y-3 text-sm">
              <InfoRow label="Empresa" value={user.organization.name} />

              <InfoRow
                label="Sucursal"
                value={user.branch?.name ?? "Sin sucursal"}
              />

              <InfoRow label="Usuario" value={user.email} />

              <InfoRow label="Rol" value={user.role?.name ?? "Sin rol"} />
            </div>
          </section>

          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">
              Próximamente
            </h3>

            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <p>• Gestión de pedidos</p>
              <p>• Menú y productos</p>
              <p>• Mesas</p>
              <p>• Domicilios</p>
              <p>• Inventario</p>
              <p>• Proveedores</p>
              <p>• Finanzas</p>
              <p>• Reportes</p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function DashboardCard({
  title,
  value,
  description,
}: {
  title: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{title}</p>

      <p className="mt-3 text-3xl font-bold text-slate-900">{value}</p>

      <p className="mt-2 text-sm text-slate-400">{description}</p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
      <span className="text-slate-500">{label}</span>

      <span className="font-medium text-slate-900">{value}</span>
    </div>
  );
}
