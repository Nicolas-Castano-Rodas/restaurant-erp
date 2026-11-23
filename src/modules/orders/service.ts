import { createHash } from "node:crypto";
import type { PrismaClient } from "@/generated/prisma/client";
import { fromMinor, toMinor } from "./money";

type Scope = { organizationId: string; branchId: string; membershipId: string };
type Channel = "DINE_IN" | "TAKEAWAY" | "DELIVERY";
type Item = { productId: string; variantId: string | null; quantity: number };
export type OrderInput = { requestId: string; channel: Channel; tableId: string | null; note: string; items: Item[] };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class OrderError extends Error {}

export function parseOrderInput(raw: unknown): OrderInput {
  if (!raw || typeof raw !== "object") throw new OrderError("Pedido inválido.");
  const data = raw as Record<string, unknown>;
  const { requestId, channel, tableId, note, items } = data;
  if (typeof requestId !== "string" || !uuid.test(requestId) ||
    (channel !== "DINE_IN" && channel !== "TAKEAWAY" && channel !== "DELIVERY") ||
    (channel === "DINE_IN" ? typeof tableId !== "string" || !uuid.test(tableId) : tableId !== null) ||
    typeof note !== "string" || note.length > 500 || !Array.isArray(items) || !items.length || items.length > 100) {
    throw new OrderError("Revisa los datos del pedido.");
  }
  const seen = new Set<string>();
  const validated = items.map((rawItem: unknown): Item => {
    if (!rawItem || typeof rawItem !== "object") throw new OrderError("Producto inválido.");
    const { productId, variantId, quantity } = rawItem as Record<string, unknown>;
    if (typeof productId !== "string" || !uuid.test(productId) || (variantId !== null && (typeof variantId !== "string" || !uuid.test(variantId))) ||
      typeof quantity !== "number" || !Number.isInteger(quantity) || quantity < 1 || quantity > 99) throw new OrderError("Producto o cantidad inválida.");
    const key = `${productId}:${variantId ?? ""}`;
    if (seen.has(key)) throw new OrderError("No repitas líneas del mismo producto y variante.");
    seen.add(key);
    return { productId, variantId, quantity };
  });
  validated.sort((a, b) => `${a.productId}:${a.variantId ?? ""}`.localeCompare(`${b.productId}:${b.variantId ?? ""}`));
  return { requestId, channel, tableId: channel === "DINE_IN" ? tableId as string : null, note: note.trim(), items: validated };
}

export async function createOrder(db: PrismaClient, scope: Scope, input: OrderInput) {
  const { organizationId, branchId, membershipId } = scope;
  const data = parseOrderInput(input);
  const requestHash = createHash("sha256").update(JSON.stringify({ ...data, membershipId })).digest("hex");
  const key = { organizationId, branchId, requestId: data.requestId };
  const existingOrder = async () => {
    const order = await db.order.findUnique({ where: { organizationId_branchId_requestId: key }, select: { id: true, requestHash: true } });
    if (!order) return null;
    if (order.requestHash !== requestHash) throw new OrderError("La solicitud ya fue utilizada para otro pedido.");
    return order.id;
  };
  try {
    return await db.$transaction(async (tx) => {
      const membership = await tx.membership.findFirst({
        where: { id: membershipId, organizationId, active: true, user: { active: true }, organization: { active: true },
          role: { permissions: { some: { permissionCode: "orders.manage" } } },
          branches: { some: { branchId, branch: { active: true } } } },
        select: { organization: { select: { currency: true } } },
      });
      if (!membership) throw new OrderError("No tienes autorización para esta sucursal.");
      const previous = await tx.order.findUnique({ where: { organizationId_branchId_requestId: key }, select: { id: true, requestHash: true } });
      if (previous) {
        if (previous.requestHash !== requestHash) throw new OrderError("La solicitud ya fue utilizada para otro pedido.");
        return previous.id;
      }
      const table = data.tableId ? await tx.restaurantTable.findFirst({ where: { id: data.tableId, organizationId, branchId, active: true } }) : null;
      if (data.tableId && !table) throw new OrderError("Mesa no disponible en esta sucursal.");
      if (table && await tx.order.findFirst({ where: { organizationId, branchId, tableId: table.id, status: "OPEN" }, select: { id: true } })) throw new OrderError("La mesa ya tiene un pedido abierto.");
      const products = await tx.product.findMany({
        where: { organizationId, id: { in: data.items.map((item) => item.productId) }, active: true, available: true, category: { active: true } },
        select: { id: true, name: true, price: true, variants: { where: { active: true, organizationId }, select: { id: true, name: true, price: true } } },
      });
      let subtotal = 0n;
      const lines = data.items.map((item) => {
        const product = products.find((p) => p.id === item.productId);
        if (!product) throw new OrderError("Un producto ya no está disponible.");
        const variant = item.variantId ? product.variants.find((v) => v.id === item.variantId) : null;
        if (item.variantId && !variant) throw new OrderError("Variante no disponible.");
        const unitPrice = toMinor((variant?.price ?? product.price).toFixed(2));
        const lineTotal = unitPrice * BigInt(item.quantity);
        subtotal += lineTotal;
        return { productId: product.id, variantId: variant?.id ?? null, productName: product.name, variantName: variant?.name ?? null, quantity: item.quantity, unitPrice: fromMinor(unitPrice), lineTotal: fromMinor(lineTotal) };
      });
      if (subtotal > 9999999999999999n) throw new OrderError("El importe supera el máximo permitido.");
      const total = fromMinor(subtotal);
      const order = await tx.order.create({ data: {
        ...key, membershipId, requestHash, channel: data.channel, tableId: table?.id ?? null, tableName: table?.name ?? null,
        currency: membership.organization.currency, subtotal: total, total, note: data.note || null,
      }, select: { id: true } });
      await tx.orderLine.createMany({ data: lines.map((line) => ({ ...line, organizationId, orderId: order.id })) });
      return order.id;
    }, { isolationLevel: "Serializable" });
  } catch (error) {
    const code = typeof error === "object" && error !== null && "code" in error ? error.code : null;
    if (code === "P2002" || code === "P2034") {
      // Retry lookup only after rechecking workspace authorization.
      const membership = await db.membership.findFirst({ where: { id: membershipId, organizationId, active: true, user: { active: true }, organization: { active: true }, role: { permissions: { some: { permissionCode: "orders.manage" } } }, branches: { some: { branchId, branch: { active: true } } } }, select: { id: true } });
      if (!membership) throw new OrderError("No tienes autorización para esta sucursal.");
      const previous = await existingOrder();
      if (previous) return previous;
      throw new OrderError("El pedido entró en conflicto con otra operación. Actualiza y vuelve a intentar.");
    }
    throw error;
  }
}

export function listOrders(db: PrismaClient, organizationId: string, branchId: string) {
  return db.order.findMany({
    where: { organizationId, branchId },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { id: true, channel: true, status: true, kitchenStatus: true, tableName: true, total: true, currency: true, createdAt: true, note: true, lines: { select: { id: true, productName: true, variantName: true, quantity: true, lineTotal: true } } },
  });
}
