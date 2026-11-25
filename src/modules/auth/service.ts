import { createHash, randomBytes } from "node:crypto";
import type { PrismaClient } from "@/generated/prisma/client";
import { verifyPassword } from "./password";

export const SESSION_SECONDS = 12 * 60 * 60;
export const SESSION_COOKIE = "restaurant_session";
export const IDLE_SESSION_MS = 2 * 60 * 60 * 1000;
const SESSION_TOUCH_MS = 5 * 60 * 1000;
const WINDOW_MS = 15 * 60 * 1000;

function digest(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function validEmail(email: string): boolean {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validToken(token: string): boolean {
  return /^[a-f0-9]{64}$/.test(token);
}

export async function consumeAttempt(db: PrismaClient, identity: string, limit: number): Promise<boolean> {
  const bucket = Math.floor(Date.now() / WINDOW_MS);
  const key = digest(`login:${identity}:${bucket}`);
  const attempt = await db.loginAttempt.upsert({
    where: { key },
    create: { key, expiresAt: new Date((bucket + 1) * WINDOW_MS) },
    update: { count: { increment: 1 } },
    select: { count: true },
  });
  return attempt.count <= limit;
}

async function checkCredentials(db: PrismaClient, rawEmail: string, password: string) {
  const email = normalizeEmail(rawEmail);
  if (!validEmail(email) || Buffer.byteLength(password, "utf8") > 256) return null;
  if (!(await consumeAttempt(db, "global", 300))) return null;
  if (!(await consumeAttempt(db, `email:${email}`, 8))) return null;

  const user = await db.user.findUnique({
    where: { email },
    select: { id: true, active: true, passwordHash: true },
  });
  const verified = await verifyPassword(password, user?.passwordHash ?? null);
  if (verified && user?.active) return user;
  if (user) await db.securityEvent.create({ data: { userId: user.id, kind: "LOGIN_REJECTED" } });
  return null;
}

export async function authenticate(db: PrismaClient, rawEmail: string, password: string) {
  return (await checkCredentials(db, rawEmail, password))?.id ?? null;
}

// Lock the verified user row before issuing the session to serialize password changes.
export async function signIn(db: PrismaClient, email: string, password: string) {
  const verified = await checkCredentials(db, email, password);
  if (!verified) return null;
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_SECONDS * 1000);
  return db.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<{ active: boolean; passwordHash: string | null }[]>`SELECT "active", "passwordHash" FROM "User" WHERE "id" = ${verified.id}::uuid FOR UPDATE`;
    if (!rows[0]?.active || rows[0].passwordHash !== verified.passwordHash) return null;
    await tx.session.create({ data: { tokenHash: digest(token), userId: verified.id, expiresAt } });
    await tx.securityEvent.create({ data: { userId: verified.id, kind: "LOGIN_SUCCEEDED" } });
    return { token, expiresAt };
  });
}

export async function createSession(db: PrismaClient, userId: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_SECONDS * 1000);
  await db.session.create({ data: { tokenHash: digest(token), userId, expiresAt } });
  return { token, expiresAt };
}

export async function revokeSession(db: PrismaClient, token: string) {
  if (!validToken(token)) return;
  await db.$transaction(async (tx) => {
    const tokenHash = digest(token);
    const session = await tx.session.findUnique({ where: { tokenHash }, select: { userId: true } });
    if (!session) return;
    const result = await tx.session.deleteMany({ where: { tokenHash } });
    if (result.count === 1) await tx.securityEvent.create({ data: { userId: session.userId, kind: "SESSION_REVOKED" } });
  });
}

export async function getSession(db: PrismaClient, token: string) {
  if (!validToken(token)) return null;
  const now = new Date();
  const idleSince = new Date(now.getTime() - IDLE_SESSION_MS);
  const session = await db.session.findFirst({
    where: { tokenHash: digest(token), expiresAt: { gt: now }, lastSeenAt: { gt: idleSince }, user: { active: true } },
    select: {
      tokenHash: true,
      lastSeenAt: true,
      membershipId: true,
      branchId: true,
      user: { select: { id: true, name: true, email: true } },
    },
  });
  if (!session) return null;
  if (session.lastSeenAt.getTime() <= now.getTime() - SESSION_TOUCH_MS) {
    const refreshed = await db.session.updateMany({ where: { tokenHash: session.tokenHash, expiresAt: { gt: now }, lastSeenAt: { gt: idleSince }, user: { active: true } }, data: { lastSeenAt: now } });
    if (refreshed.count !== 1) return null;
  }
  const memberships = await db.membership.findMany({
    where: { userId: session.user.id, active: true, organization: { active: true } },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      organization: { select: { id: true, name: true, currency: true, timeZone: true } },
      role: { select: { name: true, permissions: { select: { permissionCode: true } } } },
      branches: {
        where: { branch: { active: true } },
        select: { branch: { select: { id: true, name: true } } },
      },
    },
  });
  const membership = memberships.find((item) => item.id === session.membershipId);
  const branch = membership?.branches.find((item) => item.branch.id === session.branchId)?.branch;
  const context = membership && branch ? {
    membershipId: membership.id,
    organization: membership.organization,
    branch,
    role: membership.role.name,
    permissions: membership.role.permissions.map((item) => item.permissionCode),
  } : null;
  return { user: session.user, memberships, context };
}

export async function selectContext(db: PrismaClient, token: string, membershipId: string, branchId: string) {
  const session = await getSession(db, token);
  if (!session) return false;
  const allowed = session.memberships.some((item) =>
    item.id === membershipId && item.branches.some((entry) => entry.branch.id === branchId),
  );
  if (!allowed) return false;
  const result = await db.session.updateMany({
    where: { tokenHash: digest(token), userId: session.user.id, expiresAt: { gt: new Date() }, lastSeenAt: { gt: new Date(Date.now() - IDLE_SESSION_MS) }, user: { active: true } },
    data: { membershipId, branchId },
  });
  return result.count === 1;
}

export function hasPermission(context: { permissions: string[] } | null, permission: string): boolean {
  return context?.permissions.includes(permission) ?? false;
}
