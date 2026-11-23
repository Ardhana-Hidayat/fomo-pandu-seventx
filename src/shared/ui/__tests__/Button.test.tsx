import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../Button';

describe('Button component', () => {
  it('merender teks tombol dengan benar', () => {
    render(<Button>Buat materi</Button>);
    expect(screen.getByRole('button', { name: 'Buat materi' })).toBeDefined();
  });

  it('menjalankan callback onClick saat diklik', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Lanjut</Button>);
    fireEvent.click(screen.getByRole('button', { name: 'Lanjut' }));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('tidak menjalankan onClick dan menerapkan status disabled saat nonaktif', () => {
    const handleClick = vi.fn();
    render(
      <Button disabled onClick={handleClick}>
        Kirim
      </Button>
    );
    const button = screen.getByRole('button', { name: 'Kirim' });
    expect(button).toHaveProperty('disabled', true);
    expect(button.getAttribute('aria-disabled')).toBe('true');
    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('merender sebagai tautan saat href diberikan', () => {
    render(<Button href="/guru">Masuk ruang guru</Button>);
    const link = screen.getByRole('link', { name: 'Masuk ruang guru' });
    expect(link.getAttribute('href')).toBe('/guru');
  });

  it('menerapkan kelas varian utama, sekunder, dan bahaya', () => {
    const { rerender } = render(<Button variant="primary">Utama</Button>);
    expect(screen.getByRole('button').className).toContain('bg-[var(--primary)]');

    rerender(<Button variant="secondary">Sekunder</Button>);
    expect(screen.getByRole('button').className).toContain('bg-[var(--surface)]');

    rerender(<Button variant="danger">Bahaya</Button>);
    expect(screen.getByRole('button').className).toContain('border-[var(--galat-edge)]');
  });
});
