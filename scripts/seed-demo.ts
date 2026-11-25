import "dotenv/config";
import { getPrisma } from "../src/lib/prisma";
import { createDemoFixture, requireDisposableDatabase } from "./demo-fixture";

async function main() {
  requireDisposableDatabase("demo");
  const password = process.env.DEMO_PASSWORD ?? "";
  try {
    const fixture = await createDemoFixture("demo", password);
    console.log("Datos ficticios creados. Usuario propietario:", fixture.ownerEmail);
    console.log("Usuario mesero:", fixture.staffEmail);
    console.log("Usa la contraseña proporcionada por tu entorno. Nunca se imprime.");
  } finally { await getPrisma().$disconnect(); }
}
main().catch(() => { console.error("No se pudo crear la demo. Comprueba la base local restaurant_erp_demo, el permiso explícito, la contraseña y las migraciones."); process.exitCode = 1; });
