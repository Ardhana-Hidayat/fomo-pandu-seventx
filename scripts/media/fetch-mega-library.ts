import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

interface PictoItem {
  key: string;
  id: number;
  name: string;
  alt: string;
}

// 60 Konsep Esensial Kurikulum SLB Terverifikasi ID ARASAAC
const CURATED_LIST: PictoItem[] = [
  // Anggota Tubuh Tambahan
  { key: "kepala", id: 2408, name: "head", alt: "Kepala manusia" },
  { key: "rambut", id: 2426, name: "hair", alt: "Rambut kepala" },
  { key: "leher", id: 2422, name: "neck", alt: "Leher" },
  { key: "perut", id: 2424, name: "belly", alt: "Perut" },
  { key: "jari", id: 2419, name: "finger", alt: "Jari-jari tangan" },
  { key: "lidah", id: 2417, name: "tongue", alt: "Lidah" },

  // Keluarga & Orang
  { key: "ayah", id: 2730, name: "father", alt: "Ayah / Bapak" },
  { key: "ibu", id: 2731, name: "mother", alt: "Ibu / Mama" },
  { key: "kakek", id: 2732, name: "grandfather", alt: "Kakek" },
  { key: "nenek", id: 2733, name: "grandmother", alt: "Nenek" },
  { key: "kakak", id: 2734, name: "brother", alt: "Saudara laki-laki / Kakak" },
  { key: "adik", id: 2735, name: "sister", alt: "Saudara perempuan / Adik" },
  { key: "anak", id: 2736, name: "child", alt: "Anak" },

  // Peralatan Sekolah & Belajar Tambahan
  { key: "papan-tulis", id: 2542, name: "blackboard", alt: "Papan tulis kelas" },
  { key: "spidol", id: 2544, name: "marker", alt: "Spidol papan tulis" },
  { key: "kertas", id: 2547, name: "sheet of paper", alt: "Kertas tulis" },
  { key: "kotak-pensil", id: 2540, name: "pencil case", alt: "Kotak pensil" },
  { key: "bendera", id: 2580, name: "flag", alt: "Bendera merah putih" },
  { key: "seragam", id: 2908, name: "uniform", alt: "Pakaian seragam sekolah" },

  // Makanan & Minuman Tambahan
  { key: "teh", id: 2871, name: "tea", alt: "Secangkir teh hangat" },
  { key: "jus", id: 2873, name: "juice", alt: "Segelas jus buah segar" },
  { key: "sup", id: 2862, name: "soup", alt: "Semangkuk sup hangat" },
  { key: "mie", id: 2861, name: "noodles", alt: "Mie rebus atau goreng" },
  { key: "daging", id: 2876, name: "meat", alt: "Daging" },
  { key: "keju", id: 2869, name: "cheese", alt: "Keju" },
  { key: "biskuit", id: 2866, name: "biscuit", alt: "Kue biskuit" },
  { key: "permen", id: 2868, name: "sweet", alt: "Permen manis" },

  // Aktivitas Harian Tambahan
  { key: "berdoa", id: 2605, name: "to pray", alt: "Berdoa dengan tenang" },
  { key: "bernyanyi", id: 2606, name: "to sing", alt: "Bernyanyi lagu" },
  { key: "menari", id: 2607, name: "to dance", alt: "Menari riang" },
  { key: "berenang", id: 2608, name: "to swim", alt: "Berenang di air" },
  { key: "melompat", id: 2609, name: "to jump", alt: "Melompat tinggi" },
  { key: "mendengar", id: 2413, name: "to listen", alt: "Mendengarkan suara" },
  { key: "melihat", id: 2411, name: "to look", alt: "Melihat dengan mata" },
  { key: "bicara", id: 2604, name: "to speak", alt: "Berbicara" },
  { key: "tersenyum", id: 2600, name: "to smile", alt: "Tersenyum ramah" },
  { key: "tertawa", id: 2601, name: "to laugh", alt: "Tertawa gembira" },

  // Emosi Tambahan
  { key: "takut", id: 2690, name: "scared", alt: "Merasa takut" },
  { key: "lelah", id: 2692, name: "tired", alt: "Merasa lelah / capek" },
  { key: "lapar", id: 2695, name: "hungry", alt: "Merasa lapar" },
  { key: "haus", id: 2696, name: "thirsty", alt: "Merasa haus" },
  { key: "sakit", id: 2742, name: "ill / sick", alt: "Sedang sakit" },

  // Hewan Tambahan
  { key: "bebek", id: 2955, name: "duck", alt: "Bebek" },
  { key: "kuda", id: 2957, name: "horse", alt: "Kuda" },
  { key: "gajah", id: 2962, name: "elephant", alt: "Gajah besar" },
  { key: "monyet", id: 2965, name: "monkey", alt: "Monyet" },
  { key: "kupu-kupu", id: 2970, name: "butterfly", alt: "Kupu-kupu indah" },

  // Lingkungan & Tempat Tambahan
  { key: "rumah-sakit", id: 2745, name: "hospital", alt: "Gedung rumah sakit" },
  { key: "perpustakaan", id: 2579, name: "library", alt: "Ruang perpustakaan buku" },
  { key: "kantin", id: 2578, name: "canteen", alt: "Kantin sekolah" },
  { key: "lapangan", id: 2581, name: "sports field", alt: "Lapangan olahraga" },
  { key: "kolam", id: 2520, name: "pond", alt: "Kolam air" },
  { key: "pantai", id: 2522, name: "beach", alt: "Pantai berpasir" },
  { key: "pelangi", id: 2507, name: "rainbow", alt: "Pelangi indah di langit" },
  { key: "angin", id: 2506, name: "wind", alt: "Angin bertiup" },

  // Warna Tambahan
  { key: "ungu", id: 2718, name: "purple", alt: "Warna ungu" },
  { key: "oranye", id: 2719, name: "orange", alt: "Warna oranye / jingga" },
  { key: "abu-abu", id: 2720, name: "grey", alt: "Warna abu-abu" },
  { key: "merah-muda", id: 2724, name: "pink", alt: "Warna merah muda / merah jambu" },
];

async function main() {
  console.log(`Mengunduh ${CURATED_LIST.length} piktogram kurikulum SLB terverifikasi...`);
  const outDir = path.resolve(process.cwd(), "public/media/pictograms");
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
    attribution: "Piktogram: ARASAAC (arasaac.org), Pemerintah Aragon, Sergio Palao.",
    license_url: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
    items: {},
  };

  if (fs.existsSync(manifestPath)) {
    try {
      manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
    } catch {}
  }

  let successCount = 0;
  for (const item of CURATED_LIST) {
    const dest = path.join(outDir, `${item.key}.webp`);
    if (fs.existsSync(dest) && manifest.items[item.key]) {
      continue;
    }

    const url = `https://static.arasaac.org/pictograms/${item.id}/${item.id}_500.png`;
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
      if (!res.ok) {
        console.warn(`[GAGAL HTTP ${res.status}] ${item.key} (ID ${item.id})`);
        continue;
      }

      const buffer = Buffer.from(await res.arrayBuffer());
      await sharp(buffer)
        .resize(512, 512, {
          fit: "contain",
          background: { r: 255, g: 255, b: 255, alpha: 0 },
        })
        .webp({ quality: 80, effort: 4 })
        .toFile(dest);

      manifest.items[item.key] = {
        id: item.id,
        name: item.name,
        alt: item.alt,
      };
      successCount++;
      console.log(`[BERHASIL] ${item.key} -> ${item.key}.webp`);
    } catch (err) {
      console.warn(`[GAGAL] ${item.key}:`, err);
    }
  }

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf-8");
  console.log(`\nSelesai! Ditambahkan ${successCount} piktogram baru. Total pustaka sekarang: ${Object.keys(manifest.items).length}`);
}

void main();
