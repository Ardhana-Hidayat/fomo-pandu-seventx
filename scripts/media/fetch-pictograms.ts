import fs from "node:fs";
import path from "node:path";

/**
 * Pengunduh dan pembangun metadata piktogram ARASAAC demo untuk InkluDidik (Pack 2 Berkas 03 §6).
 */
const DEMO_KEYWORDS: Record<string, { id: number; name: string; alt: string }> = {
  air: { id: 2344, name: "water", alt: "Air mengalir dari keran" },
  "cuci-tangan": { id: 2470, name: "wash hands", alt: "Dua tangan dibasahi air" },
  sabun: { id: 34846, name: "soap", alt: "Sabun batang" },
  "gosok-tangan": { id: 2470, name: "rub hands", alt: "Tangan digosok dengan sabun" },
  bilas: { id: 2471, name: "rinse", alt: "Tangan dibilas air mengalir" },
  handuk: { id: 2474, name: "towel", alt: "Handuk bersih" },
  keringkan: { id: 2474, name: "dry", alt: "Tangan dikeringkan dengan handuk" },
  "tangan-bersih": { id: 2472, name: "clean hands", alt: "Dua tangan yang bersih" },
  "sikat-gigi": { id: 2476, name: "toothbrush", alt: "Sikat gigi dan pasta gigi" },
};

async function main() {
  console.log("Menyiapkan piktogram demo ARASAAC dan manifest...");
  const outDir = path.resolve(process.cwd(), "public/media/pictograms");
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const manifest = {
    source: "ARASAAC",
    license: "CC BY-NC-SA 4.0",
    attribution: "Piktogram: ARASAAC (arasaac.org), Pemerintah Aragon, penulis Sergio Palao.",
    license_url: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
    items: DEMO_KEYWORDS,
  };

  const manifestPath = path.join(outDir, "manifest.json");
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf-8");
  console.log("Manifest piktograms demo ditulis ke", manifestPath);
}

void main();
