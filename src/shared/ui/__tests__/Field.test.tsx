import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Field } from '../Field';

describe('Field component', () => {
  it('menampilkan label yang terhubung ke input', () => {
    render(<Field id="kode-kelas" label="Kode kelas (6 angka)" />);
    const input = screen.getByLabelText('Kode kelas (6 angka)');
    expect(input).toBeDefined();
    expect(input.id).toBe('kode-kelas');
  });

  it('menampilkan pesan galat dengan ikon dan aria-invalid saat error', () => {
    render(
      <Field
        id="kode"
        label="Kode kelas"
        error="Kode kelas harus terdiri dari 6 angka."
      />
    );
    const input = screen.getByLabelText('Kode kelas');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByRole('alert')).toBeDefined();
    expect(screen.getByText('Kode kelas harus terdiri dari 6 angka.')).toBeDefined();
  });

  it('mendukung mode kode kelas dengan maxlength 6 dan inputMode numeric', () => {
    render(<Field id="pin" label="Kode PIN" codeMode={true} />);
    const input = screen.getByLabelText('Kode PIN');
    expect(input.getAttribute('maxLength')).toBe('6');
    expect(input.getAttribute('inputMode')).toBe('numeric');
  });
});
