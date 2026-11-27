# Langkah Deploy & Verifikasi Katalog Visual (B1.8 / B2.8)

Dokumen ini menjelaskan langkah deploy skema basis data, sinkronisasi katalog konsep visual (`data/catalog/*.json`), dan kueri verifikasi untuk lingkungan lokal (PGlite) maupun produksi (PostgreSQL / Supabase).

---

## 1. Prasyarat & Pemeriksaan Lingkungan

1. Pastikan file katalog dan benih sudah terverifikasi sebelum deploy:

```bash
npm run catalog:verify
npm run catalog:report
npm run typecheck
npx vitest run src/shared/lib/grounding/visual-retrieval.test.ts
```

2. Pastikan seluruh berkas `.webp` berada di:
   - `public/media/pictograms/*.webp` (1.050 piktogram ARASAAC)
   - `public/media/custom/*.webp` (125 ilustrasi kustom SDLB)
   - Dan tidak ada berkas gambar biner baru yang dimasukkan ke dalam `data/`.

---

## 2. Migrasi Skema Basis Data (Forward-Only, B2.2)

Skema baru menambahkan:
- Kolom `assets.sha256` (`text`) + indeks `assets_sha256_idx`
- Tabel `visual_concepts` + indeks unik parsial `visual_concepts_active_label_norm_idx` (`WHERE status <> 'hidden'`)
- Tabel `visual_gaps`
- Tabel `catalog_version`

### A. Lingkungan Lokal (PGlite)
Migrasi otomatis dijalankan oleh `ensureDatabaseInitialized()` di `src/server/db/auto-init.ts`, atau jalankan secara eksplisit:

```bash
npm run db:migrate
```

### B. Lingkungan Produksi (PostgreSQL / Supabase)
Jika menargetkan PostgreSQL produksi dengan `DATABASE_URL` terpasang:

```bash
npx drizzle-kit push
```

Atau jalankan DDL idempoten berikut melalui SQL editor / `psql`:

```sql
ALTER TABLE "assets" ADD COLUMN IF NOT EXISTS "sha256" text;
CREATE INDEX IF NOT EXISTS "assets_sha256_idx" ON "assets" USING btree ("sha256");

CREATE TABLE IF NOT EXISTS "visual_concepts" (
  "id" text PRIMARY KEY NOT NULL,
  "label" text NOT NULL,
  "label_norm" text NOT NULL,
  "synonyms" text[] DEFAULT '{}' NOT NULL,
  "label_en" text,
  "domains" text[] DEFAULT '{}' NOT NULL,
  "group_id" text,
  "kind" text,
  "popularity" real DEFAULT 0 NOT NULL,
  "asset_id" uuid REFERENCES "public"."assets"("id") ON DELETE SET NULL,
  "alt_asset_ids" uuid[] DEFAULT '{}' NOT NULL,
  "alt_text" text,
  "status" text DEFAULT 'active' NOT NULL,
  "source" text DEFAULT 'arasaac' NOT NULL,
  "source_ref" text,
  "uploaded_by" uuid REFERENCES "public"."teachers"("id") ON DELETE SET NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "visual_concepts_active_label_norm_idx"
  ON "visual_concepts" USING btree ("label_norm")
  WHERE "visual_concepts"."status" <> 'hidden';

CREATE INDEX IF NOT EXISTS "visual_concepts_status_idx"
  ON "visual_concepts" USING btree ("status");

CREATE TABLE IF NOT EXISTS "visual_gaps" (
  "term" text PRIMARY KEY NOT NULL,
  "count" integer DEFAULT 1 NOT NULL,
  "last_lesson_id" uuid REFERENCES "public"."lessons"("id") ON DELETE SET NULL,
  "subject" text,
  "first_seen" timestamp with time zone DEFAULT now() NOT NULL,
  "last_seen" timestamp with time zone DEFAULT now() NOT NULL,
  "status" text DEFAULT 'open' NOT NULL
);

CREATE TABLE IF NOT EXISTS "catalog_version" (
  "id" text PRIMARY KEY NOT NULL,
  "hash" text NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
```

---

## 3. Sinkronisasi Katalog ke Basis Data & Storage

1. Sinkronkan aset kustom ke Supabase Storage (`card-images` bucket) bila ada pembaruan aset:

```bash
npm run storage:upload
```

2. Sinkronkan `data/catalog/*.json` ke tabel `visual_concepts` dan `catalog_version`:

```bash
npm run catalog:sync
```

3. Pantau istilah yang belum memiliki gambar (`visual_gaps`):

```bash
npm run catalog:gaps
```

---

## 4. Kueri SQL Verifikasi Pasca-Deploy (B1.8 / B2.8)

Jalankan kueri berikut untuk memastikan katalog dan basis data sinkron:

```sql
-- 1. Jumlah konsep per status dan sumber
SELECT status, source, count(*) AS total
FROM visual_concepts
GROUP BY status, source
ORDER BY status, source;

-- 2. Pastikan tidak ada duplikasi label_norm pada konsep aktif/needs_review
SELECT label_norm, count(*) AS dup_count
FROM visual_concepts
WHERE status <> 'hidden'
GROUP BY label_norm
HAVING count(*) > 1;

-- 3. Versi katalog aktif terakhir
SELECT id, hash, updated_at
FROM catalog_version
ORDER BY updated_at DESC;

-- 4. Cek 20 gap visual terbanyak yang perlu ditambahkan ilustrasinya
SELECT term, count, subject, last_seen, status
FROM visual_gaps
ORDER BY count DESC
LIMIT 20;

-- 5. Cek aset unggahan guru dan deduplikasi SHA-256
SELECT source, count(*) AS total, count(sha256) AS with_sha256
FROM assets
GROUP BY source;
```
