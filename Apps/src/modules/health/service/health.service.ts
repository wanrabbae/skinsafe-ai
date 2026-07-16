import { prisma } from "@/shared/prisma/client";
import { getServerEnv } from "@/shared/lib/env";

export type DependencyHealth =
  | { ok: true }
  | { ok: false; error: string };

export async function checkDatabaseConnection(): Promise<DependencyHealth> {
  try {
    getServerEnv();
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown database error",
    };
  }
}
