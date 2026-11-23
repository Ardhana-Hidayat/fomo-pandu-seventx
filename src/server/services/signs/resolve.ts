import type { SignItem } from "./schema";

export interface ResolveSignContext {
  manifestItems?: SignItem[];
  dbOverrides?: Array<{
    system: string;
    key: string;
    status: "verified" | "source" | "draft" | "missing";
    assetUrl?: string | null;
    verifiedBy?: string | null;
    verifiedAt?: Date | string | null;
  }>;
  allowDraft?: boolean;
  isTeacherPreview?: boolean;
}

export interface ResolvedSignResult {
  letter: string;
  system: "SIBI" | "BISINDO";
  available: boolean;
  src: string | null;
  alt: string;
  motion: boolean;
  status: "verified" | "source" | "draft" | "missing";
  badge: string | null;
  verifiedBy?: string | null;
  verifiedAt?: string | null;
  origin?: SignItem["origin"];
  reference?: string;
}

/**
 * Resolves the effective sign card asset for a given system and letter.
 * Rules per Pack 2 Berkas 03 §4:
 * - DB override takes precedence over file manifest.
 * - `verified`: displayed to student, badge "Diperiksa" in teacher preview.
 * - `source`: displayed to student, badge "Sumber terbuka, belum diperiksa" in teacher preview.
 * - `draft`: not displayed to student (unless allowDraft is true), badge "Draf" in teacher preview.
 * - `missing`: displays letter box fallback with "Isyarat belum tersedia".
 */
export function resolveSign(
  system: "SIBI" | "BISINDO",
  letter: string,
  ctx: ResolveSignContext = {}
): ResolvedSignResult {
  const key = letter.trim().toUpperCase();
  const defaultMotion = key === "J" || key === "Z";

  // 1. Check DB overrides first
  const dbOverride = ctx.dbOverrides?.find(
    (o) => o.system === system && o.key === key
  );

  // 2. Check file manifest
  const manifestItem = ctx.manifestItems?.find(
    (m) => m.system === system && m.key === key
  );

  const status = dbOverride?.status ?? manifestItem?.status ?? "missing";
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const isSupabase =
    Boolean(supabaseUrl) &&
    process.env.NODE_ENV !== "test" &&
    (process.env.STORAGE_DRIVER === "supabase" || process.env.NODE_ENV === "production");

  const defaultLocalSrc = `/signs/${system.toLowerCase()}/${key.toLowerCase()}.webp`;
  let src = dbOverride?.assetUrl ?? manifestItem?.src ?? defaultLocalSrc;

  if (isSupabase && src.startsWith("/signs/")) {
    src = `${supabaseUrl!.replace(/\/+$/, "")}/storage/v1/object/public${src}`;
  }

  const motion = manifestItem?.motion ?? defaultMotion;
  const verifiedBy = dbOverride?.verifiedBy ?? manifestItem?.verifiedBy ?? null;
  const verifiedAt =
    dbOverride?.verifiedAt instanceof Date
      ? dbOverride.verifiedAt.toISOString().split("T")[0]
      : (dbOverride?.verifiedAt as string) ?? manifestItem?.verifiedAt ?? null;

  let available = false;
  let badge: string | null = null;

  if (status === "verified") {
    available = true;
    badge = ctx.isTeacherPreview ? "Diperiksa" : null;
  } else if (status === "source") {
    available = true;
    badge = ctx.isTeacherPreview ? "Sumber terbuka, belum diperiksa" : null;
  } else if (status === "draft") {
    available = ctx.allowDraft ?? false;
    badge = ctx.isTeacherPreview ? "Draf" : null;
  } else {
    // missing
    available = false;
    badge = ctx.isTeacherPreview ? "Belum tersedia" : null;
  }

  return {
    letter: key,
    system,
    available,
    src: available ? src : null,
    alt: `Isyarat huruf ${key} dalam ${system}${motion ? " (isyarat ini bergerak)" : ""}`,
    motion,
    status,
    badge,
    verifiedBy,
    verifiedAt,
    origin: manifestItem?.origin,
    reference: manifestItem?.reference ?? (system === "SIBI" ? "Kamus SIBI Kemdikbud" : "Lembar abjad BISINDO resmi"),
  };
}
