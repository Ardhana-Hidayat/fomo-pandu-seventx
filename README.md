# PANDU â€” Platform Pembelajaran Adaptif Terintegrasi SLB

[![Quality Gate](https://img.shields.io/badge/Quality%20Gate-Passing-success)](docs/backlog.md)
[![Next.js](https://img.shields.io/badge/Next.js-16.4.6-black)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict%205.x-blue)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38bdf8)](https://tailwindcss.com)
[![Database](https://img.shields.io/badge/Database-PGlite%20%2F%20PostgreSQL-336791)](https://orm.drizzle.team)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

Platform web pendidikan inklusif adaptif yang dirancang khusus untuk siswa berkebutuhan khusus (tunarungu-wicara, tunanetra, *low vision*, dan tunagrahita) serta guru di Sekolah Luar Biasa (**SLBN Manisrejo Kota Madiun**). Dikembangkan oleh **Tim Fomo** untuk kompetisi nasional **SEVENT X (Kategori Website)**.

---

## ðŸŒŸ Fitur Utama

### 1. Empat Saluran Belajar Multimodal (*Four Modality Channels*)
Setiap kartu peraga pembelajaran dapat disajikan melalui 4 saluran yang dapat diaktifkan/dinonaktifkan secara fleksibel sesuai kebutuhan individual siswa:
- **Teks**: Tipografi ramah disleksia (*Atkinson Hyperlegible Next* & *Lexend*), ukuran huruf adaptif, dan kata kunci berpenanda.
- **Audio Konsisten**: Audio pelafalan kalimat tersintesis di server (WAV 24kHz) atau rekaman suara guru langsung, tersinkronisasi dengan efek sorotan kata (*karaoke wipe* `--progres`).
- **Bahasa Isyarat**: Ejaan jari terverifikasi untuk sistem **SIBI** dan **BISINDO** tanpa gambar buatan AI. Dilengkapi pita huruf interaktif (*letter ribbon*).
- **Piktogram Konkret**: Piktogram simbol standar **ARASAAC** (*Creative Commons CC BY-NC-SA 4.0*) dengan *caching* lokal dan *fallback* otomatis tanpa internet.

### 2. Ruang Kerja Guru (*Teacher Workspace*)
- **Wizard Pembuatan Materi Otomatis**: Buat draf materi dari topik, teks panjang, berkas PDF buku ajar, atau foto dokumen buku. Ditenagai Google Gemini API dengan *fallback* kurikulum deterministik saat offline.
- **Editor & Gerbang Persetujuan Ketat (*Approval Gate*)**: Guru memiliki kendali penuh menyunting kartu, memilih media piktogram/foto, merekam audio mikrofon, dan wajib menyetujui (*approve*) sebelum materi terbit ke siswa.
- **Mode Presentasi Kelas & Smart TV (`/guru/materi/[id]/presentasi` & `/tv/[kode]`)**: Tampilan layar penuh dengan tipografi raksasa (`--t-tv`), kontrol ramah remote TV (tombol angka 1-4, spasi, panah), dan kuis bersama di depan kelas.
- **Ekspor Kartu Fisik Siap Cetak (`/guru/materi/[id]/cetak`)**: Lembar cetak format A4 dengan tata letak kisi 2x2, panduan garis potong putus-putus (*dashed line*), kontras tinggi, dan QR code akses mandiri.
- **Manajemen Kelas & Buku Nilai**: Kode gabung 6-digit instan, pengelolaan profil kebutuhan khusus siswa, rekap skor, akurasi percobaan pertama (*first-try accuracy*), dan waktu pengerjaan.

### 3. Jembatan Komunikasi Cepat (*Quick Instructions*) (`/guru/instruksi-cepat`)
- Mengubah instruksi verbal atau ketikan guru menjadi 1â€“4 langkah visual konkret dengan ejaan isyarat dan piktogram untuk diproyeksikan langsung di layar Smart TV kelas.

### 4. Mesin Rekomendasi Pedagogis Transparan (`/guru/kelas/[id]/hasil/[sid]`)
- Mengevaluasi pola belajar siswa berdasarkan aturan pedagogis teruji (R1â€“R4, R7) dari Berkas 06:
  - **R1 (Pengulangan Konsep)**: Deteksi kesulitan berulang pada kartu tertentu untuk pendampingan benda konkret.
  - **R2 (Ketergantungan Petunjuk / Akselerasi)**: Rekomendasi penyesuaian jumlah opsi pilihan (2, 3, atau 4).
  - **R3 (Pola Tebak / Kontras Font)**: Deteksi jawaban cepat berturut-turut atau kebutuhan kontras tinggi untuk siswa *low vision*.
  - **R4 (Kanal Bahasa Isyarat)**: Rekomendasi pengaktifan kanal isyarat & teks bagi siswa tunarungu.
  - **R7 (Peringatan Kartu Menantang)**: Analisis kartu paling menantang di tingkat kelas.
- Setiap rekomendasi dilengkapi bukti nyata ("Dasar data") dan status tindak lanjut (*baru*, *dilakukan*, *diabaikan*).

### 5. Akses Siswa Tanpa Hambatan (*Zero-Friction Student Access*) (`/masuk`)
- Siswa masuk hanya dengan memasukkan **Kode Kelas 6-Digit** dan nama panggilan tanpa perlu mengingat kata sandi atau email.
- Pemutar kartu peraga interaktif dengan navigasi sentuh minimal 48px dan umpan balik hangat non-punitif (tanpa timer hitung mundur pemicu stres).

### 6. Aksesibilitas Teruji (Kepatuhan WCAG AAA)
- **3 Tema Visual**: Terang (*Warm Off-White*), Gelap (*Deep Slate*), dan Kuning-Hitam (*High Contrast* 18:1).
- **Fokus Ganda (*Dual Focus Ring*)**: Indikator fokus keyboard kontras tinggi putih-hitam yang jelas di semua peramban.
- **Anti-Slop & Anti-Distraksi**: Bebas gradien neon, bebas animasi berlebihan, bebas emoji liar, dan semantik HTML penuh (`<main id="main-content">`, `<nav>`, `<aside aria-live="polite">`).

---

## ðŸ› ï¸ Tumpukan Teknologi (*Tech Stack*)

| Komponen | Teknologi | Keterangan |
|---|---|---|
| **Framework** | **Next.js 16.4.6** | App Router, Server Actions, Partial Prerendering (PPR), Turbopack |
| **Bahasa** | **TypeScript 5.x** | *Strict mode*, 0 `any`, arsitektur fungsional `Result<T, AppError>` |
| **Gaya & Token** | **Tailwind CSS v4** | CSS variables semantik, utilitas fluid typography & high-contrast |
| **Basis Data** | **Drizzle ORM** | Skema tipe aman, migrasi terkelola otomatis |
| **Driver DB Lokal** | **@electric-sql/pglite** | PostgreSQL WASM *in-memory/embedded* (jalan lokal tanpa docker/cloud) |
| **Driver DB Produksi** | **PostgreSQL / Supabase** | Sakelar 1-baris via env `DATA_DRIVER=postgres` |
| **Penyimpanan Media** | **StorageProvider** | Driver lokal `.data/storage/` dan driver Supabase Storage |
| **Manipulasi Citra** | **Sharp** | Sanitasi EXIF, *resize* rasio 4:3 max 1200x900, konversi WebP |
| **AI & LLM** | **Google Gemini API** | Model `gemini-2.5-flash` dengan *fallback* kurikulum offline |
| **Pustaka Simbol** | **ARASAAC API** | Piktogram simbol lisensi CC BY-NC-SA 4.0 |
| **Ikonografi** | **Phosphor Icons** | `@phosphor-icons/react` berbobot tebal ramah sensori |

---

## ðŸš€ Panduan Memulai Cepat (*Local Quickstart*)

Aplikasi ini dirancang dengan prinsip **Zero-Cloud Dependency**: dapat dijalankan 100% secara lokal untuk evaluasi juri tanpa memerlukan akun cloud, kartu kredit, atau instalasi PostgreSQL eksternal.

### 1. Prasyarat
- Node.js versi 20.x atau 22.x LTS (uji verifikasi menggunakan Node.js v22/v24).
- NPM versi 10.x+.

### 2. Pemasangan Dependensi
```bash
npm install
```

### 3. Pengaturan Lingkungan
Salin berkas konfigurasi contoh:
```bash
cp .env.example .env.local
```
*Catatan: Nilai bawaan di `.env.example` sudah siap pakai untuk mode lokal (`DATA_DRIVER=local`, `STORAGE_DRIVER=local`, `AUTH_MODE=demo`). API key Gemini bersifat opsional karena sistem memiliki fallback offline cerdas.*

### 4. Inisialisasi & Seed Basis Data Lokal
Jalankan migrasi Drizzle dan buat data demo lengkap (guru demo, kelas demo, siswa, materi contoh, dan hasil latihan):
```bash
npm run db:reset
```

### 5. Jalankan Server Pengembangan
```bash
npm run dev
```
Buka browser pada alamat [http://localhost:3000](http://localhost:3000).

---

## ðŸ‘¥ Akses Akun & Skenario Demo

| Peran | URL Masuk | Cara Akses / Kredensial |
|---|---|---|
| **Guru Demo** | `/guru/masuk` | Klik tombol **"Masuk sebagai Guru Demo"** (langsung masuk ke dashboard `/guru`) |
| **Siswa Demo** | `/masuk` | Masukkan Kode Kelas: **`123456`**, Nama Siswa: **`Budi`** (atau `Sari`, `Dina`, `Raka`) |
| **Mode Smart TV** | `/tv/123456` | Tampilan layar besar kelas untuk materi cuci tangan |
| **Instruksi Cepat** | `/guru/instruksi-cepat` | Jembatan instruksi visual kelas untuk guru |
| **Pustaka Isyarat** | `/guru/pengaturan/isyarat` | Verifikasi kamus abjad SIBI dan BISINDO |
| **Halaman Kredit** | `/kredit` | Atribusi lisensi ARASAAC, font, dan kamus isyarat |

---

## ðŸ”„ Beralih ke Supabase (Mode Produksi)

Untuk menyambungkan aplikasi ke infrastruktur Supabase di server produksi:

1. Buat proyek baru di [Supabase Dashboard](https://supabase.com).
2. Salin URL Pooler PostgreSQL dari menu **Settings > Database**.
3. Perbarui variabel lingkungan di `.env.local`:
   ```env
   DATA_DRIVER=postgres
   DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true
   STORAGE_DRIVER=supabase
   NEXT_PUBLIC_SUPABASE_URL=https://[project-ref].supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
   AUTH_MODE=google
   ```
4. Jalankan migrasi dan seeding ke database Supabase:
   ```bash
   npm run db:migrate
   npm run db:seed
   ```
5. Lihat panduan lengkap di [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

---

## ðŸ›¡ï¸ Gerbang Kualitas & Pengujian (*Quality Gates*)

Setiap baris kode diuji melalui rangkaian uji otomatis sebelum disetujui:

```bash
# Jalankan seluruh rangkaian gerbang mutu (lint, typecheck, deps, unused, unit test)
npm run check

# Uji unit & integrasi lengkap (Vitest)
npm run test

# Pengecekan arsitektur & impor lintas modul (Dependency Cruiser)
npm run deps

# Pengecekan kode mati & ekspor tak terpakai (Knip)
npm run unused

# Pengecekan keamanan berkas git (Git Guard)
node scripts/git-guard.mjs tracked

# Kompilasi build produksi (Turbopack)
npm run build
```

---

## ðŸ“ Struktur Direktori Proyek

```text
PANDU/
â”œâ”€â”€ src/
â”‚   â”œâ”€â”€ app/                      # Rute Next.js 16 App Router (Guru, Siswa, TV, API)
â”‚   â”‚   â”œâ”€â”€ (auth)/               # Rute autentikasi
â”‚   â”‚   â”œâ”€â”€ guru/                 # Ruang kerja guru (materi, kelas, pengaturan, hasil)
â”‚   â”‚   â”œâ”€â”€ kelas/                # Portal siswa berbasis kode kelas
â”‚   â”‚   â”œâ”€â”€ tv/                   # Mode layar penuh Smart TV kelas
â”‚   â”‚   â”œâ”€â”€ api/                  # Route handler API (AI, media, TTS, signs)
â”‚   â”‚   â””â”€â”€ kredit/               # Halaman atribusi lisensi terbuka
â”‚   â”œâ”€â”€ features/                 # Modul fitur mandiri (cohesive feature vertical slices)
â”‚   â”‚   â”œâ”€â”€ accessibility/        # Konteks tema, kontras tinggi, font picker
â”‚   â”‚   â”œâ”€â”€ authoring/            # Editor materi, wizard AI, uploader gambar & audio
â”‚   â”‚   â”œâ”€â”€ player/               # Pemutar kartu peraga & kartu isyarat
â”‚   â”‚   â”œâ”€â”€ presentation/         # Komponen TV player layar penuh
â”‚   â”‚   â”œâ”€â”€ print-cards/          # Tata letak cetak fisik A4
â”‚   â”‚   â”œâ”€â”€ quick-instructions/   # Jembatan instruksi cepat visual
â”‚   â”‚   â”œâ”€â”€ quiz/                 # Runner kuis adaptif
â”‚   â”‚   â””â”€â”€ signs/                # Pustaka isyarat SIBI/BISINDO
â”‚   â”œâ”€â”€ server/                   # Server-only logic (DB, Repos, Services, Config)
â”‚   â”‚   â”œâ”€â”€ config/               # Validasi env Zod (env.ts)
â”‚   â”‚   â”œâ”€â”€ db/                   # Skema Drizzle (schema.ts), client, seed
â”‚   â”‚   â”œâ”€â”€ repos/                # Akses data (lessons, classrooms, assets, recommendations)
â”‚   â”‚   â”œâ”€â”€ security/             # Sesi, token, rate-limit
â”‚   â”‚   â””â”€â”€ services/             # AI (Gemini), media (Sharp), TTS, signs, storage
â”‚   â””â”€â”€ shared/                   # Komponen UI dasar & utilitas bersama
â”‚       â”œâ”€â”€ components/           # Button, Card, Field, Chip, Modal (aksesibel)
â”‚       â””â”€â”€ lib/                  # Result pattern, sync engine
â”œâ”€â”€ public/                       # Aset statis publik (signs, media, favicon)
â”œâ”€â”€ docs/                         # Dokumentasi arsitektur, ADR, deployment, backlog
â””â”€â”€ scripts/                      # Skrip git-guard, import isyarat, env check
```

---

## ðŸ“œ Lisensi & Atribusi

- **Perangkat Lunak**: Berlisensi [MIT](LICENSE) Â© 2026 Tim Fomo.
- **Piktogram**: [ARASAAC](https://arasaac.org) (Pemerintah Aragon, penulis Sergio Palao), berlisensi [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/).
- **Bahasa Isyarat**: Rujukan resmi Kamus SIBI Kemendikbud dan Lembar Abjad BISINDO Kemendikdasmen.
- **Tipografi**: *Atkinson Hyperlegible Next* (Braille Institute, OFL) & *Lexend* (Google Fonts, OFL).

