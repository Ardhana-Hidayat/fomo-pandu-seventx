# Instruksi Rebrand Proyek ke **PanduIn** untuk AI Agent (Antigravity)

Jalankan seluruh langkah di bawah ini secara berurutan pada repositori proyek Next.js + Supabase ini untuk mengganti identitas aplikasi (baik sisa `InkluDidik` maupun `PANDU`) menjadi **PanduIn** (*Panduan Dukungan Inklusif*) tanpa merusak alur MVP yang sudah berjalan.

---

## 1. Standar Penamaan Target

Gunakan konvensi berikut secara konsisten di seluruh kode, metadata, dan dokumentasi:

| Konteks | Nilai Lama | Nilai Target |
| :--- | :--- | :--- |
| **Nama Aplikasi (UI & Teks)** | `InkluDidik` / `PANDU` | `PanduIn` |
| **Kepanjangan Resmi** | `Inklusi Pendidikan Digital` / `Panduan Dukungan Inklusif` | `Panduan Dukungan Inklusif` |
| **Title Browser / Metadata** | `InkluDidik — ...` / `PANDU — ...` | `PanduIn — Panduan Dukungan Inklusif` |
| **Package Name (`package.json`)** | `inkludidik` / `pandu` | `panduin` |
| **Slug / Nama Repo / Domain** | `inkludidik` / `pandu` | `panduin` (mis. `panduin.vercel.app`) |

**Aturan Ketat Penggantian Kata:**
* Ganti semua kemunculan `InkluDidik` dan `Inklusi Pendidikan Digital` (*case-insensitive*).
* Ganti `PANDU` **hanya jika merujuk pada nama merek/aplikasi** (misal: wordmark navbar, title halaman, header PDF, judul dokumen, prompt AI, atau teks sambutan). **Dilarang** mengubah kata bahasa Indonesia umum seperti `panduan`, `memandu`, atau `dipandu` maupun variabel internal yang tidak merujuk pada merek.

---

## 2. Langkah Eksekusi Agent

### Tahap 1 — Audit & Branching
1. Buat branch baru `chore/rebrand-to-panduin` jika working tree bersih (atau laporkan jika ada perubahan yang belum di-commit sebelum melanjutkan).
2. Jalankan pencarian menyeluruh di seluruh repositori (abaikan `.git`, `node_modules`, `.next`):
   - Cari `inkludidik` dan `inklusi pendidikan digital` (*case-insensitive*).
   - Cari `PANDU` (*case-sensitive* maupun dalam tag/title/komponen UI).
3. Kelompokkan daftar file terdampak: konfigurasi, UI/komponen, prompt AI/API, dan dokumentasi (`README.md`, `DESIGN.md`, `ROADMAP-REVISI.md`, dll.).

### Tahap 2 — Konfigurasi Proyek & Dokumentasi
1. **`package.json`:** Ubah `"name"` menjadi `"panduin"` dan perbarui `"description"` agar menyebut **PanduIn (Panduan Dukungan Inklusif)**.
2. **`.env.example` (jika ada):** Perbarui nilai contoh `NEXT_PUBLIC_APP_NAME="PanduIn"` dan `NEXT_PUBLIC_APP_URL` ke contoh domain baru (mis. `https://panduin.vercel.app`). Jangan pernah menyentuh atau membocorkan file `.env.local` yang berisi secret asli jika tidak diminta.
3. **Dokumentasi Internal (`README.md`, `DESIGN.md`, `ROADMAP-REVISI.md`, dan file `.md` terkait):**
   - Perbarui seluruh judul, wordmark referensi, dan deskripsi menjadi **PanduIn** (*Panduan Dukungan Inklusif*).
   - Pertahankan struktur, token desain (`#0F766E`, `#F8FAFC`, `Plus Jakarta Sans`, dll.), dan batasan MVP.

### Tahap 3 — Antarmuka Pengguna (Next.js App Router), Metadata & Aset
1. **Root Metadata (`src/app/layout.tsx` atau `app/layout.tsx`):**
   - Perbarui `metadata.title`, `metadata.description`, dan `openGraph` ke `PanduIn — Panduan Dukungan Inklusif`.
   - Periksa `alt` text logo, `manifest.json` / `site.webmanifest` (jika ada), serta referensi ikon/favicon.
2. **Komponen Branding & Halaman Utama:**
   - **Navbar / Sidebar Teacher Studio:** Ganti wordmark menjadi **PanduIn**.
   - **Halaman Login & Register Guru:** Perbarui judul, subjudul, dan teks bantuan sambutan.
   - **Editor & Approval Kartu:** Perbarui label/teks yang menyebut nama aplikasi.
   - **Mode Presentasi Smart TV:** Perbarui label pojok/header kecil ke **PanduIn**.
   - **Template Ekspor PDF (`@media print`):** Pastikan header dan footer kartu fisik A4 bertuliskan **PanduIn**.
   - **Halaman Siswa via QR Code:** Perbarui header/footer dan teks bagikan tautan (mis. *"Buka materi PanduIn melalui tautan berikut..."*).
   - **Toast, Empty State & Error Messages:** Pastikan microcopy yang menyebut nama aplikasi sudah memakai **PanduIn**.

### Tahap 4 — Backend, Prompt AI & Skema Data
1. **Prompt Gemini API (`src/lib/ai/` atau `src/app/api/`):** Perbarui system prompt atau konteks aplikasi yang menyebut nama lama menjadi **PanduIn**.
2. **Database Supabase:**
   - **Jangan mengubah nama tabel atau kolom inti** (`teachers`, `materials`, `material_cards`, `exercise_results`) agar migrasi dan query RLS tetap aman.
   - Periksa file migrasi SQL (`supabase/migrations/`) atau seed data hanya jika ada dummy text bertuliskan `InkluDidik` atau `PANDU`.

### Tahap 5 — Verifikasi Wajib Sebelum Selesai
1. **Zero-Leftover Check:**
   - Jalankan pencarian ulang untuk memastikan tidak ada lagi kata `inkludidik` atau `inklusi pendidikan digital` yang tersisa.
   - Periksa sisa kata `PANDU` untuk memastikan yang tersisa hanya kata umum bahasa Indonesia (jika ada), bukan nama aplikasi.
2. **Quality & Build Check:**
   - Jalankan `npm run lint`
   - Jalankan `npx tsc --noEmit` (jika TypeScript aktif)
   - Jalankan `npm run build`
   - Perbaiki setiap error TypeScript, lint, atau build yang muncul akibat perubahan ini.

---

## 3. Format Laporan Akhir Agent

Setelah semua tahap lulus verifikasi, laporkan kepada pengguna dengan ringkas:
1. Daftar file yang berhasil diperbarui beserta ringkasan perubahannya.
2. Hasil pemeriksaan sisa string lama (*zero-leftover check*), `lint`, `typecheck`, dan `build`.
3. **Daftar Tugas Manual Pengguna** (yang hanya bisa dilakukan di dashboard eksternal):
   - Ubah *Project Name* & *Email Templates* di **Supabase Dashboard**.
   - Tambahkan domain baru ke **Supabase Auth > URL Configuration > Redirect URLs**.
   - Perbarui `NEXT_PUBLIC_APP_URL` dan domain proyek di **Vercel Dashboard**, lalu *redeploy*.
   - Rename repositori GitHub (jika diperlukan) dan perbarui nama file/judul diagram Draw.io (`UseCase_PanduIn.xml`, `Activity_PanduIn.xml`).
