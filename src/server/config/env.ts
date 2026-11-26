import "server-only";
import { z } from "zod";

const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const schema = z
  .object({
    DATA_DRIVER: z.preprocess(
      emptyToUndefined,
      z.enum(["local", "postgres"]).optional()
    ),
    DATABASE_URL: z.preprocess(emptyToUndefined, z.string().url().optional()),
    STORAGE_DRIVER: z.enum(["local", "supabase"]).default("local"),
    AUTH_MODE: z.enum(["demo", "google"]).default("demo"),
    SESSION_SECRET: z
      .string()
      .min(32)
      .default("dev-session-secret-at-least-32-characters-long-example-seventx"),
    GEMINI_API_KEY: z.string().min(1).optional(),
    GEMINI_MODEL: z.string().min(1).default("gemini-2.5-flash"),
    TTS_PROVIDER: z.enum(["gemini", "none"]).default("none"),
    GENERATE_LIMIT_PER_HOUR: z.coerce.number().int().positive().default(5),
    ALLOW_DRAFT_SIGNS: z.enum(["true", "false"]).default("false").transform((v) => v === "true"),
    NEXT_PUBLIC_APP_URL: z
      .string()
      .url()
      .default(
        process.env.NEXT_PUBLIC_VERCEL_URL
          ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
          : "http://localhost:3000"
      ),
  })
  .transform((v) => ({
    ...v,
    // Jika DATABASE_URL tersedia dan DATA_DRIVER tidak disetel eksplisit,
    // otomatis gunakan postgres agar serverless (mis. Vercel) tidak jatuh ke /tmp/pglite.
    DATA_DRIVER:
      v.DATA_DRIVER ?? (v.DATABASE_URL ? ("postgres" as const) : ("local" as const)),
  }))
  .superRefine((v, ctx) => {
    if (v.DATA_DRIVER === "postgres" && !v.DATABASE_URL) {
      ctx.addIssue({
        code: "custom",
        path: ["DATABASE_URL"],
        message: "Wajib saat DATA_DRIVER=postgres",
      });
    }
  });

export type Env = z.infer<typeof schema>;

export function parseEnv(raw: NodeJS.ProcessEnv | Record<string, string | undefined>): Env {
  return schema.parse(raw);
}

export const env = parseEnv(process.env);
