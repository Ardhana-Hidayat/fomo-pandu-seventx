import "server-only";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { storage } from "../storage";
import {
  saveAsset,
  findPictogram,
  findAssetByKeyword,
  getAssetByStorageKey,
} from "../../repos/assets";
import { getAssetById } from "../assets/catalog";
import { searchAssets } from "../assets/retrieval";
import { getConceptIndex } from "../catalog";
import { normalize, search } from "@/shared/lib/grounding/visual-retrieval";
import { ok, err, type Result, makeAppError } from "@/shared/lib/result";
import type { Asset } from "../../db/schema";

const ARASAAC_API_BASE = "https://api.arasaac.org/v1";
const ARASAAC_STATIC_BASE = "https://static.arasaac.org/pictograms";

// Circuit Breaker State
let consecutiveFailures = 0;
let circuitBreakerUntil = 0;

interface ArasaacSearchResult {
  _id: number;
  keywords?: Array<{ keyword: string; type: number }>;
}

export function isCircuitBreakerOpen(): boolean {
  if (Date.now() < circuitBreakerUntil) {
    return true;
  }
  return false;
}

export function recordFailure(): void {
  consecutiveFailures += 1;
  if (consecutiveFailures >= 3) {
    // Lewati panggilan ARASAAC selama 60 detik
    circuitBreakerUntil = Date.now() + 60000;
    consecutiveFailures = 0;
  }
}

export function recordSuccess(): void {
  consecutiveFailures = 0;
  circuitBreakerUntil = 0;
}

async function fetchWithTimeout(url: string, timeoutMs = 10000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json, image/*",
      },
    });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

export async function searchArasaacApi(
  keyword: string,
  locale: "id" | "en"
): Promise<ArasaacSearchResult[]> {
  if (isCircuitBreakerOpen() || process.env.NODE_ENV === "test") {
    return [];
  }

  const clean = keyword.trim().toLowerCase();
  if (!clean) return [];

  const url = `${ARASAAC_API_BASE}/pictograms/${locale}/search/${encodeURIComponent(clean)}`;

  try {
    const res = await fetchWithTimeout(url, 3000);
    if (res.status === 404) {
      return [];
    }
    if (!res.ok) {
      recordFailure();
      return [];
    }
    const data = (await res.json()) as ArasaacSearchResult[];
    recordSuccess();
    return Array.isArray(data) ? data : [];
  } catch {
    recordFailure();
    return [];
  }
}

export async function downloadAndCacheArasaacPictogram(
  pictogramId: number,
  keywordId: string,
  keywordEn?: string
): Promise<Result<Asset>> {
  try {
    const localSlug = keywordId.toLowerCase().trim().replace(/\s+/g, "-");
    const localCandidates = [
      path.resolve(process.cwd(), `public/media/pictograms/${localSlug}.webp`),
      keywordEn
        ? path.resolve(
            process.cwd(),
            `public/media/pictograms/${keywordEn.toLowerCase().trim().replace(/\s+/g, "-")}.webp`
          )
        : null,
    ].filter((p): p is string => Boolean(p));

    let webpBuffer: Buffer | null = null;
    for (const cand of localCandidates) {
      if (fs.existsSync(cand)) {
        webpBuffer = fs.readFileSync(cand);
        break;
      }
    }

    if (!webpBuffer) {
      const imgUrl = `${ARASAAC_STATIC_BASE}/${pictogramId}/${pictogramId}_500.png`;
      const res = await fetchWithTimeout(imgUrl, 4000);
      if (!res.ok) {
        return err(
          makeAppError("NOT_FOUND", `Gagal mengunduh piktogram ID ${pictogramId}`)
        );
      }

      const arrayBuffer = await res.arrayBuffer();
      const pngBuffer = Buffer.from(arrayBuffer);

      // Ubah ukuran ke 500x500 WebP berkualitas tinggi dengan latar belakang transparan/bersih
      webpBuffer = await sharp(pngBuffer)
        .resize(500, 500, {
          fit: "contain",
          background: { r: 255, g: 255, b: 255, alpha: 0 },
        })
        .webp({ quality: 90 })
        .toBuffer();
    }

    const storageKey = `arasaac-${pictogramId}.webp`;
    await storage.put(storageKey, webpBuffer, "image/webp", "card-images");

    const keyword = keywordEn ? `${keywordId} | ${keywordEn}` : keywordId;
    const assetResult = await saveAsset({
      kind: "piktogram",
      storageKey,
      mime: "image/webp",
      bytes: webpBuffer.length,
      keyword,
      alt: `Piktogram ${keywordId}`,
      source: "arasaac",
      license: "CC BY-NC-SA 4.0",
      attribution:
        "Piktogram: ARASAAC (arasaac.org), Pemerintah Aragon, penulis Sergio Palao. Lisensi CC BY-NC-SA 4.0.",
      verified: true,
    });

    return assetResult;
  } catch (error) {
    return err(
      makeAppError("PROCESSING_ERROR", "Gagal memproses piktogram ARASAAC", error)
    );
  }
}

// Menghasilkan placeholder WebP elegan saat offline / tidak ditemukan
export async function createPlaceholderPictogram(
  keyword: string
): Promise<Result<Asset>> {
  try {
    const clean = keyword.trim();
    // Buat placeholder WebP instan tanpa bergantung pada sistem font SVG eksternal
    const webpBuffer = await sharp({
      create: {
        width: 500,
        height: 500,
        channels: 4,
        background: { r: 241, g: 245, b: 249, alpha: 1 },
      },
    })
      .webp({ quality: 90 })
      .toBuffer();

    const hashSafe = clean.toLowerCase().replace(/[^a-z0-9]/g, "-") || "symbol";
    const storageKey = `placeholder-${hashSafe}.webp`;
    await storage.put(storageKey, webpBuffer, "image/webp", "card-images");

    const assetResult = await saveAsset({
      kind: "piktogram",
      storageKey,
      mime: "image/webp",
      bytes: webpBuffer.length,
      keyword: clean,
      alt: `Piktogram ${clean}`,
      source: "system-placeholder",
      license: "PanduIn",
      attribution: "PanduIn Pustaka Piktogram",
      verified: true,
    });

    return assetResult;
  } catch (error) {
    return err(
      makeAppError(
        "PROCESSING_ERROR",
        "Gagal membuat piktogram cadangan",
        error
      )
    );
  }
}

const CURATED_ARASAAC_IDS: Record<string, number> = {
  "cuci tangan": 8975,
  "mencuci tangan": 8975,
  "wash hands": 8975,
  "gosok tangan": 2443,
  "rub hands": 2443,
  bilas: 8977,
  rinse: 8977,
  keringkan: 2566,
  dry: 2566,
  air: 2414,
  water: 2414,
  sabun: 34846,
  soap: 34846,
  handuk: 2593,
  towel: 2593,
  "sikat gigi": 2694,
  toothbrush: 2694,
  "tangan bersih": 26172,
  "clean hands": 26172,
};

function hasExactKeywordSegment(
  assetKeyword: string | null | undefined,
  target: string
): boolean {
  if (!assetKeyword) return false;
  const targetNorm = normalize(target);
  if (!targetNorm) return false;
  const segments = assetKeyword
    .split("|")
    .map((s) => normalize(s))
    .filter(Boolean);
  return segments.includes(targetNorm);
}

export async function resolveCatalogAssetToDb(
  assetId: string,
  customAlt?: string
): Promise<Result<Asset>> {
  try {
    let record = getAssetById(assetId);
    let conceptFallbackUrl: string | null = null;
    let conceptLabel = "";
    let conceptKeywords: string[] = [];
    let conceptSource = "arasaac";

    if (!record || !record.available) {
      const concept = getConceptIndex().byId.get(assetId);
      if (concept && concept.status === "active" && concept.assetUrl) {
        const url = concept.assetUrl;
        const base = path.basename(url, path.extname(url));
        if (url.includes("/media/custom/")) {
          record = getAssetById(`custom:${base}`);
        } else if (url.includes("/media/pictograms/")) {
          record = getAssetById(`picto:${base}`);
        } else if (concept.assetId) {
          record = getAssetById(concept.assetId);
        }

        if (!record || !record.available) {
          conceptFallbackUrl = url;
          conceptLabel = concept.label;
          conceptKeywords = [
            concept.label.toLowerCase(),
            ...(concept.synonyms ?? []).slice(0, 3).map((s) => s.toLowerCase()),
          ];
          conceptSource = concept.source || "arasaac";
        }
      }
    }

    if ((!record || !record.available) && !conceptFallbackUrl) {
      return err(
        makeAppError("NOT_FOUND", `Aset katalog '${assetId}' tidak ditemukan`)
      );
    }

    const filePathOrUrl = record ? record.file_path : conceptFallbackUrl!;
    const isRemoteUrl = /^https?:\/\//i.test(filePathOrUrl);
    const diskPath = isRemoteUrl
      ? ""
      : path.join(process.cwd(), "public", filePathOrUrl.replace(/^\/+/, ""));
    const hasDiskFile = !isRemoteUrl && fs.existsSync(diskPath);
    const isSupabaseRemote =
      isRemoteUrl ||
      (!hasDiskFile &&
        process.env.STORAGE_DRIVER === "supabase" &&
        (filePathOrUrl.startsWith("/media/custom/") ||
          filePathOrUrl.startsWith("/media/pictograms/")));

    const storageKey = isSupabaseRemote
      ? path.basename(filePathOrUrl.split("?")[0]!)
      : filePathOrUrl;

    const existing = await getAssetByStorageKey(storageKey);
    if (existing.ok && existing.data) {
      return ok(existing.data);
    }

    if (!hasDiskFile && !isSupabaseRemote) {
      return err(
        makeAppError(
          "NOT_FOUND",
          `Berkas aset '${filePathOrUrl}' tidak ada di disk`
        )
      );
    }

    const bytes = hasDiskFile ? fs.statSync(diskPath).size : 6000;
    const filename = record
      ? record.filename
      : path.basename(filePathOrUrl.split("?")[0]!);
    const ext = path.extname(filename).toLowerCase();
    const mime =
      ext === ".png"
        ? "image/png"
        : ext === ".jpg" || ext === ".jpeg"
          ? "image/jpeg"
          : ext === ".svg"
            ? "image/svg+xml"
            : "image/webp";

    const keyword = record
      ? Array.from(
          new Set([
            record.display_name.toLowerCase(),
            ...record.keywords_id.slice(0, 3),
          ])
        ).join(" | ")
      : Array.from(new Set(conceptKeywords)).join(" | ");

    const isCustom =
      record?.visual_type === "illustration" ||
      filePathOrUrl.includes("/custom/") ||
      conceptSource === "panduin-custom";

    return saveAsset({
      kind: isCustom ? "gambar" : "piktogram",
      storageKey,
      mime,
      bytes,
      keyword,
      alt: customAlt?.trim() || record?.display_name || conceptLabel,
      source: record?.source || conceptSource,
      license:
        record?.license ||
        (isCustom ? "CC0 / PanduIn" : "CC BY-NC-SA 4.0"),
      attribution:
        record?.attribution ||
        (isCustom
          ? "Ilustrasi edukasi kustom oleh PanduIn (CC0)."
          : "Piktogram: ARASAAC (arasaac.org), Pemerintah Aragon, penulis Sergio Palao. Lisensi CC BY-NC-SA 4.0."),
      verified: true,
    });
  } catch (error) {
    return err(
      makeAppError("PROCESSING_ERROR", "Gagal menyimpan aset katalog ke DB", error)
    );
  }
}

export async function findOrFetchPictogram(
  keywordId: string,
  keywordEn?: string
): Promise<Result<Asset>> {
  const cleanId = keywordId.trim().toLowerCase();
  const cleanEn = keywordEn?.trim().toLowerCase();
  if (!cleanId && !cleanEn) {
    return err(
      makeAppError("VALIDATION_ERROR", "Kata kunci piktogram tidak boleh kosong")
    );
  }

  // 0. Jika langsung berupa asset_id katalog lokal atau concept ID terverifikasi, resolusikan langsung
  if (
    cleanId.startsWith("picto:") ||
    cleanId.startsWith("custom:") ||
    getConceptIndex().byId.has(keywordId.trim())
  ) {
    const resolved = await resolveCatalogAssetToDb(keywordId.trim());
    if (resolved.ok) return resolved;
  }

  // 1. Cek cache lokal di tabel assets secara idempoten (hanya kecocokan segmen persis, bukan %substring%!)
  if (cleanId) {
    const cached = await findPictogram(cleanId);
    if (
      cached.ok &&
      cached.data &&
      hasExactKeywordSegment(cached.data.keyword, cleanId)
    ) {
      return ok(cached.data);
    }
  }

  if (cleanEn) {
    const cachedEn = await findAssetByKeyword(cleanEn, "piktogram");
    if (
      cachedEn.ok &&
      cachedEn.data &&
      cachedEn.data.source !== "system-placeholder" &&
      hasExactKeywordSegment(cachedEn.data.keyword, cleanEn)
    ) {
      return ok(cachedEn.data);
    }
  }

  // 2. Cari di katalog konsep terverifikasi Bahasa Indonesia
  const index = getConceptIndex();
  const conceptHits = search(cleanId || cleanEn || "", index, {
    limit: 3,
    minScore: 45,
    requireImage: true,
  }).filter(
    (h) =>
      h.concept.status === "active" &&
      !/\b\d{4,}\b/.test(h.concept.labelNorm || normalize(h.concept.label)) &&
      !h.matchedOn.includes("exact_en") &&
      !h.matchedOn.includes("en_tokens")
  );
  if (conceptHits[0]) {
    const resolved = await resolveCatalogAssetToDb(conceptHits[0].concept.id);
    if (resolved.ok) return resolved;
  }

  // 2a. Cari di katalog aset lokal dengan skor ketat (hindari kecocokan lemah/subkata)
  const catalogHits = searchAssets(cleanId || cleanEn || "", {
    limit: 1,
    minScore: 30,
    onlyAvailable: true,
  });
  if (catalogHits[0]) {
    const resolved = await resolveCatalogAssetToDb(catalogHits[0].asset.asset_id);
    if (resolved.ok) return resolved;
  }

  // 2b. Cek curated mapping agar ID akurat dan tidak tertukar
  const curatedId =
    CURATED_ARASAAC_IDS[cleanId] ??
    (cleanEn ? CURATED_ARASAAC_IDS[cleanEn] : undefined);
  if (curatedId) {
    const curatedAsset = await downloadAndCacheArasaacPictogram(
      curatedId,
      cleanId,
      cleanEn
    );
    if (curatedAsset.ok) {
      return curatedAsset;
    }
  }

  // 3. Lookup ARASAAC API (Bahasa Indonesia dulu)
  let results = await searchArasaacApi(cleanId, "id");

  // 4. Fallback ARASAAC API (Bahasa Inggris)
  if (results.length === 0 && cleanEn) {
    results = await searchArasaacApi(cleanEn, "en");
  }

  // 5. Hanya gunakan hasil ARASAAC jika ada kata kunci yang benar-benar cocok
  if (results.length > 0) {
    const targetNormId = normalize(cleanId);
    const targetNormEn = cleanEn ? normalize(cleanEn) : "";
    const exactMatch = results.find((r) =>
      r.keywords?.some((k) => {
        const kwNorm = normalize(k.keyword);
        return (
          kwNorm === targetNormId ||
          (targetNormEn !== "" && kwNorm === targetNormEn)
        );
      })
    );
    if (exactMatch) {
      const cachedAsset = await downloadAndCacheArasaacPictogram(
        exactMatch._id,
        cleanId,
        cleanEn
      );
      if (cachedAsset.ok) {
        return cachedAsset;
      }
    }
  }

  // 6. Jangan membuat gambar placeholder abu-abu kosong — kembalikan NOT_FOUND agar kartu tetap tanpa_gambar (null)
  return err(
    makeAppError(
      "NOT_FOUND",
      `Piktogram terverifikasi untuk '${cleanId || cleanEn}' tidak ditemukan`
    )
  );
}

// Pre-bundling piktogram materi demo agar siap pakai offline
export async function bundleDemoPictograms(): Promise<Result<number>> {
  const demoKeywords = [
    { id: "air", en: "water" },
    { id: "cuci tangan", en: "wash hands" },
    { id: "sabun", en: "soap" },
    { id: "gosok tangan", en: "rub hands" },
    { id: "bilas", en: "rinse" },
    { id: "handuk", en: "towel" },
    { id: "tangan bersih", en: "clean hands" },
    { id: "sikat gigi", en: "toothbrush" },
  ];

  let count = 0;
  for (const item of demoKeywords) {
    const res = await findOrFetchPictogram(item.id, item.en);
    if (res.ok) {
      count += 1;
    }
  }

  return ok(count);
}
