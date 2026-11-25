import { redirect } from "next/navigation";
import { currentSession } from "@/modules/auth/request";
import { ModulePage, inputStyle, buttonStyle } from "@/components/workspace/module-page";
import { getPrisma } from "@/lib/prisma";
import { accountSecurityHistory } from "@/modules/account/service";
import { updatePassword } from "@/modules/account/actions";
export default async function AccountPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const session = await currentSession();
  if (!session) redirect("/login");
  const { error } = await searchParams;
  const events = await accountSecurityHistory(getPrisma(), session.user.id);
  const date = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "medium", timeZone: session.context?.organization.timeZone ?? "America/Bogota" });
  const labels = { LOGIN_SUCCEEDED: "Inicio de sesión correcto", LOGIN_REJECTED: "Intento de acceso rechazado", SESSION_REVOKED: "Sesión cerrada o revocada", PASSWORD_CHANGED: "Contraseña actualizada", PASSWORD_CHANGE_REJECTED: "Cambio de contraseña rechazado" };
  return <ModulePage title="Mi cuenta" subtitle={session.user.email}>
    <section className="reference-card max-w-xl p-4"><h2 className="mb-3 font-semibold">Cambiar contraseña</h2>
      {error && <p role="alert" className="mb-3 rounded-lg bg-danger-soft p-3 text-sm text-danger">No se pudo cambiar la contraseña. Verifica la actual y los requisitos. Si alcanzaste el límite de intentos, vuelve a intentar después de 15 minutos.</p>}
      <form action={updatePassword} className="space-y-3"><label className="block text-sm text-muted">Contraseña actual<input name="current" type="password" required maxLength={256} autoComplete="current-password" className={inputStyle} /></label><label className="block text-sm text-muted">Nueva contraseña<input name="password" type="password" required minLength={12} maxLength={256} autoComplete="new-password" className={inputStyle} /></label><label className="block text-sm text-muted">Confirmar nueva contraseña<input name="confirmation" type="password" required minLength={12} maxLength={256} autoComplete="new-password" className={inputStyle} /></label><p className="text-xs text-muted">Mínimo 12 caracteres y máximo 256 bytes. Se cerrarán todas tus sesiones al cambiarla.</p><button type="submit" className={buttonStyle}>Cambiar contraseña</button></form>
    </section>
    <section className="reference-card mt-3 max-w-xl p-4"><h2 className="font-semibold">Actividad de seguridad</h2><p className="mt-1 text-xs text-muted">Últimos 20 eventos de tu propia cuenta desde la activación de esta función.</p><div className="mt-3 divide-y divide-line">{events.map((event) => <div key={event.id} className="flex flex-wrap items-center justify-between gap-2 py-3"><span className="text-sm font-semibold">{labels[event.kind]}</span><span className="text-xs text-muted">{date.format(event.createdAt)}</span></div>)}{!events.length && <p className="py-3 text-sm text-muted">No hay eventos registrados.</p>}</div><p className="mt-3 text-xs text-muted">Las sesiones vencen después de 12 horas o aproximadamente 2 horas de inactividad. No se muestran IP ni credenciales.</p></section>
  </ModulePage>;
}
