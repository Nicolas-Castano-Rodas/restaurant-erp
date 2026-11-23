CREATE TYPE "KitchenStatus" AS ENUM ('PENDING', 'PREPARING', 'READY', 'SERVED');
ALTER TABLE "Order" ADD COLUMN "kitchenStatus" "KitchenStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN "preparingAt" TIMESTAMP(3),
ADD COLUMN "readyAt" TIMESTAMP(3),
ADD COLUMN "servedAt" TIMESTAMP(3);
CREATE INDEX "Order_organizationId_branchId_kitchenStatus_createdAt_idx" ON "Order"("organizationId", "branchId", "kitchenStatus", "createdAt");
