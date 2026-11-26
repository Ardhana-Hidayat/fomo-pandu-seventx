import "server-only";
import { z } from "zod";

const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const urlSchema = z.string().url();

function pickFirstValidUrl(candidates: Array<unknown>): string | undefined {
  for (const candidate of candidates) {
    const normalized = emptyToUndefined(candidate);
    if (typeof normalized !== "string") continue;
    const trimmed = normalized.trim();
    if (urlSchema.safeParse(trimmed).success) {
      return trimmed;
    }
  }
  return undefined;
}

const schema = z
  .object({
    VERCEL: z.preprocess(emptyToUndefined, z.string().optional()),
    DATA_DRIVER: z.preprocess(
      emptyToUndefined,
      z.enum(["local", "postgres"]).optional()
    ),
    DATABASE_URL: z.preprocess(emptyToUndefined, z.string().optional()),
    POSTGRES_URL: z.preprocess(emptyToUndefined, z.string().optional()),
    POSTGRES_PRISMA_URL: z.preprocess(emptyToUndefined, z.string().optional()),
    SUPABASE_DB_URL: z.preprocess(emptyToUndefined, z.string().optional()),
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
  .transform((v) => {
    const resolvedDatabaseUrl = pickFirstValidUrl([
      v.DATABASE_URL,
      v.POSTGRES_URL,
      v.POSTGRES_PRISMA_URL,
      v.SUPABASE_DB_URL,
    ]);
    const isVercel = Boolean(v.VERCEL ?? process.env.VERCEL);
    // Di Vercel, jika URL Postgres tersedia, selalu paksa DATA_DRIVER="postgres"
    // agar variabel lama DATA_DRIVER="local" tidak menjatuhkan penyimpanan ke /tmp/pglite.
    const resolvedDataDriver =
      isVercel && resolvedDatabaseUrl
        ? ("postgres" as const)
        : (v.DATA_DRIVER ?? (resolvedDatabaseUrl ? ("postgres" as const) : ("local" as const)));

    return {
      ...v,
      DATABASE_URL: resolvedDatabaseUrl,
      DATA_DRIVER: resolvedDataDriver,
    };
  })
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
