CREATE TABLE "Customer" (
  "id" UUID NOT NULL PRIMARY KEY,
  "organizationId" UUID NOT NULL,
  "branchId" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "phone" TEXT,
  "email" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Customer_organizationId_branchId_fkey" FOREIGN KEY ("organizationId","branchId") REFERENCES "Branch"("organizationId","id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Customer_organizationId_branchId_id_key" ON "Customer"("organizationId","branchId","id");
CREATE INDEX "Customer_organizationId_branchId_name_idx" ON "Customer"("organizationId","branchId","name");
CREATE INDEX "Customer_organizationId_branchId_phone_idx" ON "Customer"("organizationId","branchId","phone");
ALTER TABLE "Order" ADD COLUMN "customerId" UUID;
ALTER TABLE "Order" ADD CONSTRAINT "Order_organizationId_branchId_customerId_fkey" FOREIGN KEY ("organizationId","branchId","customerId") REFERENCES "Customer"("organizationId","branchId","id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "Order_customer_history_idx" ON "Order"("organizationId","branchId","customerId","createdAt");
