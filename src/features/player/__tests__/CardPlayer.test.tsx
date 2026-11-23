import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PreferencesProvider } from "@/shared/ui";
import { CardPlayer } from "../components/CardPlayer";

describe("CardPlayer Component", () => {
  const dummyCards = [
    {
      id: "c-1",
      lessonId: "l-1",
      position: 1,
      text: "Budi membaca buku di perpustakaan",
      cardType: "instruction",
      audioRef: "https://example.com/audio1.mp3",
      audioSource: "tts" as const,
      audioAssetId: null,
      imageUrl: "https://example.com/image1.png",
      imageSource: "pictogram" as const,
      imageAssetId: null,
      imageAlt: "Budi membaca buku",
      keyTerms: ["buku"],
      signOverride: null,
      voiceOverride: null,
      createdAt: new Date(),
    },
    {
      id: "c-2",
      lessonId: "l-1",
      position: 2,
      text: "Siti menulis cerita",
      cardType: "instruction",
      audioRef: null,
      audioSource: "none" as const,
      audioAssetId: null,
      imageUrl: null,
      imageSource: "none" as const,
      imageAssetId: null,
      imageAlt: null,
      keyTerms: [],
      signOverride: null,
      voiceOverride: null,
      createdAt: new Date(),
    },
  ];

  it("merender kartu pertama dan teks dengan benar", () => {
    render(
      <PreferencesProvider>
        <CardPlayer cards={dummyCards} backHref="/kelas/123456" />
      </PreferencesProvider>
    );

    expect(screen.getByText(/Kartu 1 dari 2/i)).toBeDefined();
    expect(screen.getByText(/Budi/i)).toBeDefined();
    expect(screen.getByText(/membaca/i)).toBeDefined();
    expect(screen.getAllByText(/buku/i).length).toBeGreaterThanOrEqual(1);
  });

  it("menampilkan gambar peraga jika tersedia", () => {
    render(
      <PreferencesProvider>
        <CardPlayer cards={dummyCards} backHref="/kelas/123456" />
      </PreferencesProvider>
    );

    const img = screen.getByAltText("Budi membaca buku");
    expect(img).toBeDefined();
    expect(img.getAttribute("src")).toBe("https://example.com/image1.png");
  });

  it("menampilkan tombol navigasi Kembali, Suara, dan Lanjut", () => {
    render(
      <PreferencesProvider>
        <CardPlayer cards={dummyCards} backHref="/kelas/123456" />
      </PreferencesProvider>
    );

    expect(screen.getByRole("button", { name: /Kembali/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /Putar|Suara/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /Lanjut/i })).toBeDefined();
  });
});
