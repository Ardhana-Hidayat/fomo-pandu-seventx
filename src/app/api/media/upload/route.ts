import crypto from "node:crypto";
import { NextResponse } from "next/server";
import sharp from "sharp";
import { eq, ne, sql } from "drizzle-orm";
import { db } from "@/server/db/client";
import { assets, rateLimits, visualConcepts, type Asset } from "@/server/db/schema";
import { storage } from "@/server/services/storage";
import { saveAsset } from "@/server/repos/assets";
import { updateCardMedia } from "@/server/repos/lessons";
import {
  getConceptCatalog,
  invalidateConceptCatalog,
} from "@/server/services/catalog";
import { getCurrentTeacher } from "@/features/auth";
import { normalize, type ConceptRecord } from "@/shared/lib/grounding/visual-retrieval";

const MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB
const MAX_AUDIO_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_PROCESSED_WEBP_BYTES = 40 * 1024; // 40 KB
const MAX_NAME_LENGTH = 60;
const UPLOAD_RATE_LIMIT_MAX = 60;
const UPLOAD_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

function resolveStorageUrl(storageKey: string): string {
  return storageKey.startsWith("/") || storageKey.startsWith("http")
    ? storageKey
    : storage.url(storageKey, "card-images");
}

function detectImageMagicBytes(buf: Buffer): "jpeg" | "png" | "webp" | null {
  if (buf.length < 4) return null;
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return "jpeg";
  }
  // PNG: 89 50 4E 47
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47
  ) {
    return "png";
  }
  // WebP: RIFF....WEBP
  if (
    buf.length >= 12 &&
    buf.subarray(0, 4).toString("ascii") === "RIFF" &&
    buf.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "webp";
  }
  return null;
}

async function checkUploadRateLimit(key: string): Promise<{ allowed: boolean }> {
  if (process.env.NODE_ENV === "test") {
    return { allowed: true };
  }

  const windowStart =
    Math.floor(Date.now() / UPLOAD_RATE_LIMIT_WINDOW_MS) *
    UPLOAD_RATE_LIMIT_WINDOW_MS;

  try {
    const rows = await db
      .insert(rateLimits)
      .values({ key, windowStart, count: 1 })
      .onConflictDoUpdate({
        target: [rateLimits.key, rateLimits.windowStart],
        set: { count: sql`${rateLimits.count} + 1` },
      })
      .returning({ count: rateLimits.count });

    return { allowed: (rows[0]?.count ?? 1) <= UPLOAD_RATE_LIMIT_MAX };
  } catch (err) {
    console.warn("[upload] Rate limit check skipped (DB error):", err);
    return { allowed: true };
  }
}

async function processImageToSquareWebp(rawBuffer: Buffer): Promise<Buffer> {
  const qualities = [80, 65, 50, 35, 25];
  let bestBuffer: Buffer | null = null;

  for (const quality of qualities) {
    const candidate = await sharp(rawBuffer)
      .rotate()
      .resize(400, 400, {
        fit: "contain",
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      })
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .webp({ quality, effort: 4 })
      .toBuffer();

    bestBuffer = candidate;
    if (candidate.length <= MAX_PROCESSED_WEBP_BYTES) {
      return candidate;
    }
  }

  return bestBuffer!;
}

function serializeDbAsset(asset: Asset, name?: string) {
  const url = resolveStorageUrl(asset.storageKey);
  return {
    id: asset.id,
    storageKey: asset.storageKey,
    url,
    name: name || asset.alt || "Gambar Unggahan Guru",
    keyword: asset.keyword,
    alt: asset.alt,
    mime: asset.mime,
    bytes: asset.bytes,
    sha256: asset.sha256 ?? null,
  };
}

function isUniqueViolation(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { code?: string; cause?: { code?: string } };
  return e.code === "23505" || e.cause?.code === "23505";
}

async function findActiveDbConceptByLabelOrSynonym(labelNorm: string) {
  const rows = await db
    .select({
      concept: visualConcepts,
      asset: assets,
    })
    .from(visualConcepts)
    .leftJoin(assets, eq(visualConcepts.assetId, assets.id))
    .where(ne(visualConcepts.status, "hidden"));

  for (const row of rows) {
    if (row.concept.labelNorm === labelNorm) {
      return row;
    }
    const synMatch = (row.concept.synonyms ?? []).some(
      (s) => normalize(s) === labelNorm
    );
    if (synMatch) {
      return row;
    }
  }
  return null;
}

function findActiveCatalogConceptByLabelOrSynonym(
  labelNorm: string
): ConceptRecord | null {
  const catalog = getConceptCatalog();
  for (const c of catalog) {
    if (c.status === "hidden") continue;
    const cNorm = c.labelNorm || normalize(c.label);
    if (cNorm === labelNorm) return c;
    if ((c.synonyms ?? []).some((s) => normalize(s) === labelNorm)) {
      return c;
    }
  }
  return null;
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        { error: "Content-Type harus berupa multipart/form-data" },
        { status: 400 }
      );
    }

    const teacherSession = await getCurrentTeacher();
    if (!teacherSession) {
      return NextResponse.json(
        { error: "Akses ditolak. Sesi guru tidak valid atau telah kedaluwarsa." },
        { status: 401 }
      );
    }

    const teacherId = teacherSession.teacher.id;

    const rateRes = await checkUploadRateLimit(`upload:${teacherId}`);
    if (!rateRes.allowed) {
      return NextResponse.json(
        {
          error:
            "Terlalu banyak unggahan dalam waktu singkat. Silakan tunggu beberapa menit.",
        },
        { status: 429 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const rawName =
      typeof formData.get("name") === "string"
        ? (formData.get("name") as string).trim()
        : "";
    const rawAlt =
      typeof formData.get("alt") === "string"
        ? (formData.get("alt") as string).trim()
        : "";
    const rawKeyword =
      typeof formData.get("keyword") === "string"
        ? (formData.get("keyword") as string).trim()
        : "";
    const alt = (rawAlt || rawName).trim();
    const cardId = (formData.get("cardId") as string) || undefined;
    const customKind = (formData.get("kind") as string) || undefined;

    if (!file || file.size === 0) {
      return NextResponse.json(
        { error: "Berkas tidak ditemukan atau kosong" },
        { status: 400 }
      );
    }

    const mimeType = file.type;
    const isAudio =
      customKind === "audio" ||
      mimeType.startsWith("audio/") ||
      file.name.endsWith(".wav") ||
      file.name.endsWith(".webm") ||
      file.name.endsWith(".mp3") ||
      file.name.endsWith(".m4a");

    if (isAudio) {
      if (file.size > MAX_AUDIO_SIZE_BYTES) {
        return NextResponse.json(
          { error: "Ukuran audio melebihi batas maksimal 10 MB" },
          { status: 400 }
        );
      }

      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = Buffer.from(arrayBuffer);

      const ext = mimeType.includes("webm")
        ? "webm"
        : mimeType.includes("wav")
          ? "wav"
          : "m4a";
      const storageKey = `recording-${crypto.randomUUID()}.${ext}`;

      await storage.put(storageKey, audioBuffer, mimeType, "card-audio");

      const assetRes = await saveAsset({
        kind: "audio",
        storageKey,
        mime: mimeType || "audio/webm",
        bytes: audioBuffer.length,
        alt: alt || "Rekaman suara guru",
        source: "recording",
        license: "Hak cipta guru",
        attribution: "Rekaman guru PanduIn",
        verified: true,
        ownerTeacherId: teacherId,
      });

      if (!assetRes.ok) {
        return NextResponse.json(
          { error: assetRes.error.message },
          { status: 500 }
        );
      }

      const asset = assetRes.data;

      if (cardId) {
        const updateRes = await updateCardMedia(
          cardId,
          {
            audioAssetId: asset.id,
            audioSource: "recording",
          },
          teacherId
        );
        if (!updateRes.ok) {
          return NextResponse.json(
            { error: updateRes.error.message },
            { status: 403 }
          );
        }
      }

      return NextResponse.json({
        success: true,
        asset: {
          id: asset.id,
          storageKey: asset.storageKey,
          url: storage.url(storageKey, "card-audio"),
          mime: asset.mime,
          bytes: asset.bytes,
          alt: asset.alt,
        },
      });
    }

    // 1. Validasi Nama Gambar (wajib, maks 60 karakter, tidak hanya tanda baca)
    if (!rawName) {
      return NextResponse.json(
        { error: "Nama gambar wajib diisi." },
        { status: 400 }
      );
    }

    if (rawName.length > MAX_NAME_LENGTH) {
      return NextResponse.json(
        { error: `Nama gambar maksimal ${MAX_NAME_LENGTH} karakter.` },
        { status: 400 }
      );
    }

    const labelNorm = normalize(rawName);
    if (!labelNorm) {
      return NextResponse.json(
        { error: "Nama gambar tidak boleh hanya berisi tanda baca." },
        { status: 400 }
      );
    }

    // 2. Validasi Ukuran & Magic Bytes Gambar
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      return NextResponse.json(
        { error: "Ukuran gambar melebihi batas maksimal 2 MB" },
        { status: 400 }
      );
    }

    const rawBuffer = Buffer.from(await file.arrayBuffer());
    const detectedFormat = detectImageMagicBytes(rawBuffer);
    if (!detectedFormat) {
      return NextResponse.json(
        {
          error:
            "Format berkas tidak valid. Harap unggah gambar JPEG, PNG, atau WebP.",
        },
        { status: 400 }
      );
    }

    // 3. Name Dedup: cek visual_concepts di DB dan katalog disk
    const existingDbMatch = await findActiveDbConceptByLabelOrSynonym(labelNorm);
    let existingConceptWithNullAssetId: string | null = null;

    if (existingDbMatch) {
      const { concept, asset } = existingDbMatch;
      if (concept.assetId && asset) {
        const serialized = serializeDbAsset(asset, concept.label);
        if (cardId) {
          await updateCardMedia(
            cardId,
            {
              imageAssetId: asset.id,
              imageAlt: asset.alt ?? concept.altText ?? concept.label,
              imageSource: "upload",
            },
            teacherId
          );
        }
        return NextResponse.json({
          success: true,
          duplicate: true,
          reason: "name_exists",
          message: `Gambar bernama '${rawName}' sudah ada di aset. Memakai gambar yang sudah ada.`,
          url: serialized.url,
          asset: serialized,
          concept,
        });
      }
      existingConceptWithNullAssetId = concept.id;
    } else {
      const catalogMatch = findActiveCatalogConceptByLabelOrSynonym(labelNorm);
      if (catalogMatch) {
        if (catalogMatch.assetUrl || catalogMatch.assetId) {
          const url = catalogMatch.assetUrl || "";
          return NextResponse.json({
            success: true,
            duplicate: true,
            reason: "name_exists",
            message: `Gambar bernama '${rawName}' sudah ada di aset. Memakai gambar yang sudah ada.`,
            url,
            asset: {
              id: catalogMatch.assetId ?? catalogMatch.id,
              storageKey: url,
              url,
              name: catalogMatch.label,
              keyword: catalogMatch.labelNorm,
              alt: catalogMatch.altText ?? catalogMatch.label,
              mime: "image/webp",
              bytes: 0,
            },
            concept: catalogMatch,
          });
        }
        existingConceptWithNullAssetId = catalogMatch.id;
      }
    }

    // 4. Proses gambar via sharp (hapus EXIF, 400x400 latar putih, WebP <= 40KB)
    let processedBuffer: Buffer;
    try {
      processedBuffer = await processImageToSquareWebp(rawBuffer);
    } catch {
      return NextResponse.json(
        { error: "Gagal memproses berkas gambar. Pastikan berkas tidak rusak." },
        { status: 400 }
      );
    }

    // 5. SHA-256 Content Dedup
    const sha256 = crypto
      .createHash("sha256")
      .update(processedBuffer)
      .digest("hex");

    const existingShaRows = await db
      .select()
      .from(assets)
      .where(eq(assets.sha256, sha256))
      .limit(1);

    const existingShaAsset = existingShaRows[0];
    if (existingShaAsset) {
      const conceptRows = await db
        .select()
        .from(visualConcepts)
        .where(eq(visualConcepts.assetId, existingShaAsset.id))
        .limit(1);

      let targetConcept = conceptRows[0] ?? null;

      if (targetConcept) {
        const existingNorms = new Set([
          targetConcept.labelNorm,
          ...(targetConcept.synonyms ?? []).map(normalize),
        ]);
        if (!existingNorms.has(labelNorm)) {
          const updatedSynonyms = [...(targetConcept.synonyms ?? []), rawName];
          const updated = await db
            .update(visualConcepts)
            .set({
              synonyms: updatedSynonyms,
              updatedAt: new Date(),
            })
            .where(eq(visualConcepts.id, targetConcept.id))
            .returning();
          if (updated[0]) {
            targetConcept = updated[0];
          }
          invalidateConceptCatalog();
        }
      }

      if (cardId) {
        await updateCardMedia(
          cardId,
          {
            imageAssetId: existingShaAsset.id,
            imageAlt: existingShaAsset.alt ?? alt,
            imageSource: "upload",
          },
          teacherId
        );
      }

      const serialized = serializeDbAsset(
        existingShaAsset,
        targetConcept?.label ?? rawName
      );
      return NextResponse.json({
        success: true,
        duplicate: true,
        reason: "content_exists",
        message: `Gambar dengan isi yang sama sudah ada (${targetConcept?.label ?? rawName}). Memakai aset yang sudah ada.`,
        url: serialized.url,
        asset: serialized,
        concept: targetConcept,
      });
    }

    // 6. Unggah ke storage & simpan transaksional ke assets + visual_concepts
    const storageKey = `catalog/${sha256}.webp`;
    await storage.put(storageKey, processedBuffer, "image/webp", "card-images");

    const keywordParts = Array.from(
      new Set(
        [rawName, alt, rawKeyword]
          .map((part) => part.trim().toLowerCase())
          .filter(Boolean)
      )
    );
    const keyword = keywordParts.join(" | ") || alt.trim().toLowerCase();

    try {
      const txResult = await db.transaction(async (tx) => {
        const [createdAsset] = await tx
          .insert(assets)
          .values({
            kind: "gambar",
            storageKey,
            mime: "image/webp",
            bytes: processedBuffer.length,
            keyword,
            alt,
            source: "upload",
            license: "Hak cipta guru",
            attribution: "Unggahan guru",
            verified: true,
            sha256,
            ownerTeacherId: teacherId,
          })
          .returning();

        if (!createdAsset) {
          throw new Error("Gagal menyimpan data aset gambar.");
        }

        if (existingConceptWithNullAssetId) {
          const [updatedConcept] = await tx
            .update(visualConcepts)
            .set({
              assetId: createdAsset.id,
              altText: alt,
              updatedAt: new Date(),
            })
            .where(eq(visualConcepts.id, existingConceptWithNullAssetId))
            .returning();

          if (updatedConcept) {
            return { asset: createdAsset, concept: updatedConcept };
          }
        }

        const conceptId = `upload:${labelNorm.replace(/\s+/g, "-")}-${sha256.slice(0, 6)}`;
        const [createdConcept] = await tx
          .insert(visualConcepts)
          .values({
            id: conceptId,
            label: rawName,
            labelNorm,
            synonyms: [],
            domains: ["lainnya"],
            groupId: "lainnya",
            kind: "lainnya",
            popularity: 0,
            assetId: createdAsset.id,
            altAssetIds: [],
            altText: alt,
            status: "active",
            source: "upload",
            uploadedBy: teacherId,
          })
          .returning();

        return { asset: createdAsset, concept: createdConcept };
      });

      invalidateConceptCatalog();

      if (cardId) {
        const updateRes = await updateCardMedia(
          cardId,
          {
            imageAssetId: txResult.asset.id,
            imageAlt: alt,
            imageSource: "upload",
          },
          teacherId
        );
        if (!updateRes.ok) {
          return NextResponse.json(
            { error: updateRes.error.message },
            { status: 403 }
          );
        }
      }

      const serialized = serializeDbAsset(txResult.asset, rawName);
      return NextResponse.json({
        success: true,
        duplicate: false,
        url: serialized.url,
        asset: serialized,
        concept: txResult.concept,
      });
    } catch (txErr) {
      // Tangani race condition nama yang sama secara bersamaan
      if (isUniqueViolation(txErr)) {
        const winner = await findActiveDbConceptByLabelOrSynonym(labelNorm);
        if (winner?.asset) {
          const serialized = serializeDbAsset(winner.asset, winner.concept.label);
          return NextResponse.json({
            success: true,
            duplicate: true,
            reason: "name_exists",
            message: `Gambar bernama '${rawName}' sudah ada di aset. Memakai gambar yang sudah ada.`,
            url: serialized.url,
            asset: serialized,
            concept: winner.concept,
          });
        }
      }
      throw txErr;
    }
  } catch (error) {
    console.error("Upload API Error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat mengunggah media" },
      { status: 500 }
    );
  }
}
