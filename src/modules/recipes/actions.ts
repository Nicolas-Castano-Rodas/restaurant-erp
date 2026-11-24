"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getPrisma } from "@/lib/prisma";
import { requireWorkspace } from "@/modules/auth/workspace";
import { InventoryError } from "@/modules/inventory/service";
import { removeRecipeLine, saveRecipeLine } from "./service";

export async function manageRecipe(form: FormData) {
  const context = await requireWorkspace("inventory.manage");
  const scope = { organizationId: context.organization.id, branchId: context.branch.id, membershipId: context.membershipId };
  const field = (name: string) => { const value = form.get(name); return typeof value === "string" ? value : ""; };
  if (field("scope") !== `${scope.organizationId}:${scope.branchId}`) redirect("/dashboard/recipes?error=Sucursal%20incorrecta");
  let message = "";
  try {
    if (field("operation") === "remove") await removeRecipeLine(getPrisma(), scope, field("id"));
    else if (field("operation") === "save") await saveRecipeLine(getPrisma(), scope, { productId: field("productId"), variantId: field("variantId") || null, ingredientId: field("ingredientId"), quantity: field("quantity") });
    else throw new InventoryError("Operación inválida.");
  } catch (error) {
    message = error instanceof InventoryError ? error.message : "No se pudo guardar la receta. Actualiza e intenta nuevamente.";
  }
  revalidatePath("/dashboard/recipes");
  redirect(message ? `/dashboard/recipes?error=${encodeURIComponent(message)}` : "/dashboard/recipes?saved=1");
}
