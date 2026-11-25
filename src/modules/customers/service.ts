import { recordAudit } from "@/modules/audit/service";
import type { PrismaClient } from "@/generated/prisma/client";

type Scope = { organizationId: string; branchId: string; membershipId: string };
type Input = { id?: string; name: string; phone: string; email: string; active: boolean };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export class CustomerError extends Error {}

export function saveCustomer(db: PrismaClient, scope: Scope, input: Input) {
  const name = input.name.trim();
  const phone = input.phone.trim();
  const email = input.email.trim().toLowerCase();
  if (!name || name.length > 120 || phone.length > 40 || email.length > 254 || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) || (input.id && !uuid.test(input.id))) throw new CustomerError("Revisa el nombre y los datos de contacto.");
  const { organizationId, branchId, membershipId } = scope;
  const data = { name, phone: phone || null, email: email || null, active: input.active };
  return db.$transaction(async (tx) => {
    const member = await tx.membership.findFirst({ where: { id: membershipId, organizationId, active: true, user: { active: true }, organization: { active: true }, role: { permissions: { some: { permissionCode: "orders.manage" } } }, branches: { some: { branchId, branch: { active: true } } } }, select: { id: true } });
    if (!member) throw new CustomerError("No tienes autorización para esta sucursal.");
    if (!input.id) {
      const customer = await tx.customer.create({ data: { organizationId, branchId, ...data } });
      await recordAudit(tx, scope, "CUSTOMER_CREATED", "Customer", customer.id, { active: input.active });
      return customer;
    }
    const result = await tx.customer.updateMany({ where: { id: input.id, organizationId, branchId }, data });
    if (result.count !== 1) throw new CustomerError("Cliente no encontrado en esta sucursal.");
    await recordAudit(tx, scope, "CUSTOMER_UPDATED", "Customer", input.id, { active: input.active });
    return tx.customer.findUniqueOrThrow({ where: { id: input.id } });
  }, { isolationLevel: "Serializable" });
}

export function searchCustomers(db: PrismaClient, organizationId: string, branchId: string, query: string) {
  const q = query.trim().slice(0, 120);
  return db.customer.findMany({ where: { organizationId, branchId, ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" as const } }, { phone: { contains: q } }, { email: { contains: q, mode: "insensitive" as const } }] } : {}) }, orderBy: [{ name: "asc" }, { id: "asc" }], take: 100 });
}

export async function listPosCustomers(db: PrismaClient, organizationId: string, branchId: string, selected?: string) {
  const where = { organizationId, branchId, active: true };
  const select = { id: true, name: true, phone: true } as const;
  const customers = await db.customer.findMany({ where, select, orderBy: { updatedAt: "desc" }, take: 100 });
  if (typeof selected === "string" && uuid.test(selected) && !customers.some((customer) => customer.id === selected)) {
    const customer = await db.customer.findFirst({ where: { ...where, id: selected }, select });
    if (customer) customers.unshift(customer);
  }
  return customers;
}

export async function customerHistory(db: PrismaClient, organizationId: string, branchId: string, customerId: string) {
  if (!uuid.test(customerId)) return null;
  const customer = await db.customer.findFirst({ where: { id: customerId, organizationId, branchId } });
  if (!customer) return null;
  const where = { organizationId, branchId, customerId };
  const [orders, paid] = await Promise.all([
    db.order.findMany({ where, orderBy: { createdAt: "desc" }, take: 50, select: { id: true, createdAt: true, status: true, channel: true, total: true, currency: true, lines: { select: { id: true, productName: true, variantName: true, quantity: true } } } }),
    db.order.groupBy({ by: ["currency"], where: { ...where, status: "COMPLETED", payment: { isNot: null } }, _sum: { total: true }, _count: { _all: true } }),
  ]);
  return { customer, orders, paid };
}
