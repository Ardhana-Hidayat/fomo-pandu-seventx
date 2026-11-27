import { NextResponse } from "next/server";
import {
  findOrFetchPictogram,
  resolveCatalogAssetToDb,
} from "@/server/services/media/arasaac";
import {
  ALL_ASSET_CATEGORIES,
  getCatalog,
  searchAssets,
  type AssetCategory,
  type AssetRecord,
} from "@/server/services/assets";
import { listVisualAssets } from "@/server/repos/assets";
import { storage } from "@/server/services/storage";
import type { Asset } from "@/server/db/schema";

const TEACHER_UPLOAD_CATEGORY = "Unggahan Guru";

export interface VisualLibraryItem {
  id: string;
  dbAssetId: string | null;
  url: string;
  display_name: string;
  alt: string;
  keyword: string;
  categories: string[];
  visual_type: "pictogram" | "illustration" | "upload";
  source: string;
  license: string;
  attribution: string;
}

function resolveAssetUrl(storageKey: string): string {
  return storageKey.startsWith("/") || storageKey.startsWith("http")
    ? storageKey
    : storage.url(storageKey, "card-images");
}

function mapCatalogRecordToLibraryItem(record: AssetRecord): VisualLibraryItem {
  return {
    id: record.asset_id,
    dbAssetId: null,
    url: record.file_path,
    display_name: record.display_name,
    alt: record.description || record.display_name,
    keyword: record.keywords_id[0] || record.display_name.toLowerCase(),
    categories: [...record.categories],
    visual_type: record.visual_type,
    source: record.source,
    license: record.license,
    attribution: record.attribution,
  };
}

function mapDbAssetToLibraryItem(asset: Asset): VisualLibraryItem {
  const primaryLabel =
    asset.alt?.trim() ||
    asset.keyword?.split("|")[0]?.trim() ||
    "Gambar Unggahan Guru";

  return {
    id: asset.id,
    dbAssetId: asset.id,
    url: resolveAssetUrl(asset.storageKey),
    display_name: primaryLabel,
    alt: asset.alt?.trim() || primaryLabel,
    keyword: asset.keyword?.trim() || primaryLabel.toLowerCase(),
    categories: [TEACHER_UPLOAD_CATEGORY],
    visual_type: "upload",
    source: asset.source || "upload",
    license: asset.license || "Hak cipta guru",
    attribution: asset.attribution || "Unggahan guru",
  };
}

function handleLibraryRequest(
  searchParams: URLSearchParams
): Promise<NextResponse> {
  return (async () => {
    const query = (searchParams.get("q") || searchParams.get("keyword") || "").trim();
    const rawCategory = (searchParams.get("category") || "Semua").trim();
    const limitParam = Number.parseInt(searchParams.get("limit") || "60", 10);
    const offsetParam = Number.parseInt(searchParams.get("offset") || "0", 10);
    const limit = Number.isFinite(limitParam)
      ? Math.max(1, Math.min(200, limitParam))
      : 60;
    const offset = Number.isFinite(offsetParam) ? Math.max(0, offsetParam) : 0;

    const catalog = getCatalog().filter((item) => item.available);
    const catalogUrls = new Set(catalog.map((item) => item.file_path));

    // Kumpulkan kategori yang tersedia secara dinamis
    const categoryCounts = new Map<string, number>();
    for (const item of catalog) {
      for (const cat of item.categories) {
        categoryCounts.set(cat, (categoryCounts.get(cat) ?? 0) + 1);
      }
    }
    const availableCatalogCategories = ALL_ASSET_CATEGORIES.filter(
      (cat) => (categoryCounts.get(cat) ?? 0) > 0
    );
    const categories = ["Semua", TEACHER_UPLOAD_CATEGORY, ...availableCatalogCategories];

    // Ambil seluruh aset visual unggahan/kustom dari DB tanpa batas 200 tersembunyi
    const allDbAssets: Asset[] = [];
    let dbOffset = 0;
    const dbPageSize = 500;
    while (true) {
      const dbRes = await listVisualAssets({
        search: query || undefined,
        limit: dbPageSize,
        offset: dbOffset,
      });
      if (!dbRes.ok || dbRes.data.length === 0) break;
      allDbAssets.push(...dbRes.data);
      if (dbRes.data.length < dbPageSize) break;
      dbOffset += dbPageSize;
    }

    const dbUploadItems: VisualLibraryItem[] = allDbAssets
      .filter(
        (a) =>
          !catalogUrls.has(a.storageKey) &&
          !a.storageKey.startsWith("/media/pictograms/") &&
          !a.storageKey.startsWith("/media/custom/")
      )
      .map(mapDbAssetToLibraryItem);

    const isAllCategory = !rawCategory || rawCategory === "Semua";
    const isTeacherCategory = rawCategory === TEACHER_UPLOAD_CATEGORY;
    const catalogCategoryFilter =
      !isAllCategory &&
      !isTeacherCategory &&
      ALL_ASSET_CATEGORIES.includes(rawCategory as AssetCategory)
        ? [rawCategory as AssetCategory]
        : undefined;

    let catalogItems: VisualLibraryItem[] = [];
    if (!isTeacherCategory) {
      if (query) {
        const hits = searchAssets(query, {
          limit: catalog.length,
          minScore: 1,
          onlyAvailable: true,
          deduplicateConcepts: false,
          categories: catalogCategoryFilter,
        });
        catalogItems = hits.map((hit) => mapCatalogRecordToLibraryItem(hit.asset));
      } else {
        const filtered = catalogCategoryFilter
          ? catalog.filter((item) =>
              item.categories.some((cat) => catalogCategoryFilter.includes(cat))
            )
          : catalog;

        // Tampilkan ilustrasi edukasi kustom lebih dulu, lalu piktogram ARASAAC
        const illustrations = filtered.filter((i) => i.visual_type === "illustration");
        const pictograms = filtered.filter((i) => i.visual_type !== "illustration");
        catalogItems = [...illustrations, ...pictograms].map(
          mapCatalogRecordToLibraryItem
        );
      }
    }

    const includeDbUploads = isAllCategory || isTeacherCategory;
    const combined = includeDbUploads
      ? [...dbUploadItems, ...catalogItems]
      : catalogItems;

    const total = combined.length;
    const items = combined.slice(offset, offset + limit);
    const hasMore = offset + items.length < total;

    return NextResponse.json(
      {
        success: true,
        items,
        total,
        categories,
        hasMore,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  })();
}

function serializePictogramAsset(asset: Asset) {
  const url = resolveAssetUrl(asset.storageKey);
  return {
    id: asset.id,
    storageKey: asset.storageKey,
    url,
    keyword: asset.keyword,
    alt: asset.alt,
    attribution: asset.attribution,
    license: asset.license,
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("mode");

    if (mode === "library") {
      return await handleLibraryRequest(searchParams);
    }

    const resolveId = (searchParams.get("resolve") || "").trim();
    if (resolveId) {
      const resolved = await resolveCatalogAssetToDb(resolveId);
      if (!resolved.ok) {
        return NextResponse.json(
          { error: resolved.error.message },
          { status: 404 }
        );
      }
      return NextResponse.json({
        success: true,
        pictogram: serializePictogramAsset(resolved.data),
      });
    }

    const query = searchParams.get("q") || searchParams.get("keyword") || "";
    const en = searchParams.get("en") || undefined;
    const strict =
      searchParams.get("strict") === "1" || searchParams.get("strict") === "true";

    if (!query.trim()) {
      return NextResponse.json(
        { error: "Kata kunci pencarian tidak boleh kosong" },
        { status: 400 }
      );
    }

    if (strict) {
      const hits = searchAssets(query, {
        limit: 1,
        minScore: 22,
        onlyAvailable: true,
      });
      const topHit = hits[0];
      if (!topHit) {
        return NextResponse.json({
          success: true,
          pictogram: null,
        });
      }

      const resolved = await resolveCatalogAssetToDb(topHit.asset.asset_id);
      if (!resolved.ok) {
        return NextResponse.json({
          success: true,
          pictogram: null,
        });
      }

      return NextResponse.json(
        {
          success: true,
          pictogram: serializePictogramAsset(resolved.data),
        },
        {
          headers: {
            "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
          },
        }
      );
    }

    // Mode lookup backward-compatible: cari di DB atau fetch dari ARASAAC
    const picRes = await findOrFetchPictogram(query, en);
    if (!picRes.ok) {
      return NextResponse.json(
        { error: picRes.error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        pictogram: serializePictogramAsset(picRes.data),
      },
      {
        headers: {
          "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gagal mencari piktogram",
      },
      { status: 500 }
    );
  }
}
