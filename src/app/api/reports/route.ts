import { NextResponse } from "next/server";
import { currentSession } from "@/modules/auth/request";
import { getPrisma } from "@/lib/prisma";
import { reportRange } from "@/modules/analytics/service";
import { buildReport, ReportError } from "@/modules/reports/service";
import { renderExcel, renderPdf } from "@/modules/reports/render";
import { isReportType } from "@/modules/reports/types";

export const runtime = "nodejs";
const privateHeaders = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };

export async function GET(request: Request) {
  const session = await currentSession();
  if (!session) return NextResponse.json({ error: "Inicia sesión." }, { status: 401, headers: privateHeaders });
  const context = session.context;
  if (!context?.permissions.includes("reports.read")) return NextResponse.json({ error: "Acceso denegado." }, { status: 403, headers: privateHeaders });
  const query = new URL(request.url).searchParams;
  if (query.get("scope") !== `${context.organization.id}:${context.branch.id}`) return NextResponse.json({ error: "La sucursal cambió. Actualiza el módulo de reportes." }, { status: 409, headers: privateHeaders });
  const type = query.get("type");
  const format = query.get("format");
  const range = reportRange(context.organization.timeZone, query.get("from") ?? "", query.get("to") ?? "");
  if (!isReportType(type) || (format !== "pdf" && format !== "xlsx") || range.invalid) return NextResponse.json({ error: "Formato, reporte o período inválido." }, { status: 400, headers: privateHeaders });
  try {
    const report = await buildReport(getPrisma(), { organizationId: context.organization.id, branchId: context.branch.id, organization: context.organization.name, branch: context.branch.name, currency: context.organization.currency, timeZone: context.organization.timeZone }, type, range);
    const bytes = format === "pdf" ? await renderPdf(report) : await renderExcel(report);
    return new Response(Uint8Array.from(bytes), { headers: { ...privateHeaders, "Content-Type": format === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="restaurant-erp-${type}-${range.from}-${range.to}.${format}"` } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof ReportError ? error.message : "No se pudo generar el reporte. Intenta nuevamente." }, { status: error instanceof ReportError ? 422 : 500, headers: privateHeaders });
  }
}
