"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getPrisma } from "@/lib/prisma";
import { requireWorkspace } from "@/modules/auth/workspace";
import { CustomerError, saveCustomer } from "./service";

export async function manageCustomer(form: FormData) {
  const context = await requireWorkspace("orders.manage");
  const scope = { organizationId: context.organization.id, branchId: context.branch.id, membershipId: context.membershipId };
  const field = (name: string) => { const value = form.get(name); return typeof value === "string" ? value : ""; };
  if (field("scope") !== `${scope.organizationId}:${scope.branchId}`) redirect("/dashboard/customers?error=Sucursal%20incorrecta");
  let message = "";
  let id = "";
  try {
    const customer = await saveCustomer(getPrisma(), scope, { id: field("id") || undefined, name: field("name"), phone: field("phone"), email: field("email"), active: form.has("active") });
    id = customer.id;
  } catch (error) {
    message = error instanceof CustomerError ? error.message : "No se pudo guardar el cliente. Actualiza e intenta nuevamente.";
  }
  revalidatePath("/dashboard/customers");
  revalidatePath("/dashboard/pos");
  redirect(message ? `/dashboard/customers?error=${encodeURIComponent(message)}` : `/dashboard/customers?saved=1&customer=${id}`);
}
