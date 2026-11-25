"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getPrisma } from "@/lib/prisma";
import { requireWorkspace } from "@/modules/auth/workspace";
import { createOrder, OrderError, parseOrderInput } from "./service";

export async function submitOrder(scope: string, payload: unknown): Promise<{ id: string; nextRequestId: string } | { error: string }> {
  const context = await requireWorkspace("orders.manage");
  if (scope !== `${context.organization.id}:${context.branch.id}`) return { error: "Cambió tu sucursal. Actualiza el punto de venta." };
  try {
    const data = parseOrderInput(payload);
    const id = await createOrder(getPrisma(), { organizationId: context.organization.id, branchId: context.branch.id, membershipId: context.membershipId }, data);
    revalidatePath("/dashboard/pos");
    revalidatePath("/dashboard/tables");
    revalidatePath("/dashboard/orders");
    revalidatePath("/dashboard/kitchen");
    revalidatePath("/dashboard/cash");
    revalidatePath("/dashboard/customers");
    return { id, nextRequestId: randomUUID() };
  } catch (error) {
    return { error: error instanceof OrderError ? error.message : "No se pudo registrar el pedido. Intenta nuevamente." };
  }
}
