'use client';

import Link from 'next/link';

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="id">
      <body className="flex min-h-[100dvh] flex-col items-center justify-center p-6 bg-[#F6F8FB] text-[#0B1B3A] font-sans">
        <main
          id="main-content"
          className="w-full max-w-md flex flex-col gap-6 text-center p-6 rounded-[20px] border-2 border-[#6B7A96] bg-white shadow-[0_4px_0_0_#0B1B3A]"
        >
          <h1 className="text-2xl font-bold">Terjadi kendala pada sistem</h1>
          <p className="text-base text-[#2C3A57]">
            Aplikasi mengalami kesalahan tak terduga. Silakan muat ulang sistem.
          </p>
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => reset()}
              className="inline-flex min-h-[56px] items-center justify-center rounded-[14px] border-2 border-[#0B1B3A] bg-[#0B1B3A] text-white font-bold px-6 shadow-[0_4px_0_0_#000000] cursor-pointer"
            >
              Muat ulang aplikasi
            </button>
            <Link
              href="/"
              className="inline-flex min-h-[56px] items-center justify-center rounded-[14px] border-2 border-[#6B7A96] bg-white text-[#0B1B3A] font-bold px-6 shadow-[0_4px_0_0_#6B7A96]"
            >
              Kembali ke beranda
            </Link>
          </div>
        </main>
      </body>
    </html>
  );
}
