import assert from "node:assert/strict";
import { test } from "node:test";
import { rootCertificates } from "node:tls";
import { databaseConfig } from "../../src/lib/database-config";

const local = "postgresql://user:pass@localhost:5432/restaurant_erp_test?schema=public";
const remote = "postgresql://user:p%40ss@db.example.invalid:5432/postgres?sslmode=verify-full&application_name=demo";
const ca = rootCertificates[0];

test("local connection remains unchanged", () => {
  assert.deepEqual(databaseConfig(local), { connectionString: local, connectionTimeoutMillis: 5000 });
});

test("explicit CA keeps strict verification and other connection parameters", () => {
  const config = databaseConfig(remote, ca);
  const url = new URL(config.connectionString ?? "");
  assert.equal(url.password, "p%40ss");
  assert.equal(url.searchParams.get("application_name"), "demo");
  assert.equal(url.searchParams.has("sslmode"), false);
  assert.deepEqual(config.ssl, { ca, rejectUnauthorized: true });
});

test("rejects conflicting SSL options or non-verified mode", () => {
  assert.throws(() => databaseConfig(remote.replace("verify-full", "require"), ca), /verify-full/);
  assert.throws(() => databaseConfig(`${remote}&sslrootcert=other.crt`, ca), /additional SSL/);
  assert.throws(() => databaseConfig(`${remote}&sslmode=disable`, ca), /verify-full/);
  assert.throws(() => databaseConfig(remote, "not a certificate"), /PEM/);
});
