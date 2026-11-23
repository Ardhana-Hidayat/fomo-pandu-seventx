import fs from "node:fs";
import path from "node:path";

for (const envFile of [".env.local", ".env"]) {
  const fullPath = path.resolve(process.cwd(), envFile);
  if (fs.existsSync(fullPath)) {
    try {
      process.loadEnvFile(fullPath);
      break;
    } catch {
      // ignore
    }
  }
}
