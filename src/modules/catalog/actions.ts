"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getPrisma } from "@/lib/prisma";
import { requireWorkspace } from "@/modules/auth/workspace";
import { validPrice } from "./service";

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
    const db = getPrisma();
    if (id) {
      const result = await db.category.updateMany({ where: { id, organizationId }, data: { name, active } });
      if (!result.count) throw new Error("Category not found");
    } else {
      await db.category.create({ data: { organizationId, name, active } });
    }
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
    const db = getPrisma();
    if (id) {
      const result = await db.product.updateMany({ where: { id, organizationId }, data });
      if (!result.count) throw new Error("Product not found");
    } else {
      await db.product.create({ data: { organizationId, ...data } });
    }
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
    const db = getPrisma();
    if (id) {
      const result = await db.productVariant.updateMany({ where: { id, organizationId, productId }, data });
      if (!result.count) throw new Error("Variant not found");
    } else {
      await db.productVariant.create({ data: { organizationId, productId, ...data } });
    }
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
    const db = getPrisma();
    if (id) {
      const result = await db.restaurantTable.updateMany({ where: { id, organizationId, branchId }, data });
      if (!result.count) throw new Error("Table not found");
    } else {
      await db.restaurantTable.create({ data: { organizationId, branchId, ...data } });
    }
  } catch {
    fail(path);
  }
  finish(path);
}
