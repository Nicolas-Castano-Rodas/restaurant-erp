import { recordAudit } from "@/modules/audit/service";
import type { PrismaClient } from "@/generated/prisma/client";
import { consumeRecipeIngredients } from "@/modules/recipes/service";

type Scope = { organizationId: string; branchId: string; membershipId: string };
type Status = "PENDING" | "PREPARING" | "READY" | "SERVED";
const nextStatus = { PENDING: "PREPARING", PREPARING: "READY", READY: "SERVED", SERVED: null } as const;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function listKitchenOrders(db: PrismaClient, organizationId: string, branchId: string) {
  return db.order.findMany({
    where: { organizationId, branchId, status: "OPEN", kitchenStatus: { in: ["PENDING", "PREPARING", "READY"] } },
    orderBy: { createdAt: "asc" },
    select: { id: true, tableName: true, channel: true, kitchenStatus: true, createdAt: true, note: true,
      lines: { select: { id: true, productName: true, variantName: true, quantity: true } } },
  });
}

export async function advanceKitchen(db: PrismaClient, scope: Scope, orderId: string, expected: Status) {
  if (!uuid.test(orderId) || !Object.hasOwn(nextStatus, expected) || !nextStatus[expected]) return false;
  const { organizationId, branchId, membershipId } = scope;
  const target = nextStatus[expected];
  const now = new Date();
  return db.$transaction(async (tx) => {
    const authorized = await tx.membership.findFirst({
      where: { id: membershipId, organizationId, active: true, user: { active: true }, organization: { active: true },
        role: { permissions: { some: { permissionCode: "kitchen.manage" } } },
        branches: { some: { branchId, branch: { active: true } } } },
      select: { id: true },
    });
    if (!authorized) return false;
    const result = await tx.order.updateMany({
      where: { id: orderId, organizationId, branchId, status: "OPEN", kitchenStatus: expected },
      data: { kitchenStatus: target, ...(target === "PREPARING" ? { preparingAt: now } : target === "READY" ? { readyAt: now } : { servedAt: now }) },
    });
    if (result.count !== 1) return false;
    if (target === "PREPARING") await consumeRecipeIngredients(tx, scope, orderId);
    await recordAudit(tx, scope, "KITCHEN_TRANSITION", "Order", orderId, { before: expected, after: target });
    return true;
  }, { isolationLevel: "Serializable" });
}
