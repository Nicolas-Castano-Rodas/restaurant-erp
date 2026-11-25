"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getPrisma } from "@/lib/prisma";
import { requireWorkspace } from "@/modules/auth/workspace";
import { InventoryError } from "@/modules/inventory/service";
import { createPurchase, finishPurchase, removePurchaseLine, savePurchaseLine, saveSupplier } from "./service";

export async function managePurchase(form: FormData) {
  const context = await requireWorkspace("inventory.manage");
  const scope = { organizationId: context.organization.id, branchId: context.branch.id, membershipId: context.membershipId };
  const field = (name: string) => { const value = form.get(name); return typeof value === "string" ? value : ""; };
  if (field("scope") !== `${scope.organizationId}:${scope.branchId}`) redirect("/dashboard/purchases?error=Sucursal%20incorrecta");
  let message = "";
  let purchaseId = field("purchaseId");
  try {
    const db = getPrisma();
    switch (field("operation")) {
      case "supplier":
        await saveSupplier(db, scope, { id: field("supplierId") || undefined, name: field("name"), taxId: field("taxId"), phone: field("phone"), email: field("email"), active: form.has("active") });
        break;
      case "create":
        purchaseId = (await createPurchase(db, scope, { supplierId: field("supplierId"), requestId: field("requestId"), reference: field("reference"), note: field("note") })).id;
        break;
      case "line":
        await savePurchaseLine(db, scope, { purchaseId, ingredientId: field("ingredientId"), quantity: field("quantity"), unitCost: field("unitCost") });
        break;
      case "remove":
        await removePurchaseLine(db, scope, purchaseId, field("lineId"));
        break;
      case "receive":
        await finishPurchase(db, scope, purchaseId, "RECEIVED");
        break;
      case "cancel":
        await finishPurchase(db, scope, purchaseId, "CANCELLED");
        break;
      default:
        throw new InventoryError("Operación inválida.");
    }
  } catch (error) {
    message = error instanceof InventoryError ? error.message : "No se pudo guardar. Revisa datos duplicados y actualiza antes de reintentar.";
  }
  for (const path of ["/dashboard/purchases", "/dashboard/inventory", "/dashboard/recipes"]) revalidatePath(path);
  const query = new URLSearchParams(message ? { error: message } : { saved: "1" });
  if (/^[0-9a-f-]{36}$/i.test(purchaseId)) query.set("purchase", purchaseId);
  redirect(`/dashboard/purchases?${query.toString()}`);
}
