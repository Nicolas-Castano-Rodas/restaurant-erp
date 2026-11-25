"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getPrisma } from "@/lib/prisma";
import { requireWorkspace } from "@/modules/auth/workspace";
import { advanceDelivery, assignCourier, DeliveryError, saveCourier } from "./service";

export async function manageDelivery(form: FormData) {
  const context = await requireWorkspace("orders.manage");
  const scope = { organizationId: context.organization.id, branchId: context.branch.id, membershipId: context.membershipId };
  const field = (name: string) => { const value = form.get(name); return typeof value === "string" ? value : ""; };
  if (field("scope") !== `${scope.organizationId}:${scope.branchId}`) redirect("/dashboard/deliveries?error=Sucursal%20incorrecta");
  let message = "";
  try {
    const db = getPrisma();
    const op = field("operation");
    if (op === "courier") await saveCourier(db, scope, { id: field("id") || undefined, name: field("name"), phone: field("phone"), active: form.has("active") });
    else if (op === "assign") await assignCourier(db, scope, field("id"), field("courierId"));
    else if (op === "dispatch" || op === "deliver") await advanceDelivery(db, scope, field("id"), op === "dispatch" ? "DISPATCHED" : "DELIVERED");
    else throw new DeliveryError("Operación inválida.");
  } catch (error) {
    message = error instanceof DeliveryError ? error.message : "No se pudo guardar. Actualiza antes de reintentar.";
  }
  for (const path of ["/dashboard/deliveries", "/dashboard/orders", "/dashboard/cash"]) revalidatePath(path);
  redirect(message ? `/dashboard/deliveries?error=${encodeURIComponent(message)}` : "/dashboard/deliveries?saved=1");
}
