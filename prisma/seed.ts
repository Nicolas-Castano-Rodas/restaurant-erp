import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not configured");
}

const adapter = new PrismaPg({
  connectionString: databaseUrl,
});

const prisma = new PrismaClient({
  adapter,
});

// ============================================================
// PERMISSIONS
// ============================================================

const permissions = [
  // Organizations
  {
    code: "organizations.read",
    name: "View organizations",
    description: "Allows viewing organization information",
  },
  {
    code: "organizations.update",
    name: "Update organizations",
    description: "Allows updating organization information",
  },

  // Branches
  {
    code: "branches.read",
    name: "View branches",
    description: "Allows viewing branches",
  },
  {
    code: "branches.create",
    name: "Create branches",
    description: "Allows creating branches",
  },
  {
    code: "branches.update",
    name: "Update branches",
    description: "Allows updating branches",
  },
  {
    code: "branches.delete",
    name: "Delete branches",
    description: "Allows deleting branches",
  },

  // Users
  {
    code: "users.read",
    name: "View users",
    description: "Allows viewing users",
  },
  {
    code: "users.create",
    name: "Create users",
    description: "Allows creating users",
  },
  {
    code: "users.update",
    name: "Update users",
    description: "Allows updating users",
  },
  {
    code: "users.delete",
    name: "Delete users",
    description: "Allows deleting users",
  },

  // Roles
  {
    code: "roles.read",
    name: "View roles",
    description: "Allows viewing roles",
  },
  {
    code: "roles.create",
    name: "Create roles",
    description: "Allows creating roles",
  },
  {
    code: "roles.update",
    name: "Update roles",
    description: "Allows updating roles",
  },
  {
    code: "roles.delete",
    name: "Delete roles",
    description: "Allows deleting roles",
  },

  // Products
  {
    code: "products.read",
    name: "View products",
    description: "Allows viewing products",
  },
  {
    code: "products.create",
    name: "Create products",
    description: "Allows creating products",
  },
  {
    code: "products.update",
    name: "Update products",
    description: "Allows updating products",
  },
  {
    code: "products.delete",
    name: "Delete products",
    description: "Allows deleting products",
  },

  // Categories
  {
    code: "categories.read",
    name: "View categories",
    description: "Allows viewing categories",
  },
  {
    code: "categories.create",
    name: "Create categories",
    description: "Allows creating categories",
  },
  {
    code: "categories.update",
    name: "Update categories",
    description: "Allows updating categories",
  },
  {
    code: "categories.delete",
    name: "Delete categories",
    description: "Allows deleting categories",
  },

  // Orders
  {
    code: "orders.read",
    name: "View orders",
    description: "Allows viewing orders",
  },
  {
    code: "orders.create",
    name: "Create orders",
    description: "Allows creating orders",
  },
  {
    code: "orders.update",
    name: "Update orders",
    description: "Allows updating orders",
  },
  {
    code: "orders.cancel",
    name: "Cancel orders",
    description: "Allows cancelling orders",
  },

  // Payments
  {
    code: "payments.read",
    name: "View payments",
    description: "Allows viewing payments",
  },
  {
    code: "payments.create",
    name: "Create payments",
    description: "Allows registering payments",
  },
  {
    code: "payments.refund",
    name: "Refund payments",
    description: "Allows refunding payments",
  },

  // Inventory
  {
    code: "inventory.read",
    name: "View inventory",
    description: "Allows viewing inventory",
  },
  {
    code: "inventory.adjust",
    name: "Adjust inventory",
    description: "Allows adjusting inventory quantities",
  },

  // Suppliers
  {
    code: "suppliers.read",
    name: "View suppliers",
    description: "Allows viewing suppliers",
  },
  {
    code: "suppliers.create",
    name: "Create suppliers",
    description: "Allows creating suppliers",
  },
  {
    code: "suppliers.update",
    name: "Update suppliers",
    description: "Allows updating suppliers",
  },
  {
    code: "suppliers.delete",
    name: "Delete suppliers",
    description: "Allows deleting suppliers",
  },

  // Purchases
  {
    code: "purchases.read",
    name: "View purchases",
    description: "Allows viewing purchases",
  },
  {
    code: "purchases.create",
    name: "Create purchases",
    description: "Allows creating purchases",
  },
  {
    code: "purchases.update",
    name: "Update purchases",
    description: "Allows updating purchases",
  },
  {
    code: "purchases.cancel",
    name: "Cancel purchases",
    description: "Allows cancelling purchases",
  },

  // Customers
  {
    code: "customers.read",
    name: "View customers",
    description: "Allows viewing customers",
  },
  {
    code: "customers.create",
    name: "Create customers",
    description: "Allows creating customers",
  },
  {
    code: "customers.update",
    name: "Update customers",
    description: "Allows updating customers",
  },
  {
    code: "customers.delete",
    name: "Delete customers",
    description: "Allows deleting customers",
  },

  // Tables
  {
    code: "tables.read",
    name: "View tables",
    description: "Allows viewing restaurant tables",
  },
  {
    code: "tables.create",
    name: "Create tables",
    description: "Allows creating restaurant tables",
  },
  {
    code: "tables.update",
    name: "Update tables",
    description: "Allows updating restaurant tables",
  },
  {
    code: "tables.delete",
    name: "Delete tables",
    description: "Allows deleting restaurant tables",
  },

  // Kitchen
  {
    code: "kitchen.read",
    name: "View kitchen orders",
    description: "Allows viewing kitchen orders",
  },
  {
    code: "kitchen.update",
    name: "Update kitchen orders",
    description: "Allows updating kitchen order status",
  },

  // Reports
  {
    code: "reports.read",
    name: "View reports",
    description: "Allows viewing reports",
  },
];

// ============================================================
// ROLES
// ============================================================

const roles = [
  {
    name: "Owner",
    description: "Full access to the restaurant organization",
  },
  {
    name: "Administrator",
    description: "Administrative access to the restaurant ERP",
  },
  {
    name: "Manager",
    description: "Operational management access",
  },
  {
    name: "Cashier",
    description: "Point of sale and payment management",
  },
  {
    name: "Kitchen",
    description: "Kitchen and order preparation management",
  },
  {
    name: "Waiter",
    description: "Table and order management",
  },
  {
    name: "Driver",
    description: "Delivery management",
  },
  {
    name: "Inventory",
    description: "Inventory and supplier management",
  },
  {
    name: "Accountant",
    description: "Financial and reporting management",
  },
];

// ============================================================
// ROLE PERMISSIONS
// ============================================================

const rolePermissions: Record<string, string[]> = {
  // Owner has access to everything.
  Owner: ["*"],

  // Administrator
  Administrator: [
    "organizations.read",
    "organizations.update",

    "branches.read",
    "branches.create",
    "branches.update",
    "branches.delete",

    "users.read",
    "users.create",
    "users.update",
    "users.delete",

    "roles.read",
    "roles.create",
    "roles.update",
    "roles.delete",

    "products.read",
    "products.create",
    "products.update",
    "products.delete",

    "categories.read",
    "categories.create",
    "categories.update",
    "categories.delete",

    "orders.read",
    "orders.create",
    "orders.update",
    "orders.cancel",

    "payments.read",
    "payments.create",
    "payments.refund",

    "inventory.read",
    "inventory.adjust",

    "suppliers.read",
    "suppliers.create",
    "suppliers.update",
    "suppliers.delete",

    "purchases.read",
    "purchases.create",
    "purchases.update",
    "purchases.cancel",

    "customers.read",
    "customers.create",
    "customers.update",
    "customers.delete",

    "tables.read",
    "tables.create",
    "tables.update",
    "tables.delete",

    "kitchen.read",
    "kitchen.update",

    "reports.read",
  ],

  // Manager
  Manager: [
    "organizations.read",

    "branches.read",

    "users.read",

    "roles.read",

    "products.read",
    "products.create",
    "products.update",

    "categories.read",
    "categories.create",
    "categories.update",

    "orders.read",
    "orders.create",
    "orders.update",
    "orders.cancel",

    "payments.read",
    "payments.create",
    "payments.refund",

    "inventory.read",
    "inventory.adjust",

    "suppliers.read",
    "suppliers.create",
    "suppliers.update",

    "purchases.read",
    "purchases.create",
    "purchases.update",

    "customers.read",
    "customers.create",
    "customers.update",

    "tables.read",
    "tables.create",
    "tables.update",

    "kitchen.read",
    "kitchen.update",

    "reports.read",
  ],

  // Cashier
  Cashier: [
    "products.read",
    "categories.read",

    "orders.read",
    "orders.create",
    "orders.update",

    "payments.read",
    "payments.create",

    "customers.read",
    "customers.create",
    "customers.update",

    "tables.read",
  ],

  // Kitchen
  Kitchen: [
    "products.read",
    "categories.read",

    "orders.read",

    "kitchen.read",
    "kitchen.update",
  ],

  // Waiter
  Waiter: [
    "products.read",
    "categories.read",

    "orders.read",
    "orders.create",
    "orders.update",

    "customers.read",
    "customers.create",

    "tables.read",
    "tables.update",

    "kitchen.read",
  ],

  // Driver
  Driver: [
    "orders.read",
    "orders.update",

    "customers.read",
  ],

  // Inventory
  Inventory: [
    "products.read",
    "products.create",
    "products.update",

    "categories.read",
    "categories.create",
    "categories.update",

    "inventory.read",
    "inventory.adjust",

    "suppliers.read",
    "suppliers.create",
    "suppliers.update",
    "suppliers.delete",

    "purchases.read",
    "purchases.create",
    "purchases.update",
    "purchases.cancel",
  ],

  // Accountant
  Accountant: [
    "payments.read",
    "payments.refund",

    "purchases.read",

    "suppliers.read",

    "customers.read",

    "reports.read",
  ],
};

// ============================================================
// MAIN
// ============================================================

async function main() {
  console.log("🌱 Starting database seed...");

  // ----------------------------------------------------------
  // 1. ORGANIZATION
  // ----------------------------------------------------------

  const organization = await prisma.organization.upsert({
    where: {
      slug: "el-famoso",
    },
    update: {
      name: "EL FAMOSO",
    },
    create: {
      name: "EL FAMOSO",
      slug: "el-famoso",
      email: "admin@el-famoso.local",
      phone: null,
    },
  });

  console.log(`🏢 Organization ready: ${organization.name}`);

  // ----------------------------------------------------------
  // 2. BRANCH
  // ----------------------------------------------------------

  const branch = await prisma.branch.upsert({
    where: {
      id: "development-main-branch",
    },
    update: {
      name: "Sucursal Principal",
      organizationId: organization.id,
    },
    create: {
      id: "development-main-branch",
      name: "Sucursal Principal",
      organizationId: organization.id,
    },
  });

  console.log(`🏪 Branch ready: ${branch.name}`);

  // ----------------------------------------------------------
  // 3. PERMISSIONS
  // ----------------------------------------------------------

  for (const permission of permissions) {
    await prisma.permission.upsert({
      where: {
        code: permission.code,
      },
      update: {
        name: permission.name,
        description: permission.description,
      },
      create: permission,
    });
  }

  console.log(`🔐 ${permissions.length} permissions created/updated.`);

  // ----------------------------------------------------------
  // 4. ROLES
  // ----------------------------------------------------------

  for (const role of roles) {
    await prisma.role.upsert({
      where: {
        organizationId_name: {
          organizationId: organization.id,
          name: role.name,
        },
      },
      update: {
        description: role.description,
      },
      create: {
        name: role.name,
        description: role.description,
        organizationId: organization.id,
      },
    });
  }

  console.log(`👥 ${roles.length} roles created/updated.`);

  // ----------------------------------------------------------
  // 5. ROLE PERMISSIONS
  // ----------------------------------------------------------

  const allPermissions = await prisma.permission.findMany();

  for (const [roleName, permissionCodes] of Object.entries(rolePermissions)) {
    const role = await prisma.role.findUnique({
      where: {
        organizationId_name: {
          organizationId: organization.id,
          name: roleName,
        },
      },
    });

    if (!role) {
      throw new Error(`Role not found: ${roleName}`);
    }

    const permissionsToAssign = permissionCodes.includes("*")
      ? allPermissions
      : allPermissions.filter((permission) =>
          permissionCodes.includes(permission.code),
        );

    for (const permission of permissionsToAssign) {
      const existingRolePermission = await prisma.rolePermission.findFirst({
        where: {
          roleId: role.id,
          permissionId: permission.id,
        },
      });

      if (!existingRolePermission) {
        await prisma.rolePermission.create({
          data: {
            roleId: role.id,
            permissionId: permission.id,
          },
        });
      }
    }

    console.log(
      `🔗 ${roleName}: ${permissionsToAssign.length} permissions assigned.`,
    );
  }

  console.log("🔐 Role permissions configured successfully.");

  // ----------------------------------------------------------
  // 6. OWNER USER
  // ----------------------------------------------------------

  const ownerRole = await prisma.role.findUnique({
    where: {
      organizationId_name: {
        organizationId: organization.id,
        name: "Owner",
      },
    },
  });

  if (!ownerRole) {
    throw new Error("Owner role not found.");
  }

  const passwordHash = await bcrypt.hash("Admin123!", 12);

  const ownerUser = await prisma.user.upsert({
    where: {
      email: "admin@el-famoso.local",
    },
    update: {
      name: "Nicolás Admin",
      passwordHash,
      organizationId: organization.id,
      branchId: branch.id,
      roleId: ownerRole.id,
    },
    create: {
      name: "Nicolás Admin",
      email: "admin@el-famoso.local",
      passwordHash,
      organizationId: organization.id,
      branchId: branch.id,
      roleId: ownerRole.id,
    },
  });

  console.log(`👤 Owner user ready: ${ownerUser.email}`);

  // ----------------------------------------------------------
  // FINISH
  // ----------------------------------------------------------

  console.log("🎉 Database seed completed successfully.");
}

// ============================================================
// EXECUTION
// ============================================================

main()
  .catch((error) => {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
