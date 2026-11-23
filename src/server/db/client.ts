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

  // In test environment without explicit data dir, use in-memory PGlite.
  // In serverless environment (e.g. Vercel), the current working directory is read-only, so fallback to /tmp.
  const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
  const pglitePath =
    process.env.NODE_ENV === "test"
      ? undefined
      : isServerless
        ? "/tmp/pglite"
        : "./.data/pglite";

  if (pglitePath) {
    try {
      if (!fs.existsSync(pglitePath)) {
        fs.mkdirSync(pglitePath, { recursive: true });
      }
    } catch {
      // Jika pembuatan direktori gagal, fallback ke in-memory PGlite agar tidak melempar EROFS
    }
  }

  let pglite = globalForDb.pglite;
  if (!pglite) {
    try {
      pglite = new PGlite(pglitePath);
    } catch {
      pglite = new PGlite();
    }
    globalForDb.pglite = pglite;
  }
  return drizzlePglite(pglite, { schema });
}

export const db: DbClient = globalForDb.dbInstance ?? createDb();
globalForDb.dbInstance = db;

