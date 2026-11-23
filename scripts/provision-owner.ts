import "dotenv/config";
import { getPrisma } from "../src/lib/prisma";
import { hashPassword } from "../src/modules/auth/password";
import { permissions } from "../src/modules/auth/permissions";
import { normalizeEmail, validEmail } from "../src/modules/auth/service";

async function main() {
  const email = normalizeEmail(process.env.OWNER_EMAIL ?? "");
  const name = process.env.OWNER_NAME?.trim() ?? "";
  const password = process.env.OWNER_PASSWORD ?? "";
  const organizationName = process.env.OWNER_ORGANIZATION?.trim() ?? "";
  const slug = process.env.OWNER_SLUG?.trim() ?? "";
  if (!validEmail(email) || !name || !organizationName || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error("Configure OWNER_EMAIL, OWNER_NAME, OWNER_PASSWORD, OWNER_ORGANIZATION and OWNER_SLUG");
  }
  const passwordHash = await hashPassword(password);
  const db = getPrisma();
  try {
    await db.$transaction(async (tx) => {
      const organization = await tx.organization.create({ data: { name: organizationName, slug } });
      const branch = await tx.branch.create({ data: { organizationId: organization.id, name: "Sucursal principal", code: "MAIN" } });
      const user = await tx.user.create({ data: { email, name, passwordHash } });
      const role = await tx.role.create({ data: { organizationId: organization.id, name: "Propietario" } });
      for (const permission of permissions) {
        await tx.permission.upsert({ where: { code: permission.code }, create: permission, update: { description: permission.description } });
        await tx.rolePermission.create({ data: { roleId: role.id, permissionCode: permission.code } });
      }
      const membership = await tx.membership.create({ data: { organizationId: organization.id, userId: user.id, roleId: role.id } });
      await tx.membershipBranch.create({ data: { organizationId: organization.id, membershipId: membership.id, branchId: branch.id } });
    });
    console.log("Owner and organization created.");
  } finally {
    await db.$disconnect();
  }
}

main().catch(() => {
  console.error("Provisioning failed. Check configuration and whether the account or organization already exists.");
  process.exitCode = 1;
});
