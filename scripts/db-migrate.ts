import "./load-env";
import { runMigrations } from "../src/server/db/migrate";

async function main() {
  console.log("Menjalankan migrasi basis data...");
  try {
    await runMigrations();
    console.log("Migrasi selesai!");
    process.exit(0);
  } catch (err) {
    console.error("Gagal menjalankan migrasi:", err);
    process.exit(1);
  }
}

void main();
