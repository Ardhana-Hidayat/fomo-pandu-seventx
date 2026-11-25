import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
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

  it("mempertahankan elemen img SIBI yang sama saat berpindah huruf agar tidak berkedip", () => {
    render(
      <PreferencesProvider>
        <CardPlayer cards={dummyCards} backHref="/kelas/123456" />
      </PreferencesProvider>
    );

    const signImgBefore = screen.getByAltText("Isyarat huruf B dalam SIBI") as HTMLImageElement;
    expect(signImgBefore.getAttribute("src")).toBe("/signs/sibi/b.webp");

    const letterUButton = screen.getAllByRole("button", { name: "Pilih huruf isyarat U" })[0];
    fireEvent.click(letterUButton);

    const signImgAfter = screen.getByAltText("Isyarat huruf U dalam SIBI") as HTMLImageElement;
    expect(signImgAfter).toBe(signImgBefore);
    expect(signImgAfter.getAttribute("src")).toBe("/signs/sibi/u.webp");
  });

  it("tetap mendukung mode SIBI saja tanpa gambar ilustrasi", () => {
    const sibiOnlyCards = [
      {
        ...dummyCards[0],
        imageUrl: null,
        imageSource: "none" as const,
        imageAlt: null,
        keyTerms: ["apel"],
      },
    ];

    render(
      <PreferencesProvider>
        <CardPlayer cards={sibiOnlyCards} backHref="/kelas/123456" />
      </PreferencesProvider>
    );

    expect(screen.getByAltText("Isyarat huruf A dalam SIBI")).toBeDefined();
    expect(screen.getByText("SIBI")).toBeDefined();
  });

  it("menampilkan kontrol kecepatan inklusif (Lambat, Sedang, Normal) dengan bawaan Sedang", () => {
    render(
      <PreferencesProvider>
        <CardPlayer cards={dummyCards} backHref="/kelas/123456" />
      </PreferencesProvider>
    );

    const lambat = screen.getByRole("radio", { name: "Lambat" });
    const sedang = screen.getByRole("radio", { name: "Sedang" });
    const normal = screen.getByRole("radio", { name: "Normal" });

    expect(sedang.getAttribute("aria-checked")).toBe("true");
    expect(lambat.getAttribute("aria-checked")).toBe("false");
    expect(normal.getAttribute("aria-checked")).toBe("false");

    fireEvent.click(lambat);
    expect(lambat.getAttribute("aria-checked")).toBe("true");
    expect(sedang.getAttribute("aria-checked")).toBe("false");
  });

  it("hanya melakukan preload huruf SIBI unik dari kartu aktif", () => {
    const loadedSrcs: string[] = [];
    const OriginalImage = window.Image;
    class MockImage {
      decoding = "";
      set src(val: string) {
        loadedSrcs.push(val);
      }
    }
    // @ts-expect-error mock Image for preload assertion
    window.Image = MockImage;

    try {
      render(
        <PreferencesProvider>
          <CardPlayer cards={dummyCards} backHref="/kelas/123456" />
        </PreferencesProvider>
      );

      // keyTerms kartu 1 adalah ["buku"] -> huruf unik: b, u, k
      expect(loadedSrcs.sort()).toEqual([
        "/signs/sibi/b.webp",
        "/signs/sibi/k.webp",
        "/signs/sibi/u.webp",
      ]);
    } finally {
      window.Image = OriginalImage;
    }
  });
});
