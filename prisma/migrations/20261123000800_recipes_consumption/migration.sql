ALTER TABLE "InventoryBalance" ADD COLUMN "unitCost" DECIMAL(12,2);
ALTER TABLE "InventoryBalance" ADD CONSTRAINT "InventoryBalance_cost_check" CHECK ("unitCost" >= 0);
ALTER TABLE "StockMovement" ADD COLUMN "orderId" UUID, ADD COLUMN "unitCost" DECIMAL(12,2);
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_cost_check" CHECK ("unitCost" >= 0);
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_order_check" CHECK ("orderId" IS NULL OR "kind" = 'EXIT');
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_organizationId_branchId_orderId_fkey" FOREIGN KEY ("organizationId", "branchId", "orderId") REFERENCES "Order"("organizationId", "branchId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE UNIQUE INDEX "StockMovement_organizationId_branchId_orderId_ingredientId_key" ON "StockMovement"("organizationId", "branchId", "orderId", "ingredientId");
CREATE TABLE "RecipeLine" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "productId" UUID NOT NULL,
  "variantId" UUID,
  "ingredientId" UUID NOT NULL,
  "quantity" DECIMAL(16,3) NOT NULL,
  CONSTRAINT "RecipeLine_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RecipeLine_quantity_check" CHECK ("quantity" > 0)
);
CREATE UNIQUE INDEX "RecipeLine_organizationId_productId_variantId_ingredientId_key" ON "RecipeLine"("organizationId", "productId", "variantId", "ingredientId");
CREATE UNIQUE INDEX "RecipeLine_base_unique" ON "RecipeLine"("organizationId", "productId", "ingredientId") WHERE "variantId" IS NULL;
CREATE INDEX "RecipeLine_organizationId_ingredientId_idx" ON "RecipeLine"("organizationId", "ingredientId");
ALTER TABLE "RecipeLine" ADD CONSTRAINT "RecipeLine_organizationId_productId_fkey" FOREIGN KEY ("organizationId", "productId") REFERENCES "Product"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RecipeLine" ADD CONSTRAINT "RecipeLine_organizationId_productId_variantId_fkey" FOREIGN KEY ("organizationId", "productId", "variantId") REFERENCES "ProductVariant"("organizationId", "productId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RecipeLine" ADD CONSTRAINT "RecipeLine_organizationId_ingredientId_fkey" FOREIGN KEY ("organizationId", "ingredientId") REFERENCES "Ingredient"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
