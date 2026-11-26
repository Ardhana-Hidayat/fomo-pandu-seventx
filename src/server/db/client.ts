import "server-only";
import fs from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import postgres from "postgres";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import * as schema from "./schema";
import { env } from "@/server/config/env";
import { SCHEMA_STATEMENTS } from "./auto-init";

export type DbClient = ReturnType<typeof drizzlePglite<typeof schema>>;

const globalForDb = globalThis as unknown as {
  dbInstance?: DbClient;
  pglite?: PGlite;
  sqlClient?: ReturnType<typeof postgres>;
  dbInitPromise?: Promise<void>;
  isInitializing?: boolean;
};

export async function ensureDatabaseInitialized(): Promise<void> {
  if (
    globalForDb.isInitializing ||
    process.env.NODE_ENV === "test"
  ) {
    return;
  }
  if (globalForDb.dbInitPromise) {
    return globalForDb.dbInitPromise;
  }

  globalForDb.isInitializing = true;
  globalForDb.dbInitPromise = (async () => {
    if (env.DATA_DRIVER === "postgres") {
      const sqlClient = globalForDb.sqlClient;
      if (!sqlClient) return;
      try {
        const rows = await sqlClient<{ count: string }[]>`
          SELECT count(*)::text as count
          FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'teachers'
        `;
        if (rows[0]?.count === "0") {
          for (const statement of SCHEMA_STATEMENTS) {
            if (statement && statement.trim()) {
              try {
                await sqlClient.unsafe(statement);
              } catch {
                // Abaikan jika tabel/indeks/constraint sudah ada
              }
            }
          }
        }
      } catch (e) {
        console.error("Gagal auto-init database postgres:", e);
        globalForDb.dbInitPromise = undefined;
      }
      return;
    }

    const pglite = globalForDb.pglite;
    if (!pglite) return;
    try {
      const check = await pglite.query<{ count: string }>(
        "SELECT count(*)::text as count FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'teachers'"
      );
      if (check.rows[0]?.count === "0") {
        for (const statement of SCHEMA_STATEMENTS) {
          if (statement && statement.trim()) {
            await pglite.exec(statement);
          }
        }
      }
    } catch (e) {
      console.error("Gagal auto-init database pglite:", e);
    }
  })().finally(() => {
    globalForDb.isInitializing = false;
  });

  return globalForDb.dbInitPromise;
}

function wrapWithInit<T extends object>(target: T): T {
  return new Proxy(target, {
    get(t, prop, receiver) {
      const val = Reflect.get(t, prop, receiver);
      if (prop === "then" && typeof val === "function") {
        return async (onFulfilled: unknown, onRejected: unknown) => {
          await ensureDatabaseInitialized();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return (val as any).call(t, onFulfilled, onRejected);
        };
      }
      if (typeof val === "function") {
        return function (...args: unknown[]) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const res = (val as any).apply(t, args);
          if (res && (typeof res === "object" || typeof res === "function")) {
            return wrapWithInit(res);
          }
          return res;
        };
      }
      return val;
    },
  });
}

function createDb(): DbClient {
  const testDbUrl = process.env.TEST_DATABASE_URL;
  if (testDbUrl) {
    const client = postgres(testDbUrl, { prepare: false });
    return drizzlePostgres(client, { schema }) as unknown as DbClient;
  }

  if (env.DATA_DRIVER === "postgres") {
    const dbUrl = env.DATABASE_URL!;
    const isRemote = !/localhost|127\.0\.0\.1/i.test(dbUrl);
    const disableSsl = /sslmode=disable/i.test(dbUrl);
    const client =
      globalForDb.sqlClient ??
      postgres(dbUrl, {
        prepare: false,
        ssl: isRemote && !disableSsl ? { rejectUnauthorized: false } : undefined,
        max: 3,
        idle_timeout: 20,
        connect_timeout: 10,
      });
    globalForDb.sqlClient = client;
    const rawPg = drizzlePostgres(client, { schema }) as unknown as DbClient;
    return wrapWithInit(rawPg);
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

  const rawDb = drizzlePglite(pglite, { schema });
  if (process.env.NODE_ENV === "test") {
    return rawDb;
  }
  return wrapWithInit(rawDb);
}

export const db: DbClient = globalForDb.dbInstance ?? createDb();
globalForDb.dbInstance = db;
