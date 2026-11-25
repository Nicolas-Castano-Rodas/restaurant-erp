CREATE TABLE "AuditEvent" (
  "id" UUID NOT NULL PRIMARY KEY, "organizationId" UUID NOT NULL, "branchId" UUID NOT NULL, "membershipId" UUID NOT NULL,
  "actorName" TEXT NOT NULL, "actorRole" TEXT NOT NULL, "action" VARCHAR(64) NOT NULL, "entity" VARCHAR(48) NOT NULL,
  "entityId" UUID NOT NULL, "details" JSONB NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditEvent_organizationId_branchId_fkey" FOREIGN KEY ("organizationId","branchId") REFERENCES "Branch"("organizationId","id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "AuditEvent_organizationId_membershipId_fkey" FOREIGN KEY ("organizationId","membershipId") REFERENCES "Membership"("organizationId","id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "AuditEvent_branch_date_idx" ON "AuditEvent"("organizationId","branchId","createdAt","id");
CREATE INDEX "AuditEvent_org_date_idx" ON "AuditEvent"("organizationId","createdAt","id");
