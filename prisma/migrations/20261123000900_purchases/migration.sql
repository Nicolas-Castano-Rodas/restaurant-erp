CREATE TYPE "PurchaseStatus" AS ENUM ('DRAFT','RECEIVED','CANCELLED');
CREATE TABLE "Supplier" (
  "id" UUID NOT NULL PRIMARY KEY, "organizationId" UUID NOT NULL, "name" TEXT NOT NULL,
  "taxId" TEXT, "phone" TEXT, "email" TEXT, "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Supplier_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Supplier_organizationId_id_key" ON "Supplier"("organizationId","id");
CREATE UNIQUE INDEX "Supplier_organizationId_name_key" ON "Supplier"("organizationId","name");
CREATE TABLE "Purchase" (
  "id" UUID NOT NULL PRIMARY KEY, "organizationId" UUID NOT NULL, "branchId" UUID NOT NULL, "supplierId" UUID NOT NULL,
  "createdById" UUID NOT NULL, "closedById" UUID, "requestId" UUID NOT NULL, "supplierName" TEXT NOT NULL,
  "reference" TEXT, "note" TEXT, "currency" VARCHAR(3) NOT NULL, "status" "PurchaseStatus" NOT NULL DEFAULT 'DRAFT',
  "total" DECIMAL(16,2) NOT NULL DEFAULT 0, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "closedAt" TIMESTAMP(3), "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Purchase_total_check" CHECK ("total" >= 0),
  CONSTRAINT "Purchase_status_check" CHECK (("status" = 'DRAFT' AND "closedAt" IS NULL AND "closedById" IS NULL) OR ("status" <> 'DRAFT' AND "closedAt" IS NOT NULL AND "closedById" IS NOT NULL)),
  CONSTRAINT "Purchase_organizationId_branchId_fkey" FOREIGN KEY ("organizationId","branchId") REFERENCES "Branch"("organizationId","id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Purchase_organizationId_supplierId_fkey" FOREIGN KEY ("organizationId","supplierId") REFERENCES "Supplier"("organizationId","id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Purchase_organizationId_createdById_fkey" FOREIGN KEY ("organizationId","createdById") REFERENCES "Membership"("organizationId","id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Purchase_organizationId_closedById_fkey" FOREIGN KEY ("organizationId","closedById") REFERENCES "Membership"("organizationId","id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Purchase_organizationId_branchId_id_key" ON "Purchase"("organizationId","branchId","id");
CREATE UNIQUE INDEX "Purchase_organizationId_branchId_requestId_key" ON "Purchase"("organizationId","branchId","requestId");
CREATE INDEX "Purchase_organizationId_branchId_status_createdAt_idx" ON "Purchase"("organizationId","branchId","status","createdAt");
CREATE TABLE "PurchaseLine" (
  "id" UUID NOT NULL PRIMARY KEY, "organizationId" UUID NOT NULL, "branchId" UUID NOT NULL, "purchaseId" UUID NOT NULL,
  "ingredientId" UUID NOT NULL, "ingredientName" TEXT NOT NULL, "unit" "IngredientUnit" NOT NULL,
  "quantity" DECIMAL(16,3) NOT NULL, "unitCost" DECIMAL(12,2) NOT NULL, "lineTotal" DECIMAL(16,2) NOT NULL,
  CONSTRAINT "PurchaseLine_amount_check" CHECK ("quantity" > 0 AND "unitCost" >= 0 AND "lineTotal" = ROUND("quantity" * "unitCost", 2) AND ("unit" <> 'UNIT' OR "quantity" = TRUNC("quantity"))),
  CONSTRAINT "PurchaseLine_organizationId_branchId_purchaseId_fkey" FOREIGN KEY ("organizationId","branchId","purchaseId") REFERENCES "Purchase"("organizationId","branchId","id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PurchaseLine_organizationId_ingredientId_fkey" FOREIGN KEY ("organizationId","ingredientId") REFERENCES "Ingredient"("organizationId","id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "PurchaseLine_purchase_ingredient_key" ON "PurchaseLine"("organizationId","branchId","purchaseId","ingredientId");
CREATE INDEX "PurchaseLine_organizationId_ingredientId_idx" ON "PurchaseLine"("organizationId","ingredientId");
ALTER TABLE "StockMovement" ADD COLUMN "purchaseId" UUID;
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_purchase_check" CHECK ("purchaseId" IS NULL OR ("kind" = 'ENTRY' AND "orderId" IS NULL));
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_organizationId_branchId_purchaseId_fkey" FOREIGN KEY ("organizationId","branchId","purchaseId") REFERENCES "Purchase"("organizationId","branchId","id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE UNIQUE INDEX "StockMovement_purchase_ingredient_key" ON "StockMovement"("organizationId","branchId","purchaseId","ingredientId");
