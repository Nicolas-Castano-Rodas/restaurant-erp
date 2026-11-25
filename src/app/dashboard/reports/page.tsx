import Link from "next/link";
import { ModulePage, inputStyle } from "@/components/workspace/module-page";
import { requireWorkspace } from "@/modules/auth/workspace";
import { reportRange } from "@/modules/analytics/service";
import { reportTypes } from "@/modules/reports/types";

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const context = await requireWorkspace("reports.read");
  const { from, to } = await searchParams;
  const range = reportRange(context.organization.timeZone, typeof from === "string" ? from : undefined, typeof to === "string" ? to : undefined);
  const scope = `${context.organization.id}:${context.branch.id}`;
  return <ModulePage title="Reportes empresariales" subtitle={`${context.organization.name} · ${context.branch.name}`}>
    <section className="reference-card mb-3 p-4"><h2 className="mb-3 font-semibold">Seleccionar período</h2>
      <form method="get" className="flex flex-wrap items-end gap-3"><label className="min-w-0 flex-1 text-sm text-muted">Desde<input type="date" name="from" required defaultValue={range.from} className={inputStyle} /></label><label className="min-w-0 flex-1 text-sm text-muted">Hasta<input type="date" name="to" required defaultValue={range.to} className={inputStyle} /></label><button type="submit" className="rounded-lg bg-brand px-4 py-3 text-sm font-semibold text-white">Aplicar período</button></form>
      <p className="mt-2 text-xs text-muted">Hasta 90 días. Los archivos contienen los datos de esta sucursal. Las existencias muestran el saldo actual.</p>
      {range.invalid && <p role="alert" className="mt-2 text-sm text-warning">Período inválido. Se aplicaron los últimos 7 días.</p>}
    </section>
    <div className="grid gap-3 sm:grid-cols-2">{reportTypes.map((report) => {
      const href = (format: string) => `/api/reports?${new URLSearchParams({ type: report.id, format, from: range.from, to: range.to, scope }).toString()}`;
      return <section key={report.id} className="reference-card flex flex-col gap-3 p-4"><div><h2 className="font-semibold">{report.title}</h2><p className="mt-1 text-sm text-muted">{report.description}</p></div><div className="mt-auto grid grid-cols-2 gap-2"><a href={href("xlsx")} className="rounded-lg bg-success px-3 py-3 text-center text-sm font-semibold text-white">Descargar Excel</a><a href={href("pdf")} className="rounded-lg bg-brand px-3 py-3 text-center text-sm font-semibold text-white">Descargar PDF</a></div></section>;
    })}</div>
    <p className="mt-3 text-xs text-muted">Máximo 2.000 filas por tabla. Los reportes demasiado grandes se rechazan, sin truncar datos. Los archivos son documentos internos, no facturas electrónicas.</p>
    <Link href="/dashboard/analytics" className="mt-3 inline-block text-sm font-semibold text-brand underline">Consultar analítica de ventas →</Link>
  </ModulePage>;
}
