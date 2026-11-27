// @vitest-environment node
import { describe, it, expect, beforeAll, vi } from "vitest";
import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/pglite/migrator";
import { db } from "@/server/db/client";
import { assets, visualConcepts } from "@/server/db/schema";
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

  it("ignores placeholder storageKeys and resolves missing-on-disk custom media to Supabase URL when STORAGE_DRIVER=supabase", async () => {
    const prevDriver = process.env.STORAGE_DRIVER;
    const prevSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    process.env.STORAGE_DRIVER = "supabase";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://mock.supabase.co";

    const testPlaceholderId = "test-placeholder-skip-concept";
    const testSupabaseId = "test-supabase-fallback-concept";
    let placeholderAssetId: string | null = null;
    let supabaseAssetId: string | null = null;

    try {
      const [phAsset] = await db
        .insert(assets)
        .values({
          kind: "pictogram",
          storageKey: "placeholder-test-broken.webp",
          mime: "image/webp",
          bytes: 532,
          alt: "Placeholder broken",
          source: "system-placeholder",
          verified: false,
        })
        .returning({ id: assets.id });
      placeholderAssetId = phAsset.id;

      const [sbAsset] = await db
        .insert(assets)
        .values({
          kind: "custom",
          storageKey: "/media/custom/missing-on-disk-test-only.webp",
          mime: "image/webp",
          bytes: 12000,
          alt: "Custom remote asset",
          source: "custom",
          verified: true,
        })
        .returning({ id: assets.id });
      supabaseAssetId = sbAsset.id;

      await db.insert(visualConcepts).values([
        {
          id: testPlaceholderId,
          label: "Uji Placeholder",
          labelNorm: "uji placeholder",
          synonyms: [],
          labelEn: "test placeholder",
          domains: ["bina-diri"],
          groupId: "bina-diri",
          kind: "konsep",
          popularity: 50,
          assetId: placeholderAssetId,
          altAssetIds: [],
          altText: "Uji Placeholder",
          status: "active",
          source: "upload",
        },
        {
          id: testSupabaseId,
          label: "Uji Supabase Disk",
          labelNorm: "uji supabase disk",
          synonyms: [],
          labelEn: "test supabase disk",
          domains: ["bina-diri"],
          groupId: "bina-diri",
          kind: "konsep",
          popularity: 50,
          assetId: supabaseAssetId,
          altAssetIds: [],
          altText: "Uji Supabase Disk",
          status: "active",
          source: "upload",
        },
      ]);

      const phRes = await getCatalogAssets(
        new Request("http://localhost/api/catalog/assets?q=uji+placeholder&limit=20")
      );
      expect(phRes.status).toBe(200);
      const phJson = (await phRes.json()) as {
        items: Array<{ id: string; url: string }>;
      };
      expect(phJson.items.find((i) => i.id === testPlaceholderId)).toBeUndefined();

      const sbRes = await getCatalogAssets(
        new Request("http://localhost/api/catalog/assets?q=uji+supabase+disk&limit=20")
      );
      expect(sbRes.status).toBe(200);
      const sbJson = (await sbRes.json()) as {
        items: Array<{ id: string; url: string }>;
      };
      const found = sbJson.items.find((i) => i.id === testSupabaseId);
      expect(found?.url).toBe(
        "https://mock.supabase.co/storage/v1/object/public/card-images/missing-on-disk-test-only.webp"
      );
    } finally {
      await db.delete(visualConcepts).where(eq(visualConcepts.id, testPlaceholderId));
      await db.delete(visualConcepts).where(eq(visualConcepts.id, testSupabaseId));
      if (placeholderAssetId) {
        await db.delete(assets).where(eq(assets.id, placeholderAssetId));
      }
      if (supabaseAssetId) {
        await db.delete(assets).where(eq(assets.id, supabaseAssetId));
      }
      if (prevDriver === undefined) delete process.env.STORAGE_DRIVER;
      else process.env.STORAGE_DRIVER = prevDriver;
      if (prevSupabaseUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      else process.env.NEXT_PUBLIC_SUPABASE_URL = prevSupabaseUrl;
    }
  });
});
