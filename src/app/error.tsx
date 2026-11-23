'use client';

import { useEffect } from 'react';
import { Button } from '@/shared/ui/Button';
import { StatusMessage } from '@/shared/ui/StatusMessage';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled route error:', error);
  }, [error]);

  return (
    <main
      id="main-content"
      className="flex min-h-[80dvh] flex-col items-center justify-center p-6 text-center"
    >
      <div className="w-full max-w-md flex flex-col gap-6">
        <StatusMessage type="galat" title="Terjadi kendala">
          Halaman tidak dapat ditampilkan. Coba muat ulang halaman ini atau kembali ke halaman utama.
        </StatusMessage>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button variant="primary" size="large" onClick={() => reset()}>
            Muat ulang
          </Button>
          <Button variant="secondary" size="large" href="/">
            Kembali ke beranda
          </Button>
        </div>
      </div>
    </main>
  );
}
