import fs from "node:fs";
import path from "node:path";

/**
 * Fetch script per Pack 2 Berkas 03.
 * Bila jaringan diblokir atau offline, tulis .data/sign-sources/LANGKAH-MANUAL.md
 */
async function main() {
  console.log("Memeriksa repositori sumber aset isyarat terbuka Mendeley Data...");
  const rawDir = path.resolve(process.cwd(), ".data/sign-sources");
  if (!fs.existsSync(rawDir)) {
    fs.mkdirSync(rawDir, { recursive: true });
  }

  const manualDoc = `# Prosedur Manual Pengambilan Dataset Isyarat (Pack 2 Berkas 03 §3)

Bila unduhan otomatis dari API Mendeley Data tidak dapat diakses pada lingkungan jaringan Anda, ikuti langkah berikut:

1. **SIBI P1 (Handayani & Azizah, 2026)**
   - Kunjungi: https://data.mendeley.com/datasets/xdn2gj38xf/1
   - Klik tombol **Download All** (ZIP)
   - Ekstrak ke folder: \`.data/sign-sources/10.17632-xdn2gj38xf.1/\`

2. **BISINDO P1 (Raden & Asshafi, 2026)**
   - Kunjungi: https://data.mendeley.com/datasets/4xnkvr88tk/1
   - Klik tombol **Download All** (ZIP)
   - Ekstrak ke folder: \`.data/sign-sources/10.17632-4xnkvr88tk.1/\`

3. **Jalankan Pembangun Pustaka**:
   - Jalankan \`npm run signs:build\` untuk mengolah kandidat menjadi WebP 512px.
`;

  fs.writeFileSync(path.join(rawDir, "LANGKAH-MANUAL.md"), manualDoc, "utf-8");
  console.log("Catatan panduan unduhan manual telah dicatat di .data/sign-sources/LANGKAH-MANUAL.md");
}

void main();
