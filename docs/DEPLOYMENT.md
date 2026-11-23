# Panduan Penerapan Produksi (*Production Deployment Guide*) â€” PANDU

Dokumen ini memuat prosedur resmi dan daftar periksa teknis untuk men-deploy platform **PANDU** ke lingkungan produksi menggunakan arsitektur **Next.js (Vercel / Railway)** dan **Supabase (PostgreSQL + Storage + Auth)**.

---

## ðŸ—ï¸ Arsitektur Lingkungan Produksi

```text
[ Klien Siswa / HP / Tablet / Smart TV ]
                    â”‚
                    â–¼  HTTPS (Cloudflare / Vercel Edge)
[ Next.js 16 App Router (Vercel / Railway) ]
  â”œâ”€â”€ Server Actions & API Routes (Node.js LTS)
  â”œâ”€â”€ Sharp Image Sanitizer & PCM Audio Synthesizer
  â””â”€â”€ Proxy Session Guard (`src/proxy.ts`)
                    â”‚
                    â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
                    â–¼                          â–¼
       [ Supabase PostgreSQL ]        [ Supabase Storage ]
       - Database Pooler (Port 6543)  - Bucket: `card-images`
       - Drizzle Migrations           - Bucket: `card-audio`
       - Row Level Security (RLS)     - Bucket: `lesson-sources`
```

---

## ðŸ“‹ Daftar Periksa Pra-Penerapan (*Pre-Deployment Checklist*)

Sebelum melakukan deploy ke produksi, pastikan:
- [ ] Seluruh gerbang kualitas lulus 100%: `npm run check` (0 lint error, 0 type error, 0 depcruise violation, 0 knip dead code).
- [ ] Build Turbopack sukses: `npm run build`.
- [ ] Pemeriksaan keamanan git lulus: `node scripts/git-guard.mjs tracked` (bebas berkas rahasia `.env`, token API, berkas > 1 MB).
- [ ] Seluruh migrasi skema Drizzle telah di-generate: `npm run db:generate`.

---

## ðŸš€ Langkah-Langkah Penerapan Langkah-Demi-Langkah

### Langkah 1: Persiapan Proyek Supabase
1. Masuk ke [Supabase Dashboard](https://supabase.com) dan buat proyek baru (pilih region terdekat, misalnya `Singapore - ap-southeast-1`).
2. Buka menu **Project Settings > Database**:
   - Salin URI koneksi **Transaction Pooler** (Port 6543) untuk `DATABASE_URL`.
3. Buka menu **Storage**:
   - Buat bucket berikut dengan visibilitas publik:
     - `card-images` (Penyimpanan gambar piktogram dan unggahan guru)
     - `card-audio` (Penyimpanan berkas suara TTS dan rekaman mikrofon guru)
     - `lesson-sources` (Penyimpanan PDF dan lampiran guru)
4. Buka menu **Authentication > Providers**:
   - Aktifkan penyedia **Google** jika menggunakan OAuth guru produksi, dan masukkan *Authorized Redirect URI* dari domain produksi Anda.

---

### Langkah 2: Konfigurasi Variabel Lingkungan Produksi

Atur variabel lingkungan berikut pada dashboard Vercel / Railway (pastikan variabel rahasia **tidak** menggunakan awalan `NEXT_PUBLIC_`):

| Nama Variabel | Nilai Produksi | Keterangan |
|---|---|---|
| `NODE_ENV` | `production` | Mode optimasi produksi |
| `DATA_DRIVER` | `postgres` | Beralih dari PGlite lokal ke PostgreSQL |
| `DATABASE_URL` | `postgresql://postgres.[ref]:[pass]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true` | Pooler PostgreSQL Supabase |
| `STORAGE_DRIVER` | `supabase` | Beralih ke penyimpanan cloud Supabase |
| `AUTH_MODE` | `google` (atau `demo` untuk pameran) | Metode autentikasi guru |
| `SESSION_SECRET` | *(string acak minimal 32 karakter)* | Kunci rahasia HMAC penandatangan sesi |
| `GEMINI_API_KEY` | *(kunci Google Gemini AI)* | Pembuatan draf materi otomatis |
| `GEMINI_MODEL` | `gemini-2.5-flash` | Model AI terstandar |
| `TTS_PROVIDER` | `none` (atau `gemini`) | Penyedia pelafalan suara |
| `GENERATE_LIMIT_PER_HOUR` | `10` | Batas kecepatan AI per guru |
| `ALLOW_DRAFT_SIGNS` | `false` | Hanya tampilkan isyarat terverifikasi |
| `NEXT_PUBLIC_APP_URL` | `https://PANDU.id` | URL publik resmi aplikasi |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://[ref].supabase.co` | Endpoint Supabase publik |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGci...` | Kunci anonim publik Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGci...` | Kunci internal aman Supabase |

---

### Langkah 3: Eksekusi Migrasi & Seeding Produksi

Jalankan skrip migrasi dari terminal lokal Anda yang terhubung ke `DATABASE_URL` produksi:

```bash
# 1. Terapkan seluruh migrasi skema Drizzle ke Supabase
DATABASE_URL="postgresql://..." npm run db:migrate

# 2. Seed data kelas demo dan guru demo awal
DATABASE_URL="postgresql://..." npm run db:seed
```

---

### Langkah 4: Deployment ke Platform Hosting

#### Opsi A: Deployment ke Vercel (Disarankan)
1. Sambungkan repositori GitHub ke proyek baru di Vercel.
2. Pengaturan Build & Development:
   - **Framework Preset**: `Next.js`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
   - **Install Command**: `npm install`
   - **Node.js Version**: `22.x`
3. Masukkan seluruh variabel lingkungan dari Langkah 2 ke menu **Environment Variables**.
4. Klik **Deploy**.

#### Opsi B: Deployment ke Railway / Docker
1. Proyek dapat langsung di-deploy ke Railway menggunakan Nixpacks bawaan Node.js 22.
2. Tambahkan Healthcheck Endpoint pada konfigurasi Railway:
   - **Healthcheck Path**: `/api/health`
   - **Timeout**: 10 detik

---

### Langkah 5: Verifikasi Pasca-Penerapan (*Smoke Testing*)

Setelah deployment berhasil tayang, lakukan pengujian cepat pada rute-rute inti:
1. **Pemeriksaan Healthcheck**: Buka `https://your-domain.com/api/health` â†’ Pastikan status `200 OK`.
2. **Login Guru Demo**: Masuk ke `/guru/masuk`, klik masuk demo â†’ Pastikan dashboard `/guru` memuat kelas dan materi contoh.
3. **Penerbitan Materi**: Buka materi contoh, klik edit â†’ simpan & setujui (*approve*) â†’ pastikan QR Code dan share code aktif.
4. **Portal Siswa**: Buka `/masuk` pada ponsel/tablet, masukkan kode kelas `123456` dan nama `Budi` â†’ Pastikan kartu peraga terbuka dengan pemutar suara dan isyarat.
5. **Mode Smart TV**: Buka `/tv/123456` pada layar besar â†’ Pastikan tampilan layar penuh dan pintasan keyboard (spasi, 1-4) bekerja.
6. **Ekspor Cetak**: Buka `/guru/materi/[id]/cetak` â†’ Tekan tombol Cetak â†’ Pastikan pratinjau cetak A4 2x2 rapi dengan garis potong putus-putus.

---

## ðŸ”’ Keamanan & Kebijakan Header

Platform PANDU menerapkan header keamanan ketat melalui konfigurasi server:
- **Content-Security-Policy (CSP)**: Membatasi sumber skrip, melarang eval tidak aman, membatasi `img-src` dan `media-src` hanya ke domain internal dan storage Supabase.
- **X-Content-Type-Options**: `nosniff` (mencegah MIME-sniffing).
- **Referrer-Policy**: `strict-origin-when-cross-origin`.
- **Permissions-Policy**: `microphone=(self), camera=(), geolocation=(), fullscreen=(self)`.
- **Anti-EXIF**: Seluruh citra unggahan guru dibersihkan dari metadata lokasi (GPS) dan kamera melalui pustaka `Sharp` sebelum disimpan ke storage.
- **IDOR Protection**: Setiap operasi pembacaan/penulisan materi memeriksa kepemilikan sesi guru (`where teacherId = session.teacherId`).

---

## ðŸ”„ Prosedur Rollback & Pemulihan

Jika terjadi insiden fatal pada versi rilis baru:
1. **Rollback Instan Vercel**: Buka Vercel Dashboard > Deployments > Pilih deployment stabil sebelumnya > Klik **Promote to Production** (waktu pemulihan < 30 detik).
2. **Pemulihan Basis Data**: Supabase menyediakan fitur *Point-in-Time Recovery (PITR)* untuk memulihkan status database jika terjadi galat data.

