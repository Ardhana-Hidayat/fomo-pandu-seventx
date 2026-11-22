import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PreferencesProvider, usePreferences } from '../PreferencesContext';

function TestPreferencesConsumer() {
  const { preferences, setPreference } = usePreferences();
  return (
    <div>
      <span data-testid="tema">{preferences.tema}</span>
      <span data-testid="huruf">{preferences.huruf}</span>
      <button
        type="button"
        onClick={() => setPreference('tema', 'kuning-hitam')}
      >
        Ubah Tema Kuning-Hitam
      </button>
      <button
        type="button"
        onClick={() => setPreference('huruf', 'raksasa')}
      >
        Ubah Huruf Raksasa
      </button>
    </div>
  );
}

describe('Preferences Context & Provider', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-tema');
    document.documentElement.removeAttribute('data-huruf');
  });

  it('menggunakan nilai bawaan dan memperbarui DOM saat preferensi diubah', () => {
    render(
      <PreferencesProvider>
        <TestPreferencesConsumer />
      </PreferencesProvider>
    );

    expect(screen.getByTestId('tema').textContent).toBe('terang');

    fireEvent.click(screen.getByRole('button', { name: 'Ubah Tema Kuning-Hitam' }));
    expect(screen.getByTestId('tema').textContent).toBe('kuning-hitam');
    expect(document.documentElement.getAttribute('data-tema')).toBe('kuning-hitam');

    fireEvent.click(screen.getByRole('button', { name: 'Ubah Huruf Raksasa' }));
    expect(screen.getByTestId('huruf').textContent).toBe('raksasa');
    expect(document.documentElement.getAttribute('data-huruf')).toBe('raksasa');
  });
});
