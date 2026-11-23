import fs from "node:fs";
import path from "node:path";

/**
 * Pengunduh piktogram ARASAAC demo untuk InkluDidik (Pack 2 Berkas 03 §6).
 * Kata kunci demo: sabun, air, cuci, tangan, gigi, baju, handuk, makan, minum, buku, pensil, tas.
 */
const DEMO_KEYWORDS: Record<string, { id: number; name: string }> = {
  sabun: { id: 2843, name: "soap" },
  air: { id: 2479, name: "water" },
  cuci: { id: 2838, name: "wash" },
  tangan: { id: 2465, name: "hands" },
  gigi: { id: 2841, name: "tooth" },
  handuk: { id: 2844, name: "towel" },
  makan: { id: 2439, name: "eat" },
  minum: { id: 2440, name: "drink" },
};

async function main() {
  console.log("Menyiapkan piktogram demo ARASAAC...");
  const outDir = path.resolve(process.cwd(), "public/media/pictograms");
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const manifest: Record<string, unknown> = {
    source: "ARASAAC",
    license: "CC BY-NC-SA 4.0",
    attribution: "Piktogram: ARASAAC (arasaac.org), Pemerintah Aragon, penulis Sergio Palao.",
    items: DEMO_KEYWORDS,
  };

  fs.writeFileSync(
    path.join(outDir, "manifest.json"),
    JSON.stringify(manifest, null, 2),
    "utf-8"
  );
  console.log("Manifest piktograms demo ditulis ke", path.join(outDir, "manifest.json"));
}

void main();
