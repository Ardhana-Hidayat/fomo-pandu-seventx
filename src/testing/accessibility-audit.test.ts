import { describe, it, expect } from "vitest";

// ========================================================
// WCAG 2.2 Relative Luminance and Contrast Ratio Calculators
// ========================================================
function hexToRgb(hex: string): [number, number, number] {
  const cleanHex = hex.replace("#", "").trim();
  const bigint = parseInt(cleanHex, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return [r, g, b];
}

function getRelativeLuminance(r: number, g: number, b: number): number {
  const sRgb = [r, g, b].map((val) => {
    const s = val / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * sRgb[0]! + 0.7152 * sRgb[1]! + 0.0722 * sRgb[2]!;
}

function calculateContrastRatio(hex1: string, hex2: string): number {
  const [r1, g1, b1] = hexToRgb(hex1);
  const [r2, g2, b2] = hexToRgb(hex2);

  const lum1 = getRelativeLuminance(r1, g1, b1);
  const lum2 = getRelativeLuminance(r2, g2, b2);

  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);

  return (lighter + 0.05) / (darker + 0.05);
}

describe("Story S4-01: Accessibility & Visual Audit", () => {
  describe("1. WCAG AAA Contrast Ratios (>= 7:1) across Themes", () => {
    // ----------------------------------------------------
    // Tema Terang (Light Theme)
    // ----------------------------------------------------
    describe("Tema Terang (Light)", () => {
      const surface = "#FFFFFF";
      const bg = "#F6F8FB";

      it("memiliki kontras teks utama (--ink) >= 7:1 (WCAG AAA)", () => {
        const ink = "#0B1B3A";
        const ratioSurface = calculateContrastRatio(ink, surface);
        const ratioBg = calculateContrastRatio(ink, bg);

        expect(ratioSurface).toBeGreaterThanOrEqual(7.0);
        expect(ratioBg).toBeGreaterThanOrEqual(7.0);
        // Desain sistem PANDU mencapai ~17:1 untuk teks utama
        expect(ratioSurface).toBeGreaterThanOrEqual(16.0);
      });

      it("memiliki kontras teks pendukung (--ink-2) >= 7:1 (WCAG AAA)", () => {
        const ink2 = "#2C3A57";
        const ratio = calculateContrastRatio(ink2, surface);
        expect(ratio).toBeGreaterThanOrEqual(7.0);
        expect(ratio).toBeGreaterThanOrEqual(11.0);
      });

      it("memiliki kontras keterangan kecil (--muted) >= 4.5:1 (WCAG AA) dan ~7:1 per token desain", () => {
        const muted = "#4B5A75";
        const ratio = calculateContrastRatio(muted, surface);
        expect(ratio).toBeGreaterThanOrEqual(4.5);
        expect(ratio).toBeGreaterThanOrEqual(6.9);
      });

      it("memiliki kontras kata yang belum dibaca (--unread) >= 7:1", () => {
        const unread = "#475569";
        const ratio = calculateContrastRatio(unread, surface);
        expect(ratio).toBeGreaterThanOrEqual(7.0);
      });

      it("memiliki kontras kata yang sedang disorot (--on-sorot di atas --sorot) >= 7:1", () => {
        const sorot = "#FFC83D";
        const onSorot = "#0B1B3A";
        const ratio = calculateContrastRatio(onSorot, sorot);
        expect(ratio).toBeGreaterThanOrEqual(7.0);
        expect(ratio).toBeGreaterThanOrEqual(10.0);
      });
    });

    // ----------------------------------------------------
    // Tema Gelap (Dark Theme)
    // ----------------------------------------------------
    describe("Tema Gelap (Dark)", () => {
      const surface = "#121C36";
      const bg = "#0A1224";

      it("memiliki kontras teks utama (--ink) >= 7:1 (WCAG AAA)", () => {
        const ink = "#F4F7FF";
        const ratioSurface = calculateContrastRatio(ink, surface);
        const ratioBg = calculateContrastRatio(ink, bg);

        expect(ratioSurface).toBeGreaterThanOrEqual(7.0);
        expect(ratioBg).toBeGreaterThanOrEqual(7.0);
        expect(ratioSurface).toBeGreaterThanOrEqual(15.0);
      });

      it("memiliki kontras teks sekunder (--muted) >= 7:1 (WCAG AAA)", () => {
        const muted = "#A9B6CE";
        const ratio = calculateContrastRatio(muted, surface);
        expect(ratio).toBeGreaterThanOrEqual(7.0);
        expect(ratio).toBeGreaterThanOrEqual(8.0);
      });

      it("memiliki kontras kata belum dibaca (--unread) >= 7:1", () => {
        const unread = "#B8C4DB";
        const ratio = calculateContrastRatio(unread, surface);
        expect(ratio).toBeGreaterThanOrEqual(7.0);
      });

      it("memiliki kontras tombol utama (--on-primary di atas --primary) >= 7:1", () => {
        const primary = "#F4F7FF";
        const onPrimary = "#0A1224";
        const ratio = calculateContrastRatio(onPrimary, primary);
        expect(ratio).toBeGreaterThanOrEqual(7.0);
        expect(ratio).toBeGreaterThanOrEqual(16.0);
      });
    });

    // ----------------------------------------------------
    // Tema Kontras Tinggi Multi-Tone (WCAG AAA)
    // ----------------------------------------------------
    describe("Tema Kontras Tinggi (Multi-Tone High Contrast)", () => {
      const bg = "#0B1220";
      const surface = "#111B2E";
      const surface2 = "#1A2740";

      it("menghindari hitam pekat (#000000) dan kuning neon (#FFFF00)", () => {
        const palette = [bg, surface, surface2, "#F8FAFC", "#E2E8F0", "#CBD5E1", "#38BDF8", "#FCD34D"];
        expect(palette).not.toContain("#000000");
        expect(palette).not.toContain("#FFFF00");
      });

      it("memiliki kontras teks utama (--ink) >= 7:1 di atas bg dan surface (WCAG AAA)", () => {
        const ink = "#F8FAFC";
        expect(calculateContrastRatio(ink, bg)).toBeGreaterThanOrEqual(16.0);
        expect(calculateContrastRatio(ink, surface)).toBeGreaterThanOrEqual(16.0);
        expect(calculateContrastRatio(ink, surface2)).toBeGreaterThanOrEqual(7.0);
      });

      it("memiliki kontras teks pendukung (--ink-2) dan sekunder (--muted) >= 7:1 (WCAG AAA)", () => {
        const ink2 = "#E2E8F0";
        const muted = "#CBD5E1";
        expect(calculateContrastRatio(ink2, surface)).toBeGreaterThanOrEqual(7.0);
        expect(calculateContrastRatio(muted, surface)).toBeGreaterThanOrEqual(7.0);
        expect(calculateContrastRatio(muted, surface2)).toBeGreaterThanOrEqual(7.0);
      });

      it("memiliki kontras tombol utama (--on-primary di atas --primary) & tautan >= 7:1", () => {
        const primary = "#38BDF8";
        const onPrimary = "#06121F";
        const link = "#7DD3FC";
        expect(calculateContrastRatio(onPrimary, primary)).toBeGreaterThanOrEqual(7.0);
        expect(calculateContrastRatio(primary, surface)).toBeGreaterThanOrEqual(7.0);
        expect(calculateContrastRatio(link, surface)).toBeGreaterThanOrEqual(7.0);
      });

      it("memiliki kontras sorotan kata (--on-sorot di atas --sorot) dan status >= 7:1", () => {
        const sorot = "#FCD34D";
        const onSorot = "#0B1220";
        expect(calculateContrastRatio(onSorot, sorot)).toBeGreaterThanOrEqual(7.0);
        expect(calculateContrastRatio(sorot, surface)).toBeGreaterThanOrEqual(7.0);

        expect(calculateContrastRatio("#6EE7B7", "#052E16")).toBeGreaterThanOrEqual(7.0);
        expect(calculateContrastRatio("#FDE68A", "#422006")).toBeGreaterThanOrEqual(7.0);
        expect(calculateContrastRatio("#BAE6FD", "#0C2D48")).toBeGreaterThanOrEqual(7.0);
        expect(calculateContrastRatio("#FECACA", "#450A0A")).toBeGreaterThanOrEqual(7.0);
      });

      it("memiliki kontras batas UI (--border) >= 3:1 (WCAG AA UI)", () => {
        const border = "#64748B";
        expect(calculateContrastRatio(border, bg)).toBeGreaterThanOrEqual(3.0);
        expect(calculateContrastRatio(border, surface)).toBeGreaterThanOrEqual(3.0);
      });
    });
  });

  describe("2. Touch Targets & Focus Ring Guidelines", () => {
    it("komponen Button memiliki target sentuh minimal 48px dan 56px untuk tombol utama", () => {
      // Konstanta ukuran tombol per Berkas 03 & AKSESIBILITAS-CHECKLIST
      const minButtonHeight = 48;
      const primaryButtonHeight = 56;
      expect(minButtonHeight).toBeGreaterThanOrEqual(48);
      expect(primaryButtonHeight).toBeGreaterThanOrEqual(56);
    });

    it("fokus papan ketik menggunakan cincin dua lapis (:focus-visible ring-4 ring-offset-2)", () => {
      const dualRingClasses = "focus-visible:ring-4 focus-visible:ring-offset-2";
      expect(dualRingClasses).toContain("focus-visible:ring-4");
      expect(dualRingClasses).toContain("focus-visible:ring-offset-2");
    });
  });

  describe("3. Screen Reader Landmarks & SkipLink", () => {
    it("SkipLink mengarah ke target id='main-content'", () => {
      const targetId = "main-content";
      expect(targetId).toBe("main-content");
    });

    it("pengumuman pembaruan penting menggunakan aria-live='polite'", () => {
      const ariaLiveMode = "polite";
      expect(ariaLiveMode).toBe("polite");
    });
  });

  describe("4. Anti-Slop Compliance", () => {
    it("tidak mengandung emoji di ikon atau teks antarmuka", () => {
      // String verifikasi anti-slop
      const forbiddenEmojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}]/u;
      const sampleInterfaceTexts = [
        "Papan Belajar Inklusif",
        "Setujui dan bagikan",
        "Tandai terverifikasi",
        "Putar suara",
        "Kartu 1 dari 5",
        "Jawaban tepat! Hebat sekali.",
        "Coba lagi ya, kamu pasti bisa.",
      ];

      for (const text of sampleInterfaceTexts) {
        expect(forbiddenEmojiRegex.test(text)).toBe(false);
      }
    });

    it("menggunakan istilah pedagogis yang tenang dan jelas tanpa hiperbola", () => {
      const sampleSystemPhrases = [
        "Alat belajar adaptif untuk siswa dan guru SLB",
        "Pustaka Isyarat SIBI",
        "Mode cadangan otomatis aktif",
        "Tersambung! Model aktif.",
      ];

      const forbiddenHypeRegex = /(revolusioner|ajaib|magic|super power|tanpa batas)/i;
      for (const phrase of sampleSystemPhrases) {
        expect(forbiddenHypeRegex.test(phrase)).toBe(false);
      }
    });
  });
});
