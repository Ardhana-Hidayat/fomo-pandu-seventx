import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PreferencesProvider } from "@/shared/ui";
import { QuizRunner } from "../components/QuizRunner";

describe("QuizRunner Component", () => {
  const dummyQuestions = [
    {
      id: "q-1",
      lessonId: "l-1",
      position: 1,
      type: "pilih_kata",
      prompt: "Budi membaca apa di perpustakaan?",
      payload: {
        options: [
          { id: "opt-1", text: "Buku", correct: true },
          { id: "opt-2", text: "Sepatu", correct: false },
          { id: "opt-3", text: "Piring", correct: false },
        ],
        showTextHint: true,
        hint: "Benda yang memiliki halaman untuk dibaca.",
      },
      linkedCardId: null,
      explanation: null,
      keyTerms: [],
      signOverride: null,
      createdAt: new Date(),
    },
    {
      id: "q-2",
      lessonId: "l-1",
      position: 2,
      type: "benar_salah",
      prompt: "Budi membaca buku di perpustakaan.",
      payload: {
        answer: true,
      },
      linkedCardId: null,
      explanation: null,
      keyTerms: [],
      signOverride: null,
      createdAt: new Date(),
    },
  ];

  it("merender pertanyaan kuis dan 3 opsi jawaban", () => {
    render(
      <PreferencesProvider>
        <QuizRunner
          lessonTitle="Membaca Buku"
          questions={dummyQuestions}
          classroomHref="/kelas/123456"
        />
      </PreferencesProvider>
    );

    expect(screen.getByText(/Budi membaca apa di perpustakaan\?/i)).toBeDefined();
    expect(screen.getByText("Buku")).toBeDefined();
    expect(screen.getByText("Sepatu")).toBeDefined();
    expect(screen.getByText("Piring")).toBeDefined();
  });

  it("menampilkan umpan balik Benar saat opsi yang tepat dipilih", () => {
    render(
      <PreferencesProvider>
        <QuizRunner
          lessonTitle="Membaca Buku"
          questions={dummyQuestions}
          classroomHref="/kelas/123456"
        />
      </PreferencesProvider>
    );

    const correctButton = screen.getByText("Buku");
    fireEvent.click(correctButton);

    expect(screen.getByText(/Tepat! Jawabanmu benar/i)).toBeDefined();
  });

  it("menampilkan tombol petunjuk dan membuka teks petunjuk saat diklik", () => {
    render(
      <PreferencesProvider>
        <QuizRunner
          lessonTitle="Membaca Buku"
          questions={dummyQuestions}
          classroomHref="/kelas/123456"
        />
      </PreferencesProvider>
    );

    const hintButton = screen.getByText(/Lihat petunjuk/i);
    expect(hintButton).toBeDefined();

    fireEvent.click(hintButton);
    expect(
      screen.getByText("Benda yang memiliki halaman untuk dibaca.")
    ).toBeDefined();
  });

  it("mendukung opsi jawaban dalam bentuk array string (seperti demo data) tanpa kosong", () => {
    const stringOptionQuestions = [
      {
        id: "q-demo-1",
        lessonId: "l-demo",
        position: 1,
        type: "choice_word",
        prompt: "Benda apa yang digunakan untuk membersihkan kuman di tangan?",
        payload: {
          options: ["Sabun", "Minyak", "Pasir"],
          answer: "Sabun",
        },
        linkedCardId: null,
        explanation: null,
        keyTerms: [] as string[],
        signOverride: null,
        createdAt: new Date(),
      },
    ];

    render(
      <PreferencesProvider>
        <QuizRunner
          lessonTitle="Mencuci Tangan"
          questions={stringOptionQuestions}
          classroomHref="/kelas/123456"
        />
      </PreferencesProvider>
    );

    // Pastikan teks opsi TIDAK KOSONG dan terlihat jelas
    expect(screen.getByText("Sabun")).toBeDefined();
    expect(screen.getByText("Minyak")).toBeDefined();
    expect(screen.getByText("Pasir")).toBeDefined();

    // Klik opsi yang benar ("Sabun")
    fireEvent.click(screen.getByText("Sabun"));
    expect(screen.getByText(/Tepat! Jawabanmu benar/i)).toBeDefined();
  });

  it("mengarahkan tombol Keluar dan Kembali ke Beranda ke / serta mendukung tombol Ulangi saat selesai", () => {
    render(
      <PreferencesProvider>
        <QuizRunner
          lessonTitle="Membaca Buku"
          questions={dummyQuestions}
          backHref="/"
        />
      </PreferencesProvider>
    );

    const exitLink = screen.getByRole("link", { name: /Keluar dari kuis/i });
    expect(exitLink.getAttribute("href")).toBe("/");

    // Jawab soal 1
    fireEvent.click(screen.getByText("Buku"));
    fireEvent.click(screen.getByRole("button", { name: /Soal Berikutnya/i }));

    // Jawab soal 2
    fireEvent.click(screen.getByText("Benar"));
    fireEvent.click(screen.getByRole("button", { name: /Lihat Hasil/i }));

    expect(screen.getByText("Latihan Selesai!")).toBeDefined();
    expect(screen.queryByText(/Kembali ke Kelas/i)).toBeNull();

    const homeLink = screen.getByRole("link", { name: /Kembali ke Beranda/i });
    expect(homeLink.getAttribute("href")).toBe("/");

    // Klik Ulangi kembali ke soal pertama
    fireEvent.click(screen.getByRole("button", { name: /Ulangi/i }));
    expect(screen.getByText(/Budi membaca apa di perpustakaan\?/i)).toBeDefined();
  });

  it("menampilkan tombol Kembali ke Beranda menuju / saat soal kosong", () => {
    render(
      <PreferencesProvider>
        <QuizRunner
          lessonTitle="Kosong"
          questions={[]}
          backHref="/"
        />
      </PreferencesProvider>
    );

    const homeLink = screen.getByRole("link", { name: /Kembali ke Beranda/i });
    expect(homeLink.getAttribute("href")).toBe("/");
    expect(screen.queryByText(/Kembali ke Kelas/i)).toBeNull();
  });

  it("mendukung soal susun urutan (arrange_steps) secara interaktif", () => {
    const orderQuestions = [
      {
        id: "q-order-1",
        lessonId: "l-order",
        position: 1,
        type: "arrange_steps",
        prompt: "Susun langkah mencuci tangan.",
        payload: {
          steps: [
            { id: "s1", text: "Basahi tangan dengan air" },
            { id: "s2", text: "Gosok tangan dengan sabun" },
            { id: "s3", text: "Bilas tangan sampai bersih" },
          ],
        },
        linkedCardId: null,
        explanation: null,
        keyTerms: [] as string[],
        signOverride: null,
        createdAt: new Date(),
      },
    ];

    render(
      <PreferencesProvider>
        <QuizRunner
          lessonTitle="Cuci Tangan"
          questions={orderQuestions}
          backHref="/"
        />
      </PreferencesProvider>
    );

    // Awalnya urutan diacak (s2, s3, s1), klik Periksa Urutan harus memberi umpan balik Coba lagi
    fireEvent.click(screen.getByRole("button", { name: /Periksa Urutan/i }));
    expect(screen.getByText(/Coba lagi/i)).toBeDefined();

    // Pindahkan "Basahi tangan dengan air" (di posisi 3) naik dua kali ke posisi 1
    fireEvent.click(screen.getByRole("button", { name: /Naikkan langkah 3/i }));
    fireEvent.click(screen.getByRole("button", { name: /Naikkan langkah 2/i }));

    fireEvent.click(screen.getByRole("button", { name: /Periksa Urutan/i }));
    expect(screen.getByText(/Tepat! Jawabanmu benar/i)).toBeDefined();
  });

  it("mendukung soal match, pilih_gambar, dan choice_sign yang dapat diklik", () => {
    const multiTypeQuestions = [
      {
        id: "q-match-1",
        lessonId: "l-multi",
        position: 1,
        type: "match",
        prompt: "Mana alat untuk menulis?",
        payload: {
          options: [
            { id: "m1", text: "Pensil", correct: true },
            { id: "m2", text: "Piring", correct: false },
          ],
        },
        linkedCardId: null,
        explanation: null,
        keyTerms: [] as string[],
        signOverride: null,
        createdAt: new Date(),
      },
      {
        id: "q-sign-1",
        lessonId: "l-multi",
        position: 2,
        type: "choice_sign",
        prompt: "Kata apa yang dieja isyarat ini?",
        payload: {
          signWord: "BUKU",
          options: [
            { id: "sg1", text: "Buku", correct: true },
            { id: "sg2", text: "Meja", correct: false },
          ],
        },
        linkedCardId: null,
        explanation: null,
        keyTerms: ["buku"],
        signOverride: null,
        createdAt: new Date(),
      },
    ];

    render(
      <PreferencesProvider>
        <QuizRunner
          lessonTitle="Benda Kelas"
          questions={multiTypeQuestions}
          backHref="/"
        />
      </PreferencesProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: "Piring" }));
    expect(screen.getByText(/Coba lagi/i)).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Pensil" }));
    expect(screen.getByText(/Tepat! Jawabanmu benar/i)).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: /Soal Berikutnya/i }));
    expect(screen.getByText(/Kata apa yang dieja isyarat ini\?/i)).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Buku" }));
    expect(screen.getByText(/Tepat! Jawabanmu benar/i)).toBeDefined();
  });

  it("aturan timbal-balik: jika soal memiliki gambar (promptImageUrl), opsi jawaban WAJIB hanya teks saja", () => {
    const imagePromptQuestions = [
      {
        id: "q-img-prompt",
        lessonId: "l-rule",
        position: 1,
        type: "pilih_kata",
        prompt: "Hewan apa pada gambar ini?",
        payload: {
          promptImageUrl: "/media/pictograms/kucing.webp",
          options: [
            {
              id: "opt-1",
              text: "Kucing",
              imageUrl: "/media/pictograms/kucing.webp",
              correct: true,
            },
            {
              id: "opt-2",
              text: "Ikan",
              imageUrl: "/media/pictograms/ikan.webp",
              correct: false,
            },
          ],
        },
        linkedCardId: null,
        explanation: null,
        keyTerms: [] as string[],
        signOverride: null,
        createdAt: new Date(),
      },
    ];

    const { container } = render(
      <PreferencesProvider>
        <QuizRunner
          lessonTitle="Hewan"
          questions={imagePromptQuestions}
          backHref="/"
        />
      </PreferencesProvider>
    );

    // Gambar soal tampil
    const imgs = Array.from(container.querySelectorAll("img"));
    expect(imgs).toHaveLength(1);
    expect(imgs[0]?.getAttribute("src")).toBe("/media/pictograms/kucing.webp");
    expect(imgs[0]?.getAttribute("alt")).toBe("Hewan apa pada gambar ini?");

    // Opsi tetap tampil teks saja tanpa gambar opsi
    expect(screen.getByRole("button", { name: "Kucing" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Ikan" })).toBeDefined();
    expect(screen.queryByAltText("Kucing")).toBeNull();
    expect(screen.queryByAltText("Ikan")).toBeNull();
  });

  it("aturan timbal-balik: pada pilih_gambar dengan gambar opsi, soal WAJIB hanya teks saja meski promptImageUrl tersimpan di DB", () => {
    const imageOptionsQuestions = [
      {
        id: "q-img-opts",
        lessonId: "l-rule",
        position: 1,
        type: "pilih_gambar",
        prompt: 'Mana gambar yang menunjukkan "kucing"?',
        payload: {
          promptImageUrl: "/media/pictograms/kucing.webp",
          imageUrl: "/media/pictograms/kucing.webp",
          options: [
            {
              id: "opt-1",
              text: "kucing",
              imageUrl: "/media/pictograms/kucing.webp",
              correct: true,
            },
            {
              id: "opt-2",
              text: "burung",
              imageUrl: "/media/pictograms/burung.webp",
              correct: false,
            },
          ],
        },
        linkedCardId: null,
        explanation: null,
        keyTerms: [] as string[],
        signOverride: null,
        createdAt: new Date(),
      },
    ];

    render(
      <PreferencesProvider>
        <QuizRunner
          lessonTitle="Hewan"
          questions={imageOptionsQuestions}
          backHref="/"
        />
      </PreferencesProvider>
    );

    // Gambar prompt tidak boleh tampil
    expect(
      screen.queryByAltText('Mana gambar yang menunjukkan "kucing"?')
    ).toBeNull();

    // Gambar opsi tampil dengan label bahasa Indonesia
    expect(screen.getByAltText("kucing")).toBeDefined();
    expect(screen.getByAltText("burung")).toBeDefined();
    expect(screen.getByText("kucing")).toBeDefined();
    expect(screen.getByText("burung")).toBeDefined();
  });

  it("menyembunyikan gambar opsi yang gagal dimuat tanpa menampilkan ikon rusak dan tetap menampilkan teks opsi", () => {
    const brokenImageQuestions = [
      {
        id: "q-broken-opt",
        lessonId: "l-broken",
        position: 1,
        type: "pilih_gambar",
        prompt: "Mana gambar apel?",
        payload: {
          options: [
            {
              id: "opt-1",
              text: "apel",
              imageUrl: "/media/pictograms/tidak-ada.webp",
              correct: true,
            },
            {
              id: "opt-2",
              text: "jeruk",
              imageUrl: "/media/pictograms/jeruk.webp",
              correct: false,
            },
          ],
        },
        linkedCardId: null,
        explanation: null,
        keyTerms: [] as string[],
        signOverride: null,
        createdAt: new Date(),
      },
    ];

    render(
      <PreferencesProvider>
        <QuizRunner
          lessonTitle="Buah"
          questions={brokenImageQuestions}
          backHref="/"
        />
      </PreferencesProvider>
    );

    const brokenImg = screen.getByAltText("apel");
    fireEvent.error(brokenImg);

    // Gambar rusak disembunyikan, label teks opsi tetap tampil & dapat diklik
    expect(screen.queryByAltText("apel")).toBeNull();
    expect(screen.getByAltText("jeruk")).toBeDefined();
    const apelBtn = screen.getByRole("button", { name: "apel" });
    fireEvent.click(apelBtn);
    expect(screen.getByText(/Tepat! Jawabanmu benar/i)).toBeDefined();
  });

  it("aturan timbal-balik pada arrange_steps: jika prompt bergambar, langkah dirender teks saja", () => {
    const orderWithPromptImg = [
      {
        id: "q-order-img",
        lessonId: "l-order",
        position: 1,
        type: "arrange_steps",
        prompt: "Susun langkah mencuci tangan.",
        payload: {
          promptImageUrl: "/media/pictograms/cuci-tangan.webp",
          steps: [
            {
              id: "s1",
              text: "Basahi tangan",
              imageUrl: "/media/pictograms/air.webp",
            },
            {
              id: "s2",
              text: "Gosok dengan sabun",
              imageUrl: "/media/pictograms/sabun.webp",
            },
          ],
        },
        linkedCardId: null,
        explanation: null,
        keyTerms: [] as string[],
        signOverride: null,
        createdAt: new Date(),
      },
    ];

    const { container } = render(
      <PreferencesProvider>
        <QuizRunner
          lessonTitle="Cuci Tangan"
          questions={orderWithPromptImg}
          backHref="/"
        />
      </PreferencesProvider>
    );

    const imgs = Array.from(container.querySelectorAll("img"));
    expect(imgs).toHaveLength(1);
    expect(imgs[0]?.getAttribute("src")).toBe("/media/pictograms/cuci-tangan.webp");
    expect(screen.getByText("Basahi tangan")).toBeDefined();
    expect(screen.getByText("Gosok dengan sabun")).toBeDefined();
  });
});
