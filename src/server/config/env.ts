import "server-only";
import { z } from "zod";

const schema = z
  .object({
    DATA_DRIVER: z.enum(["local", "postgres"]).default("local"),
    DATABASE_URL: z.string().url().optional(),
    STORAGE_DRIVER: z.enum(["local", "supabase"]).default("local"),
    AUTH_MODE: z.enum(["demo", "google"]).default("demo"),
    SESSION_SECRET: z.string().min(32),
    GEMINI_API_KEY: z.string().min(1).optional(),
    GEMINI_MODEL: z.string().min(1),
    TTS_PROVIDER: z.enum(["gemini", "none"]).default("none"),
    GENERATE_LIMIT_PER_HOUR: z.coerce.number().int().positive().default(5),
    ALLOW_DRAFT_SIGNS: z.enum(["true", "false"]).default("false").transform((v) => v === "true"),
    NEXT_PUBLIC_APP_URL: z.string().url(),
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
export const env = schema.parse(process.env);
