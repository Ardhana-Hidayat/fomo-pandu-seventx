# PanduIn — Panduan Dukungan Inklusif

[![Quality Gate](https://img.shields.io/badge/Quality%20Gate-Passing-success)](docs/backlog.md)
[![Next.js](https://img.shields.io/badge/Next.js-16.4.6-black)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict%205.x-blue)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38bdf8)](https://tailwindcss.com)
[![Database](https://img.shields.io/badge/Database-PGlite%20%2F%20PostgreSQL-336791)](https://orm.drizzle.team)
![License](https://img.shields.io/badge/License-MIT-green)

Platform web pendidikan inklusif adaptif yang dirancang khusus untuk siswa berkebutuhan khusus (tunarungu-wicara, tunanetra, *low vision*, dan tunagrahita) serta guru di Sekolah Luar Biasa (**SLBN Manisrejo Kota Madiun**). Dikembangkan oleh **Tim Fomo** untuk kompetisi nasional **SEVENT X (Kategori Software Development)**.

---

## Fitur Utama

### 1. Empat Saluran Belajar Multimodal (*Four Modality Channels*)
Setiap kartu peraga pembelajaran dapat disajikan melalui 4 saluran yang dapat diaktifkan/dinonaktifkan secara fleksibel sesuai kebutuhan individual siswa:
- **Teks**: Tipografi ramah disleksia (*Atkinson Hyperlegible Next* & *Lexend*), ukuran huruf adaptif, dan kata kunci berpenanda.
- **Audio Konsisten**: Audio pelafalan kalimat tersintesis di server (WAV 24kHz) atau rekaman suara guru langsung, tersinkronisasi dengan efek sorotan kata (*karaoke wipe* `--progres`).
- **Bahasa Isyarat**: Ejaan jari terverifikasi untuk sistem **SIBI** dan **BISINDO** tanpa gambar buatan AI. Dilengkapi pita huruf interaktif (*letter ribbon*).
- **Piktogram Konkret**: Piktogram simbol standar **ARASAAC** (*Creative Commons CC BY-NC-SA 4.0*) dengan *caching* lokal dan *fallback* otomatis tanpa internet.

### 2. Ruang Kerja Guru (*Teacher Workspace*)
- **Wizard Pembuatan Materi Otomatis**: Buat draf materi dari topik, teks panjang, berkas PDF buku ajar, atau foto dokumen buku. Ditenagai Google Gemini API dengan *fallback* kurikulum deterministik saat offline.
- **Editor & Gerbang Persetujuan Ketat (*Approval Gate*)**: Guru memiliki kendali penuh menyunting kartu, memilih media piktogram/foto, merekam audio mikrofon, dan wajib menyetujui (*approve*) sebelum materi terbit ke siswa.
- **Mode Presentasi Kelas & Smart TV (`/guru/materi/[id]/presentasi` & `/tv/[kode]`)**: Tampilan layar penuh dengan tipografi raksasa (`--t-tv`), kontrol ramah remote TV (tombol angka 1–4, spasi, panah), dan kuis bersama di depan kelas.
- **Ekspor Kartu Fisik Siap Cetak (`/guru/materi/[id]/cetak`)**: Lembar cetak format A4 dengan tata letak kisi 2x2, panduan garis potong putus-putus (*dashed line*), kontras tinggi, dan QR code akses mandiri.
- **Manajemen Kelas & Buku Nilai**: Kode gabung 6-digit instan, pengelolaan profil kebutuhan khusus siswa, rekap skor, akurasi percobaan pertama (*first-try accuracy*), dan waktu pengerjaan.

### 3. Jembatan Komunikasi Cepat (*Quick Instructions*) (`/guru/instruksi-cepat`)
- Mengubah instruksi verbal atau ketikan guru menjadi 1–4 langkah visual konkret dengan ejaan isyarat dan piktogram untuk diproyeksikan langsung di layar Smart TV kelas.

### 4. Rekap Hasil Belajar & Rekomendasi Pedagogis (`/guru/materi/[id]/hasil`)
- Mengevaluasi pola belajar siswa berdasarkan aturan pedagogis teruji (R1–R4, R7):
  - **R1 (Pengulangan Konsep)**: Deteksi kesulitan berulang pada kartu tertentu untuk pendampingan benda konkret.
  - **R2 (Ketergantungan Petunjuk / Akselerasi)**: Rekomendasi penyesuaian jumlah opsi pilihan (2, 3, atau 4).
  - **R3 (Pola Tebak / Kontras Font)**: Deteksi jawaban cepat berturut-turut atau kebutuhan kontras tinggi untuk siswa *low vision*.
  - **R4 (Kanal Bahasa Isyarat)**: Rekomendasi pengaktifan kanal isyarat & teks bagi siswa tunarungu.
  - **R7 (Peringatan Kartu Menantang)**: Analisis kartu paling menantang di tingkat kelas.
- Setiap rekomendasi dilengkapi bukti nyata (*Dasar Data*) dan status tindak lanjut (*baru*, *dilakukan*, *diabaikan*).

### 5. Akses Siswa Tanpa Hambatan (*Zero-Friction Student Access*) (`/masuk`)
- Siswa masuk hanya dengan memasukkan **Kode Kelas 6-Digit** dan nama panggilan tanpa perlu mengingat kata sandi atau email.
- Pemutar kartu peraga interaktif dengan navigasi sentuh minimal 48px dan umpan balik hangat non-punitif (tanpa *timer* hitung mundur pemicu stres).

### 6. Aksesibilitas Teruji (Kepatuhan WCAG AAA)
- **3 Tema Visual**: Terang (*Warm Off-White*), Gelap (*Deep Slate*), dan Kuning-Hitam (*High Contrast* 18:1).
- **Fokus Ganda (*Dual Focus Ring*)**: Indikator fokus keyboard kontras tinggi putih-hitam yang jelas di semua peramban.
- **Anti-Slop & Anti-Distraksi**: Bebas gradien neon, bebas animasi berlebihan, bebas emoji liar, dan semantik HTML penuh (`<main id="main-content">`, `<nav>`, `<aside aria-live="polite">`).

---

## Tumpukan Teknologi (*Tech Stack*)

| Komponen | Teknologi | Keterangan |
| :--- | :--- | :--- |
| **Framework** | **Next.js 16.4.6** | App Router, Server Actions, Cache Components, Turbopack |
| **Bahasa** | **TypeScript 5.x** | *Strict mode*, 0 `any`, arsitektur fungsional `Result<T, AppError>` |
| **Gaya & Token** | **Tailwind CSS v4** | CSS variables semantik, utilitas *fluid typography* & *high-contrast* |
| **Basis Data** | **Drizzle ORM** | Skema tipe aman, migrasi terkelola otomatis |
| **Driver DB Lokal** | **@electric-sql/pglite** | PostgreSQL WASM *embedded* (jalan lokal tanpa Docker/cloud) |
| **Driver DB Produksi** | **PostgreSQL / Supabase** | Sakelar 1-baris via env `DATA_DRIVER=postgres` |
| **Penyimpanan Media** | **StorageProvider** | Driver lokal `.data/uploads/` dan driver Supabase Storage |
| **Manipulasi Citra** | **Sharp** | Sanitasi EXIF, *resize* rasio 4:3 max 1200x900, konversi WebP |
| **AI & LLM** | **Google Gemini API** | Model `gemini-2.5-flash` dengan *fallback* kurikulum offline |
| **Pustaka Simbol** | **ARASAAC API** | Piktogram simbol lisensi CC BY-NC-SA 4.0 |
| **Ikonografi** | **Phosphor Icons** | `@phosphor-icons/react` berbobot tebal ramah sensori |

---

## Panduan Memulai Cepat (*Local Quickstart*)

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
Buka peramban pada alamat [http://localhost:3000](http://localhost:3000).

---

## Akses Akun & Skenario Demo

| Peran | URL Masuk | Cara Akses / Kredensial |
| :--- | :--- | :--- |
| **Guru Demo** | `/guru/masuk` | Klik tombol **"Masuk sebagai Guru Demo"** (langsung masuk ke dashboard `/guru`) |
| **Siswa Demo** | `/masuk` | Masukkan Kode Kelas: **`123456`**, Nama Siswa: **`Budi`** (atau `Sari`, `Dina`, `Raka`) |
| **Mode Smart TV** | `/tv/123456` | Tampilan layar besar kelas untuk materi cuci tangan |
| **Instruksi Cepat** | `/guru/instruksi-cepat` | Jembatan instruksi visual kelas untuk guru |
| **Pustaka Isyarat** | `/guru/pengaturan/isyarat` | Verifikasi kamus abjad SIBI dan BISINDO |
| **Halaman Kredit** | `/kredit` | Atribusi lisensi ARASAAC, font, dan kamus isyarat |

---

## Beralih ke Supabase (Mode Produksi)

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
5. Lihat panduan lengkap di [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) dan [docs/PRODUCTION-DEPLOYMENT.md](docs/PRODUCTION-DEPLOYMENT.md).

---

## Gerbang Kualitas & Pengujian (*Quality Gates*)

Setiap baris kode diuji melalui rangkaian uji otomatis sebelum disetujui:

```bash
# Jalankan seluruh rangkaian gerbang mutu (lint, typecheck, deps, unused, unit test)
npm run check

# Uji unit & integrasi lengkap (Vitest — 26 file, 139 tests)
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

## Struktur Direktori Proyek

```text
PanduIn/
├── src/
│   ├── app/                      # Rute Next.js 16 App Router (Guru, Siswa, TV, API)
│   │   ├── api/                  # Route handler API (AI, media, TTS, signs, health)
│   │   ├── bantuan/              # Halaman panduan & bantuan pengguna
│   │   ├── guru/                 # Ruang kerja guru (materi, kelas, pengaturan, hasil)
│   │   ├── kelas/                # Portal belajar & kuis siswa berbasis kode kelas
│   │   ├── kredit/               # Halaman atribusi lisensi terbuka
│   │   ├── m/                    # Tautan pendek berbagi materi (shareCode)
│   │   ├── masuk/                # Gerbang masuk siswa & guru
│   │   └── tv/                   # Mode layar penuh Smart TV kelas
│   ├── features/                 # Modul fitur mandiri (vertical slices)
│   │   ├── auth/                 # Autentikasi guru & sesi siswa
│   │   ├── authoring/            # Editor materi, wizard AI, uploader gambar & audio
│   │   ├── player/               # Pemutar kartu peraga & kartu isyarat
│   │   ├── presentation/         # Komponen TV player layar penuh
│   │   ├── print-cards/          # Tata letak cetak fisik A4
│   │   ├── quick-instructions/   # Jembatan instruksi cepat visual
│   │   ├── quiz/                 # Runner kuis adaptif & pencatatan attempt
│   │   ├── signs/                # Pustaka & resolver isyarat SIBI/BISINDO
│   │   ├── teacher-dashboard/    # Komponen ringkasan dashboard guru
│   │   └── teacher-settings/     # Pengaturan preferensi guru & isyarat
│   ├── server/                   # Server-only logic (DB, Repos, Services, Config)
│   │   ├── config/               # Validasi env Zod (env.ts)
│   │   ├── db/                   # Skema Drizzle (schema.ts), client, seed
│   │   ├── repos/                # Akses data (lessons, classrooms, assets, recommendations)
│   │   ├── security/             # Sesi, token, rate-limit
│   │   └── services/             # AI (Gemini), media (Sharp), TTS, signs, storage
│   └── shared/                   # Komponen UI dasar & utilitas bersama
│       ├── lib/                  # Result pattern, sync engine
│       └── ui/                   # Button, Card, Field, Chip, Modal (aksesibel)
├── public/                       # Aset statis publik (signs, media, favicon)
├── docs/                         # Dokumentasi arsitektur, ADR, deployment, backlog
└── scripts/                      # Skrip git-guard, import isyarat, env check
```

---

## Lisensi & Atribusi

- **Perangkat Lunak**: Berlisensi MIT © 2026 Tim Fomo.
- **Piktogram**: [ARASAAC](https://arasaac.org) (Pemerintah Aragon, penulis Sergio Palao), berlisensi [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/).
- **Bahasa Isyarat**: Rujukan resmi Kamus SIBI Kemendikbud dan Lembar Abjad BISINDO Kemendikdasmen.
- **Tipografi**: *Atkinson Hyperlegible Next* (Braille Institute, OFL) & *Lexend* (Google Fonts, OFL).
