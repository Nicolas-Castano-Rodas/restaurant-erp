"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getPrisma } from "@/lib/prisma";
import { requireWorkspace } from "@/modules/auth/workspace";
import { configureBalance, createIngredient, InventoryError, recordMovement } from "./service";

export async function manageInventory(form: FormData) {
  const context = await requireWorkspace("inventory.manage");
  const scope = { organizationId: context.organization.id, branchId: context.branch.id, membershipId: context.membershipId };
  const field = (name: string) => { const value = form.get(name); return typeof value === "string" ? value : ""; };
  if (field("scope") !== `${scope.organizationId}:${scope.branchId}`) redirect("/dashboard/inventory?error=Sucursal%20incorrecta");
  let message = "";
  try {
    const db = getPrisma();
    const operation = field("operation");
    if (operation === "create") {
      const unit = field("unit");
      if (unit !== "KG" && unit !== "G" && unit !== "L" && unit !== "ML" && unit !== "UNIT") throw new InventoryError("Selecciona una unidad.");
      await createIngredient(db, scope, field("name"), unit, field("minimum"));
    } else if (operation === "configure") {
      await configureBalance(db, scope, field("ingredientId"), field("minimum"), form.has("unitCost") ? field("unitCost") : undefined);
    } else if (operation === "movement") {
      const kind = field("kind");
      if (kind !== "ENTRY" && kind !== "EXIT" && kind !== "WASTE") throw new InventoryError("Tipo de movimiento inválido.");
      await recordMovement(db, scope, { ingredientId: field("ingredientId"), requestId: field("requestId"), kind, quantity: field("quantity"), reason: field("reason") });
    } else throw new InventoryError("Operación inválida.");
  } catch (error) {
    message = error instanceof InventoryError ? error.message : "No se pudo guardar. Verifica nombres duplicados o movimientos concurrentes y actualiza antes de reintentar.";
  }
  revalidatePath("/dashboard/inventory");
  redirect(message ? `/dashboard/inventory?error=${encodeURIComponent(message)}` : "/dashboard/inventory?saved=1");
}
