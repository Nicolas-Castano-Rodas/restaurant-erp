import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

const OPTIONS = { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 };

function derive(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, OPTIONS, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}

export function validPassword(password: string): boolean {
  return password.length >= 12 && Buffer.byteLength(password, "utf8") <= 256;
}

export async function hashPassword(password: string): Promise<string> {
  if (!validPassword(password)) throw new Error("Password must be at least 12 characters and at most 256 bytes");
  const salt = randomBytes(16);
  const key = await derive(password, salt);
  return `scrypt-v1:${salt.toString("hex")}:${key.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string | null): Promise<boolean> {
  if (Buffer.byteLength(password, "utf8") > 256) return false;
  const parts = (stored ?? "").split(":");
  const saltHex = parts[1] ?? "";
  const hashHex = parts[2] ?? "";
  const valid = parts.length === 3 && parts[0] === "scrypt-v1" &&
    /^[a-f0-9]{32}$/.test(saltHex) && /^[a-f0-9]{128}$/.test(hashHex);
  const salt = valid ? Buffer.from(saltHex, "hex") : Buffer.alloc(16);
  const expected = valid ? Buffer.from(hashHex, "hex") : Buffer.alloc(64);
  const actual = await derive(password, salt);
  return timingSafeEqual(actual, expected) && valid;
}
