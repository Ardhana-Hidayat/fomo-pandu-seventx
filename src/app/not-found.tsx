'use client';

import { Button } from '@/shared/ui/Button';
import { StatusMessage } from '@/shared/ui/StatusMessage';

export default function NotFoundPage() {
  return (
    <main
      id="main-content"
      className="flex min-h-[80dvh] flex-col items-center justify-center p-6 text-center"
    >
      <div className="w-full max-w-md flex flex-col gap-6">
        <h1 className="text-3xl font-bold text-[var(--ink)]">Halaman tidak ditemukan</h1>
        <StatusMessage type="info">
          Alamat yang dituju tidak ada atau sudah dipindahkan. Cek kembali tautan atau kembali ke halaman beranda.
        </StatusMessage>
        <div className="flex justify-center">
          <Button variant="primary" size="large" href="/">
            Kembali ke beranda
          </Button>
        </div>
      </div>
    </main>
  );
}
