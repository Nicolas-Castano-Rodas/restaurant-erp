CREATE INDEX "Order_branch_history_idx" ON "Order"("organizationId", "branchId", "createdAt", "id");
CREATE INDEX "Purchase_branch_created_idx" ON "Purchase"("organizationId", "branchId", "createdAt");
CREATE INDEX "Purchase_branch_closed_idx" ON "Purchase"("organizationId", "branchId", "closedAt");
CREATE INDEX "CashShift_branch_closed_idx" ON "CashShift"("organizationId", "branchId", "status", "closedAt", "id");
CREATE INDEX "Delivery_branch_updated_idx" ON "Delivery"("organizationId", "branchId", "updatedAt");
