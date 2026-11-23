'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';

export type ThemePreference = 'terang' | 'gelap' | 'kuning-hitam';
export type FontSizePreference = 'normal' | 'besar' | 'sangat-besar' | 'raksasa';
export type FontFamilyPreference = 'atkinson' | 'lexend';
export type SpacingPreference = 'normal' | 'lebar';
export type HighlightPreference = 'kuning' | 'biru' | 'hijau';
export type ButtonSizePreference = 'normal' | 'besar';
export type MotionPreference = 'normal' | 'kurang';

export interface DisplayPreferences {
  tema: ThemePreference;
  huruf: FontSizePreference;
  jenisHuruf: FontFamilyPreference;
  jarak: SpacingPreference;
  sorot: HighlightPreference;
  tombol: ButtonSizePreference;
  gerak: MotionPreference;
}

const DEFAULT_PREFERENCES: DisplayPreferences = {
  tema: 'terang',
  huruf: 'normal',
  jenisHuruf: 'atkinson',
  jarak: 'normal',
  sorot: 'kuning',
  tombol: 'normal',
  gerak: 'normal',
};

const STORAGE_KEY = 'inkludidik_tampilan';

interface PreferencesContextValue {
  preferences: DisplayPreferences;
  setPreference: <K extends keyof DisplayPreferences>(key: K, value: DisplayPreferences[K]) => void;
  resetPreferences: () => void;
  isSheetOpen: boolean;
  openSheet: () => void;
  closeSheet: () => void;
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

function applyPreferencesToDOM(prefs: DisplayPreferences) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.setAttribute('data-tema', prefs.tema);
  root.setAttribute('data-huruf', prefs.huruf);
  root.setAttribute('data-jenis-huruf', prefs.jenisHuruf);
  root.setAttribute('data-jarak', prefs.jarak);
  root.setAttribute('data-sorot', prefs.sorot);
  root.setAttribute('data-tombol', prefs.tombol);
  if (prefs.gerak === 'kurang') {
    root.setAttribute('data-gerak', 'kurang');
  } else {
    root.removeAttribute('data-gerak');
  }
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<DisplayPreferences>(DEFAULT_PREFERENCES);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved) as Partial<DisplayPreferences>;
          setPreferences((prev) => {
            const merged = { ...prev, ...parsed };
            applyPreferencesToDOM(merged);
            return merged;
          });
        }
      } catch {
        // fallback to defaults
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    applyPreferencesToDOM(preferences);
  }, [preferences]);

  const setPreference = useCallback(<K extends keyof DisplayPreferences>(key: K, value: DisplayPreferences[K]) => {
    setPreferences((prev) => {
      const updated = { ...prev, [key]: value };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      applyPreferencesToDOM(updated);
      return updated;
    });
  }, []);

  const resetPreferences = useCallback(() => {
    setPreferences(DEFAULT_PREFERENCES);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    applyPreferencesToDOM(DEFAULT_PREFERENCES);
  }, []);

  const openSheet = useCallback(() => setIsSheetOpen(true), []);
  const closeSheet = useCallback(() => setIsSheetOpen(false), []);

  return (
    <PreferencesContext.Provider
      value={{
        preferences,
        setPreference,
        resetPreferences,
        isSheetOpen,
        openSheet,
        closeSheet,
      }}
    >
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error('usePreferences must be used within PreferencesProvider');
  }
  return context;
}
