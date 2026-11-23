CREATE TABLE "Category" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Product" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "categoryId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(12,2) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Product_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Product_price_nonnegative" CHECK ("price" >= 0)
);
CREATE TABLE "ProductVariant" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProductVariant_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ProductVariant_price_nonnegative" CHECK ("price" >= 0)
);
CREATE TABLE "RestaurantTable" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RestaurantTable_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "RestaurantTable_capacity_range" CHECK ("capacity" BETWEEN 1 AND 100)
);
CREATE UNIQUE INDEX "Category_organizationId_id_key" ON "Category"("organizationId", "id");
CREATE UNIQUE INDEX "Category_organizationId_name_key" ON "Category"("organizationId", "name");
CREATE UNIQUE INDEX "Product_organizationId_id_key" ON "Product"("organizationId", "id");
CREATE UNIQUE INDEX "Product_organizationId_name_key" ON "Product"("organizationId", "name");
CREATE INDEX "Product_organizationId_categoryId_idx" ON "Product"("organizationId", "categoryId");
CREATE UNIQUE INDEX "ProductVariant_organizationId_productId_name_key" ON "ProductVariant"("organizationId", "productId", "name");
CREATE UNIQUE INDEX "ProductVariant_organizationId_id_key" ON "ProductVariant"("organizationId", "id");
CREATE INDEX "ProductVariant_organizationId_productId_idx" ON "ProductVariant"("organizationId", "productId");
CREATE UNIQUE INDEX "RestaurantTable_organizationId_branchId_id_key" ON "RestaurantTable"("organizationId", "branchId", "id");
CREATE UNIQUE INDEX "RestaurantTable_organizationId_branchId_name_key" ON "RestaurantTable"("organizationId", "branchId", "name");
ALTER TABLE "Category" ADD CONSTRAINT "Category_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Product" ADD CONSTRAINT "Product_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Product" ADD CONSTRAINT "Product_organizationId_categoryId_fkey" FOREIGN KEY ("organizationId", "categoryId") REFERENCES "Category"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_organizationId_productId_fkey" FOREIGN KEY ("organizationId", "productId") REFERENCES "Product"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RestaurantTable" ADD CONSTRAINT "RestaurantTable_organizationId_branchId_fkey" FOREIGN KEY ("organizationId", "branchId") REFERENCES "Branch"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
