# Changelog

Semua perubahan penting pada proyek PANDU dicatat di berkas ini.
Format ini mengikuti panduan [Keep a Changelog](https://keepachangelog.com/id-ID/1.0.0/).

## [Unreleased]

### Ditambah
- Fondasi Gelombang 0: validasi env Zod (`src/server/config/env.ts`), contoh konfigurasi `.env.example`, dan skrip validasi `scripts/check-env.ts` (S0-02).
- Penjaga git: `.gitignore`, `.gitattributes`, `.editorconfig`, dan `scripts/git-guard.mjs` untuk penegakan batas ukuran dan rahasia commit (S0-01).
- Gerbang kualitas: konfigurasi `dependency-cruiser.cjs` dan `knip.json` (S0-01).

### Dihapus
- Berkas legacy v1 prototype: `src/lib/modules-store.ts`, `supabase/schema.sql`, `src/types/database.ts` (S0-01).

