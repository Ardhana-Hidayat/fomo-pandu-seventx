import "server-only";
import fs from "node:fs";
import path from "node:path";
import {
  ALL_ASSET_CATEGORIES,
  type AssetCategory,
  type AssetRecord,
  type CatalogStats,
  type CatalogValidationReport,
} from "./types";
import {
  CUSTOM_SDLB_ASSETS,
  classifySlug,
  enrichKeywords,
  formatDisplayName,
  getCanonicalKey,
} from "./taxonomy";

interface ManifestItem {
  id: number;
  name: string;
  alt: string;
}

interface ManifestFile {
  source: string;
  license: string;
  attribution: string;
  license_url: string;
  items: Record<string, ManifestItem>;
}

let cachedCatalog: AssetRecord[] | null = null;
let cachedIndexById: Map<string, AssetRecord> | null = null;

function resolvePublicPath(webPath: string): string {
  const relative = webPath.replace(/^\/+/, "");
  return path.join(process.cwd(), "public", relative);
}

function resolveCatalogMedia(webPath: string): { filePath: string; available: boolean } {
  if (fs.existsSync(resolvePublicPath(webPath))) {
    return { filePath: webPath, available: true };
  }
  const useSupabaseFallback =
    process.env.STORAGE_DRIVER === "supabase" || Boolean(process.env.VERCEL);
  if (useSupabaseFallback) {
    const supabaseUrl = (
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.SUPABASE_URL ||
      "https://vmailnuloaoonmqeguok.supabase.co"
    ).replace(/\/+$/, "");
    if (supabaseUrl) {
      return {
        filePath: `${supabaseUrl}/storage/v1/object/public/card-images/${encodeURIComponent(path.basename(webPath))}`,
        available: true,
      };
    }
  }
  return { filePath: webPath, available: false };
}

function buildCatalog(): AssetRecord[] {
  const records: AssetRecord[] = [];
  const manifestPath = path.join(process.cwd(), "public", "media", "pictograms", "manifest.json");

  if (fs.existsSync(manifestPath)) {
    const manifest: ManifestFile = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    for (const [slug, item] of Object.entries(manifest.items)) {
      const filename = `${slug}.webp`;
      const resolved = resolveCatalogMedia(`/media/pictograms/${filename}`);
      const categories = classifySlug(slug);
      const enriched = enrichKeywords(slug, categories);

      records.push({
        asset_id: `picto:${slug}`,
        filename,
        display_name: formatDisplayName(slug),
        description: enriched.description,
        keywords_id: enriched.keywords_id,
        keywords_en: enriched.keywords_en,
        categories,
        concepts: enriched.concepts,
        visual_type: "pictogram",
        source: manifest.source || "ARASAAC",
        license: manifest.license || "CC BY-NC-SA 4.0",
        attribution:
          manifest.attribution ||
          "Piktogram: ARASAAC (arasaac.org), Pemerintah Aragon, penulis Sergio Palao.",
        file_path: resolved.filePath,
        available: resolved.available,
        arasaac_id: item.id,
        canonical_key: getCanonicalKey(slug),
      });
    }
  }

  for (const custom of CUSTOM_SDLB_ASSETS) {
    const resolved = resolveCatalogMedia(`/media/custom/${custom.filename}`);
    records.push({
      asset_id: `custom:${custom.slug}`,
      filename: custom.filename,
      display_name: custom.display_name,
      description: custom.description,
      keywords_id: custom.keywords_id,
      keywords_en: custom.keywords_en,
      categories: custom.categories,
      concepts: custom.concepts,
      visual_type: "illustration",
      source: "panduin-custom",
      license: "CC0 / PanduIn",
      attribution: "Ilustrasi edukasi kustom oleh PanduIn (CC0).",
      file_path: resolved.filePath,
      available: resolved.available,
      canonical_key: custom.slug,
    });
  }

  return records;
}

export function getCatalog(forceReload = false): AssetRecord[] {
  if (!cachedCatalog || forceReload) {
    cachedCatalog = buildCatalog();
    cachedIndexById = new Map(cachedCatalog.map((r) => [r.asset_id, r]));
  }
  return cachedCatalog;
}

export function getAssetById(assetId: string): AssetRecord | undefined {
  if (!cachedIndexById) {
    getCatalog();
  }
  return cachedIndexById?.get(assetId);
}

function countSibiSigns(): { count: number; missing: string[] } {
  const sibiDir = path.join(process.cwd(), "public", "signs", "sibi");
  const expected = "abcdefghijklmnopqrstuvwxyz".split("").map((c) => `${c}.webp`);
  if (!fs.existsSync(sibiDir)) {
    return { count: 0, missing: expected };
  }
  const existing = new Set(fs.readdirSync(sibiDir));
  const missing = expected.filter((f) => !existing.has(f));
  return { count: expected.length - missing.length, missing };
}

export function getCatalogStats(): CatalogStats {
  const catalog = getCatalog();
  const byCategory = Object.fromEntries(
    ALL_ASSET_CATEGORIES.map((c) => [c, 0])
  ) as Record<AssetCategory, number>;

  const byVisualType = { pictogram: 0, illustration: 0 };
  const bySource: Record<string, number> = {};
  let availableCount = 0;

  for (const item of catalog) {
    if (item.available) availableCount += 1;
    byVisualType[item.visual_type] += 1;
    bySource[item.source] = (bySource[item.source] ?? 0) + 1;
    for (const cat of item.categories) {
      byCategory[cat] = (byCategory[cat] ?? 0) + 1;
    }
  }

  const sibi = countSibiSigns();

  return {
    total_assets: catalog.length,
    available_assets: availableCount,
    unavailable_assets: catalog.length - availableCount,
    by_visual_type: byVisualType,
    by_source: bySource,
    by_category: byCategory,
    sibi_signs_count: sibi.count,
  };
}

export function validateCatalog(): CatalogValidationReport {
  const catalog = getCatalog(true);
  const missingFiles: string[] = [];
  const invalidRecords: Array<{ asset_id: string; reason: string }> = [];

  for (const item of catalog) {
    if (!item.available) {
      missingFiles.push(item.file_path);
    }
    if (!item.display_name.trim()) {
      invalidRecords.push({ asset_id: item.asset_id, reason: "Empty display_name" });
    }
    if (item.categories.length === 0) {
      invalidRecords.push({ asset_id: item.asset_id, reason: "No categories assigned" });
    }
    if (item.keywords_id.length === 0 && item.keywords_en.length === 0) {
      invalidRecords.push({ asset_id: item.asset_id, reason: "No keywords assigned" });
    }
    if (!item.license || !item.attribution) {
      invalidRecords.push({ asset_id: item.asset_id, reason: "Missing license or attribution" });
    }
  }

  const sibi = countSibiSigns();

  return {
    valid: missingFiles.length === 0 && invalidRecords.length === 0 && sibi.missing.length === 0,
    total_checked: catalog.length,
    missing_files: missingFiles,
    invalid_records: invalidRecords,
    sibi_missing: sibi.missing,
  };
}
