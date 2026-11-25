"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { currentSession } from "@/modules/auth/request";
import { getPrisma } from "@/lib/prisma";
import { SESSION_COOKIE } from "@/modules/auth/service";
import { changePassword } from "./service";

export async function updatePassword(form: FormData) {
  const session = await currentSession();
  if (!session) redirect("/login");
  const current = form.get("current");
  const password = form.get("password");
  const confirmation = form.get("confirmation");
  if (typeof current !== "string" || typeof password !== "string" || password !== confirmation) redirect("/dashboard/account?error=1");
  let changed = false;
  try { changed = await changePassword(getPrisma(), session.user.id, current, password); } catch { changed = false; }
  if (!changed) redirect("/dashboard/account?error=1");
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}
