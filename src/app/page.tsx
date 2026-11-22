'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, Field, Icon, DisplayPreferencesTrigger } from '@/shared/ui';

export default function HomePage() {
  const router = useRouter();
  const [classCode, setClassCode] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function handleJoinClass(e: React.FormEvent) {
    e.preventDefault();
    const clean = classCode.trim();

    if (clean.length !== 6 || !/^\d{6}$/.test(clean)) {
      setErrorMsg('Kode kelas terdiri dari 6 angka.');
      return;
    }

    setErrorMsg(null);
    router.push(`/kelas/${clean}`);
  }

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

      {/* Konten Utama: Dua Pintu */}
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
          <Card as="section" className="flex flex-col justify-between">
            <form onSubmit={handleJoinClass} className="flex flex-col gap-4">
              <div>
                <h2 className="text-xl font-bold text-[var(--ink)]">
                  Siswa
                </h2>
                <p className="text-sm text-[var(--ink-2)] mt-1">
                  Masukkan kode dari guru untuk mulai belajar.
                </p>
              </div>

              <Field
                id="kode-kelas"
                label="Kode kelas (6 angka)"
                codeMode={true}
                placeholder="000000"
                value={classCode}
                onChange={(e) => setClassCode(e.target.value)}
                error={errorMsg ?? undefined}
              />

              <Button
                type="submit"
                variant="primary"
                size="large"
                icon={<Icon name="DoorOpen" size={24} />}
                className="w-full mt-2"
              >
                Masuk kelas
              </Button>
            </form>
          </Card>

          {/* Pintu Guru: Ruang Guru */}
          <Card as="section" className="flex flex-col justify-between">
            <div className="flex flex-col gap-2">
              <h2 className="text-xl font-bold text-[var(--ink)]">
                Guru
              </h2>
              <p className="text-sm text-[var(--ink-2)] mt-1">
                Kelola ruang kelas, buat materi adaptif, dan pantau hasil belajar siswa.
              </p>
            </div>

            <div className="mt-8 flex flex-col gap-3">
              <Button
                variant="secondary"
                size="large"
                href="/guru"
                icon={<Icon name="Chalkboard" size={24} />}
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
      </footer>
    </div>
  );
}
