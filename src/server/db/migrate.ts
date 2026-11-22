import "server-only";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import { migrate as migratePostgres } from "drizzle-orm/postgres-js/migrator";
import { db } from "./client";
import { env } from "@/server/config/env";

export async function runMigrations(): Promise<void> {
  if (env.DATA_DRIVER === "postgres") {
    await migratePostgres(db as unknown as Parameters<typeof migratePostgres>[0], {
      migrationsFolder: "./drizzle",
    });
  } else {
    await migratePglite(db as unknown as Parameters<typeof migratePglite>[0], {
      migrationsFolder: "./drizzle",
    });
  }
}
