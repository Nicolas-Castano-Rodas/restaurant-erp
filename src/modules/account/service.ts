import type { PrismaClient } from "@/generated/prisma/client";
import { hashPassword, validPassword, verifyPassword } from "@/modules/auth/password";

export async function changePassword(db: PrismaClient, userId: string, current: string, password: string) {
  if (!validPassword(password) || current === password || Buffer.byteLength(current, "utf8") > 256) return false;
  const user = await db.user.findUnique({ where: { id: userId }, select: { active: true, passwordHash: true } });
  if (!user?.active || !await verifyPassword(current, user.passwordHash)) return false;
  const passwordHash = await hashPassword(password);
  return db.$transaction(async (tx) => {
    const changed = await tx.user.updateMany({ where: { id: userId, active: true, passwordHash: user.passwordHash }, data: { passwordHash } });
    if (changed.count !== 1) return false;
    await tx.session.deleteMany({ where: { userId } });
    return true;
  }, { isolationLevel: "Serializable" });
}
