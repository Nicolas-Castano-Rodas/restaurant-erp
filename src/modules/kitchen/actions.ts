"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getPrisma } from "@/lib/prisma";
import { requireWorkspace } from "@/modules/auth/workspace";
import { advanceKitchen } from "./service";

export async function moveKitchenOrder(form: FormData) {
  const context = await requireWorkspace("kitchen.manage");
  const scope = form.get("scope");
  const id = form.get("id");
  const expected = form.get("expected");
  if (scope !== `${context.organization.id}:${context.branch.id}` || typeof id !== "string" ||
    (expected !== "PENDING" && expected !== "PREPARING" && expected !== "READY")) redirect("/dashboard/kitchen?error=1");
  let changed = false;
  try {
    changed = await advanceKitchen(getPrisma(), { organizationId: context.organization.id, branchId: context.branch.id, membershipId: context.membershipId }, id, expected);
  } catch {
    changed = false;
  }
  revalidatePath("/dashboard/kitchen");
  revalidatePath("/dashboard/orders");
  redirect(changed ? "/dashboard/kitchen?saved=1" : "/dashboard/kitchen?error=1");
}
