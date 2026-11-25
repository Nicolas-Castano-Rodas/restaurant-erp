import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { getPrisma } from "../../src/lib/prisma";
import { createMember, saveBranch, saveRole, teamOverview, updateMember } from "../../src/modules/team/service";
import { changePassword } from "../../src/modules/account/service";
import { createSession, getSession, selectContext } from "../../src/modules/auth/service";
import { verifyPassword } from "../../src/modules/auth/password";

async function main() {
  if (process.env.RUN_DB_TESTS !== "true") throw new Error("Use a disposable database");
  const db = getPrisma();
  const organizationId = randomUUID();
  const otherId = randomUUID();
  const userId = randomUUID();
  const email = `${randomUUID()}@example.invalid`;
  const password = `Test-${randomUUID()}`;
  const ids = [organizationId, otherId];
  const where = { organizationId };
  try {
    await db.organization.createMany({ data: ids.map((id) => ({ id, name: "Team test", slug: id })) });
    const branch = await db.branch.create({ data: { ...where, name: "Main", code: "MAIN" } });
    const other = await db.branch.create({ data: { organizationId: otherId, name: "Other", code: "OTHER" } });
    const role = await db.role.create({ data: { ...where, name: "Propietario" } });
    await db.permission.upsert({ where: { code: "team.manage" }, create: { code: "team.manage", description: "Team" }, update: {} });
    await db.rolePermission.create({ data: { roleId: role.id, permissionCode: "team.manage" } });
    await db.user.create({ data: { id: userId, name: "Owner", email: `${userId}@example.invalid` } });
    const owner = await db.membership.create({ data: { ...where, userId, roleId: role.id } });
    await db.membershipBranch.create({ data: { ...where, membershipId: owner.id, branchId: branch.id } });
    const scope = { ...where, branchId: branch.id, membershipId: owner.id };
    await saveBranch(db, scope, { name: "Second", code: "SECOND", address: "" });
    const second = await db.branch.findFirstOrThrow({ where: { ...where, code: "SECOND" } });
    assert.ok(await db.membershipBranch.findFirst({ where: { ...where, membershipId: owner.id, branchId: second.id } }));
    await assert.rejects(saveRole(db, scope, { name: "Escalation", description: "", codes: ["team.manage"] }), /permisos/);
    const roleId = await saveRole(db, scope, { name: "Mesero", description: "", codes: ["orders.manage"] });
    const input = { name: "Staff", email, password, roleId, branchIds: [branch.id] };
    await assert.rejects(createMember(db, scope, { ...input, branchIds: [other.id] }), /sucursales/);
    await assert.rejects(createMember(db, scope, { ...input, roleId: role.id }), /rol operativo/);
    const memberId = await createMember(db, scope, input);
    const member = await db.membership.findUniqueOrThrow({ where: { id: memberId }, include: { user: true } });
    assert.equal(await verifyPassword(password, member.user.passwordHash), true);
    await assert.rejects(createMember(db, scope, input), /correo/);
    await assert.rejects(teamOverview(db, { ...scope, membershipId: memberId }), /propietario/);
    await assert.rejects(updateMember(db, scope, { id: owner.id, roleId, branchIds: [branch.id], active: false }), /propietario/);
    const session = await createSession(db, member.userId);
    assert.equal(await selectContext(db, session.token, memberId, branch.id), true);
    await updateMember(db, scope, { id: memberId, roleId, branchIds: [second.id], active: true });
    assert.equal(await getSession(db, session.token), null);
    const next = await createSession(db, member.userId);
    assert.equal(await selectContext(db, next.token, memberId, branch.id), false);
    assert.equal(await selectContext(db, next.token, memberId, second.id), true);
    assert.equal(await changePassword(db, member.userId, "wrong", `New-${randomUUID()}`), false);
    const newPassword = `New-${randomUUID()}`;
    assert.equal(await changePassword(db, member.userId, password, newPassword), true);
    assert.equal(await getSession(db, next.token), null);
    assert.equal(await verifyPassword(newPassword, (await db.user.findUniqueOrThrow({ where: { id: member.userId } })).passwordHash), true);
    await updateMember(db, scope, { id: memberId, roleId, branchIds: [second.id], active: false });
    assert.equal((await teamOverview(db, scope)).members.find((entry) => entry.id === memberId)?.active, false);
    console.log("Team authorization, roles, branch isolation and password rotation checks passed.");
  } finally {
    try {
      const orgs = { organizationId: { in: ids } };
      await db.session.deleteMany({ where: { user: { OR: [{ id: userId }, { email }] } } });
      await db.membershipBranch.deleteMany({ where: orgs });
      await db.membership.deleteMany({ where: orgs });
      await db.role.deleteMany({ where: orgs });
      await db.user.deleteMany({ where: { OR: [{ id: userId }, { email }] } });
      await db.branch.deleteMany({ where: orgs });
      await db.organization.deleteMany({ where: { id: { in: ids } } });
    } finally { await db.$disconnect(); }
  }
}
main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
