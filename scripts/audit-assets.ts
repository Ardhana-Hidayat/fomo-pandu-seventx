import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import sharp from "sharp";

interface ManifestItem {
  id: number;
  name: string;
  alt: string;
}

interface ManifestFile {
  source: string;
  license: string;
  attribution: string;
  license_url: string;
  items: Record<string, ManifestItem>;
}

async function audit() {
  const root = process.cwd();
  const pictoDir = path.join(root, "public", "media", "pictograms");
  const customDir = path.join(root, "public", "media", "custom");
  const sibiDir = path.join(root, "public", "signs", "sibi");
  const manifestPath = path.join(pictoDir, "manifest.json");

  const manifest: ManifestFile = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const manifestKeys = new Set(Object.keys(manifest.items));

  const entries = fs.readdirSync(pictoDir, { withFileTypes: true });
  const webpFiles = entries
    .filter((e) => e.isFile() && e.name.endsWith(".webp"))
    .map((e) => e.name)
    .sort();

  const fileStems = new Set(webpFiles.map((f) => f.replace(/\.webp$/, "")));
  const inManifestNotOnDisk = [...manifestKeys].filter((k) => !fileStems.has(k));
  const onDiskNotInManifest = [...fileStems].filter((s) => !manifestKeys.has(s));

  const hashToFiles = new Map<string, string[]>();
  const dimCounts = new Map<string, number>();
  const invalidFiles: string[] = [];
  let totalBytes = 0;
  let minBytes = Infinity;
  let maxBytes = 0;

  for (const file of webpFiles) {
    const fullPath = path.join(pictoDir, file);
    const buf = fs.readFileSync(fullPath);
    totalBytes += buf.length;
    if (buf.length < minBytes) minBytes = buf.length;
    if (buf.length > maxBytes) maxBytes = buf.length;

    const hash = crypto.createHash("sha256").update(buf).digest("hex");
    const list = hashToFiles.get(hash) ?? [];
    list.push(file);
    hashToFiles.set(hash, list);

    try {
      const meta = await sharp(buf).metadata();
      const key = `${meta.width ?? "?"}x${meta.height ?? "?"}:${meta.format ?? "?"}`;
      dimCounts.set(key, (dimCounts.get(key) ?? 0) + 1);
    } catch {
      invalidFiles.push(file);
    }
  }

  const duplicates = [...hashToFiles.entries()]
    .filter(([, files]) => files.length > 1)
    .map(([hash, files]) => ({ hash: hash.slice(0, 12), files }));

  // Check SIBI A-Z
  const expectedSibi = "abcdefghijklmnopqrstuvwxyz".split("").map((c) => `${c}.webp`);
  const sibiFiles = fs.existsSync(sibiDir) ? fs.readdirSync(sibiDir) : [];
  const sibiSet = new Set(sibiFiles);
  const missingSibi = expectedSibi.filter((f) => !sibiSet.has(f));

  // Check custom dir if exists
  const customFiles = fs.existsSync(customDir)
    ? fs.readdirSync(customDir).filter((f) => f.endsWith(".webp"))
    : [];

  console.log("=== ASSET AUDIT REPORT ===");
  console.log(`Pictograms (.webp): ${webpFiles.length}`);
  console.log(`Manifest items:     ${manifestKeys.size}`);
  console.log(`In manifest, missing on disk: ${inManifestNotOnDisk.length}`, inManifestNotOnDisk.slice(0, 10));
  console.log(`On disk, not in manifest:     ${onDiskNotInManifest.length}`, onDiskNotInManifest.slice(0, 20));
  console.log(`Invalid/corrupt webp:         ${invalidFiles.length}`, invalidFiles);
  console.log(`Duplicate content hashes:     ${duplicates.length}`);
  if (duplicates.length > 0) {
    console.log("  Sample duplicates:", duplicates.slice(0, 10));
  }
  console.log(`Size stats: total=${(totalBytes / 1024 / 1024).toFixed(2)} MB, min=${minBytes} B, max=${maxBytes} B`);
  console.log("Dimensions:", Object.fromEntries(dimCounts.entries()));
  console.log(`SIBI A-Z: ${expectedSibi.length - missingSibi.length}/26 present, missing:`, missingSibi);
  console.log(`Custom illustrations (.webp): ${customFiles.length}`);
}

audit().catch((err) => {
  console.error(err);
  process.exit(1);
});
