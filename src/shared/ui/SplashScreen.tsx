'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { usePreferences } from './PreferencesContext';

const SPLASH_STORAGE_KEY = 'panduin_splash_seen';

export interface SplashScreenProps {
  /** Durasi tampilan splash screen dalam milidetik sebelum memudar (default 1700ms). */
  durationMs?: number;
}

/**
 * Splash screen pembuka PanduIn yang menampilkan animasi logo (`/logo-panduin.png`)
 * dan teks merek "PanduIn" sekali per sesi sebelum masuk ke menu login siswa & guru.
 */
export function SplashScreen({ durationMs = 1700 }: SplashScreenProps) {
  const { preferences } = usePreferences();
  const [phase, setPhase] = useState<'checking' | 'visible' | 'hiding' | 'done'>('checking');

  useEffect(() => {
    let seen = false;
    try {
      seen = window.sessionStorage.getItem(SPLASH_STORAGE_KEY) === '1';
    } catch {
      seen = false;
    }

    if (seen) {
      const skipTimer = window.setTimeout(() => setPhase('done'), 0);
      return () => window.clearTimeout(skipTimer);
    }

    const showTimer = window.setTimeout(() => setPhase('visible'), 0);
    const hideTimer = window.setTimeout(() => setPhase('hiding'), durationMs);
    const doneTimer = window.setTimeout(() => {
      try {
        window.sessionStorage.setItem(SPLASH_STORAGE_KEY, '1');
      } catch {
        // Abaikan jika sessionStorage tidak tersedia
      }
      setPhase('done');
    }, durationMs + 320);

    return () => {
      window.clearTimeout(showTimer);
      window.clearTimeout(hideTimer);
      window.clearTimeout(doneTimer);
    };
  }, [durationMs]);

  function handleSkip() {
    try {
      window.sessionStorage.setItem(SPLASH_STORAGE_KEY, '1');
    } catch {
      // Abaikan
    }
    setPhase('done');
  }

  if (phase === 'checking' || phase === 'done') {
    return null;
  }

  const reduced = preferences.gerak === 'kurang';

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Memuat PanduIn"
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[var(--bg)] px-6 text-center select-none ${
        reduced
          ? ''
          : 'transition-opacity duration-300 ease-out ' +
            (phase === 'hiding' ? 'opacity-0 pointer-events-none' : 'opacity-100')
      }`}
    >
      <div
        className={`flex flex-col items-center gap-5 ${
          reduced ? '' : 'panduin-splash-card'
        }`}
      >
        <div className="rounded-3xl border-2 border-[var(--border)] bg-white p-3 shadow-sm">
          <Image
            src="/logo-panduin.png"
            alt="Logo PanduIn"
            width={112}
            height={112}
            priority
            unoptimized
            className={`h-24 w-24 sm:h-28 sm:w-28 object-contain ${
              reduced ? '' : 'panduin-splash-logo'
            }`}
          />
        </div>

        <div className={`flex flex-col items-center gap-1.5 ${reduced ? '' : 'panduin-splash-text'}`}>
          <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[var(--ink)]">
            PanduIn
          </span>
          <span className="text-sm sm:text-base font-medium text-[var(--ink-2)]">
            Panduan Dukungan Inklusif
          </span>
        </div>

        <div
          aria-hidden="true"
          className="mt-1 h-1.5 w-36 overflow-hidden rounded-full bg-[var(--surface-2)] border border-[var(--border)]"
        >
          <div
            className={`h-full rounded-full bg-[var(--primary)] ${
              reduced ? 'w-full' : 'panduin-splash-bar'
            }`}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={handleSkip}
        className="mt-10 min-h-[44px] rounded-[var(--r-tombol)] border border-[var(--border)] bg-[var(--surface)] px-5 py-2 text-sm font-semibold text-[var(--ink-2)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)] transition-colors"
      >
        Lewati
      </button>
    </div>
  );
}
