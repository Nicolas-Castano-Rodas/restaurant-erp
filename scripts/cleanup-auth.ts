import "dotenv/config";
import { getPrisma } from "../src/lib/prisma";

async function main() {
  const db = getPrisma();
  try {
    const now = new Date();
    const sessions = await db.session.deleteMany({ where: { expiresAt: { lte: now } } });
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
