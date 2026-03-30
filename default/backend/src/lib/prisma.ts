/**
 * Responsibility: Exposes a shared Prisma client instance for database access across backend modules.
 */
import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __shopspherePrisma__: PrismaClient | undefined;
}

export const prisma =
  globalThis.__shopspherePrisma__ ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__shopspherePrisma__ = prisma;
}

