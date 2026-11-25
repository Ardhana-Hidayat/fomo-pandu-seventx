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
});
