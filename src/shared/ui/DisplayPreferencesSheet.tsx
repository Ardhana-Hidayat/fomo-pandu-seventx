'use client';

import { usePreferences, type ThemePreference, type FontSizePreference, type FontFamilyPreference, type SpacingPreference, type HighlightPreference, type ButtonSizePreference, type MotionPreference } from './PreferencesContext';
import { Sheet } from './Sheet';
import { Chip } from './Chip';
import { Button } from './Button';

export function DisplayPreferencesSheet() {
  const { preferences, setPreference, resetPreferences, isSheetOpen, closeSheet } = usePreferences();

  return (
    <Sheet
      isOpen={isSheetOpen}
      onClose={closeSheet}
      title="Pengaturan Tampilan"
      description="Atur ukuran huruf, kontras, dan kenyamanan membaca sesuai kebutuhan belajar."
    >
      <div className="flex flex-col gap-6">
        {/* Pratinjau Langsung */}
        <div className="p-4 rounded-[var(--r-kartu)] border-2 border-[var(--border)] bg-[var(--surface-2)]">
          <span className="block text-xs font-bold text-[var(--muted)] mb-1">Pratinjau Teks</span>
          <p className="text-[var(--ink)] font-medium leading-relaxed">
            PANDU membantu siswa dan guru SLB belajar dengan tenang dan jelas.
          </p>
        </div>

        {/* Tema Warna */}
        <section className="flex flex-col gap-2">
          <h3 className="font-bold text-base text-[var(--ink)]">Tema Warna</h3>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ['terang', 'Terang'],
                ['gelap', 'Gelap'],
                ['kuning-hitam', 'Kuning di atas Hitam'],
              ] as const
            ).map(([value, label]) => (
              <Chip
                key={value}
                label={label}
                selected={preferences.tema === value}
                onSelect={() => setPreference('tema', value as ThemePreference)}
                role="radio"
              />
            ))}
          </div>
        </section>

        {/* Ukuran Huruf */}
        <section className="flex flex-col gap-2">
          <h3 className="font-bold text-base text-[var(--ink)]">Ukuran Huruf</h3>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ['normal', 'Normal (100%)'],
                ['besar', 'Besar (125%)'],
                ['sangat-besar', 'Sangat Besar (150%)'],
                ['raksasa', 'Raksasa (180%)'],
              ] as const
            ).map(([value, label]) => (
              <Chip
                key={value}
                label={label}
                selected={preferences.huruf === value}
                onSelect={() => setPreference('huruf', value as FontSizePreference)}
                role="radio"
              />
            ))}
          </div>
        </section>

        {/* Jenis Huruf */}
        <section className="flex flex-col gap-2">
          <h3 className="font-bold text-base text-[var(--ink)]">Jenis Huruf</h3>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ['plus-jakarta', 'Plus Jakarta Sans'],
                ['atkinson', 'Atkinson Hyperlegible'],
                ['lexend', 'Lexend'],
              ] as const
            ).map(([value, label]) => (
              <Chip
                key={value}
                label={label}
                selected={preferences.jenisHuruf === value}
                onSelect={() => setPreference('jenisHuruf', value as FontFamilyPreference)}
                role="radio"
              />
            ))}
          </div>
        </section>

        {/* Jarak Baris dan Huruf */}
        <section className="flex flex-col gap-2">
          <h3 className="font-bold text-base text-[var(--ink)]">Jarak Baris dan Huruf</h3>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ['normal', 'Normal'],
                ['lebar', 'Lebar'],
              ] as const
            ).map(([value, label]) => (
              <Chip
                key={value}
                label={label}
                selected={preferences.jarak === value}
                onSelect={() => setPreference('jarak', value as SpacingPreference)}
                role="radio"
              />
            ))}
          </div>
        </section>

        {/* Warna Sorotan Kata */}
        <section className="flex flex-col gap-2">
          <h3 className="font-bold text-base text-[var(--ink)]">Warna Sorotan Kata</h3>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ['kuning', 'Kuning'],
                ['biru', 'Biru Muda'],
                ['hijau', 'Hijau Muda'],
              ] as const
            ).map(([value, label]) => (
              <Chip
                key={value}
                label={label}
                selected={preferences.sorot === value}
                onSelect={() => setPreference('sorot', value as HighlightPreference)}
                role="radio"
              />
            ))}
          </div>
        </section>

        {/* Ukuran Tombol */}
        <section className="flex flex-col gap-2">
          <h3 className="font-bold text-base text-[var(--ink)]">Ukuran Tombol</h3>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ['normal', 'Normal (56px)'],
                ['besar', 'Besar (64px)'],
              ] as const
            ).map(([value, label]) => (
              <Chip
                key={value}
                label={label}
                selected={preferences.tombol === value}
                onSelect={() => setPreference('tombol', value as ButtonSizePreference)}
                role="radio"
              />
            ))}
          </div>
        </section>

        {/* Kurangi Gerak */}
        <section className="flex flex-col gap-2">
          <h3 className="font-bold text-base text-[var(--ink)]">Kurangi Gerak</h3>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ['normal', 'Ikut Sistem'],
                ['kurang', 'Ya, Matikan Gerak'],
              ] as const
            ).map(([value, label]) => (
              <Chip
                key={value}
                label={label}
                selected={preferences.gerak === value}
                onSelect={() => setPreference('gerak', value as MotionPreference)}
                role="radio"
              />
            ))}
          </div>
        </section>

        {/* Aksi Bawah */}
        <div className="flex items-center justify-between gap-4 pt-4 border-t-2 border-[var(--border)]">
          <Button variant="secondary" onClick={resetPreferences}>
            Atur Ulang
          </Button>
          <Button variant="primary" onClick={closeSheet}>
            Selesai
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
