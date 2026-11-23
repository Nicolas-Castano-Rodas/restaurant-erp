import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma/client";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString || process.env.RUN_DB_TESTS !== "true") {
    throw new Error("Use a disposable database and set RUN_DB_TESTS=true");
  }

  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  const suffix = randomUUID();
  const firstId = randomUUID();
  const secondId = randomUUID();
  const userId = randomUUID();

  try {
    const first = await db.organization.create({
      data: { id: firstId, name: "Test A", slug: `test-a-${suffix}` },
    });
    const second = await db.organization.create({
      data: { id: secondId, name: "Test B", slug: `test-b-${suffix}` },
    });
    const user = await db.user.create({
      data: { id: userId, name: "Test user", email: `${suffix}@example.invalid` },
    });
    const roleA = await db.role.create({
      data: { organizationId: first.id, name: "Manager" },
    });
    const roleB = await db.role.create({
      data: { organizationId: second.id, name: "Manager" },
    });
    const branchA = await db.branch.create({
      data: { organizationId: first.id, name: "Main A", code: "MAIN" },
    });
    const branchB = await db.branch.create({
      data: { organizationId: second.id, name: "Main B", code: "MAIN" },
    });

    await assert.rejects(
      db.membership.create({
        data: { organizationId: first.id, userId: user.id, roleId: roleB.id },
      }),
      { code: "P2003" },
    );

    const membership = await db.membership.create({
      data: { organizationId: first.id, userId: user.id, roleId: roleA.id },
    });

    await assert.rejects(
      db.membershipBranch.create({
        data: { organizationId: first.id, membershipId: membership.id, branchId: branchB.id },
      }),
      { code: "P2003" },
    );

    const assignment = await db.membershipBranch.create({
      data: { organizationId: first.id, membershipId: membership.id, branchId: branchA.id },
    });
    assert.equal(assignment.branchId, branchA.id);
    assert.equal(membership.organizationId, first.id);
    console.log("Tenant foreign-key integrity checks passed.");
  } finally {
    try {
      const ids = [firstId, secondId];
      await db.membershipBranch.deleteMany({ where: { organizationId: { in: ids } } });
      await db.membership.deleteMany({ where: { organizationId: { in: ids } } });
      await db.branch.deleteMany({ where: { organizationId: { in: ids } } });
      await db.role.deleteMany({ where: { organizationId: { in: ids } } });
      await db.user.deleteMany({ where: { id: userId } });
      await db.organization.deleteMany({ where: { id: { in: ids } } });
    } finally {
      await db.$disconnect();
    }
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
