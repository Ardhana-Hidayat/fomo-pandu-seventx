import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card } from '../Card';
import { StatusMessage } from '../StatusMessage';
import { SkipLink } from '../SkipLink';

describe('Card component', () => {
  it('merender konten kartu dalam elemen semantik yang ditentukan', () => {
    render(
      <Card as="article">
        <h2>Judul Materi</h2>
        <p>Konten materi belajar inklusif</p>
      </Card>
    );
    expect(screen.getByRole('article')).toBeDefined();
    expect(screen.getByText('Judul Materi')).toBeDefined();
  });
});

describe('StatusMessage component', () => {
  it('merender status benar dengan aria-live polite', () => {
    render(<StatusMessage type="benar">Tepat. Jawabanmu benar!</StatusMessage>);
    const status = screen.getByRole('status');
    expect(status.getAttribute('aria-live')).toBe('polite');
    expect(screen.getByText('Tepat. Jawabanmu benar!')).toBeDefined();
  });

  it('merender status galat dengan role alert', () => {
    render(<StatusMessage type="galat">Gagal menyimpan materi.</StatusMessage>);
    expect(screen.getByRole('alert')).toBeDefined();
  });
});

describe('SkipLink component', () => {
  it('merender tautan lompat ke konten utama', () => {
    render(<SkipLink targetId="main-content" label="Lewati ke isi utama" />);
    const link = screen.getByRole('link', { name: 'Lewati ke isi utama' });
    expect(link.getAttribute('href')).toBe('#main-content');
  });
});
