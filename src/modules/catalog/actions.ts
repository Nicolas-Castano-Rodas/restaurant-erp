"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getPrisma } from "@/lib/prisma";
import { requireWorkspace } from "@/modules/auth/workspace";
import { recordAudit } from "@/modules/audit/service";
import type { Prisma } from "@/generated/prisma/client";
import { validPrice } from "./service";

async function verifyAccess(tx: Prisma.TransactionClient, scope: { organizationId: string; branchId: string; membershipId: string }, permission: string) {
  const member = await tx.membership.findFirst({ where: { id: scope.membershipId, organizationId: scope.organizationId, active: true, user: { active: true }, organization: { active: true }, role: { permissions: { some: { permissionCode: permission } } }, branches: { some: { branchId: scope.branchId, branch: { active: true } } } }, select: { id: true } });
  if (!member) throw new Error("Forbidden");
}

function field(form: FormData, key: string, max = 120): string {
  const value = form.get(key);
  return typeof value === "string" && value.length <= max ? value.trim() : "";
}
function uuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
function fail(path: string): never {
  redirect(`${path}?error=invalid`);
}
function finish(path: string): never {
  revalidatePath(path);
  revalidatePath("/dashboard/pos");
  redirect(`${path}?saved=1`);
}

export async function saveCategory(form: FormData) {
  const path = "/dashboard/catalog";
  const context = await requireWorkspace("catalog.manage");
  const organizationId = context.organization.id;
  if (field(form, "scope") !== organizationId) fail(path);
  const name = field(form, "name");
  const id = field(form, "id");
  const active = form.get("active") === "on";
  if (!name || (id && !uuid(id))) fail(path);
  try {
    const scope = { organizationId, branchId: context.branch.id, membershipId: context.membershipId };
    await getPrisma().$transaction(async (tx) => {
      await verifyAccess(tx, scope, "catalog.manage");
    if (id) {
      const result = await tx.category.updateMany({ where: { id, organizationId }, data: { name, active } });
      if (!result.count) throw new Error("Category not found");
      await recordAudit(tx, scope, "CATEGORY_UPDATED", "Category", id, { active });
    } else {
      const created = await tx.category.create({ data: { organizationId, name, active } });
      await recordAudit(tx, scope, "CATEGORY_CREATED", "Category", created.id, { active });
    }
    }, { isolationLevel: "Serializable" });
  } catch {
    fail(path);
  }
  finish(path);
}

export async function saveProduct(form: FormData) {
  const path = "/dashboard/catalog";
  const context = await requireWorkspace("catalog.manage");
  const organizationId = context.organization.id;
  if (field(form, "scope") !== organizationId) fail(path);
  const name = field(form, "name");
  const id = field(form, "id");
  const categoryId = field(form, "categoryId");
  const price = field(form, "price", 20);
  const description = field(form, "description", 500) || null;
  if (!name || !uuid(categoryId) || !validPrice(price) || (id && !uuid(id))) fail(path);
  const data = { categoryId, name, description, price, active: form.get("active") === "on", available: form.get("available") === "on" };
  try {
    const scope = { organizationId, branchId: context.branch.id, membershipId: context.membershipId };
    await getPrisma().$transaction(async (tx) => {
      await verifyAccess(tx, scope, "catalog.manage");
    if (id) {
      const result = await tx.product.updateMany({ where: { id, organizationId }, data });
      if (!result.count) throw new Error("Product not found");
      await recordAudit(tx, scope, "PRODUCT_UPDATED", "Product", id, { categoryId, price, active: data.active, available: data.available });
    } else {
      const created = await tx.product.create({ data: { organizationId, ...data } });
      await recordAudit(tx, scope, "PRODUCT_CREATED", "Product", created.id, { categoryId, price, active: data.active, available: data.available });
    }
    }, { isolationLevel: "Serializable" });
  } catch {
    fail(path);
  }
  finish(path);
}

export async function saveVariant(form: FormData) {
  const path = "/dashboard/catalog";
  const context = await requireWorkspace("catalog.manage");
  const organizationId = context.organization.id;
  if (field(form, "scope") !== organizationId) fail(path);
  const name = field(form, "name");
  const id = field(form, "id");
  const productId = field(form, "productId");
  const price = field(form, "price", 20);
  if (!name || !uuid(productId) || !validPrice(price) || (id && !uuid(id))) fail(path);
  const data = { name, price, active: form.get("active") === "on" };
  try {
    const scope = { organizationId, branchId: context.branch.id, membershipId: context.membershipId };
    await getPrisma().$transaction(async (tx) => {
      await verifyAccess(tx, scope, "catalog.manage");
    if (id) {
      const result = await tx.productVariant.updateMany({ where: { id, organizationId, productId }, data });
      if (!result.count) throw new Error("Variant not found");
      await recordAudit(tx, scope, "VARIANT_UPDATED", "ProductVariant", id, { productId, price, active: data.active });
    } else {
      const created = await tx.productVariant.create({ data: { organizationId, productId, ...data } });
      await recordAudit(tx, scope, "VARIANT_CREATED", "ProductVariant", created.id, { productId, price, active: data.active });
    }
    }, { isolationLevel: "Serializable" });
  } catch {
    fail(path);
  }
  finish(path);
}

export async function saveTable(form: FormData) {
  const path = "/dashboard/tables";
  const context = await requireWorkspace("orders.manage");
  const organizationId = context.organization.id;
  const branchId = context.branch.id;
  if (field(form, "scope") !== `${organizationId}:${branchId}`) fail(path);
  const id = field(form, "id");
  const name = field(form, "name");
  const capacity = Number(field(form, "capacity", 3));
  if (!name || !Number.isInteger(capacity) || capacity < 1 || capacity > 100 || (id && !uuid(id))) fail(path);
  const data = { name, capacity, active: form.get("active") === "on" };
  try {
    const scope = { organizationId, branchId: context.branch.id, membershipId: context.membershipId };
    await getPrisma().$transaction(async (tx) => {
      await verifyAccess(tx, scope, "orders.manage");
    if (id) {
      const result = await tx.restaurantTable.updateMany({ where: { id, organizationId, branchId }, data });
      if (!result.count) throw new Error("Table not found");
      await recordAudit(tx, scope, "TABLE_UPDATED", "RestaurantTable", id, { capacity, active: data.active });
    } else {
      const created = await tx.restaurantTable.create({ data: { organizationId, branchId, ...data } });
      await recordAudit(tx, scope, "TABLE_CREATED", "RestaurantTable", created.id, { capacity, active: data.active });
    }
    }, { isolationLevel: "Serializable" });
  } catch {
    fail(path);
  }
  finish(path);
}
