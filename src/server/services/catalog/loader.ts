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
  if (!fs.existsSync(catalogDir)) {
    return [];
  }

  const files = fs
    .readdirSync(catalogDir)
    .filter((f) => f.endsWith(".json"))
    .sort();

  const byId = new Map<string, ConceptRecord>();

  const supabaseUrl = (
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    ""
  ).replace(/\/+$/, "");
  const useSupabaseForMissingLocal =
    process.env.STORAGE_DRIVER === "supabase" && Boolean(supabaseUrl);

  for (const file of files) {
    const fullPath = path.join(catalogDir, file);
    const raw = fs.readFileSync(fullPath, "utf8");
    const parsed = JSON.parse(raw) as DomainCatalogFile | ConceptRecord[];
    const items = Array.isArray(parsed) ? parsed : parsed.concepts ?? [];

    for (const item of items) {
      if (!item || !item.id) continue;
      if (!byId.has(item.id)) {
        let resolvedUrl = item.assetUrl;
        if (
          useSupabaseForMissingLocal &&
          resolvedUrl &&
          resolvedUrl.startsWith("/media/custom/")
        ) {
          const localDiskPath = path.join(
            process.cwd(),
            "public",
            resolvedUrl.replace(/^\/+/, "")
          );
          if (!fs.existsSync(localDiskPath)) {
            resolvedUrl = `${supabaseUrl}/storage/v1/object/public/card-images/${path.basename(resolvedUrl)}`;
          }
        }
        byId.set(item.id, { ...item, assetUrl: resolvedUrl });
      }
    }
  }

  return Array.from(byId.values());
}
