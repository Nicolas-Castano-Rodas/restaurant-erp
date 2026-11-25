import { redirect } from "next/navigation";
import { currentSession } from "@/modules/auth/request";
import { ModulePage, inputStyle, buttonStyle } from "@/components/workspace/module-page";
import { updatePassword } from "@/modules/account/actions";
export default async function AccountPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const session = await currentSession();
  if (!session) redirect("/login");
  const { error } = await searchParams;
  return <ModulePage title="Mi cuenta" subtitle={session.user.email}>
    <section className="reference-card max-w-xl p-4"><h2 className="mb-3 font-semibold">Cambiar contraseña</h2>
      {error && <p role="alert" className="mb-3 rounded-lg bg-danger-soft p-3 text-sm text-danger">No se pudo cambiar la contraseña. Verifica la actual, la confirmación y los requisitos.</p>}
      <form action={updatePassword} className="space-y-3"><label className="block text-sm text-muted">Contraseña actual<input name="current" type="password" required maxLength={256} autoComplete="current-password" className={inputStyle} /></label><label className="block text-sm text-muted">Nueva contraseña<input name="password" type="password" required minLength={12} maxLength={256} autoComplete="new-password" className={inputStyle} /></label><label className="block text-sm text-muted">Confirmar nueva contraseña<input name="confirmation" type="password" required minLength={12} maxLength={256} autoComplete="new-password" className={inputStyle} /></label><p className="text-xs text-muted">Mínimo 12 caracteres y máximo 256 bytes. Se cerrarán todas tus sesiones al cambiarla.</p><button type="submit" className={buttonStyle}>Cambiar contraseña</button></form>
    </section>
  </ModulePage>;
}
