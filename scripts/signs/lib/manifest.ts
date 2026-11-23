import { SignsManifestV2Schema, type SignsManifestV2, type SignItem } from "../../../src/server/services/signs/schema";

/**
 * Pure functions to create and merge sign manifests per Pack 2 Berkas 03 §4.
 */

export function validateManifest(data: unknown): SignsManifestV2 {
  return SignsManifestV2Schema.parse(data);
}

export function mergeManifestWithOverrides(
  manifest: SignsManifestV2,
  overrides: Array<{
    system: string;
    key: string;
    status: "verified" | "source" | "draft" | "missing";
    assetUrl?: string | null;
    verifiedBy?: string | null;
    verifiedAt?: Date | string | null;
  }>
): SignsManifestV2 {
  const overrideMap = new Map(
    overrides.map((o) => [`${o.system}:${o.key.toUpperCase()}`, o])
  );

  const updatedItems: SignItem[] = manifest.items.map((item) => {
    const override = overrideMap.get(`${item.system}:${item.key}`);
    if (!override) return item;

    return {
      ...item,
      status: override.status,
      src: override.assetUrl ?? item.src,
      verifiedBy: override.verifiedBy ?? item.verifiedBy,
      verifiedAt:
        override.verifiedAt instanceof Date
          ? override.verifiedAt.toISOString().split("T")[0]
          : override.verifiedAt ?? item.verifiedAt,
    };
  });

  return {
    ...manifest,
    items: updatedItems,
  };
}
