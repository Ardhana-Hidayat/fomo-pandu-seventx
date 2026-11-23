import { describe, expect, it } from "vitest";
import { validateManifest, mergeManifestWithOverrides } from "../manifest";
import type { SignsManifestV2 } from "../../../../src/server/services/signs/schema";

describe("manifest lib", () => {
  const baseManifest: SignsManifestV2 = {
    version: 2,
    generated_by: "test",
    items: [
      {
        system: "SIBI",
        kind: "letter",
        key: "A",
        type: "image",
        src: "/signs/sibi/a.webp",
        alt: "Isyarat A",
        motion: false,
        status: "source",
      },
      {
        system: "SIBI",
        kind: "letter",
        key: "B",
        type: "image",
        src: "/signs/sibi/b.webp",
        alt: "Isyarat B",
        motion: false,
        status: "source",
      },
    ],
  };

  it("memvalidasi struktur manifest v2 dengan benar", () => {
    const validated = validateManifest(baseManifest);
    expect(validated.version).toBe(2);
    expect(validated.items).toHaveLength(2);
  });

  it("menggabungkan override database dengan benar", () => {
    const merged = mergeManifestWithOverrides(baseManifest, [
      {
        system: "SIBI",
        key: "A",
        status: "verified",
        assetUrl: "/signs/custom/a.webp",
        verifiedBy: "Guru SLB",
        verifiedAt: "2026-11-23",
      },
    ]);

    const itemA = merged.items.find((i) => i.key === "A")!;
    expect(itemA.status).toBe("verified");
    expect(itemA.src).toBe("/signs/custom/a.webp");
    expect(itemA.verifiedBy).toBe("Guru SLB");

    const itemB = merged.items.find((i) => i.key === "B")!;
    expect(itemB.status).toBe("source");
  });
});
