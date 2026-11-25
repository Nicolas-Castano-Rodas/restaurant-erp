"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getPrisma } from "@/lib/prisma";
import { requireWorkspace } from "@/modules/auth/workspace";
import { CashError, cancelOrder, closeShift, openShift, payOrder } from "./service";

export async function manageCash(form: FormData) {
  const context = await requireWorkspace("cash.manage");
  const scope = { organizationId: context.organization.id, branchId: context.branch.id, membershipId: context.membershipId };
  const field = (name: string) => { const value = form.get(name); return typeof value === "string" ? value : ""; };
  if (field("scope") !== `${scope.organizationId}:${scope.branchId}`) redirect("/dashboard/cash?error=scope");
  let message = "";
  try {
    const db = getPrisma();
    const operation = field("operation");
    if (operation === "open") await openShift(db, scope, field("opening"));
    else if (operation === "close") await closeShift(db, scope, field("shiftId"), field("counted"));
    else if (operation === "cancel") await cancelOrder(db, scope, field("orderId"), field("reason"));
    else if (operation === "pay") {
      const method = field("method");
      if (method !== "CASH" && method !== "CARD" && method !== "TRANSFER") throw new CashError("Selecciona el método de pago.");
      await payOrder(db, scope, field("orderId"), method, field("received"));
    } else throw new CashError("Operación inválida.");
  } catch (error) {
    message = error instanceof CashError ? error.message : "No se pudo completar la operación. Actualiza antes de reintentar.";
  }
  for (const path of ["/dashboard/cash", "/dashboard/tables", "/dashboard/pos", "/dashboard/orders", "/dashboard/kitchen", "/dashboard/customers"]) revalidatePath(path);
  redirect(message ? `/dashboard/cash?error=${encodeURIComponent(message)}` : "/dashboard/cash?saved=1");
}
