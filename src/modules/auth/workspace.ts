import { redirect } from "next/navigation";
import { currentSession } from "./request";

export async function requireWorkspace(permission: string) {
  const session = await currentSession();
  if (!session) redirect("/login");
  if (!session.context || !session.context.permissions.includes(permission)) redirect("/dashboard?error=permission");
  return session.context;
}
