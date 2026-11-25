import { randomUUID } from "node:crypto";
import { getPrisma } from "../src/lib/prisma";
import { hashPassword, validPassword } from "../src/modules/auth/password";
import { permissions } from "../src/modules/auth/permissions";

export function requireDisposableDatabase(mode: "test" | "demo") {
  let url: URL;
  try { url = new URL(process.env.DATABASE_URL ?? "invalid"); } catch { throw new Error("Configure a valid local disposable database URL."); }
  const expected = mode === "test" ? "restaurant_erp_test" : "restaurant_erp_demo";
  const allowed = mode === "test" ? process.env.RUN_BROWSER_TESTS === "true" : process.env.ALLOW_DEMO_SEED === "true";
  if (!allowed || !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) || decodeURIComponent(url.pathname.slice(1)) !== expected || !["postgres:", "postgresql:"].includes(url.protocol)) throw new Error("Use an explicitly enabled local disposable database: " + expected);
}

// Synthetic tenant only. No existing rows are overwritten; credentials are supplied by the caller.
export async function createDemoFixture(mode: "test" | "demo", password: string) {
  requireDisposableDatabase(mode);
  if (!validPassword(password)) throw new Error("Use a password of at least 12 characters.");
  const db = getPrisma();
  const suffix = randomUUID();
  const ownerEmail = `owner-${suffix}@example.invalid`;
  const staffEmail = `staff-${suffix}@example.invalid`;
  const passwordHash = await hashPassword(password);
  return db.$transaction(async (tx) => {
    const organization = await tx.organization.create({ data: { name: "Restaurante Demo (datos ficticios)", slug: `demo-${suffix}` } });
    const organizationId = organization.id;
    const branch = await tx.branch.create({ data: { organizationId, name: "Sucursal Demo", code: "DEMO" } });
    const branchId = branch.id;
    const owner = await tx.role.create({ data: { organizationId, name: "Propietario" } });
    const staff = await tx.role.create({ data: { organizationId, name: "Mesero" } });
    for (const permission of permissions) {
      await tx.permission.upsert({ where: { code: permission.code }, create: permission, update: {} });
      await tx.rolePermission.create({ data: { roleId: owner.id, permissionCode: permission.code } });
    }
    await tx.rolePermission.create({ data: { roleId: staff.id, permissionCode: "orders.manage" } });
    const ownerUser = await tx.user.create({ data: { name: "Propietario Demo", email: ownerEmail, passwordHash } });
    const staffUser = await tx.user.create({ data: { name: "Mesero Demo", email: staffEmail, passwordHash } });
    const membership = await tx.membership.create({ data: { organizationId, userId: ownerUser.id, roleId: owner.id } });
    const staffMembership = await tx.membership.create({ data: { organizationId, userId: staffUser.id, roleId: staff.id } });
    await tx.membershipBranch.createMany({ data: [membership.id, staffMembership.id].map((membershipId) => ({ organizationId, branchId, membershipId })) });
    const category = await tx.category.create({ data: { organizationId, name: "Especialidades" } });
    const product = await tx.product.create({ data: { organizationId, categoryId: category.id, name: "Arroz demo", price: "25000" } });
    await tx.product.create({ data: { organizationId, categoryId: category.id, name: "Bebida demo", price: "5000" } });
    const ingredient = await tx.ingredient.create({ data: { organizationId, name: "Arroz", unit: "KG" } });
    await tx.inventoryBalance.create({ data: { organizationId, branchId, ingredientId: ingredient.id, quantity: "10.000", minimum: "2.000", unitCost: "4000" } });
    await tx.recipeLine.create({ data: { organizationId, productId: product.id, ingredientId: ingredient.id, quantity: "0.500" } });
    await tx.restaurantTable.create({ data: { organizationId, branchId, name: "Mesa demo 1", capacity: 4 } });
    await tx.customer.create({ data: { organizationId, branchId, name: "Cliente ficticio" } });
    await tx.courier.create({ data: { organizationId, branchId, name: "Domiciliario ficticio" } });
    return { organizationId, branchId, ingredientId: ingredient.id, ownerEmail, staffEmail, ownerContext: `${membership.id}:${branchId}`, staffContext: `${staffMembership.id}:${branchId}` };
  }, { timeout: 15000 });
}
