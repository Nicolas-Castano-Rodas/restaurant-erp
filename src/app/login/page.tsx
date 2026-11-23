import Link from "next/link";
import { redirect } from "next/navigation";
import { login } from "@/modules/auth/actions";
import { currentSession } from "@/modules/auth/request";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await currentSession()) redirect("/dashboard");
  const { error } = await searchParams;
  return (
    <main className="grid min-h-screen bg-canvas lg:grid-cols-[1fr_1fr]">
      <section className="flex flex-col justify-between gap-12 bg-ink px-8 py-10 text-white lg:p-16">
        <Link href="/" className="flex w-fit items-center gap-3 font-bold">
          <span className="grid size-11 place-items-center rounded-xl bg-white text-ink" aria-hidden="true">R</span>
          Restaurant ERP
        </Link>
        <div className="max-w-lg">
          <p className="text-sm font-semibold uppercase tracking-widest text-orange-200">Tu operación, conectada</p>
          <h1 className="mt-5 text-4xl font-bold tracking-tight md:text-6xl">Cada servicio empieza con una buena gestión.</h1>
          <p className="mt-6 text-lg leading-relaxed text-slate-200">Un espacio de trabajo para tu restaurante, tus sucursales y tu equipo.</p>
        </div>
        <p className="text-sm text-slate-300">EL IMPERIO — Los Reyes del Software</p>
      </section>
      <section className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-7 shadow-sm sm:p-10">
          <p className="text-xs font-bold uppercase tracking-widest text-brand">Acceso al sistema</p>
          <h2 className="mt-3 text-3xl font-bold text-ink">Iniciar sesión</h2>
          <p className="mt-2 text-sm text-muted">Ingresa con las credenciales de tu equipo.</p>
          {error === "credentials" && (
            <p role="alert" className="mt-5 rounded-lg bg-danger-soft p-3 text-sm text-danger">No fue posible iniciar sesión. Revisa tus datos o inténtalo más tarde.</p>
          )}
          <form action={login} className="mt-8 space-y-5">
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-semibold">Correo electrónico</label>
              <input id="email" name="email" type="email" autoComplete="username" required maxLength={254} placeholder="correo@ejemplo.com" className="w-full rounded-lg border border-line bg-surface px-4 py-3" />
            </div>
            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-semibold">Contraseña</label>
              <input id="password" name="password" type="password" autoComplete="current-password" required maxLength={256} className="w-full rounded-lg border border-line bg-surface px-4 py-3" />
            </div>
            <button type="submit" className="w-full rounded-lg bg-brand px-5 py-3 font-semibold text-white hover:bg-brand-hover">Ingresar</button>
          </form>
          <p className="mt-6 text-sm text-muted">¿Necesitas acceso? Contacta con el administrador de tu organización.</p>
        </div>
      </section>
    </main>
  );
}
