/**
 * Migrasi idempoten kode bagikan materi (`publications.share_code`) dari huruf/alfanumerik
 * menjadi tepat 6 angka (`^\d{6}$`).
 *
 * Pemakaian:
 *   npx tsx scripts/migrate-share-codes-numeric.ts
 *   npx tsx scripts/migrate-share-codes-numeric.ts --dry-run
 *   npx tsx scripts/migrate-share-codes-numeric.ts --local
 */

import "./load-env";
import fs from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import postgres from "postgres";

const SHARE_CODE_REGEX = /^\d{6}$/;

const KNOWN_DEMO_CODES = new Map<string, string>([
  ["00000000-0000-4000-8000-000000000004", "100101"],
  ["00000000-0000-4000-8000-000000000203", "100102"],
]);

interface PublicationRow {
  id: string;
  share_code: string | null;
}

function isEasyPattern(code: string): boolean {
  if (/^(\d)\1{5}$/.test(code)) return true;
  const ascending = "0123456789012345";
  const descending = "9876543210987654";
  if (ascending.includes(code) || descending.includes(code)) return true;
  if (/^(\d{2})\1{2}$/.test(code)) return true;
  if (/^(\d{3})\1$/.test(code)) return true;
  return false;
}

function generateUniqueSixDigitCode(usedCodes: Set<string>): string {
  for (let attempt = 0; attempt < 500; attempt++) {
    const candidate = Math.floor(100000 + Math.random() * 900000).toString();
    if (usedCodes.has(candidate)) continue;
    if (attempt < 400 && isEasyPattern(candidate)) continue;
    usedCodes.add(candidate);
    return candidate;
  }
  throw new Error("Gagal menghasilkan kode 6 angka yang unik.");
}

function resolveDatabaseUrl(): string | undefined {
  const candidates = [
    process.env.DATABASE_URL,
    process.env.POSTGRES_URL,
    process.env.POSTGRES_PRISMA_URL,
    process.env.SUPABASE_DB_URL,
  ];
  for (const raw of candidates) {
    if (typeof raw !== "string") continue;
    const trimmed = raw.trim();
    if (/^postgres(ql)?:\/\//i.test(trimmed)) {
      return trimmed;
    }
  }
  return undefined;
}

async function migratePublications(options: {
  queryAll: () => Promise<PublicationRow[]>;
  updateCode: (id: string, nextCode: string) => Promise<void>;
  dryRun: boolean;
}) {
  const rows = await options.queryAll();
  const usedCodes = new Set<string>();
  const toMigrate: PublicationRow[] = [];

  for (const row of rows) {
    if (row.share_code && SHARE_CODE_REGEX.test(row.share_code)) {
      usedCodes.add(row.share_code);
    } else {
      toMigrate.push(row);
    }
  }

  console.log(
    `Total baris publications: ${rows.length}, sudah 6 angka: ${usedCodes.size}, perlu migrasi: ${toMigrate.length}`
  );

  if (toMigrate.length === 0) {
    console.log("Tidak ada kode non-6-angka yang perlu dimigrasi.");
    return;
  }

  const updates: Array<{ id: string; oldCode: string | null; newCode: string }> = [];
  for (const row of toMigrate) {
    const preferredDemo = KNOWN_DEMO_CODES.get(row.id);
    let nextCode: string;
    if (preferredDemo && !usedCodes.has(preferredDemo)) {
      usedCodes.add(preferredDemo);
      nextCode = preferredDemo;
    } else {
      nextCode = generateUniqueSixDigitCode(usedCodes);
    }
    updates.push({ id: row.id, oldCode: row.share_code, newCode: nextCode });
  }

  for (const item of updates) {
    console.log(
      `${options.dryRun ? "[DRY-RUN] " : ""}publication=${item.id}: ${item.oldCode ?? "<NULL>"} -> ${item.newCode}`
    );
    if (!options.dryRun) {
      await options.updateCode(item.id, item.newCode);
    }
  }

  console.log(
    options.dryRun
      ? `Dry-run selesai. ${updates.length} baris akan diperbarui.`
      : `Migrasi selesai. ${updates.length} baris berhasil diperbarui ke kode 6 angka.`
  );
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const dryRun = args.has("--dry-run");
  const forceLocal = args.has("--local");
  const dbUrl = forceLocal ? undefined : resolveDatabaseUrl();
  const usePostgres =
    !forceLocal &&
    Boolean(dbUrl) &&
    (process.env.DATA_DRIVER === "postgres" || !process.env.DATA_DRIVER);

  if (usePostgres && dbUrl) {
    console.log("Target DB: Postgres");
    const isRemote = !/localhost|127\.0\.0\.1/i.test(dbUrl);
    const disableSsl = /sslmode=disable/i.test(dbUrl);
    const sql = postgres(dbUrl, {
      prepare: false,
      ssl: isRemote && !disableSsl ? { rejectUnauthorized: false } : undefined,
      max: 1,
      connect_timeout: 15,
    });

    try {
      await sql.begin(async (tx) => {
        await migratePublications({
          queryAll: async () =>
            tx<PublicationRow[]>`
              SELECT id, share_code
              FROM publications
              ORDER BY created_at ASC, id ASC
            `,
          updateCode: async (id, nextCode) => {
            await tx`
              UPDATE publications
              SET share_code = ${nextCode}
              WHERE id = ${id}
            `;
          },
          dryRun,
        });
      });
    } finally {
      await sql.end();
    }
    return;
  }

  const pgliteDir = path.resolve(process.cwd(), ".data/pglite");
  console.log(`Target DB: PGlite (${pgliteDir})`);
  if (!fs.existsSync(pgliteDir)) {
    console.log("Direktori .data/pglite belum ada; tidak ada data lokal untuk dimigrasi.");
    return;
  }

  const pglite = new PGlite(pgliteDir);
  try {
    const tableCheck = await pglite.query<{ exists: boolean }>(
      `SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'publications'
      ) AS exists`
    );
    if (!tableCheck.rows[0]?.exists) {
      console.log("Tabel publications belum ada di PGlite lokal.");
      return;
    }

    await pglite.exec("BEGIN");
    try {
      await migratePublications({
        queryAll: async () => {
          const res = await pglite.query<PublicationRow>(
            "SELECT id, share_code FROM publications ORDER BY created_at ASC, id ASC"
          );
          return res.rows;
        },
        updateCode: async (id, nextCode) => {
          await pglite.query(
            "UPDATE publications SET share_code = $1 WHERE id = $2",
            [nextCode, id]
          );
        },
        dryRun,
      });
      await pglite.exec(dryRun ? "ROLLBACK" : "COMMIT");
    } catch (error) {
      await pglite.exec("ROLLBACK");
      throw error;
    }
  } finally {
    await pglite.close();
  }
}

void main().catch((err) => {
  console.error("Migrasi kode bagikan gagal:", err);
  process.exit(1);
});
