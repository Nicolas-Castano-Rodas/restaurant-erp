CREATE TYPE "OrderChannel" AS ENUM ('DINE_IN', 'TAKEAWAY', 'DELIVERY');
CREATE TYPE "OrderStatus" AS ENUM ('OPEN', 'COMPLETED', 'CANCELLED');
CREATE UNIQUE INDEX "ProductVariant_organizationId_productId_id_key" ON "ProductVariant"("organizationId", "productId", "id");
CREATE TABLE "Order" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "branchId" UUID NOT NULL,
  "membershipId" UUID NOT NULL,
  "tableId" UUID,
  "tableName" TEXT,
  "requestId" UUID NOT NULL,
  "requestHash" VARCHAR(64) NOT NULL,
  "channel" "OrderChannel" NOT NULL,
  "status" "OrderStatus" NOT NULL DEFAULT 'OPEN',
  "currency" VARCHAR(3) NOT NULL,
  "subtotal" DECIMAL(16,2) NOT NULL,
  "discount" DECIMAL(16,2) NOT NULL DEFAULT 0,
  "tax" DECIMAL(16,2) NOT NULL DEFAULT 0,
  "total" DECIMAL(16,2) NOT NULL,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Order_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Order_channel_table_check" CHECK (("channel" = 'DINE_IN' AND "tableId" IS NOT NULL AND "tableName" IS NOT NULL) OR ("channel" <> 'DINE_IN' AND "tableId" IS NULL AND "tableName" IS NULL)),
  CONSTRAINT "Order_totals_check" CHECK ("subtotal" >= 0 AND "discount" >= 0 AND "discount" <= "subtotal" AND "tax" >= 0 AND "total" = "subtotal" - "discount" + "tax")
);
CREATE TABLE "OrderLine" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "orderId" UUID NOT NULL,
  "productId" UUID NOT NULL,
  "variantId" UUID,
  "productName" TEXT NOT NULL,
  "variantName" TEXT,
  "quantity" INTEGER NOT NULL,
  "unitPrice" DECIMAL(12,2) NOT NULL,
  "lineTotal" DECIMAL(16,2) NOT NULL,
  CONSTRAINT "OrderLine_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "OrderLine_amount_check" CHECK ("quantity" BETWEEN 1 AND 99 AND "unitPrice" >= 0 AND "lineTotal" = "unitPrice" * "quantity")
);
CREATE UNIQUE INDEX "Order_organizationId_id_key" ON "Order"("organizationId", "id");
CREATE UNIQUE INDEX "Order_organizationId_branchId_requestId_key" ON "Order"("organizationId", "branchId", "requestId");
CREATE INDEX "Order_organizationId_branchId_status_createdAt_idx" ON "Order"("organizationId", "branchId", "status", "createdAt");
CREATE UNIQUE INDEX "Order_open_table_unique" ON "Order"("organizationId", "branchId", "tableId") WHERE "status" = 'OPEN' AND "tableId" IS NOT NULL;
CREATE INDEX "OrderLine_organizationId_orderId_idx" ON "OrderLine"("organizationId", "orderId");
CREATE INDEX "OrderLine_organizationId_productId_variantId_idx" ON "OrderLine"("organizationId", "productId", "variantId");
ALTER TABLE "Order" ADD CONSTRAINT "Order_organizationId_branchId_fkey" FOREIGN KEY ("organizationId", "branchId") REFERENCES "Branch"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_organizationId_membershipId_fkey" FOREIGN KEY ("organizationId", "membershipId") REFERENCES "Membership"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_organizationId_branchId_tableId_fkey" FOREIGN KEY ("organizationId", "branchId", "tableId") REFERENCES "RestaurantTable"("organizationId", "branchId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OrderLine" ADD CONSTRAINT "OrderLine_organizationId_orderId_fkey" FOREIGN KEY ("organizationId", "orderId") REFERENCES "Order"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OrderLine" ADD CONSTRAINT "OrderLine_organizationId_productId_fkey" FOREIGN KEY ("organizationId", "productId") REFERENCES "Product"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OrderLine" ADD CONSTRAINT "OrderLine_organizationId_productId_variantId_fkey" FOREIGN KEY ("organizationId", "productId", "variantId") REFERENCES "ProductVariant"("organizationId", "productId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
