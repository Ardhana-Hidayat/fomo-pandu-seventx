import { describe, it, expect, vi } from "vitest";
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
      text: "Zebra minum wafel",
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

  it("merender kartu pertama dan semua kata secara berurutan tanpa hilang", () => {
    render(
      <PreferencesProvider>
        <CardPlayer cards={dummyCards} backHref="/" />
      </PreferencesProvider>
    );

    expect(screen.getByText(/Kartu 1 dari 2/i)).toBeDefined();
    const wordSpans = Array.from(document.querySelectorAll("span.kata"));
    expect(wordSpans.map((el) => el.textContent)).toEqual([
      "Budi",
      "membaca",
      "buku",
      "di",
      "perpustakaan",
    ]);
  });

  it("menampilkan gambar peraga jika tersedia", () => {
    render(
      <PreferencesProvider>
        <CardPlayer cards={dummyCards} backHref="/" />
      </PreferencesProvider>
    );

    const img = screen.getByAltText("Budi membaca buku");
    expect(img).toBeDefined();
    expect(img.getAttribute("src")).toBe("https://example.com/image1.png");
  });

  it("menghormati backHref='/' dan mencegah tautan bocor ke '/kelas/...'", () => {
    const { rerender } = render(
      <PreferencesProvider>
        <CardPlayer cards={dummyCards} backHref="/" />
      </PreferencesProvider>
    );

    const backLink = screen.getByRole("link", { name: /Kembali/i });
    expect(backLink.getAttribute("href")).toBe("/");

    rerender(
      <PreferencesProvider>
        <CardPlayer cards={dummyCards} backHref="/kelas/123456" />
      </PreferencesProvider>
    );
    expect(screen.getByRole("link", { name: /Kembali/i }).getAttribute("href")).toBe("/");
  });

  it("mendukung callback onExit saat tombol Kembali diklik", () => {
    const onExit = vi.fn();
    render(
      <PreferencesProvider>
        <CardPlayer cards={dummyCards} onExit={onExit} />
      </PreferencesProvider>
    );

    fireEvent.click(screen.getAllByRole("button", { name: /Kembali/i })[0]!);
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it("menampilkan tombol navigasi Kembali, Putar, dan Lanjut", () => {
    render(
      <PreferencesProvider>
        <CardPlayer cards={dummyCards} backHref="/" />
      </PreferencesProvider>
    );

    expect(screen.getByRole("link", { name: /Kembali/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /Putar suara materi/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /Lanjut/i })).toBeDefined();
  });

  it("mempertahankan elemen img SIBI yang sama saat berpindah huruf agar tidak berkedip", () => {
    render(
      <PreferencesProvider>
        <CardPlayer cards={dummyCards} backHref="/" />
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

  it("tetap mengeja seluruh kata dengan SIBI meski keyTerms kartu kosong", () => {
    const noKeyTermsCard = [
      {
        ...dummyCards[0],
        text: "Siti menulis cerita",
        imageUrl: null,
        imageSource: "none" as const,
        imageAlt: null,
        keyTerms: [],
      },
    ];

    render(
      <PreferencesProvider>
        <CardPlayer cards={noKeyTermsCard} backHref="/" />
      </PreferencesProvider>
    );

    expect(screen.getByAltText("Isyarat huruf S dalam SIBI")).toBeDefined();
    expect(screen.getByText("SIBI")).toBeDefined();

    // Klik kata kedua ("menulis") untuk memeriksa ejaan SIBI-nya
    fireEvent.click(screen.getByText("menulis"));
    expect(screen.getByAltText("Isyarat huruf M dalam SIBI")).toBeDefined();
  });

  it("merender kalimat dengan kata berulang dan tanda baca tepat sekali per kata secara berurutan", () => {
    const repeatedWordCards = [
      {
        ...dummyCards[0],
        id: "c-rep",
        text: "Buka buku, baca buku!",
        keyTerms: [],
      },
    ];

    render(
      <PreferencesProvider>
        <CardPlayer cards={repeatedWordCards} backHref="/" />
      </PreferencesProvider>
    );

    const wordSpans = Array.from(document.querySelectorAll("span.kata"));
    expect(wordSpans.map((el) => el.textContent)).toEqual([
      "Buka",
      "buku,",
      "baca",
      "buku!",
    ]);

    // Klik kata "buku!" yang kedua (indeks 3) mengubah tampilan ke kata tersebut
    fireEvent.click(wordSpans[3]!);
    expect(screen.getByAltText("Isyarat huruf B dalam SIBI")).toBeDefined();
  });

  it("menampilkan kontrol kecepatan inklusif (Lambat, Sedang, Normal) dengan bawaan Sedang", () => {
    render(
      <PreferencesProvider>
        <CardPlayer cards={dummyCards} backHref="/" />
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

  it("hanya melakukan preload huruf SIBI unik dari seluruh kata pada kartu aktif", () => {
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
          <CardPlayer cards={dummyCards} backHref="/" />
        </PreferencesProvider>
      );

      // Kartu 1 ("Budi membaca buku di perpustakaan") tidak memuat huruf dari kartu 2 ('z', 'w')
      expect(loadedSrcs).not.toContain("/signs/sibi/z.webp");
      expect(loadedSrcs).not.toContain("/signs/sibi/w.webp");
      expect(loadedSrcs.sort()).toEqual([
        "/signs/sibi/a.webp",
        "/signs/sibi/b.webp",
        "/signs/sibi/c.webp",
        "/signs/sibi/d.webp",
        "/signs/sibi/e.webp",
        "/signs/sibi/i.webp",
        "/signs/sibi/k.webp",
        "/signs/sibi/m.webp",
        "/signs/sibi/n.webp",
        "/signs/sibi/p.webp",
        "/signs/sibi/r.webp",
        "/signs/sibi/s.webp",
        "/signs/sibi/t.webp",
        "/signs/sibi/u.webp",
      ]);
    } finally {
      window.Image = OriginalImage;
    }
  });
});
