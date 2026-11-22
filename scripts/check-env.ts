/**
 * Validasi variabel lingkungan tanpa mencetak nilai rahasia.
 * Jalankan: npx tsx scripts/check-env.ts
 */
import { z } from "zod";

const schema = z
  .object({
    DATA_DRIVER: z.enum(["local", "postgres"]).default("local"),
    DATABASE_URL: z.string().url().optional(),
    STORAGE_DRIVER: z.enum(["local", "supabase"]).default("local"),
    AUTH_MODE: z.enum(["demo", "google"]).default("demo"),
    SESSION_SECRET: z.string().min(32, "SESSION_SECRET harus minimal 32 karakter"),
    GEMINI_API_KEY: z.string().min(1).optional(),
    GEMINI_MODEL: z.string().min(1, "GEMINI_MODEL wajib diisi"),
    TTS_PROVIDER: z.enum(["gemini", "none"]).default("none"),
    GENERATE_LIMIT_PER_HOUR: z.coerce.number().int().positive().default(5),
    ALLOW_DRAFT_SIGNS: z.enum(["true", "false"]).default("false").transform((v) => v === "true"),
    NEXT_PUBLIC_APP_URL: z.string().url("NEXT_PUBLIC_APP_URL harus URL valid"),
  })
  .superRefine((v, ctx) => {
    if (v.DATA_DRIVER === "postgres" && !v.DATABASE_URL) {
      ctx.addIssue({
        code: "custom",
        path: ["DATABASE_URL"],
        message: "DATABASE_URL wajib saat DATA_DRIVER=postgres",
      });
    }
  });

const result = schema.safeParse(process.env);

if (!result.success) {
  console.error("❌ Validasi env gagal! Variabel yang kurang atau tidak sesuai:");
  for (const issue of result.error.issues) {
    console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
  }
  process.exit(1);
} else {
  console.log("✅ Variabel lingkungan valid. Konfigurasi siap.");
}
