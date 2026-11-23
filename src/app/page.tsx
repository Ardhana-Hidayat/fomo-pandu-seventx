import Link from "next/link";
import { Button, Card, Icon, DisplayPreferencesTrigger } from "@/shared/ui";

export default function HomePage() {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-[var(--bg)] text-[var(--ink)]">
      {/* Header Utama */}
      <header className="w-full border-b-2 border-[var(--border)] bg-[var(--surface)] px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold tracking-tight text-[var(--ink)]">
              InkluDidik
            </span>
          </div>
          <DisplayPreferencesTrigger />
        </div>
      </header>

      {/* Konten Utama: Dua Pintu Seimbang */}
      <main
        id="main-content"
        className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center p-4 py-8 sm:p-8"
      >
        <div className="w-full max-w-xl text-center mb-8">
          <h1 className="text-3xl font-bold sm:text-4xl text-[var(--ink)]">
            Papan Belajar Inklusif
          </h1>
          <p className="mt-2 text-base text-[var(--ink-2)]">
            Alat bantu belajar yang tenang dan jelas untuk siswa dan guru SLB.
          </p>
        </div>

        <div className="grid w-full max-w-3xl grid-cols-1 gap-6 sm:grid-cols-2">
          {/* Pintu Siswa: Masuk Kelas */}
          <Card as="section" className="flex flex-col justify-between p-6 sm:p-8">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-[var(--surface-2)] text-[var(--ink)] border border-[var(--border)]">
                  <Icon name="Cards" size={28} />
                </div>
                <h2 className="text-2xl font-bold text-[var(--ink)]">
                  Siswa
                </h2>
              </div>
              <p className="text-base text-[var(--ink-2)] mt-3 leading-relaxed">
                Belajar dengan kartu peraga multi-saluran: teks bersinkron, audio ramah sensorik, gambar visual, dan kartu isyarat SIBI/BISINDO.
              </p>
            </div>

            <div className="mt-8">
              <Button
                variant="primary"
                size="large"
                href="/masuk"
                icon={<Icon name="DoorOpen" size={24} />}
                className="w-full"
              >
                Masuk kelas
              </Button>
            </div>
          </Card>

          {/* Pintu Guru: Ruang Guru */}
          <Card as="section" className="flex flex-col justify-between p-6 sm:p-8">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-[var(--surface-2)] text-[var(--ink)] border border-[var(--border)]">
                  <Icon name="Chalkboard" size={28} />
                </div>
                <h2 className="text-2xl font-bold text-[var(--ink)]">
                  Guru
                </h2>
              </div>
              <p className="text-base text-[var(--ink-2)] mt-3 leading-relaxed">
                Kelola ruang kelas, buat materi adaptif, tinjau bahasa isyarat dan suara sistem, serta pantau rekomendasi belajar siswa.
              </p>
            </div>

            <div className="mt-8">
              <Button
                variant="secondary"
                size="large"
                href="/guru"
                icon={<Icon name="DoorOpen" size={24} />}
                className="w-full"
              >
                Buka ruang guru
              </Button>
            </div>
          </Card>
        </div>
      </main>

      {/* Footer Minimalis Aksesibel */}
      <footer className="w-full border-t-2 border-[var(--border)] bg-[var(--surface)] px-4 py-4 text-center text-sm text-[var(--muted)]">
        <p>InkluDidik &bull; Dirancang untuk aksesibilitas dan kemandirian belajar SLB</p>
        <div className="mt-2 flex items-center justify-center gap-4 text-xs font-bold">
          <Link href="/kredit" className="text-[var(--link)] hover:underline inline-flex items-center gap-1">
            <span>Kredit &amp; Atribusi Aset Terbuka</span>
          </Link>
        </div>
      </footer>
    </div>
  );
}
