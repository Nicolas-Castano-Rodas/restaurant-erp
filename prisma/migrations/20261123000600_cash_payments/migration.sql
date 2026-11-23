CREATE TYPE "CashShiftStatus" AS ENUM ('OPEN', 'CLOSED');
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CARD', 'TRANSFER');
ALTER TABLE "Order" ADD COLUMN "closedAt" TIMESTAMP(3), ADD COLUMN "closedById" UUID, ADD COLUMN "cancelReason" TEXT;
CREATE UNIQUE INDEX "Order_organizationId_branchId_id_key" ON "Order"("organizationId", "branchId", "id");
ALTER TABLE "Order" ADD CONSTRAINT "Order_organizationId_closedById_fkey" FOREIGN KEY ("organizationId", "closedById") REFERENCES "Membership"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE TABLE "CashShift" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "branchId" UUID NOT NULL,
  "openedById" UUID NOT NULL,
  "closedById" UUID,
  "currency" VARCHAR(3) NOT NULL,
  "status" "CashShiftStatus" NOT NULL DEFAULT 'OPEN',
  "openingAmount" DECIMAL(16,2) NOT NULL,
  "expectedAmount" DECIMAL(16,2),
  "countedAmount" DECIMAL(16,2),
  "difference" DECIMAL(16,2),
  "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "closedAt" TIMESTAMP(3),
  CONSTRAINT "CashShift_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CashShift_amount_check" CHECK ("openingAmount" >= 0 AND ("status" = 'OPEN' AND "closedAt" IS NULL AND "closedById" IS NULL AND "expectedAmount" IS NULL AND "countedAmount" IS NULL AND "difference" IS NULL OR "status" = 'CLOSED' AND "closedAt" IS NOT NULL AND "closedById" IS NOT NULL AND "expectedAmount" IS NOT NULL AND "countedAmount" IS NOT NULL AND "difference" IS NOT NULL AND "expectedAmount" >= 0 AND "countedAmount" >= 0 AND "difference" = "countedAmount" - "expectedAmount"))
);
CREATE UNIQUE INDEX "CashShift_organizationId_branchId_id_key" ON "CashShift"("organizationId", "branchId", "id");
CREATE UNIQUE INDEX "CashShift_open_branch_unique" ON "CashShift"("organizationId", "branchId") WHERE "status" = 'OPEN';
CREATE INDEX "CashShift_organizationId_branchId_status_openedAt_idx" ON "CashShift"("organizationId", "branchId", "status", "openedAt");
ALTER TABLE "CashShift" ADD CONSTRAINT "CashShift_organizationId_branchId_fkey" FOREIGN KEY ("organizationId", "branchId") REFERENCES "Branch"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CashShift" ADD CONSTRAINT "CashShift_organizationId_openedById_fkey" FOREIGN KEY ("organizationId", "openedById") REFERENCES "Membership"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CashShift" ADD CONSTRAINT "CashShift_organizationId_closedById_fkey" FOREIGN KEY ("organizationId", "closedById") REFERENCES "Membership"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE TABLE "Payment" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "branchId" UUID NOT NULL,
  "orderId" UUID NOT NULL,
  "shiftId" UUID NOT NULL,
  "membershipId" UUID NOT NULL,
  "method" "PaymentMethod" NOT NULL,
  "currency" VARCHAR(3) NOT NULL,
  "amount" DECIMAL(16,2) NOT NULL,
  "received" DECIMAL(16,2) NOT NULL,
  "change" DECIMAL(16,2) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Payment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Payment_amount_check" CHECK ("amount" >= 0 AND "received" >= "amount" AND "change" = "received" - "amount" AND ("method" = 'CASH' OR "change" = 0))
);
CREATE UNIQUE INDEX "Payment_organizationId_branchId_orderId_key" ON "Payment"("organizationId", "branchId", "orderId");
CREATE INDEX "Payment_organizationId_branchId_shiftId_idx" ON "Payment"("organizationId", "branchId", "shiftId");
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_organizationId_branchId_orderId_fkey" FOREIGN KEY ("organizationId", "branchId", "orderId") REFERENCES "Order"("organizationId", "branchId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_organizationId_branchId_shiftId_fkey" FOREIGN KEY ("organizationId", "branchId", "shiftId") REFERENCES "CashShift"("organizationId", "branchId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_organizationId_membershipId_fkey" FOREIGN KEY ("organizationId", "membershipId") REFERENCES "Membership"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
