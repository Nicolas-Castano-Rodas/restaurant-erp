ALTER TABLE "Session" ADD COLUMN "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
CREATE INDEX "Session_lastSeenAt_idx" ON "Session"("lastSeenAt");
CREATE TYPE "SecurityEventKind" AS ENUM ('LOGIN_SUCCEEDED', 'LOGIN_REJECTED', 'SESSION_REVOKED', 'PASSWORD_CHANGED', 'PASSWORD_CHANGE_REJECTED');
CREATE TABLE "SecurityEvent" (
  "id" UUID NOT NULL PRIMARY KEY,
  "userId" UUID NOT NULL,
  "kind" "SecurityEventKind" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SecurityEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "SecurityEvent_userId_createdAt_id_idx" ON "SecurityEvent"("userId","createdAt","id");
