import "./load-env";
import { seedDatabase } from "../src/server/db/seed";

async function main() {
  console.log("Menjalankan seed basis data...");
  try {
    const result = await seedDatabase();
    console.log("Seed selesai:", result);
    process.exit(0);
  } catch (err) {
    console.error("Gagal menjalankan seed:", err);
    process.exit(1);
  }
}

void main();
