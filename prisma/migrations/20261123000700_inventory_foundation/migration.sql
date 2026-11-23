CREATE TYPE "IngredientUnit" AS ENUM ('KG', 'G', 'L', 'ML', 'UNIT');
CREATE TYPE "StockMovementKind" AS ENUM ('ENTRY', 'EXIT', 'WASTE');
CREATE TABLE "Ingredient" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "unit" "IngredientUnit" NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Ingredient_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Ingredient_organizationId_id_key" ON "Ingredient"("organizationId", "id");
CREATE UNIQUE INDEX "Ingredient_organizationId_name_key" ON "Ingredient"("organizationId", "name");
ALTER TABLE "Ingredient" ADD CONSTRAINT "Ingredient_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "InventoryBalance" (
  "organizationId" UUID NOT NULL,
  "branchId" UUID NOT NULL,
  "ingredientId" UUID NOT NULL,
  "quantity" DECIMAL(16,3) NOT NULL DEFAULT 0,
  "minimum" DECIMAL(16,3) NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InventoryBalance_pkey" PRIMARY KEY ("organizationId", "branchId", "ingredientId"),
  CONSTRAINT "InventoryBalance_nonnegative" CHECK ("quantity" >= 0 AND "minimum" >= 0)
);
ALTER TABLE "InventoryBalance" ADD CONSTRAINT "InventoryBalance_organizationId_branchId_fkey" FOREIGN KEY ("organizationId", "branchId") REFERENCES "Branch"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryBalance" ADD CONSTRAINT "InventoryBalance_organizationId_ingredientId_fkey" FOREIGN KEY ("organizationId", "ingredientId") REFERENCES "Ingredient"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "StockMovement" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "branchId" UUID NOT NULL,
  "ingredientId" UUID NOT NULL,
  "membershipId" UUID NOT NULL,
  "requestId" UUID NOT NULL,
  "kind" "StockMovementKind" NOT NULL,
  "quantity" DECIMAL(16,3) NOT NULL,
  "balanceAfter" DECIMAL(16,3) NOT NULL,
  "reason" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "StockMovement_amount_check" CHECK ("quantity" > 0 AND "balanceAfter" >= 0)
);
CREATE UNIQUE INDEX "StockMovement_organizationId_branchId_requestId_key" ON "StockMovement"("organizationId", "branchId", "requestId");
CREATE INDEX "StockMovement_organizationId_branchId_createdAt_idx" ON "StockMovement"("organizationId", "branchId", "createdAt");
CREATE INDEX "StockMovement_organizationId_branchId_ingredientId_idx" ON "StockMovement"("organizationId", "branchId", "ingredientId");
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_organizationId_branchId_ingredientId_fkey" FOREIGN KEY ("organizationId", "branchId", "ingredientId") REFERENCES "InventoryBalance"("organizationId", "branchId", "ingredientId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_organizationId_membershipId_fkey" FOREIGN KEY ("organizationId", "membershipId") REFERENCES "Membership"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
