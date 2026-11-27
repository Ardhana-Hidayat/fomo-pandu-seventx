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

  it("mengubah tombol Lanjut di bar bawah menjadi Kerjakan Kuis pada kartu terakhir saat quizHref tersedia tanpa banner di dalam kartu", () => {
    const { container } = render(
      <PreferencesProvider>
        <CardPlayer cards={dummyCards} quizHref="/kelas/123456/kuis/l-1" backHref="/" />
      </PreferencesProvider>
    );

    // Kartu 1: tombol kanan bawah adalah Lanjut
    expect(screen.getByRole("button", { name: /Lanjut/i })).toBeDefined();
    expect(screen.queryByRole("link", { name: /Kerjakan Kuis/i })).toBeNull();

    // Pindah ke kartu terakhir (Kartu 2)
    fireEvent.click(screen.getByRole("button", { name: /Lanjut/i }));
    expect(screen.getByText(/Kartu 2 dari 2/i)).toBeDefined();

    // Tombol Lanjut di footer berubah menjadi Kerjakan Kuis (di luar kartu)
    expect(screen.queryByRole("button", { name: /^Lanjut$/i })).toBeNull();
    const quizLink = screen.getByRole("link", { name: /Kerjakan Kuis/i });
    expect(quizLink.getAttribute("href")).toBe("/kelas/123456/kuis/l-1");
    expect(container.querySelector("footer")?.contains(quizLink)).toBe(true);
    expect(container.querySelector("main")?.contains(quizLink)).toBe(false);
    expect(screen.queryByText(/Materi selesai! Mau lanjut latihan kuis\?/i)).toBeNull();
  });

  it("mendukung callback onStartQuiz pada tombol Kerjakan Kuis di kartu terakhir", () => {
    const onStartQuiz = vi.fn();
    render(
      <PreferencesProvider>
        <CardPlayer cards={dummyCards} onStartQuiz={onStartQuiz} backHref="/" />
      </PreferencesProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: /Lanjut/i }));
    const quizBtn = screen.getByRole("button", { name: /Kerjakan Kuis/i });
    fireEvent.click(quizBtn);
    expect(onStartQuiz).toHaveBeenCalledTimes(1);
  });

  it("menampilkan tombol Selesai di bar bawah pada kartu terakhir jika quizHref dan onStartQuiz tidak tersedia", () => {
    render(
      <PreferencesProvider>
        <CardPlayer cards={dummyCards} backHref="/" />
      </PreferencesProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: /Lanjut/i }));
    const doneLink = screen.getByRole("link", { name: /Selesai/i });
    expect(doneLink.getAttribute("href")).toBe("/");
  });

  it("memanggil onExit saat tombol Selesai diklik jika onExit tersedia dan tanpa kuis", () => {
    const onExit = vi.fn();
    render(
      <PreferencesProvider>
        <CardPlayer cards={[dummyCards[0]!]} onExit={onExit} />
      </PreferencesProvider>
    );
    const doneBtn = screen.getByRole("button", { name: /Selesai/i });
    fireEvent.click(doneBtn);
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it("tidak merender gambar maupun placeholder Icon Image saat imageUrl null meski imageAlt terisi", () => {
    const cardWithAltOnly = [
      {
        ...dummyCards[0]!,
        id: "c-no-url",
        text: "Kucing tidur di teras",
        imageUrl: null,
        imageSource: "none" as const,
        imageAlt: "Ilustrasi yang seharusnya tidak muncul",
        keyTerms: ["kucing"],
      },
    ];

    const { container } = render(
      <PreferencesProvider>
        <CardPlayer cards={cardWithAltOnly} backHref="/" />
      </PreferencesProvider>
    );

    const cardImgs = Array.from(container.querySelectorAll("main img")).filter(
      (img) => !img.getAttribute("src")?.startsWith("/signs/")
    );
    expect(cardImgs).toHaveLength(0);
    expect(screen.queryByAltText("Ilustrasi yang seharusnya tidak muncul")).toBeNull();
    expect(screen.queryByText("Ilustrasi yang seharusnya tidak muncul")).toBeNull();
    expect(screen.getByAltText("Isyarat huruf K dalam SIBI")).toBeDefined();
  });

  it("menyembunyikan gambar yang gagal dimuat tanpa menampilkan ikon rusak atau placeholder", () => {
    const { container } = render(
      <PreferencesProvider>
        <CardPlayer cards={[dummyCards[0]!]} backHref="/" />
      </PreferencesProvider>
    );

    const img = screen.getByAltText("Budi membaca buku");
    fireEvent.error(img);

    const cardImgs = Array.from(container.querySelectorAll("main img")).filter(
      (el) => !el.getAttribute("src")?.startsWith("/signs/")
    );
    expect(cardImgs).toHaveLength(0);
    expect(screen.queryByText("Budi membaca buku")).toBeNull();
  });
});
