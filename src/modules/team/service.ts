import { recordAudit } from "@/modules/audit/service";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { hashPassword, validPassword } from "@/modules/auth/password";
import { normalizeEmail, validEmail } from "@/modules/auth/service";
import { permissions } from "@/modules/auth/permissions";

type Scope = { organizationId: string; branchId: string; membershipId: string };
const ownerName = "Propietario";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const operationalPermissions = permissions.filter((permission) => permission.code !== "team.manage");
export class TeamError extends Error {}
function id(value: string) {
  if (!uuid.test(value)) throw new TeamError("Identificador inválido.");
  return value;
}
function text(value: string, max: number, required = true) {
  const clean = value.trim();
  if ((required && !clean) || clean.length > max) throw new TeamError("Revisa los campos obligatorios y su longitud.");
  return clean;
}

async function authorize(tx: Prisma.TransactionClient, scope: Scope) {
  const { organizationId, branchId, membershipId } = scope;
  const member = await tx.membership.findFirst({ where: { id: membershipId, organizationId, active: true, user: { active: true }, organization: { active: true }, role: { name: ownerName, permissions: { some: { permissionCode: "team.manage" } } }, branches: { some: { branchId, branch: { active: true } } } }, select: { id: true } });
  if (!member) throw new TeamError("Solo el propietario puede administrar el equipo.");
}

export async function teamOverview(db: PrismaClient, scope: Scope) {
  return db.$transaction(async (tx) => {
    await authorize(tx, scope);
    const where = { organizationId: scope.organizationId };
    const [members, roles, branches] = await Promise.all([
      tx.membership.findMany({ where, orderBy: { createdAt: "asc" }, select: { id: true, active: true, roleId: true, user: { select: { name: true, email: true, active: true } }, role: { select: { name: true } }, branches: { select: { branchId: true } } } }),
      tx.role.findMany({ where, orderBy: { name: "asc" }, select: { id: true, name: true, description: true, permissions: { select: { permissionCode: true } }, _count: { select: { memberships: true } } } }),
      tx.branch.findMany({ where, orderBy: { name: "asc" }, select: { id: true, name: true, code: true, address: true, active: true } }),
    ]);
    return { members, roles, branches };
  }, { isolationLevel: "RepeatableRead" });
}

export function saveRole(db: PrismaClient, scope: Scope, input: { id?: string; name: string; description: string; codes: string[] }) {
  const name = text(input.name, 80);
  const description = text(input.description, 300, false) || null;
  if (name.normalize("NFKC").toLowerCase() === ownerName.toLowerCase()) throw new TeamError("El rol Propietario está reservado.");
  const codes = [...new Set(input.codes)];
  if (!codes.length || codes.some((code) => !operationalPermissions.some((p) => p.code === code))) throw new TeamError("Selecciona permisos operativos válidos.");
  const organizationId = scope.organizationId;
  return db.$transaction(async (tx) => {
    await authorize(tx, scope);
    let roleId: string;
    let previousCodes: string[] = [];
    if (input.id) {
      const role = await tx.role.findFirst({ where: { id: id(input.id), organizationId }, include: { permissions: true } });
      if (!role || role.name === ownerName) throw new TeamError("El rol Propietario no se puede modificar.");
      await tx.role.update({ where: { id: role.id }, data: { name, description } });
      roleId = role.id;
      previousCodes = role.permissions.map((entry) => entry.permissionCode).sort();
      await tx.rolePermission.deleteMany({ where: { roleId } });
    } else {
      roleId = (await tx.role.create({ data: { organizationId, name, description } })).id;
    }
    for (const permission of operationalPermissions) {
      if (!codes.includes(permission.code)) continue;
      await tx.permission.upsert({ where: { code: permission.code }, create: permission, update: {} });
      await tx.rolePermission.create({ data: { roleId, permissionCode: permission.code } });
    }
    await recordAudit(tx, scope, input.id ? "ROLE_UPDATED" : "ROLE_CREATED", "Role", roleId, { beforePermissions: previousCodes, permissions: codes.sort() });
    return roleId;
  }, { isolationLevel: "Serializable" });
}

async function validateAssignments(tx: Prisma.TransactionClient, organizationId: string, roleId: string, branchIds: string[]) {
  const role = await tx.role.findFirst({ where: { id: id(roleId), organizationId }, include: { permissions: true } });
  if (!role || role.name === ownerName || role.permissions.some((permission) => permission.permissionCode === "team.manage")) throw new TeamError("Selecciona un rol operativo de la organización.");
  const ids = [...new Set(branchIds)].map(id);
  if (!ids.length || ids.length > 100 || await tx.branch.count({ where: { organizationId, active: true, id: { in: ids } } }) !== ids.length) throw new TeamError("Selecciona sucursales activas de esta organización.");
  return ids;
}

export async function createMember(db: PrismaClient, scope: Scope, input: { name: string; email: string; password: string; roleId: string; branchIds: string[] }) {
  const name = text(input.name, 120);
  const email = normalizeEmail(input.email);
  if (!validEmail(email) || !validPassword(input.password)) throw new TeamError("Correo o contraseña inválidos. Usa al menos 12 caracteres y máximo 256 bytes.");
  // Check authorization before expensive password hashing, and again in the write transaction.
  await db.$transaction((tx) => authorize(tx, scope));
  const passwordHash = await hashPassword(input.password);
  const organizationId = scope.organizationId;
  return db.$transaction(async (tx) => {
    await authorize(tx, scope);
    const branchIds = await validateAssignments(tx, organizationId, input.roleId, input.branchIds);
    if (await tx.user.findUnique({ where: { email }, select: { id: true } })) throw new TeamError("No se pudo crear la cuenta con ese correo. Usa uno diferente.");
    const user = await tx.user.create({ data: { name, email, passwordHash } });
    const member = await tx.membership.create({ data: { organizationId, userId: user.id, roleId: input.roleId } });
    await tx.membershipBranch.createMany({ data: branchIds.map((branchId) => ({ organizationId, membershipId: member.id, branchId })) });
    await recordAudit(tx, scope, "MEMBER_CREATED", "Membership", member.id, { roleId: input.roleId, branchIds });
    return member.id;
  }, { isolationLevel: "Serializable" });
}

export function updateMember(db: PrismaClient, scope: Scope, input: { id: string; roleId: string; branchIds: string[]; active: boolean }) {
  const organizationId = scope.organizationId;
  return db.$transaction(async (tx) => {
    await authorize(tx, scope);
    const member = await tx.membership.findFirst({ where: { id: id(input.id), organizationId }, include: { role: true, branches: true } });
    if (!member || member.id === scope.membershipId || member.role.name === ownerName) throw new TeamError("No puedes modificar la cuenta del propietario.");
    const branchIds = await validateAssignments(tx, organizationId, input.roleId, input.branchIds);
    await tx.membership.update({ where: { id: member.id }, data: { roleId: input.roleId, active: input.active } });
    await tx.membershipBranch.deleteMany({ where: { organizationId, membershipId: member.id } });
    await tx.membershipBranch.createMany({ data: branchIds.map((branchId) => ({ organizationId, membershipId: member.id, branchId })) });
    // Clear sessions in this membership only, never sessions in another organization.
    await tx.session.deleteMany({ where: { userId: member.userId, membershipId: member.id } });
    await recordAudit(tx, scope, "MEMBER_ACCESS_UPDATED", "Membership", member.id, { beforeRoleId: member.roleId, roleId: input.roleId, beforeActive: member.active, active: input.active, beforeBranchIds: member.branches.map((entry) => entry.branchId), branchIds });
  }, { isolationLevel: "Serializable" });
}

export function saveBranch(db: PrismaClient, scope: Scope, input: { id?: string; name: string; code: string; address: string }) {
  const name = text(input.name, 120);
  const code = text(input.code, 30).toUpperCase();
  const address = text(input.address, 250, false) || null;
  if (!/^[A-Z0-9_-]+$/.test(code)) throw new TeamError("El código solo admite letras, números, guiones y guiones bajos.");
  const organizationId = scope.organizationId;
  return db.$transaction(async (tx) => {
    await authorize(tx, scope);
    if (input.id) {
      const result = await tx.branch.updateMany({ where: { id: id(input.id), organizationId, active: true }, data: { name, code, address } });
      if (result.count !== 1) throw new TeamError("Sucursal no disponible.");
      await recordAudit(tx, scope, "BRANCH_UPDATED", "Branch", input.id, { code });
      return;
    }
    const branch = await tx.branch.create({ data: { organizationId, name, code, address } });
    await tx.membershipBranch.create({ data: { organizationId, membershipId: scope.membershipId, branchId: branch.id } });
    await recordAudit(tx, scope, "BRANCH_CREATED", "Branch", branch.id, { code });
  }, { isolationLevel: "Serializable" });
}
