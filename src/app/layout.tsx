import type { Metadata, Viewport } from 'next';
import { Atkinson_Hyperlegible_Next, Lexend, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { SkipLink } from '@/shared/ui/SkipLink';
import { UIProviders } from '@/shared/ui/UIProviders';

const atkinson = Atkinson_Hyperlegible_Next({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-atkinson',
  display: 'swap',
  fallback: ['system-ui', 'sans-serif'],
});

const lexend = Lexend({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-lexend',
  display: 'swap',
  fallback: ['system-ui', 'sans-serif'],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-mono',
  display: 'swap',
  fallback: ['monospace'],
});

export const metadata: Metadata = {
  title: 'InkluDidik - Web Pendidikan Inklusif SLB',
  description:
    'Alat belajar adaptif untuk siswa dan guru SLB: teks bersinkron, audio, piktogram, dan kartu isyarat huruf.',
};

export const viewport: Viewport = {
  themeColor: '#0B1B3A',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="id"
      data-tema="terang"
      data-huruf="normal"
      data-jenis-huruf="atkinson"
      data-jarak="normal"
      data-sorot="kuning"
      data-tombol="normal"
      className={`${atkinson.variable} ${lexend.variable} ${jetbrainsMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script id="theme-init">
          {`try {
            var s = localStorage.getItem('inkludidik_tampilan');
            if (s) {
              var p = JSON.parse(s);
              var d = document.documentElement;
              if (p.tema) d.setAttribute('data-tema', p.tema);
              if (p.huruf) d.setAttribute('data-huruf', p.huruf);
              if (p.jenisHuruf) d.setAttribute('data-jenis-huruf', p.jenisHuruf);
              if (p.jarak) d.setAttribute('data-jarak', p.jarak);
              if (p.sorot) d.setAttribute('data-sorot', p.sorot);
              if (p.tombol) d.setAttribute('data-tombol', p.tombol);
              if (p.gerak === 'kurang') d.setAttribute('data-gerak', 'kurang');
            }
          } catch (e) {}`}
        </script>
      </head>
      <body
        className="flex min-h-[100dvh] flex-col bg-[var(--bg)] text-[var(--ink)] font-sans antialiased"
        suppressHydrationWarning
      >
        <SkipLink targetId="main-content" label="Lewati ke isi utama" />
        <UIProviders>
          {children}
        </UIProviders>
      </body>
    </html>
  );
}
