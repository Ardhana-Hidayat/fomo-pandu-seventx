import "./load-env";
import fs from "node:fs";
import path from "node:path";
import { runMigrations } from "../src/server/db/migrate";
import { seedDatabase } from "../src/server/db/seed";

async function main() {
  console.log("Mereset basis data lokal...");
  const dataDir = path.resolve(process.cwd(), ".data/pglite");
  if (fs.existsSync(dataDir)) {
    console.log("Menghapus", dataDir);
    fs.rmSync(dataDir, { recursive: true, force: true });
  }

  console.log("Menjalankan migrasi...");
  await runMigrations();

  console.log("Menjalankan seed...");
  const res = await seedDatabase();
  console.log("Reset & seed selesai!", res);
  process.exit(0);
}

void main().catch((err) => {
  console.error("Gagal reset basis data:", err);
  process.exit(1);
});
