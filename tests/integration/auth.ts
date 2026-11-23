import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { getPrisma } from "../../src/lib/prisma";
import { hashPassword, verifyPassword } from "../../src/modules/auth/password";
import { authenticate, createSession, getSession, hasPermission, revokeSession, selectContext } from "../../src/modules/auth/service";

async function main() {
  if (process.env.RUN_DB_TESTS !== "true") throw new Error("Use a disposable database and set RUN_DB_TESTS=true");
  const db = getPrisma();
  const ids = [randomUUID(), randomUUID()];
  const userId = randomUUID();
  const email = `${userId}@example.invalid`;
  const password = `Test-${randomUUID()}`;
  const hash = await hashPassword(password);
  assert.equal(await verifyPassword(password, hash), true);
  assert.equal(await verifyPassword("incorrect", hash), false);
  assert.equal(await verifyPassword(password, null), false);
  try {
    const [first, second] = await Promise.all(ids.map((id) => db.organization.create({ data: { id, name: "Test org", slug: id } })));
    const branchA = await db.branch.create({ data: { organizationId: first.id, name: "A", code: "A" } });
    const branchB = await db.branch.create({ data: { organizationId: second.id, name: "B", code: "B" } });
    const role = await db.role.create({ data: { organizationId: first.id, name: "Test role" } });
    const permissionCode = `test.${userId}`;
    await db.permission.create({ data: { code: permissionCode, description: "Test only" } });
    await db.rolePermission.create({ data: { roleId: role.id, permissionCode } });
    await db.user.create({ data: { id: userId, email, name: "Test user", passwordHash: hash } });
    const membership = await db.membership.create({ data: { organizationId: first.id, userId, roleId: role.id } });
    await db.membershipBranch.create({ data: { organizationId: first.id, membershipId: membership.id, branchId: branchA.id } });
    assert.equal(await authenticate(db, email, "incorrect"), null);
    assert.equal(await authenticate(db, email.toUpperCase(), password), userId);
    const { token } = await createSession(db, userId);
    assert.equal((await getSession(db, token))?.context, null);
    assert.equal(await selectContext(db, token, membership.id, branchB.id), false);
    assert.equal(await selectContext(db, token, membership.id, branchA.id), true);
    const context = (await getSession(db, token))?.context ?? null;
    assert.equal(context?.organization.id, first.id);
    assert.equal(hasPermission(context, permissionCode), true);
    assert.equal(hasPermission(context, "unassigned.permission"), false);
    await db.branch.update({ where: { id: branchA.id }, data: { active: false } });
    assert.equal((await getSession(db, token))?.context, null);
    await db.user.update({ where: { id: userId }, data: { active: false } });
    assert.equal(await getSession(db, token), null);
    await db.user.update({ where: { id: userId }, data: { active: true } });
    await revokeSession(db, token);
    assert.equal(await getSession(db, token), null);
    const expired = await createSession(db, userId);
    await db.session.updateMany({ where: { userId }, data: { expiresAt: new Date(0) } });
    assert.equal(await getSession(db, expired.token), null);
    console.log("Authentication and workspace authorization checks passed.");
  } finally {
    try {
      await db.session.deleteMany({ where: { userId } });
      await db.membershipBranch.deleteMany({ where: { organizationId: { in: ids } } });
      await db.membership.deleteMany({ where: { organizationId: { in: ids } } });
      await db.branch.deleteMany({ where: { organizationId: { in: ids } } });
      await db.role.deleteMany({ where: { organizationId: { in: ids } } });
      await db.permission.deleteMany({ where: { code: `test.${userId}` } });
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
