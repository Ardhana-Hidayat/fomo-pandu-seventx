import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

interface PictogramDef {
  keyword: string;
  searchEn: string;
  alt: string;
  fallbackId?: number;
}

const EXPANDED_VOCABULARY: PictogramDef[] = [
  // Transportasi
  { keyword: "mobil", searchEn: "car", alt: "Mobil penumpang", fallbackId: 2367 },
  { keyword: "sepeda", searchEn: "bicycle", alt: "Sepeda kayuh", fallbackId: 2371 },
  { keyword: "motor", searchEn: "motorcycle", alt: "Sepeda motor", fallbackId: 2373 },
  { keyword: "bus", searchEn: "bus", alt: "Bus umum", fallbackId: 2368 },
  { keyword: "kereta", searchEn: "train", alt: "Kereta api", fallbackId: 2372 },
  { keyword: "pesawat", searchEn: "airplane", alt: "Pesawat terbang", fallbackId: 2376 },
  { keyword: "kapal", searchEn: "boat", alt: "Kapal laut", fallbackId: 2378 },
  { keyword: "truk", searchEn: "truck", alt: "Truk angkut", fallbackId: 2370 },

  // Cuaca & Alam
  { keyword: "matahari", searchEn: "sun", alt: "Matahari bersinar", fallbackId: 2501 },
  { keyword: "bulan", searchEn: "moon", alt: "Bulan di malam hari", fallbackId: 2502 },
  { keyword: "bintang", searchEn: "star", alt: "Bintang malam", fallbackId: 2503 },
  { keyword: "awan", searchEn: "cloud", alt: "Awan di langit", fallbackId: 2504 },
  { keyword: "hujan", searchEn: "rain", alt: "Hujan turun", fallbackId: 2505 },
  { keyword: "panas", searchEn: "hot", alt: "Cuaca panas", fallbackId: 2508 },
  { keyword: "dingin", searchEn: "cold", alt: "Cuaca dingin", fallbackId: 2509 },
  { keyword: "pohon", searchEn: "tree", alt: "Pohon rindang", fallbackId: 2510 },
  { keyword: "bunga", searchEn: "flower", alt: "Bunga mekar", fallbackId: 2512 },
  { keyword: "rumput", searchEn: "grass", alt: "Rumput hijau", fallbackId: 2514 },
  { keyword: "gunung", searchEn: "mountain", alt: "Gunung tinggi", fallbackId: 2516 },
  { keyword: "sungai", searchEn: "river", alt: "Sungai mengalir", fallbackId: 2518 },
  { keyword: "laut", searchEn: "sea", alt: "Laut luas", fallbackId: 2521 },

  // Warna
  { keyword: "merah", searchEn: "red", alt: "Warna merah", fallbackId: 2711 },
  { keyword: "kuning", searchEn: "yellow", alt: "Warna kuning", fallbackId: 2712 },
  { keyword: "hijau", searchEn: "green", alt: "Warna hijau", fallbackId: 2713 },
  { keyword: "biru", searchEn: "blue", alt: "Warna biru", fallbackId: 2714 },
  { keyword: "hitam", searchEn: "black", alt: "Warna hitam", fallbackId: 2715 },
  { keyword: "putih", searchEn: "white", alt: "Warna putih", fallbackId: 2716 },
  { keyword: "cokelat", searchEn: "brown", alt: "Warna cokelat", fallbackId: 2717 },

  // Bentuk & Objek
  { keyword: "lingkaran", searchEn: "circle", alt: "Bentuk lingkaran bulat", fallbackId: 2721 },
  { keyword: "segitiga", searchEn: "triangle", alt: "Bentuk segitiga", fallbackId: 2722 },
  { keyword: "kotak", searchEn: "square", alt: "Bentuk kotak persegi", fallbackId: 2723 },
  { keyword: "bola", searchEn: "ball", alt: "Bola mainan", fallbackId: 2731 },
  { keyword: "lampu", searchEn: "lamp", alt: "Lampu penerang", fallbackId: 2838 },
  { keyword: "jam", searchEn: "clock", alt: "Jam dinding", fallbackId: 2839 },
  { keyword: "uang", searchEn: "money", alt: "Uang belanja", fallbackId: 2848 },

  // Waktu & Rutinitas
  { keyword: "pagi", searchEn: "morning", alt: "Waktu pagi hari", fallbackId: 2605 },
  { keyword: "siang", searchEn: "afternoon", alt: "Waktu siang hari", fallbackId: 2606 },
  { keyword: "malam", searchEn: "night", alt: "Waktu malam hari", fallbackId: 2607 },

  // Pakaian
  { keyword: "topi", searchEn: "hat", alt: "Topi kepala", fallbackId: 2902 },
  { keyword: "jaket", searchEn: "jacket", alt: "Jaket hangat", fallbackId: 2904 },
  { keyword: "kaos", searchEn: "t-shirt", alt: "Kaos santai", fallbackId: 2906 },
  { keyword: "kaos-kaki", searchEn: "socks", alt: "Kaos kaki", fallbackId: 2908 },
  { keyword: "kacamata", searchEn: "glasses", alt: "Kacamata", fallbackId: 2912 },

  // Profesi & Orang
  { keyword: "polisi", searchEn: "police officer", alt: "Polisi lalu lintas", fallbackId: 2742 },
  { keyword: "tentara", searchEn: "soldier", alt: "Tentara nasional", fallbackId: 2744 },
  { keyword: "petani", searchEn: "farmer", alt: "Petani di sawah", fallbackId: 2746 },
  { keyword: "koki", searchEn: "cook", alt: "Koki memasak", fallbackId: 2748 },
  { keyword: "teman", searchEn: "friend", alt: "Teman bermain", fallbackId: 2708 },
  { keyword: "bayi", searchEn: "baby", alt: "Bayi kecil", fallbackId: 2704 },

  // Fasilitas Umum
  { keyword: "pasar", searchEn: "market", alt: "Pasar belanja", fallbackId: 2802 },
  { keyword: "toko", searchEn: "shop", alt: "Toko belanja", fallbackId: 2804 },
  { keyword: "taman", searchEn: "park", alt: "Taman bermain", fallbackId: 2806 },
  { keyword: "masjid", searchEn: "mosque", alt: "Masjid ibadah", fallbackId: 2808 },
  { keyword: "gereja", searchEn: "church", alt: "Gereja ibadah", fallbackId: 2809 },
];

async function findBestId(def: PictogramDef): Promise<number | null> {
  const searchUrl = `https://api.arasaac.org/v1/pictograms/en/search/${encodeURIComponent(def.searchEn)}`;
  try {
    const res = await fetch(searchUrl, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const results = (await res.json()) as Array<{ _id: number }>;
      if (Array.isArray(results) && results.length > 0 && results[0]?._id) {
        return results[0]._id;
      }
    }
  } catch {}
  return def.fallbackId ?? null;
}

async function downloadAndOptimize(id: number, outPath: string): Promise<boolean> {
  const cdnUrl = `https://static.arasaac.org/pictograms/${id}/${id}_500.png`;
  try {
    const res = await fetch(cdnUrl, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return false;
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    await sharp(buffer)
      .resize(512, 512, {
        fit: "contain",
        background: { r: 255, g: 255, b: 255, alpha: 0 },
      })
      .webp({ quality: 80, effort: 4 })
      .toFile(outPath);

    return true;
  } catch {
    return false;
  }
}

async function main() {
  console.log(`Mengunduh set piktogram lanjutan (${EXPANDED_VOCABULARY.length} konsep)...`);
  const outDir = path.resolve(process.cwd(), "public/media/pictograms");
  const manifestPath = path.join(outDir, "manifest.json");

  let manifest: {
    source: string;
    license: string;
    attribution: string;
    license_url: string;
    items: Record<string, unknown>;
  } = {
    source: "ARASAAC",
    license: "CC BY-NC-SA 4.0",
    attribution: "Piktogram: ARASAAC (arasaac.org), Pemerintah Aragon, Sergio Palao.",
    license_url: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
    items: {},
  };

  if (fs.existsSync(manifestPath)) {
    try {
      manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
    } catch {}
  }

  let added = 0;
  for (const item of EXPANDED_VOCABULARY) {
    const fileName = `${item.keyword}.webp`;
    const dest = path.join(outDir, fileName);

    if (fs.existsSync(dest) && fs.statSync(dest).size > 1024) {
      if (!manifest.items[item.keyword]) {
        manifest.items[item.keyword] = {
          id: item.fallbackId ?? 0,
          name: item.searchEn,
          alt: item.alt,
        };
      }
      continue;
    }

    const pictoId = await findBestId(item);
    if (!pictoId) continue;

    const ok = await downloadAndOptimize(pictoId, dest);
    if (ok) {
      added++;
      manifest.items[item.keyword] = {
        id: pictoId,
        name: item.searchEn,
        alt: item.alt,
      };
      console.log(`[BERHASIL] ${item.keyword} -> ${fileName}`);
    }

    await new Promise((r) => setTimeout(r, 80));
  }

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf-8");
  console.log(`\nSelesai! Ditambahkan ${added} piktogram baru. Total sekarang: ${Object.keys(manifest.items).length}`);
}

void main();
