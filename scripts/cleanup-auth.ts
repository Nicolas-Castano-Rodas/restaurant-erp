import "dotenv/config";
import { IDLE_SESSION_MS } from "../src/modules/auth/service";
import { getPrisma } from "../src/lib/prisma";

async function main() {
  const db = getPrisma();
  try {
    const now = new Date();
    const sessions = await db.session.deleteMany({ where: { OR: [{ expiresAt: { lte: now } }, { lastSeenAt: { lte: new Date(now.getTime() - IDLE_SESSION_MS) } }] } });
    const attempts = await db.loginAttempt.deleteMany({ where: { expiresAt: { lte: now } } });
    console.log(`Expired sessions: ${sessions.count}; expired attempt buckets: ${attempts.count}`);
  } finally {
    await db.$disconnect();
  }
}
main().catch(() => {
  console.error("Authentication cleanup failed.");
  process.exitCode = 1;
});
