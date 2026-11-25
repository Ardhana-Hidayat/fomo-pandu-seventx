import Link from "next/link";
import { Button, Card, Icon, DisplayPreferencesTrigger } from "@/shared/ui";

export default function HomePage() {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-[var(--bg)] text-[var(--ink)]">
      {/* Header Utama — 64px, white bg, 1px bottom border (DESIGN.md §6) */}
      <header className="h-16 w-full border-b border-[var(--border)] bg-[var(--surface)] px-4 sm:px-6">
        <div className="mx-auto flex h-full w-full max-w-5xl items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold tracking-tight text-[var(--ink)]">
              PANDU
            </span>
          </div>
          <DisplayPreferencesTrigger />
        </div>
      </header>

      {/* Konten Utama: Dua Pintu Seimbang */}
      <main
        id="main-content"
        className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center px-4 py-8 sm:px-8 sm:py-12"
      >
        <div className="w-full max-w-xl text-center mb-8 sm:mb-10">
          <h1 className="text-[1.75rem] font-bold leading-tight tracking-[-0.015em] text-[var(--ink)] sm:text-[2.25rem]">
            Papan Belajar Inklusif
          </h1>
          <p className="mt-3 text-base text-[var(--ink-2)] max-w-[60ch] mx-auto">
            Alat bantu belajar yang tenang dan jelas untuk siswa dan guru SLB.
          </p>
        </div>

        <div className="grid w-full max-w-3xl grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6">
          {/* Pintu Siswa */}
          <Card as="section" className="flex flex-col justify-between gap-5 sm:gap-6">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--accent-subtle)] text-[var(--primary)]">
                  <Icon name="Cards" size={24} />
                </div>
                <h2 className="text-[1.25rem] font-semibold text-[var(--ink)]">
                  Siswa
                </h2>
              </div>
              <p className="text-sm text-[var(--ink-2)] leading-relaxed max-w-[52ch]">
                Belajar mandiri dengan kartu peraga multi-saluran: teks bersinkron, audio ramah sensorik, gambar visual, dan kartu isyarat SIBI.
              </p>
            </div>

            <Button
              variant="primary"
              size="large"
              href="/masuk"
              icon={<Icon name="Play" size={20} />}
              className="w-full"
            >
              Mulai Belajar
            </Button>
          </Card>

          {/* Pintu Guru */}
          <Card as="section" className="flex flex-col justify-between gap-5 sm:gap-6">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--surface-2)] text-[var(--ink-2)]">
                  <Icon name="Chalkboard" size={24} />
                </div>
                <h2 className="text-[1.25rem] font-semibold text-[var(--ink)]">
                  Guru
                </h2>
              </div>
              <p className="text-sm text-[var(--ink-2)] leading-relaxed max-w-[52ch]">
                Susun materi adaptif, kelola sesi belajar, tinjau bahasa isyarat dan suara sistem, serta pantau rekomendasi belajar siswa.
              </p>
            </div>

            <Button
              variant="secondary"
              size="large"
              href="/guru"
              icon={<Icon name="DoorOpen" size={20} />}
              className="w-full"
            >
              Buka Ruang Guru
            </Button>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-[var(--border)] bg-[var(--surface)] px-4 py-5 sm:px-6 sm:py-6">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center justify-between gap-3 text-center sm:flex-row sm:gap-6 sm:text-left">
          <p className="text-xs sm:text-sm leading-relaxed text-[var(--muted)]">
            <span className="font-semibold text-[var(--ink-2)]">PANDU</span>
            {" \u2022 "}
            Dirancang untuk aksesibilitas dan kemandirian belajar SLB
          </p>
          <nav
            aria-label="Tautan informasi"
            className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-xs sm:text-sm font-semibold sm:justify-end shrink-0"
          >
            <Link
              href="/bantuan"
              className="inline-flex min-h-[40px] items-center rounded-md px-1.5 py-1 text-[var(--link)] hover:text-[var(--primary)] hover:underline underline-offset-4 transition-colors"
            >
              Pusat Bantuan
            </Link>
            <Link
              href="/kredit"
              className="inline-flex min-h-[40px] items-center rounded-md px-1.5 py-1 text-[var(--link)] hover:text-[var(--primary)] hover:underline underline-offset-4 transition-colors"
            >
              Kredit &amp; Atribusi Aset Terbuka
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
