import { existsSync } from "node:fs";

const issues = [];
try {
  const url = new URL(process.env.DATABASE_URL ?? "invalid");
  if (!["postgres:", "postgresql:"].includes(url.protocol) || !url.username || !url.pathname.slice(1)) issues.push("DATABASE_URL: conexión PostgreSQL válida requerida.");
  if (["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) issues.push("DATABASE_URL: revisa que la base sea el destino de producción y no la base local.");
  if (/(_dev|_test|_demo)$/i.test(decodeURIComponent(url.pathname.slice(1)))) issues.push("DATABASE_URL: no usar bases de desarrollo, pruebas o demostración para producción.");
  if (!["require", "verify-ca", "verify-full"].includes(url.searchParams.get("sslmode") ?? "")) issues.push("DATABASE_URL: confirma TLS del proveedor y configura sslmode apropiado.");
} catch {
  issues.push("DATABASE_URL: falta una URL PostgreSQL válida.");
}
if (!existsSync(new URL("../package-lock.json", import.meta.url))) issues.push("Falta package-lock.json. Genera y versiona un lockfile revisado antes del despliegue.");
if (process.env.ALLOW_DEMO_SEED === "true" || process.env.RUN_BROWSER_TESTS === "true" || process.env.RUN_DB_TESTS === "true") issues.push("Desactiva las variables de pruebas y demo.");
if (process.env.DEMO_PASSWORD || process.env.OWNER_PASSWORD) issues.push("Retira contraseñas de aprovisionamiento del entorno de ejecución.");
if (process.env.ENABLE_HSTS !== "true") issues.push("Confirma HTTPS y habilita ENABLE_HSTS=true antes del lanzamiento.");
if (issues.length) {
  for (const issue of issues) console.error(issue);
  process.exitCode = 1;
} else {
  console.log("Comprobaciones estáticas de configuración superadas. Aún debes verificar migraciones, HTTPS, backups, accesos y CI.");
}
