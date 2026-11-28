import { getCACertificates, rootCertificates } from "node:tls";
import type { PoolConfig } from "pg";

// A provider CA is optional for local PostgreSQL. On hosted connections use
// verify-full and an explicit trusted CA; never disable hostname verification.
export function databaseConfig(connectionString: string, certificate?: string): PoolConfig {
  const base = { connectionString, connectionTimeoutMillis: 5000 };
  if (certificate === undefined || certificate === "") return base;

  const url = new URL(connectionString);
  if (!["postgres:", "postgresql:"].includes(url.protocol) || url.searchParams.getAll("sslmode").length !== 1 || url.searchParams.get("sslmode") !== "verify-full") {
    throw new Error("DATABASE_CA_CERT requires DATABASE_URL with sslmode=verify-full.");
  }
  if (["ssl", "sslcert", "sslkey", "sslrootcert", "uselibpqcompat", "sslnegotiation"].some((key) => url.searchParams.has(key))) {
    throw new Error("Do not combine DATABASE_CA_CERT with additional SSL URL options.");
  }
  const ca = certificate.trim();
  if (!ca.includes("-----BEGIN CERTIFICATE-----") || !ca.includes("-----END CERTIFICATE-----")) {
    throw new Error("DATABASE_CA_CERT must contain a trusted PEM certificate.");
  }
  // pg parses SSL query parameters after the options object. Remove only
  // sslmode so the explicit verified TLS settings are not overwritten.
  url.searchParams.delete("sslmode");
  // An explicit TLS ca replaces Node's trust store. Extend it rather than
  // dropping the standard roots needed by the provider's pooler.
  const defaults = typeof getCACertificates === "function" ? getCACertificates("default") : rootCertificates;
  const trusted = [...new Set([...defaults, ca])];
  return { ...base, connectionString: url.toString(), ssl: { ca: trusted, rejectUnauthorized: true } };
}
