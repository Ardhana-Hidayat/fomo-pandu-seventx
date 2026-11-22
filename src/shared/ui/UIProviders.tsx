'use client';

import type { ReactNode } from 'react';
import { PreferencesProvider } from './PreferencesContext';
import { ToastProvider } from './Toast';
import { DisplayPreferencesSheet } from './DisplayPreferencesSheet';

export function UIProviders({ children }: { children: ReactNode }) {
  return (
    <PreferencesProvider>
      <ToastProvider>
        {children}
        <DisplayPreferencesSheet />
      </ToastProvider>
    </PreferencesProvider>
  );
}
