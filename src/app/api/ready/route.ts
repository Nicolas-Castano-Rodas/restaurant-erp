import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const headers = { "Cache-Control": "no-store" };
  try {
    await getPrisma().$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ready" }, { headers });
  } catch {
    return NextResponse.json({ status: "unavailable" }, { status: 503, headers });
  }
}
