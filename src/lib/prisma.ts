import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as typeof globalThis & {
  restaurantPrisma?: PrismaClient;
};

export function getPrisma(): PrismaClient {
  if (!globalForPrisma.restaurantPrisma) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is not configured");
    }

    globalForPrisma.restaurantPrisma = new PrismaClient({
      adapter: new PrismaPg({ connectionString, connectionTimeoutMillis: 5000 }),
    });
  }

  return globalForPrisma.restaurantPrisma;
}
