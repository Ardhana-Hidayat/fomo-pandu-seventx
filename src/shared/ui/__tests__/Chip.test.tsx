import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Chip } from '../Chip';

describe('Chip component', () => {
  it('merender label dan mendukung interaksi klik', () => {
    const handleSelect = vi.fn();
    render(<Chip label="Atkinson Hyperlegible" onSelect={handleSelect} />);
    const chip = screen.getByRole('button', { name: 'Atkinson Hyperlegible' });
    fireEvent.click(chip);
    expect(handleSelect).toHaveBeenCalledTimes(1);
  });

  it('menerapkan status terpilih dengan aria-checked pada role radio', () => {
    render(<Chip label="Terang" role="radio" selected={true} />);
    const chip = screen.getByRole('radio', { name: 'Terang' });
    expect(chip.getAttribute('aria-checked')).toBe('true');
  });

  it('menerapkan status tidak terpilih dengan aria-checked false pada role radio', () => {
    render(<Chip label="Gelap" role="radio" selected={false} />);
    const chip = screen.getByRole('radio', { name: 'Gelap' });
    expect(chip.getAttribute('aria-checked')).toBe('false');
  });
});
