import { describe, it, expect } from "vitest";
import {
  getAssetById,
  getCatalogStats,
  validateCatalog,
  searchAssets,
  normalizeText,
  stemToken,
} from "../index";

describe("Asset Catalog Integrity", () => {
  it("validates all 1074 assets on disk with zero broken paths and 26 SIBI signs", () => {
    const report = validateCatalog();
    expect(report.missing_files).toEqual([]);
    expect(report.invalid_records).toEqual([]);
    expect(report.sibi_missing).toEqual([]);
    expect(report.valid).toBe(true);
    expect(report.total_checked).toBe(1074);
  });

  it("reports accurate catalog statistics", () => {
    const stats = getCatalogStats();
    expect(stats.total_assets).toBe(1074);
    expect(stats.available_assets).toBe(1074);
    expect(stats.unavailable_assets).toBe(0);
    expect(stats.by_visual_type.pictogram).toBe(1050);
    expect(stats.by_visual_type.illustration).toBe(24);
    expect(stats.sibi_signs_count).toBe(26);
    expect(stats.by_source["ARASAAC"]).toBe(1050);
    expect(stats.by_source["panduin-custom"]).toBe(24);
  });

  it("retrieves individual assets by id with enriched metadata", () => {
    const picto = getAssetById("picto:air");
    expect(picto).toBeDefined();
    expect(picto?.file_path).toBe("/media/pictograms/air.webp");
    expect(picto?.available).toBe(true);
    expect(picto?.license).toBe("CC BY-NC-SA 4.0");

    const custom = getAssetById("custom:akar-tumbuhan");
    expect(custom).toBeDefined();
    expect(custom?.visual_type).toBe("illustration");
    expect(custom?.source).toBe("panduin-custom");
    expect(custom?.license).toBe("CC0 / PanduIn");
    expect(custom?.available).toBe(true);
  });
});

describe("Text Normalization & Stemming", () => {
  it("normalizes Indonesian and English text while preserving fractions", () => {
    expect(normalizeText("Bagian-Tumbuhan! (IPA)")).toBe("bagian tumbuhan ipa");
    expect(normalizeText("Pecahan 1/2 dan 1/4")).toBe("pecahan 1/2 dan 1/4");
  });

  it("stems common Indonesian affixes and English inflections", () => {
    expect(stemToken("menjumlahkan")).toBe("jumlah");
    expect(stemToken("bermain")).toBe("main");
    expect(stemToken("running")).toBe("runn");
    expect(stemToken("pencernaan")).toBe("cerna");
  });
});

describe("Hybrid Asset Retrieval across 12+ SDLB Topics", () => {
  const soapBiasIds = new Set(["picto:sabun", "picto:cuci-tangan", "picto:soap", "picto:gosok-tangan"]);

  it("1. bagian tumbuhan -> returns root, stem, leaf, tree, flower (no soap bias)", () => {
    const results = searchAssets("bagian tumbuhan", { limit: 6 });
    expect(results.length).toBeGreaterThanOrEqual(3);
    const ids = results.map((r) => r.asset.asset_id);
    expect(ids.some((id) => id.includes("akar-tumbuhan") || id.includes("batang-tumbuhan") || id.includes("daun-hijau"))).toBe(true);
    expect(ids.every((id) => !soapBiasIds.has(id))).toBe(true);
  });

  it("2. sistem pencernaan -> returns custom:sistem-pencernaan at top", () => {
    const results = searchAssets("sistem pencernaan", { limit: 5 });
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].asset.asset_id).toBe("custom:sistem-pencernaan");
    expect(results[0].score).toBeGreaterThan(20);
  });

  it("3. hewan -> returns diverse animals", () => {
    const results = searchAssets("hewan", { limit: 8 });
    expect(results.length).toBeGreaterThanOrEqual(5);
    const ids = results.map((r) => r.asset.asset_id);
    expect(ids.some((id) => ["picto:kucing", "picto:anjing", "picto:sapi", "picto:burung", "picto:gajah"].includes(id))).toBe(true);
    expect(ids.every((id) => !soapBiasIds.has(id))).toBe(true);
  });

  it("4. transportasi -> returns diverse vehicles", () => {
    const results = searchAssets("transportasi", { limit: 8 });
    expect(results.length).toBeGreaterThanOrEqual(5);
    const ids = results.map((r) => r.asset.asset_id);
    expect(ids.some((id) => ["picto:mobil", "picto:sepeda", "picto:bus", "picto:kereta", "picto:pesawat"].includes(id))).toBe(true);
    expect(ids.every((id) => !soapBiasIds.has(id))).toBe(true);
  });

  it("5. penjumlahan -> returns custom:penjumlahan at top", () => {
    const results = searchAssets("penjumlahan", { limit: 5 });
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].asset.asset_id).toBe("custom:penjumlahan");
  });

  it("6. pengurangan -> returns custom:pengurangan at top", () => {
    const results = searchAssets("pengurangan", { limit: 5 });
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].asset.asset_id).toBe("custom:pengurangan");
  });

  it("7. pecahan -> returns fraction illustrations (1/2, 1/4)", () => {
    const results = searchAssets("pecahan", { limit: 5 });
    expect(results.length).toBeGreaterThanOrEqual(2);
    const ids = results.map((r) => r.asset.asset_id);
    expect(ids).toContain("custom:pecahan-setengah");
    expect(ids).toContain("custom:pecahan-seperempat");
  });

  it("8. profesi -> returns diverse professions", () => {
    const results = searchAssets("profesi", { limit: 8 });
    expect(results.length).toBeGreaterThanOrEqual(4);
    const ids = results.map((r) => r.asset.asset_id);
    expect(ids.some((id) => ["picto:guru", "picto:dokter", "picto:polisi", "picto:petani", "custom:pemadam-kebakaran"].includes(id))).toBe(true);
  });

  it("9. kegiatan sosial -> returns gotong royong, musyawarah, membantu, bermain", () => {
    const results = searchAssets("kegiatan sosial", { limit: 8 });
    expect(results.length).toBeGreaterThanOrEqual(4);
    const ids = results.map((r) => r.asset.asset_id);
    expect(ids.some((id) => ["custom:gotong-royong", "custom:musyawarah", "picto:membantu", "picto:bermain"].includes(id))).toBe(true);
  });

  it("10. kebersihan diri -> returns diverse hygiene concepts without soap-variant flooding", () => {
    const results = searchAssets("kebersihan diri", { limit: 8 });
    expect(results.length).toBeGreaterThanOrEqual(5);
    const canonicalKeys = new Set(results.map((r) => r.asset.canonical_key));
    // All returned results have distinct canonical concepts
    expect(canonicalKeys.size).toBe(results.length);
    const soapOnlyCount = results.filter((r) => r.asset.canonical_key.includes("soap")).length;
    expect(soapOnlyCount).toBeLessThanOrEqual(1);
  });

  it("11. cuaca -> returns weather illustrations & pictograms", () => {
    const results = searchAssets("cuaca", { limit: 8 });
    expect(results.length).toBeGreaterThanOrEqual(4);
    const ids = results.map((r) => r.asset.asset_id);
    expect(ids.some((id) => ["custom:cuaca-cerah", "custom:cuaca-berawan", "custom:cuaca-badai-petir", "picto:hujan"].includes(id))).toBe(true);
  });

  it("12. lingkungan -> returns nature & environment assets", () => {
    const results = searchAssets("lingkungan", { limit: 8 });
    expect(results.length).toBeGreaterThanOrEqual(4);
    const ids = results.map((r) => r.asset.asset_id);
    expect(ids.some((id) => ["picto:pohon", "picto:gunung", "picto:sungai", "custom:siklus-air"].includes(id))).toBe(true);
  });

  it("supports English queries, category filtering, visualType filtering, and empty queries", () => {
    const enHappy = searchAssets("happy", { limit: 3 });
    expect(enHappy.length).toBeGreaterThanOrEqual(1);
    expect(enHappy[0].asset.canonical_key).toBe("happy");

    const customOnly = searchAssets("matematika", { visualType: "illustration", limit: 10 });
    expect(customOnly.length).toBeGreaterThanOrEqual(6);
    expect(customOnly.every((r) => r.asset.visual_type === "illustration")).toBe(true);

    const catFiltered = searchAssets("air", { categories: ["IPA"], limit: 5 });
    expect(catFiltered.every((r) => r.asset.categories.includes("IPA"))).toBe(true);

    expect(searchAssets("")).toEqual([]);
  });
});
