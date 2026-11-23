"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getPrisma } from "@/lib/prisma";
import { authenticate, createSession, revokeSession, selectContext, SESSION_COOKIE, SESSION_SECONDS } from "./service";

export async function login(formData: FormData): Promise<void> {
  const email = formData.get("email");
  const password = formData.get("password");
  if (typeof email !== "string" || typeof password !== "string") redirect("/login?error=credentials");

  const db = getPrisma();
  const userId = await authenticate(db, email, password);
  if (!userId) redirect("/login?error=credentials");

  const store = await cookies();
  const previous = store.get(SESSION_COOKIE)?.value;
  if (previous) await revokeSession(db, previous);
  const session = await createSession(db, userId);
  store.set(SESSION_COOKIE, session.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_SECONDS,
  });
  redirect("/dashboard");
}

export async function logout(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await revokeSession(getPrisma(), token);
  store.delete(SESSION_COOKIE);
  redirect("/login");
}

export async function changeContext(formData: FormData): Promise<void> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) redirect("/login");
  const value = formData.get("context");
  if (typeof value !== "string") redirect("/dashboard?error=context");
  const [membershipId, branchId, extra] = value.split(":");
  if (!membershipId || !branchId || extra !== undefined) redirect("/dashboard?error=context");
  const selected = await selectContext(getPrisma(), token, membershipId, branchId);
  redirect(selected ? "/dashboard" : "/dashboard?error=context");
}
