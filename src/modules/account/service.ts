import type { PrismaClient } from "@/generated/prisma/client";
import { consumeAttempt } from "@/modules/auth/service";
import { hashPassword, validPassword, verifyPassword } from "@/modules/auth/password";

export async function changePassword(db: PrismaClient, userId: string, current: string, password: string) {
  if (!validPassword(password) || current === password || Buffer.byteLength(current, "utf8") > 256) return false;
  if (!await consumeAttempt(db, `password-change:${userId}`, 5)) return false;
  const user = await db.user.findUnique({ where: { id: userId }, select: { active: true, passwordHash: true } });
  if (!user?.active) return false;
  if (!await verifyPassword(current, user.passwordHash)) {
    await db.securityEvent.create({ data: { userId, kind: "PASSWORD_CHANGE_REJECTED" } });
    return false;
  }
  const passwordHash = await hashPassword(password);
  return db.$transaction(async (tx) => {
    const changed = await tx.user.updateMany({ where: { id: userId, active: true, passwordHash: user.passwordHash }, data: { passwordHash } });
    if (changed.count !== 1) return false;
    await tx.session.deleteMany({ where: { userId } });
    await tx.securityEvent.create({ data: { userId, kind: "PASSWORD_CHANGED" } });
    return true;
  }, { isolationLevel: "Serializable" });
}

export function accountSecurityHistory(db: PrismaClient, userId: string) {
  return db.securityEvent.findMany({ where: { userId }, select: { id: true, kind: true, createdAt: true }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 20 });
}
