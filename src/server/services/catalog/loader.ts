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

  for (const file of files) {
    const fullPath = path.join(catalogDir, file);
    const raw = fs.readFileSync(fullPath, "utf8");
    const parsed = JSON.parse(raw) as DomainCatalogFile | ConceptRecord[];
    const items = Array.isArray(parsed) ? parsed : parsed.concepts ?? [];

    for (const item of items) {
      if (!item || !item.id) continue;
      if (!byId.has(item.id)) {
        byId.set(item.id, item);
      }
    }
  }

  return Array.from(byId.values());
}
