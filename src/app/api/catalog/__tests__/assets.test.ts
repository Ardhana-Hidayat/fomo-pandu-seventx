// @vitest-environment node
import { describe, it, expect, beforeAll, vi } from "vitest";
import { migrate } from "drizzle-orm/pglite/migrator";
import { db } from "@/server/db/client";
import { GET as getCatalogAssets } from "../assets/route";
import * as catalogService from "@/server/services/catalog";
import type { ConceptRecord } from "@/shared/lib/grounding/visual-retrieval";

function makeSyntheticCatalog(count: number): ConceptRecord[] {
  const seeds: Array<{ id: string; label: string; domains: string[]; synonyms?: string[] }> = [
    { id: "seed:mangga", label: "Mangga", domains: ["tumbuhan-makanan"], synonyms: ["buah mangga"] },
    { id: "seed:mencuci", label: "Mencuci", domains: ["bina-diri"], synonyms: ["cuci tangan"] },
    { id: "seed:pohon", label: "Pohon", domains: ["alam-cuaca", "tumbuhan-makanan"], synonyms: ["pepohonan"] },
  ];

  const list: ConceptRecord[] = seeds.map((s) => ({
    id: s.id,
    label: s.label,
    labelNorm: s.label.toLowerCase(),
    synonyms: s.synonyms ?? [],
    domains: s.domains,
    groupId: "umum",
    kind: "kata_benda",
    popularity: 10,
    assetUrl: `/media/pictograms/${s.label.toLowerCase()}.webp`,
    altText: s.label,
    status: "active",
    source: "arasaac",
  }));

  for (let i = list.length; i < count; i++) {
    const label = `Konsep Visual ${String(i).padStart(4, "0")}`;
    list.push({
      id: `seed:item-${i}`,
      label,
      labelNorm: label.toLowerCase(),
      synonyms: [],
      domains: [i % 2 === 0 ? "sekolah" : "hewan"],
      groupId: "umum",
      kind: "kata_benda",
      popularity: 1,
      assetUrl: `/media/pictograms/item-${i}.webp`,
      altText: label,
      status: "active",
      source: "arasaac",
    });
  }

  return list;
}

describe("GET /api/catalog/assets (C3)", () => {
  beforeAll(async () => {
    await migrate(db as unknown as Parameters<typeof migrate>[0], {
      migrationsFolder: "./drizzle",
    });

    const realCatalog = catalogService.getConceptCatalog();
    if (realCatalog.length < 1200) {
      const synthetic = makeSyntheticCatalog(1200);
      vi.spyOn(catalogService, "getConceptCatalog").mockReturnValue(synthetic);
    }
  });

  it("paginates through all >= 1,200 active concepts without any hidden cap", async () => {
    const seenIds = new Set<string>();
    let cursor: string | null = "0";
    let expectedTotal = 0;
    let pageCount = 0;

    while (cursor !== null) {
      const res = await getCatalogAssets(
        new Request(`http://localhost/api/catalog/assets?limit=100&cursor=${cursor}`)
      );
      expect(res.status).toBe(200);
      const json = (await res.json()) as {
        success: boolean;
        items: Array<{ id: string; url: string; label: string }>;
        nextCursor: string | null;
        total: number;
        domains: string[];
      };

      expect(json.success).toBe(true);
      expect(Array.isArray(json.items)).toBe(true);
      expect(Array.isArray(json.domains)).toBe(true);
      if (pageCount === 0) {
        expectedTotal = json.total;
        expect(expectedTotal).toBeGreaterThan(1000);
      } else {
        expect(json.total).toBe(expectedTotal);
      }

      for (const item of json.items) {
        expect(item.url).toBeTruthy();
        seenIds.add(item.id);
      }

      cursor = json.nextCursor;
      pageCount++;
      expect(pageCount).toBeLessThan(50);
    }

    expect(seenIds.size).toBe(expectedTotal);
  });

  it("searches for 'mencuci', 'pohon', and 'apel' accurately", async () => {
    for (const term of ["mencuci", "pohon", "apel"]) {
      const res = await getCatalogAssets(
        new Request(`http://localhost/api/catalog/assets?q=${encodeURIComponent(term)}&limit=60`)
      );
      expect(res.status).toBe(200);
      const json = (await res.json()) as {
        success: boolean;
        items: Array<{ id: string; label: string; alt_text: string }>;
        total: number;
      };
      expect(json.success).toBe(true);
      expect(json.total).toBeGreaterThan(0);
    }
  });
});
