import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("Lisensi dataset isyarat", () => {
  it("seluruh sourceId yang dirujuk dalam manifest.json ada di registri sumber dan berlisensi CC BY 4.0", () => {
    const manifestPath = path.resolve(process.cwd(), "public/signs/manifest.json");
    const sourcesPath = path.resolve(process.cwd(), "docs/update-pack-2/data/sign-sources.json");

    expect(fs.existsSync(manifestPath)).toBe(true);
    expect(fs.existsSync(sourcesPath)).toBe(true);

    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
    const sourcesData = JSON.parse(fs.readFileSync(sourcesPath, "utf-8"));

    // Flatten all sources from sign-sources.json
    const sourceMap = new Map<string, { license: string; title: string }>();

    interface SystemSourceEntry {
      priority?: Array<{ id: string; license: string; title: string }>;
    }

    for (const sys of Object.values(sourcesData.systems) as SystemSourceEntry[]) {
      if (Array.isArray(sys.priority)) {
        for (const item of sys.priority) {
          sourceMap.set(item.id, { license: item.license, title: item.title });
        }
      }
    }

    // Check each manifest item's origin
    for (const item of manifest.items) {
      if (item.origin?.sourceId) {
        const source = sourceMap.get(item.origin.sourceId);
        expect(
          source,
          `Item ${item.system} ${item.key} merujuk sourceId '${item.origin.sourceId}' yang tidak terdaftar di sign-sources.json`
        ).toBeDefined();

        expect(
          source?.license,
          `Sumber '${item.origin.sourceId}' memiliki lisensi '${source?.license}', wajib 'CC BY 4.0'`
        ).toBe("CC BY 4.0");
      }
    }
  });
});
