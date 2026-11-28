import fs from "node:fs";
import path from "node:path";
import type { ConceptRecord } from "@/shared/lib/grounding/visual-retrieval";

export interface DomainCatalogFile {
  domain: string;
  version?: string;
  count?: number;
  concepts: ConceptRecord[];
}

export function getCatalogDir(): string {
  return path.join(process.cwd(), "data", "catalog");
}

export function getSeedsFilePath(): string {
  return path.join(process.cwd(), "data", "domains-and-seeds.json");
}

/**
 * Load all domain catalog JSON files from data/catalog/*.json.
 */
export function loadCatalogFromDisk(catalogDir = getCatalogDir()): ConceptRecord[] {
  if (!fs.existsSync(/* turbopackIgnore: true */ catalogDir)) {
    return [];
  }

  const files = fs
    .readdirSync(/* turbopackIgnore: true */ catalogDir)
    .filter((f) => f.endsWith(".json"))
    .sort();

  const byId = new Map<string, ConceptRecord>();

  const supabaseUrl = (
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    (process.env.STORAGE_DRIVER === "supabase" || Boolean(process.env.VERCEL)
      ? "https://vmailnuloaoonmqeguok.supabase.co"
      : "")
  ).replace(/\/+$/, "");
  const useSupabaseForMissingLocal =
    Boolean(supabaseUrl) &&
    (process.env.STORAGE_DRIVER === "supabase" || Boolean(process.env.VERCEL));

  const resolveMediaUrl = (url: string | null | undefined): string | null | undefined => {
    if (
      !useSupabaseForMissingLocal ||
      !url ||
      (!url.startsWith("/media/custom/") && !url.startsWith("/media/pictograms/"))
    ) {
      return url;
    }
    const localDiskPath = path.join(process.cwd(), "public", url.replace(/^\/+/, ""));
    if (fs.existsSync(localDiskPath)) {
      return url;
    }
    return `${supabaseUrl}/storage/v1/object/public/card-images/${encodeURIComponent(path.basename(url))}`;
  };

  for (const file of files) {
    const fullPath = path.join(/* turbopackIgnore: true */ catalogDir, file);
    const raw = fs.readFileSync(/* turbopackIgnore: true */ fullPath, "utf8");
    const parsed = JSON.parse(raw) as DomainCatalogFile | ConceptRecord[];
    const items = Array.isArray(parsed) ? parsed : parsed.concepts ?? [];

    for (const item of items) {
      if (!item || !item.id) continue;
      if (!byId.has(item.id)) {
        const resolvedUrl = resolveMediaUrl(item.assetUrl);
        const rawAlts = (item as ConceptRecord & { altUrls?: string[] }).altUrls;
        const resolvedAlts = Array.isArray(rawAlts)
          ? rawAlts.map((u) => resolveMediaUrl(u) || u)
          : undefined;
        byId.set(item.id, {
          ...item,
          assetUrl: resolvedUrl,
          ...(resolvedAlts ? { altUrls: resolvedAlts } : {}),
        } as ConceptRecord);
      }
    }
  }

  return Array.from(byId.values());
}
