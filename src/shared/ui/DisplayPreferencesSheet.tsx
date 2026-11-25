'use client';

import {
  usePreferences,
  type ThemePreference,
  type FontSizePreference,
  type FontFamilyPreference,
  type SpacingPreference,
  type HighlightPreference,
  type ButtonSizePreference,
  type MotionPreference,
} from './PreferencesContext';
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
      description="Atur ukuran huruf, kontras, dan kenyamanan membaca di PanduIn sesuai kebutuhan belajar."
    >
      <div className="flex flex-col gap-5">
        {/* Pratinjau Langsung */}
        <div className="p-4 sm:p-5 rounded-[var(--r-kartu)] border border-[var(--border-strong)] bg-[var(--surface-2)]">
          <span className="block text-xs font-bold uppercase tracking-wide text-[var(--muted)] mb-1.5">
            Pratinjau Langsung
          </span>
          <p className="text-[var(--ink)] font-medium leading-relaxed">
            PanduIn membantu siswa dan guru SLB belajar dengan{' '}
            <mark className="rounded px-1.5 py-0.5 bg-[var(--sorot-lembut)] text-[var(--on-sorot)] font-bold">
              tenang dan jelas
            </mark>
            .
          </p>
        </div>

        {/* Tema Warna */}
        <section className="flex flex-col gap-2.5 pt-1">
          <h3 className="font-bold text-base text-[var(--ink)]">Tema Warna</h3>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Tema warna">
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
        <section className="flex flex-col gap-2.5 pt-4 border-t border-[var(--border)]">
          <h3 className="font-bold text-base text-[var(--ink)]">Ukuran Huruf</h3>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Ukuran huruf">
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
        <section className="flex flex-col gap-2.5 pt-4 border-t border-[var(--border)]">
          <h3 className="font-bold text-base text-[var(--ink)]">Jenis Huruf</h3>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Jenis huruf">
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

        {/* Jarak Baris & Ukuran Tombol */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-[var(--border)]">
          <section className="flex flex-col gap-2.5">
            <h3 className="font-bold text-base text-[var(--ink)]">Jarak Baris &amp; Huruf</h3>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Jarak baris dan huruf">
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

          <section className="flex flex-col gap-2.5">
            <h3 className="font-bold text-base text-[var(--ink)]">Ukuran Tombol</h3>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Ukuran tombol">
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
        </div>

        {/* Warna Sorotan Kata */}
        <section className="flex flex-col gap-2.5 pt-4 border-t border-[var(--border)]">
          <h3 className="font-bold text-base text-[var(--ink)]">Warna Sorotan Kata</h3>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Warna sorotan kata">
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

        {/* Kurangi Gerak */}
        <section className="flex flex-col gap-2.5 pt-4 border-t border-[var(--border)]">
          <h3 className="font-bold text-base text-[var(--ink)]">Kurangi Gerak</h3>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Kurangi gerak">
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
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t-2 border-[var(--border)]">
          <Button variant="secondary" size="large" onClick={resetPreferences}>
            Atur Ulang
          </Button>
          <Button variant="primary" size="large" onClick={closeSheet}>
            Selesai
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
