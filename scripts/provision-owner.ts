import "dotenv/config";
import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";
import { getPrisma } from "../src/lib/prisma";
import { hashPassword, validPassword } from "../src/modules/auth/password";
import { permissions } from "../src/modules/auth/permissions";
import { normalizeEmail, validEmail } from "../src/modules/auth/service";

async function readOwner() {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    return {
      email: normalizeEmail(process.env.OWNER_EMAIL ?? ""),
      name: process.env.OWNER_NAME?.trim() ?? "",
      password: process.env.OWNER_PASSWORD ?? "",
      organizationName: process.env.OWNER_ORGANIZATION?.trim() ?? "",
      slug: process.env.OWNER_SLUG?.trim() ?? "",
    };
  }

  let hidden = false;
  const output = new Writable({
    write(chunk, encoding, callback) {
      if (!hidden) process.stdout.write(chunk, encoding);
      callback();
    },
  });
  const rl = createInterface({ input: process.stdin, output, terminal: true });
  try {
    console.log("\nRestaurant ERP — Registrar propietario\n");
    const organizationName = (await rl.question("Nombre del restaurante: ")).trim();
    const suggestedSlug = organizationName.normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    const slug = (await rl.question(suggestedSlug ? `Identificador [${suggestedSlug}]: ` : "Identificador: ")).trim() || suggestedSlug;
    const name = (await rl.question("Nombre del propietario: ")).trim();
    const email = normalizeEmail(await rl.question("Correo electrónico: "));
    async function secret(prompt: string) {
      process.stdout.write(prompt);
      hidden = true;
      try {
        return await rl.question("");
      } finally {
        hidden = false;
        process.stdout.write("\n");
      }
    }
    const password = await secret("Contraseña (mínimo 12 caracteres; entrada oculta): ");
    if (!validPassword(password)) {
      console.error("La contraseña debe tener mínimo 12 caracteres y máximo 256 bytes.");
      return null;
    }
    const confirmation = await secret("Confirmar contraseña: ");
    if (password !== confirmation) {
      console.error("Las contraseñas no coinciden.");
      return null;
    }
    const confirm = (await rl.question("¿Crear restaurante y propietario? [s/N]: ")).trim().toLowerCase();
    if (confirm !== "s" && confirm !== "si" && confirm !== "sí") {
      console.log("Registro cancelado. No se modificó la base de datos.");
      return null;
    }
    return { email, name, password, organizationName, slug };
  } finally {
    rl.close();
    output.end();
  }
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL: conexión requerida.");
    process.exitCode = 1;
    return;
  }
  const owner = await readOwner();
  if (!owner) {
    process.exitCode = 1;
    return;
  }
  const { email, name, password, organizationName, slug } = owner;
  const invalid: string[] = [];
  if (!validEmail(email)) invalid.push("OWNER_EMAIL: correo válido requerido");
  if (!name) invalid.push("OWNER_NAME: nombre requerido");
  if (!validPassword(password)) invalid.push("OWNER_PASSWORD: mínimo 12 caracteres, máximo 256 bytes");
  if (!organizationName) invalid.push("OWNER_ORGANIZATION: nombre requerido");
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) invalid.push("OWNER_SLUG: letras minúsculas, números y guiones");
  if (invalid.length) {
    console.error("Configuración inválida:");
    for (const issue of invalid) console.error(`- ${issue}`);
    process.exitCode = 1;
    return;
  }
  const passwordHash = await hashPassword(password);
  const db = getPrisma();
  try {
    const [existingUser, existingOrganization] = await Promise.all([
      db.user.findUnique({ where: { email }, select: { id: true } }),
      db.organization.findUnique({ where: { slug }, select: { id: true } }),
    ]);
    if (existingUser || existingOrganization) {
      if (existingUser) console.error("OWNER_EMAIL: ya existe un usuario con este correo.");
      if (existingOrganization) console.error("OWNER_SLUG: ya existe una organización con este identificador.");
      console.error("No se modificaron los registros existentes.");
      process.exitCode = 1;
      return;
    }
    await db.$transaction(async (tx) => {
      const organization = await tx.organization.create({ data: { name: organizationName, slug } });
      const branch = await tx.branch.create({ data: { organizationId: organization.id, name: "Sucursal principal", code: "MAIN" } });
      const user = await tx.user.create({ data: { email, name, passwordHash } });
      const role = await tx.role.create({ data: { organizationId: organization.id, name: "Propietario" } });
      for (const permission of permissions) {
        await tx.permission.upsert({ where: { code: permission.code }, create: permission, update: { description: permission.description } });
        await tx.rolePermission.create({ data: { roleId: role.id, permissionCode: permission.code } });
      }
      const membership = await tx.membership.create({ data: { organizationId: organization.id, userId: user.id, roleId: role.id } });
      await tx.membershipBranch.create({ data: { organizationId: organization.id, membershipId: membership.id, branchId: branch.id } });
    }, { timeout: 15000 });
    console.log("Owner and organization created.");
  } finally {
    await db.$disconnect();
  }
}

main().catch((error: unknown) => {
  const code = typeof error === "object" && error !== null && "code" in error ? error.code : null;
  switch (code) {
    case "P1000":
    case "28P01":
      console.error("PostgreSQL rechazó las credenciales de DATABASE_URL.");
      break;
    case "P1001":
    case "ECONNREFUSED":
      console.error("No se pudo conectar a PostgreSQL. Verifica el servicio y el puerto.");
      break;
    case "P2021":
    case "42P01":
      console.error("Faltan tablas. Ejecuta npm run db:deploy.");
      break;
    case "P2002":
      console.error("Conflicto de datos únicos: comprueba OWNER_EMAIL y OWNER_SLUG.");
      break;
    case "P2028":
      console.error("No se pudo completar la transacción. Comprueba la conexión y vuelve a intentar.");
      break;
    default:
      console.error("No se pudo crear el propietario.", typeof code === "string" && /^(P\d{4}|[A-Z0-9_]{2,32})$/.test(code) ? `Código: ${code}` : "Error no clasificado.");
  }
  process.exitCode = 1;
});
