import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const organizations = await prisma.organization.count();

    return Response.json({
      status: "ok",
      database: "connected",
      organizations,
    });
  } catch (error) {
    console.error("Database connection error:", error);

    return Response.json(
      {
        status: "error",
        database: "disconnected",
      },
      { status: 500 },
    );
  }
}
