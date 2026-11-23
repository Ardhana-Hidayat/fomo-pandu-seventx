import "server-only";
import { eq, and, sql, desc, or } from "drizzle-orm";
import { db } from "../db/client";
import { assets, type Asset, type NewAsset } from "../db/schema";
import { ok, err, type Result, makeAppError } from "@/shared/lib/result";
import { storage } from "../services/storage";

export interface SaveAssetInput {
  kind: "piktogram" | "gambar" | "isyarat" | "pdf" | "audio" | string;
  storageKey: string;
  mime: string;
  bytes: number;
  keyword?: string;
  alt?: string;
  source?: string;
  license?: string;
  attribution?: string;
  verified?: boolean;
  ownerTeacherId?: string;
}

export interface CachePictogramInput {
  keywordId: string;
  keywordEn?: string;
  storageKey: string;
  bytes: number;
  mime?: string;
  alt?: string;
}

export async function saveAsset(
  input: SaveAssetInput
): Promise<Result<Asset>> {
  try {
    const values: NewAsset = {
      kind: input.kind,
      storageKey: input.storageKey,
      mime: input.mime,
      bytes: input.bytes,
      keyword: input.keyword,
      alt: input.alt,
      source: input.source ?? "system",
      license: input.license ?? "CC-BY-SA",
      attribution: input.attribution ?? "ARASAAC / PANDU",
      verified: input.verified ?? false,
      ownerTeacherId: input.ownerTeacherId ?? null,
    };

    const inserted = await db.insert(assets).values(values).returning();
    const created = inserted[0];
    if (!created) {
      return err(makeAppError("CREATE_FAILED", "Gagal menyimpan data aset"));
    }
    return ok(created);
  } catch (error) {
    return err(
      makeAppError("DB_ERROR", "Terjadi kesalahan penyimpanan aset", error)
    );
  }
}

export async function findPictogram(
  keyword: string
): Promise<Result<Asset | null>> {
  const cleanKeyword = keyword.trim().toLowerCase();
  if (!cleanKeyword) {
    return ok(null);
  }

  try {
    const rows = await db
      .select()
      .from(assets)
      .where(
        and(
          eq(assets.kind, "piktogram"),
          or(
            sql`lower(${assets.keyword}) = ${cleanKeyword}`,
            sql`lower(${assets.keyword}) LIKE ${`%${cleanKeyword}%`}`,
            sql`lower(${assets.alt}) LIKE ${`%${cleanKeyword}%`}`
          )
        )
      )
      .limit(1);

    return ok(rows[0] ?? null);
  } catch (error) {
    return err(
      makeAppError("DB_ERROR", "Gagal mencari piktogram", error)
    );
  }
}

export async function findAssetByKeyword(
  keyword: string,
  kind?: string
): Promise<Result<Asset | null>> {
  const cleanKeyword = keyword.trim().toLowerCase();
  if (!cleanKeyword) {
    return ok(null);
  }

  try {
    const conditions = [
      or(
        sql`lower(${assets.keyword}) = ${cleanKeyword}`,
        sql`lower(${assets.keyword}) LIKE ${`%${cleanKeyword}%`}`,
        sql`lower(${assets.alt}) LIKE ${`%${cleanKeyword}%`}`
      ),
    ];

    if (kind) {
      conditions.push(eq(assets.kind, kind));
    }

    const rows = await db
      .select()
      .from(assets)
      .where(and(...conditions))
      .limit(1);

    return ok(rows[0] ?? null);
  } catch (error) {
    return err(
      makeAppError("DB_ERROR", "Gagal mencari aset berdasarkan kata kunci", error)
    );
  }
}

export async function cachePictogram(
  input: CachePictogramInput
): Promise<Result<Asset>> {
  // Simpan kata kunci gabungan jika ada bahasa inggris
  const keyword = input.keywordEn
    ? `${input.keywordId} | ${input.keywordEn}`
    : input.keywordId;

  const existing = await findPictogram(input.keywordId);
  if (existing.ok && existing.data) {
    return ok(existing.data);
  }

  return saveAsset({
    kind: "piktogram",
    storageKey: input.storageKey,
    mime: input.mime ?? "image/webp",
    bytes: input.bytes,
    keyword,
    alt: input.alt ?? `Piktogram ${input.keywordId}`,
    source: "arasaac",
    license: "CC BY-NC-SA 4.0",
    attribution: "ARASAAC (https://arasaac.org)",
    verified: true,
  });
}

export async function getAssetById(id: string): Promise<Result<Asset>> {
  try {
    const rows = await db
      .select()
      .from(assets)
      .where(eq(assets.id, id))
      .limit(1);

    const found = rows[0];
    if (!found) {
      return err(makeAppError("NOT_FOUND", "Aset tidak ditemukan"));
    }
    return ok(found);
  } catch (error) {
    return err(
      makeAppError("DB_ERROR", "Gagal memuat data aset", error)
    );
  }
}

export async function getAssetByStorageKey(
  storageKey: string
): Promise<Result<Asset | null>> {
  try {
    const rows = await db
      .select()
      .from(assets)
      .where(eq(assets.storageKey, storageKey))
      .limit(1);

    return ok(rows[0] ?? null);
  } catch (error) {
    return err(
      makeAppError("DB_ERROR", "Gagal memuat aset dari storage key", error)
    );
  }
}

export async function listAssetsByKind(
  kind: string,
  limit = 50
): Promise<Result<Asset[]>> {
  try {
    const rows = await db
      .select()
      .from(assets)
      .where(eq(assets.kind, kind))
      .orderBy(desc(assets.createdAt))
      .limit(limit);

    return ok(rows);
  } catch (error) {
    return err(
      makeAppError("DB_ERROR", "Gagal memuat daftar aset", error)
    );
  }
}

export async function listTeacherUploads(
  teacherId: string
): Promise<Result<Asset[]>> {
  try {
    const rows = await db
      .select()
      .from(assets)
      .where(eq(assets.ownerTeacherId, teacherId))
      .orderBy(desc(assets.createdAt));

    return ok(rows);
  } catch (error) {
    return err(
      makeAppError("DB_ERROR", "Gagal memuat berkas unggahan guru", error)
    );
  }
}

export async function deleteAsset(
  teacherId: string,
  assetId: string
): Promise<Result<void>> {
  try {
    const assetRow = await db
      .select()
      .from(assets)
      .where(and(eq(assets.id, assetId), eq(assets.ownerTeacherId, teacherId)))
      .limit(1)
      .then((rows) => rows[0]);

    if (!assetRow) {
      return err(
        makeAppError("FORBIDDEN", "Aset tidak ditemukan atau bukan milik Anda")
      );
    }

    // Hapus dari penyimpanan fisik
    const bucket =
      assetRow.kind === "audio"
        ? "card-audio"
        : assetRow.kind === "pdf"
          ? "lesson-sources"
          : "card-images";
    await storage.delete(assetRow.storageKey, bucket);

    // Hapus dari basis data
    await db.delete(assets).where(eq(assets.id, assetId));

    return ok(undefined);
  } catch (error) {
    return err(
      makeAppError("DB_ERROR", "Gagal menghapus aset", error)
    );
  }
}
