import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

interface PictogramDef {
  keyword: string;
  searchEn: string;
  alt: string;
  fallbackId?: number;
}

const VOCABULARY: PictogramDef[] = [
  // Peralatan Sekolah & Belajar
  { keyword: "buku", searchEn: "book", alt: "Buku pelajaran", fallbackId: 2450 },
  { keyword: "pensil", searchEn: "pencil", alt: "Pensil untuk menulis", fallbackId: 2541 },
  { keyword: "penghapus", searchEn: "eraser", alt: "Penghapus karet", fallbackId: 2555 },
  { keyword: "tas", searchEn: "backpack", alt: "Tas sekolah", fallbackId: 2538 },
  { keyword: "meja", searchEn: "desk", alt: "Meja belajar", fallbackId: 2831 },
  { keyword: "kursi", searchEn: "chair", alt: "Kursi belajar", fallbackId: 2836 },
  { keyword: "guru", searchEn: "teacher", alt: "Guru di ruang kelas", fallbackId: 2588 },
  { keyword: "siswa", searchEn: "student", alt: "Siswa sekolah", fallbackId: 2589 },
  { keyword: "sekolah", searchEn: "school", alt: "Gedung sekolah", fallbackId: 2577 },
  { keyword: "menulis", searchEn: "to write", alt: "Menulis dengan pensil", fallbackId: 2603 },
  { keyword: "membaca", searchEn: "to read", alt: "Membaca buku", fallbackId: 2453 },
  { keyword: "menggambar", searchEn: "to draw", alt: "Menggambar di kertas", fallbackId: 2602 },
  { keyword: "gunting", searchEn: "scissors", alt: "Gunting kertas", fallbackId: 2546 },
  { keyword: "lem", searchEn: "glue", alt: "Lem perekat", fallbackId: 2548 },
  { keyword: "penggaris", searchEn: "ruler", alt: "Penggaris lurus", fallbackId: 2545 },
  { keyword: "komputer", searchEn: "computer", alt: "Komputer belajar", fallbackId: 2966 },

  // Kebersihan & Kesehatan
  { keyword: "mandi", searchEn: "to shower", alt: "Mandi dengan air bersih", fallbackId: 2465 },
  { keyword: "sampo", searchEn: "shampoo", alt: "Sampo rambut", fallbackId: 2478 },
  { keyword: "sisir", searchEn: "comb", alt: "Sisir rambut", fallbackId: 2479 },
  { keyword: "toilet", searchEn: "toilet", alt: "Toilet kamar mandi", fallbackId: 2483 },
  { keyword: "tisu", searchEn: "tissue", alt: "Tisu bersih", fallbackId: 2484 },
  { keyword: "mata", searchEn: "eye", alt: "Mata untuk melihat", fallbackId: 2410 },
  { keyword: "telinga", searchEn: "ear", alt: "Telinga untuk mendengar", fallbackId: 2412 },
  { keyword: "hidung", searchEn: "nose", alt: "Hidung untuk bernapas", fallbackId: 2414 },
  { keyword: "mulut", searchEn: "mouth", alt: "Mulut untuk berbicara", fallbackId: 2415 },
  { keyword: "tangan", searchEn: "hand", alt: "Tangan manusia", fallbackId: 2418 },
  { keyword: "kaki", searchEn: "foot", alt: "Kaki untuk berjalan", fallbackId: 2420 },
  { keyword: "gigi", searchEn: "teeth", alt: "Gigi bersih", fallbackId: 2416 },
  { keyword: "dokter", searchEn: "doctor", alt: "Dokter kesehatan", fallbackId: 2740 },
  { keyword: "obat", searchEn: "medicine", alt: "Obat kesehatan", fallbackId: 2750 },

  // Makanan & Minuman
  { keyword: "makan", searchEn: "to eat", alt: "Makan makanan", fallbackId: 2850 },
  { keyword: "minum", searchEn: "to drink", alt: "Minum air", fallbackId: 2855 },
  { keyword: "nasi", searchEn: "rice", alt: "Nasi putih", fallbackId: 2860 },
  { keyword: "roti", searchEn: "bread", alt: "Roti", fallbackId: 2865 },
  { keyword: "susu", searchEn: "milk", alt: "Segelas susu", fallbackId: 2870 },
  { keyword: "buah", searchEn: "fruit", alt: "Buah-buahan segar", fallbackId: 2880 },
  { keyword: "sayur", searchEn: "vegetables", alt: "Sayur segar", fallbackId: 2890 },
  { keyword: "apel", searchEn: "apple", alt: "Buah apel", fallbackId: 2882 },
  { keyword: "pisang", searchEn: "banana", alt: "Buah pisang", fallbackId: 2884 },
  { keyword: "jeruk", searchEn: "orange", alt: "Buah jeruk", fallbackId: 2886 },
  { keyword: "telur", searchEn: "egg", alt: "Telur ayam", fallbackId: 2875 },
  { keyword: "ikan", searchEn: "fish", alt: "Ikan", fallbackId: 2872 },
  { keyword: "ayam", searchEn: "chicken", alt: "Daging ayam", fallbackId: 2874 },
  { keyword: "piring", searchEn: "plate", alt: "Piring makan", fallbackId: 2840 },
  { keyword: "sendok", searchEn: "spoon", alt: "Sendok makan", fallbackId: 2842 },
  { keyword: "garpu", searchEn: "fork", alt: "Garpu makan", fallbackId: 2844 },
  { keyword: "gelas", searchEn: "glass", alt: "Gelas minum", fallbackId: 2846 },

  // Aktivitas Harian
  { keyword: "duduk", searchEn: "to sit", alt: "Duduk di kursi", fallbackId: 2610 },
  { keyword: "berdiri", searchEn: "to stand", alt: "Berdiri tegak", fallbackId: 2612 },
  { keyword: "jalan", searchEn: "to walk", alt: "Berjalan kaki", fallbackId: 2614 },
  { keyword: "lari", searchEn: "to run", alt: "Berlari", fallbackId: 2616 },
  { keyword: "tidur", searchEn: "to sleep", alt: "Tidur di kasur", fallbackId: 2620 },
  { keyword: "bangun", searchEn: "to wake up", alt: "Bangun tidur", fallbackId: 2622 },
  { keyword: "bermain", searchEn: "to play", alt: "Bermain bersama", fallbackId: 2630 },
  { keyword: "membantu", searchEn: "to help", alt: "Membantu teman", fallbackId: 2645 },
  { keyword: "buka", searchEn: "to open", alt: "Membuka pintu", fallbackId: 2650 },
  { keyword: "tutup", searchEn: "to close", alt: "Menutup pintu", fallbackId: 2652 },

  // Emosi & Perasaan
  { keyword: "senang", searchEn: "happy", alt: "Perasaan senang", fallbackId: 2660 },
  { keyword: "sedih", searchEn: "sad", alt: "Perasaan sedih", fallbackId: 2662 },
  { keyword: "marah", searchEn: "angry", alt: "Perasaan marah", fallbackId: 2664 },
  { keyword: "tenang", searchEn: "calm", alt: "Perasaan tenang", fallbackId: 2668 },

  // Rumah & Lingkungan
  { keyword: "rumah", searchEn: "house", alt: "Bangunan rumah", fallbackId: 2800 },
  { keyword: "pintu", searchEn: "door", alt: "Pintu rumah", fallbackId: 2805 },
  { keyword: "jendela", searchEn: "window", alt: "Jendela rumah", fallbackId: 2810 },
  { keyword: "tempat-tidur", searchEn: "bed", alt: "Tempat tidur", fallbackId: 2815 },
  { keyword: "sapu", searchEn: "broom", alt: "Sapu lantai", fallbackId: 2820 },
  { keyword: "sampah", searchEn: "trash", alt: "Tempat sampah", fallbackId: 2825 },
  { keyword: "sepatu", searchEn: "shoes", alt: "Sepatu sekolah", fallbackId: 2900 },
  { keyword: "baju", searchEn: "clothes", alt: "Baju pakaian", fallbackId: 2905 },
  { keyword: "celana", searchEn: "trousers", alt: "Celana", fallbackId: 2910 },

  // Hewan Umum
  { keyword: "kucing", searchEn: "cat", alt: "Kucing", fallbackId: 2950 },
  { keyword: "anjing", searchEn: "dog", alt: "Anjing", fallbackId: 2952 },
  { keyword: "burung", searchEn: "bird", alt: "Burung", fallbackId: 2954 },
  { keyword: "sapi", searchEn: "cow", alt: "Sapi", fallbackId: 2956 },
  { keyword: "kambing", searchEn: "goat", alt: "Kambing", fallbackId: 2958 },
  { keyword: "kelinci", searchEn: "rabbit", alt: "Kelinci", fallbackId: 2960 },
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
  } catch {
    // Abaikan dan gunakan fallback
  }
  return def.fallbackId ?? null;
}

async function downloadAndOptimize(id: number, outPath: string): Promise<boolean> {
  const cdnUrl = `https://static.arasaac.org/pictograms/${id}/${id}_500.png`;
  try {
    const res = await fetch(cdnUrl, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return false;
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Olah dengan sharp: pangkas, resize 512x512 contain, buang metadata, konversi ke WebP
    await sharp(buffer)
      .resize(512, 512, {
        fit: "contain",
        background: { r: 255, g: 255, b: 255, alpha: 0 },
      })
      .webp({ quality: 80, effort: 4 })
      .toFile(outPath);

    return true;
  } catch (err) {
    console.warn(`Gagal mengunduh ID ${id}:`, err);
    return false;
  }
}

async function main() {
  console.log(`Memulai pengunduhan pustaka piktogram umum ARASAAC (${VOCABULARY.length} konsep)...`);
  const outDir = path.resolve(process.cwd(), "public/media/pictograms");
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const manifestPath = path.join(outDir, "manifest.json");
  let manifest: {
    source: string;
    license: string;
    attribution: string;
    license_url: string;
    items: Record<string, { id: number; name: string; alt: string }>;
  } = {
    source: "ARASAAC",
    license: "CC BY-NC-SA 4.0",
    attribution: "Piktogram: ARASAAC (arasaac.org), Pemerintah Aragon, penulis Sergio Palao.",
    license_url: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
    items: {},
  };

  if (fs.existsSync(manifestPath)) {
    try {
      manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
    } catch {}
  }

  let downloadedCount = 0;
  for (const item of VOCABULARY) {
    const fileName = `${item.keyword}.webp`;
    const dest = path.join(outDir, fileName);

    // Jika sudah ada dan bukan file kosong/kecil (> 1 KB), catat dan lanjutkan
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

    // Cari ID terbaik
    const pictoId = await findBestId(item);
    if (!pictoId) {
      console.log(`[LEWATI] Tidak menemukan ID untuk ${item.keyword}`);
      continue;
    }

    const ok = await downloadAndOptimize(pictoId, dest);
    if (ok) {
      downloadedCount++;
      manifest.items[item.keyword] = {
        id: pictoId,
        name: item.searchEn,
        alt: item.alt,
      };
      const sizeKb = (fs.statSync(dest).size / 1024).toFixed(1);
      console.log(`[BERHASIL] ${item.keyword} (ID: ${pictoId}) -> ${fileName} (${sizeKb} KB)`);
    } else {
      console.log(`[GAGAL] Mengunduh ${item.keyword} (ID: ${pictoId})`);
    }

    // Beri jeda kecil agar sopan ke server API
    await new Promise((r) => setTimeout(r, 100));
  }

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf-8");
  console.log(`\nSelesai! Berhasil mengunduh ${downloadedCount} aset baru.`);
  console.log(`Total piktogram terdaftar di manifest: ${Object.keys(manifest.items).length}`);
}

void main();
