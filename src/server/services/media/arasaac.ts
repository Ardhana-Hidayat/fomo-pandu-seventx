import "server-only";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { storage } from "../storage";
import {
  saveAsset,
  findPictogram,
  findAssetByKeyword,
} from "../../repos/assets";
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
      license: "PANDU",
      attribution: "PANDU Pustaka Piktogram",
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

export async function findOrFetchPictogram(
  keywordId: string,
  keywordEn?: string
): Promise<Result<Asset>> {
  const cleanId = keywordId.trim().toLowerCase();
  const cleanEn = keywordEn?.trim().toLowerCase();

  // 1. Cek cache lokal di tabel assets
  const cached = await findPictogram(cleanId);
  if (cached.ok && cached.data) {
    return ok(cached.data);
  }

  if (cleanEn) {
    const cachedEn = await findAssetByKeyword(cleanEn, "piktogram");
    if (cachedEn.ok && cachedEn.data) {
      return ok(cachedEn.data);
    }
  }

  // 1b. Cek curated mapping agar ID akurat dan tidak tertukar (misal cuci tangan tidak tertukar cuci mobil)
  const curatedId = CURATED_ARASAAC_IDS[cleanId] ?? (cleanEn ? CURATED_ARASAAC_IDS[cleanEn] : undefined);
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

  // 2. Lookup ARASAAC API (Bahasa Indonesia dulu)
  let results = await searchArasaacApi(cleanId, "id");

  // 3. Fallback ARASAAC API (Bahasa Inggris)
  if (results.length === 0 && cleanEn) {
    results = await searchArasaacApi(cleanEn, "en");
  }

  // 4. Jika ditemukan di ARASAAC, cari yang keyword-nya paling tepat
  if (results.length > 0) {
    const exactMatch = results.find((r) =>
      r.keywords?.some((k) =>
        cleanEn ? k.keyword.toLowerCase() === cleanEn : k.keyword.toLowerCase() === cleanId
      )
    );
    const selectedMatch = exactMatch ?? results[0];
    if (selectedMatch) {
      const cachedAsset = await downloadAndCacheArasaacPictogram(
        selectedMatch._id,
        cleanId,
        cleanEn
      );
      if (cachedAsset.ok) {
        return cachedAsset;
      }
    }
  }

  // 5. Fallback ke placeholder lokal terstandarisasi
  return createPlaceholderPictogram(cleanId);
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
