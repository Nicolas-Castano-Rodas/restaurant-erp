import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { currentSession } from "@/modules/auth/request";
import { listCatalog } from "@/modules/catalog/service";

export async function GET() {
  const session = await currentSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const context = session.context;
  if (!context || !context.permissions.some((permission) => permission === "orders.manage" || permission === "catalog.manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const categories = await listCatalog(getPrisma(), context.organization.id, true);
  return NextResponse.json({ currency: context.organization.currency, categories }, { headers: { "Cache-Control": "private, no-store" } });
}
