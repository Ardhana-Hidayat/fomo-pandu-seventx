import fs from "node:fs";
import path from "node:path";

/**
 * Pengunduh dan pembangun metadata piktogram ARASAAC demo untuk PanduIn (Pack 2 Berkas 03 Â§6).
 */
const DEMO_KEYWORDS: Record<string, { id: number; name: string; alt: string }> = {
  air: { id: 2414, name: "water tap", alt: "Air mengalir dari keran" },
  "cuci-tangan": { id: 8975, name: "wash hands", alt: "Mencuci tangan dengan air dan sabun" },
  sabun: { id: 34846, name: "soap", alt: "Sabun batang pembersih" },
  "gosok-tangan": { id: 2443, name: "lather hands", alt: "Menggosok telapak tangan dengan sabun" },
  bilas: { id: 8977, name: "rinse hands", alt: "Membilas tangan di bawah air mengalir" },
  handuk: { id: 2593, name: "towel", alt: "Handuk kain bersih" },
  keringkan: { id: 2566, name: "dry hands", alt: "Mengeringkan tangan dengan handuk" },
  "tangan-bersih": { id: 26172, name: "clean hands", alt: "Tangan yang bersih dan sehat" },
  "sikat-gigi": { id: 2694, name: "toothbrush", alt: "Sikat gigi dan pasta gigi" },
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

