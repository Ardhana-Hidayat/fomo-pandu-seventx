import "server-only";
import fs from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import postgres from "postgres";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import * as schema from "./schema";
import { env } from "@/server/config/env";

export type DbClient = ReturnType<typeof drizzlePglite<typeof schema>>;

const globalForDb = globalThis as unknown as {
  dbInstance?: DbClient;
  pglite?: PGlite;
  sqlClient?: ReturnType<typeof postgres>;
};

function createDb(): DbClient {
  const testDbUrl = process.env.TEST_DATABASE_URL;
  if (testDbUrl) {
    const client = postgres(testDbUrl, { prepare: false });
    return drizzlePostgres(client, { schema }) as unknown as DbClient;
  }

  if (env.DATA_DRIVER === "postgres") {
    const client =
      globalForDb.sqlClient ??
      postgres(env.DATABASE_URL!, { prepare: false });
    if (process.env.NODE_ENV !== "production") {
      globalForDb.sqlClient = client;
    }
    return drizzlePostgres(client, { schema }) as unknown as DbClient;
  }

  // In test environment without explicit data dir, use in-memory PGlite
  const pglitePath =
    process.env.NODE_ENV === "test" ? undefined : "./.data/pglite";
  if (pglitePath && !fs.existsSync(pglitePath)) {
    fs.mkdirSync(pglitePath, { recursive: true });
  }
  const pglite = globalForDb.pglite ?? new PGlite(pglitePath);
  if (process.env.NODE_ENV !== "production") {
    globalForDb.pglite = pglite;
  }
  return drizzlePglite(pglite, { schema });
}

export const db: DbClient = globalForDb.dbInstance ?? createDb();

if (process.env.NODE_ENV !== "production") {
  globalForDb.dbInstance = db;
}
