CREATE TYPE "DeliveryStatus" AS ENUM ('PENDING','ASSIGNED','DISPATCHED','DELIVERED');
ALTER TABLE "Order" ADD COLUMN "deliveryFee" DECIMAL(16,2) NOT NULL DEFAULT 0;
ALTER TABLE "Order" DROP CONSTRAINT "Order_totals_check";
ALTER TABLE "Order" ADD CONSTRAINT "Order_totals_check" CHECK ("subtotal" >= 0 AND "discount" >= 0 AND "discount" <= "subtotal" AND "tax" >= 0 AND "deliveryFee" >= 0 AND ("channel" = 'DELIVERY' OR "deliveryFee" = 0) AND "total" = "subtotal" - "discount" + "tax" + "deliveryFee");
CREATE TABLE "Courier" (
  "id" UUID NOT NULL PRIMARY KEY, "organizationId" UUID NOT NULL, "branchId" UUID NOT NULL,
  "name" TEXT NOT NULL, "phone" TEXT, "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Courier_organizationId_branchId_fkey" FOREIGN KEY ("organizationId","branchId") REFERENCES "Branch"("organizationId","id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Courier_organizationId_branchId_id_key" ON "Courier"("organizationId","branchId","id");
CREATE INDEX "Courier_organizationId_branchId_active_idx" ON "Courier"("organizationId","branchId","active");
CREATE TABLE "Delivery" (
  "id" UUID NOT NULL PRIMARY KEY, "organizationId" UUID NOT NULL, "branchId" UUID NOT NULL,
  "orderId" UUID NOT NULL, "courierId" UUID, "recipient" TEXT NOT NULL, "phone" TEXT NOT NULL, "address" TEXT NOT NULL, "instructions" TEXT,
  "status" "DeliveryStatus" NOT NULL DEFAULT 'PENDING', "assignedAt" TIMESTAMP(3), "dispatchedAt" TIMESTAMP(3), "deliveredAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Delivery_organizationId_branchId_orderId_fkey" FOREIGN KEY ("organizationId","branchId","orderId") REFERENCES "Order"("organizationId","branchId","id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Delivery_organizationId_branchId_courierId_fkey" FOREIGN KEY ("organizationId","branchId","courierId") REFERENCES "Courier"("organizationId","branchId","id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Delivery_state_check" CHECK (("status" = 'PENDING' AND "courierId" IS NULL AND "assignedAt" IS NULL AND "dispatchedAt" IS NULL AND "deliveredAt" IS NULL) OR ("status" = 'ASSIGNED' AND "courierId" IS NOT NULL AND "assignedAt" IS NOT NULL AND "dispatchedAt" IS NULL AND "deliveredAt" IS NULL) OR ("status" = 'DISPATCHED' AND "courierId" IS NOT NULL AND "assignedAt" IS NOT NULL AND "dispatchedAt" IS NOT NULL AND "deliveredAt" IS NULL) OR ("status" = 'DELIVERED' AND "courierId" IS NOT NULL AND "assignedAt" IS NOT NULL AND "dispatchedAt" IS NOT NULL AND "deliveredAt" IS NOT NULL))
);
CREATE UNIQUE INDEX "Delivery_organizationId_branchId_orderId_key" ON "Delivery"("organizationId","branchId","orderId");
CREATE INDEX "Delivery_organizationId_branchId_status_createdAt_idx" ON "Delivery"("organizationId","branchId","status","createdAt");
