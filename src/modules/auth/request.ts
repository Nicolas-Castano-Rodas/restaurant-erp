import { cookies } from "next/headers";
import { getPrisma } from "@/lib/prisma";
import { getSession, SESSION_COOKIE } from "./service";

export async function currentSession() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return token ? getSession(getPrisma(), token) : null;
}
