"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireWorkspace } from "@/modules/auth/workspace";
import { getPrisma } from "@/lib/prisma";
import { createMember, saveBranch, saveRole, TeamError, updateMember } from "./service";

export async function manageTeam(form: FormData) {
  const context = await requireWorkspace("team.manage");
  const scope = { organizationId: context.organization.id, branchId: context.branch.id, membershipId: context.membershipId };
  const field = (name: string) => { const value = form.get(name); return typeof value === "string" ? value : ""; };
  const fields = (name: string) => form.getAll(name).filter((value): value is string => typeof value === "string");
  if (field("scope") !== `${scope.organizationId}:${scope.branchId}`) redirect("/dashboard/team?error=Contexto%20incorrecto");
  let message = "";
  try {
    const db = getPrisma();
    switch (field("operation")) {
      case "role":
        await saveRole(db, scope, { id: field("id") || undefined, name: field("name"), description: field("description"), codes: fields("permission") });
        break;
      case "create":
        if (field("password") !== field("confirmation")) throw new TeamError("Las contraseñas no coinciden.");
        await createMember(db, scope, { name: field("name"), email: field("email"), password: field("password"), roleId: field("roleId"), branchIds: fields("branchId") });
        break;
      case "member":
        await updateMember(db, scope, { id: field("id"), roleId: field("roleId"), branchIds: fields("branchId"), active: form.has("active") });
        break;
      case "branch":
        await saveBranch(db, scope, { id: field("id") || undefined, name: field("name"), code: field("code"), address: field("address") });
        break;
      default: throw new TeamError("Operación inválida.");
    }
  } catch (error) {
    message = error instanceof TeamError ? error.message : "No se pudo guardar. Revisa datos duplicados y vuelve a intentar.";
  }
  revalidatePath("/dashboard/team");
  revalidatePath("/dashboard");
  redirect(message ? `/dashboard/team?error=${encodeURIComponent(message)}` : "/dashboard/team?saved=1");
}
