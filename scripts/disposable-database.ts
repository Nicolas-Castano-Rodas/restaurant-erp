export function requireDisposableDatabase(mode: "test" | "demo") {
  let url: URL;
  try { url = new URL(process.env.DATABASE_URL ?? "invalid"); } catch { throw new Error("Configure a valid local disposable database URL."); }
  const expected = mode === "test" ? "restaurant_erp_test" : "restaurant_erp_demo";
  const allowed = mode === "test" ? process.env.RUN_BROWSER_TESTS === "true" : process.env.ALLOW_DEMO_SEED === "true";
  if (!allowed || !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) || decodeURIComponent(url.pathname.slice(1)) !== expected || !["postgres:", "postgresql:"].includes(url.protocol)) throw new Error("Use an explicitly enabled local disposable database: " + expected);
}

