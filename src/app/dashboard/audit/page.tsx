import Link from "next/link";
import { redirect } from "next/navigation";
import { ModulePage, inputStyle } from "@/components/workspace/module-page";
import { requireWorkspace } from "@/modules/auth/workspace";
import { getPrisma } from "@/lib/prisma";
import { auditLabels, listAudit } from "@/modules/audit/service";

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ action?: string; branch?: string; page?: string }> }) {
  const context = await requireWorkspace("team.manage");
  if (context.role !== "Propietario") redirect("/dashboard?error=permission");
  const params = await searchParams;
  const action = typeof params.action === "string" && Object.hasOwn(auditLabels, params.action) ? params.action : "";
  const branchId = typeof params.branch === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.branch) ? params.branch : "";
  const page = typeof params.page === "string" && /^\d{1,4}$/.test(params.page) ? Math.max(1, Number(params.page)) : 1;
  const { events, count, branches } = await listAudit(getPrisma(), { organizationId: context.organization.id, branchId: context.branch.id, membershipId: context.membershipId }, { action, branchId, page });
  const date = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "medium", timeZone: context.organization.timeZone });
  const href = (target: number) => `/dashboard/audit?${new URLSearchParams({ action, branch: branchId, page: String(target) })}`;
  return <ModulePage title="Auditoría de operaciones" subtitle={`${context.organization.name} · Bitácora de solo lectura`}>
    <section className="reference-card mb-3 p-4"><h2 className="font-semibold">Filtrar actividad</h2><form method="get" className="mt-3 flex flex-wrap items-end gap-3"><label className="min-w-0 flex-1 text-sm text-muted">Sucursal<select name="branch" defaultValue={branchId} className={inputStyle}><option value="">Todas las sucursales</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label><label className="min-w-0 flex-1 text-sm text-muted">Operación<select name="action" defaultValue={action} className={inputStyle}><option value="">Todas las operaciones</option>{Object.entries(auditLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><button type="submit" className="rounded-lg bg-brand px-4 py-3 text-sm font-semibold text-white">Filtrar</button></form><p className="mt-3 text-xs text-muted">Se registran operaciones exitosas desde la activación de esta función. No hay reconstrucción de actividad anterior.</p></section>
    <section className="reference-card p-4"><div className="flex items-center justify-between gap-3"><h2 className="font-semibold">Historial de operaciones</h2><span className="text-sm text-muted">{count} eventos</span></div><div className="mt-3 divide-y divide-line">{events.map((event) => <details key={event.id} className="reference-disclosure"><summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3 py-4"><div className="min-w-0 flex-1"><p className="font-semibold text-ink">{auditLabels[event.action] ?? event.action}</p><p className="break-words text-xs text-muted">{event.actorName} · {event.actorRole} · {event.branch.name}</p></div><span className="text-xs text-muted">{date.format(event.createdAt)}</span></summary><div className="mb-3 rounded-lg bg-canvas p-3 text-sm"><p className="break-all">Registro: {event.entity} · {event.entityId}</p><p className="mt-2 text-xs font-semibold text-muted">Detalles registrados</p><pre className="mt-2 whitespace-pre-wrap break-all text-xs">{JSON.stringify(event.details, null, 2)}</pre></div></details>)}{!events.length && <p className="py-4 text-sm text-muted">No hay eventos en esta consulta.</p>}</div><div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">{page > 1 ? <Link href={href(page - 1)} className="text-sm font-semibold text-brand underline">Anterior</Link> : <span />}<span className="text-xs text-muted">Página {page} de {Math.max(1, Math.ceil(count / 50))}</span>{page * 50 < count && page < 9999 ? <Link href={href(page + 1)} className="text-sm font-semibold text-brand underline">Siguiente</Link> : <span />}</div></section>
    <p className="mt-3 text-xs text-muted">Los registros no se editan ni eliminan desde la aplicación. No se guardan contraseñas, tokens, teléfonos, direcciones ni textos libres en los detalles.</p>
  </ModulePage>;
}
