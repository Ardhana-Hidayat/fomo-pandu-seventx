import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PreferencesProvider } from "@/shared/ui";
import { TVPlayer, TVQuiz } from "@/features/presentation";
import type { LessonWithContent } from "@/server/repos/lessons";
import type { QuizQuestion } from "@/server/db/schema";

const mockLesson: LessonWithContent = {
  id: "lesson-1",
  teacherId: "teacher-1",
  title: "Membaca Bersama",
  topic: "Literasi",
  level: "sdlb",
  slug: "membaca-bersama",
  sourceType: "topik",
  sourceTextHash: null,
  sourceAssetId: null,
  generatedBy: "manual",
  status: "published",
  exerciseType: "both",
  optionCount: 3,
  showTextHint: true,
  signSystem: "SIBI",
  signScope: "all_words",
  signSpeed: 1,
  voiceKey: "A",
  voiceSpeed: 1,
  audioVersion: 0,
  settings: null,
  options: null,
  createdAt: new Date(),
  cards: [
    {
      id: "tv-c1",
      lessonId: "lesson-1",
      position: 1,
      text: "Buka buku dan baca buku",
      keyTerms: [],
      cardType: "instruction",
      imageSource: "pictogram",
      audioSource: "none",
      signOverride: null,
      voiceOverride: null,
      imageAssetId: null,
      imageAlt: "Buku terbuka",
      imageUrl: "https://example.com/book.png",
      audioAssetId: null,
      audioUrl: null,
      audioRef: null,
      createdAt: new Date(),
    },
    {
      id: "tv-c2",
      lessonId: "lesson-1",
      position: 2,
      text: "Lihat kupu-kupu terbang!",
      keyTerms: ["kupu-kupu"],
      cardType: "instruction",
      imageSource: "none",
      audioSource: "none",
      signOverride: null,
      voiceOverride: null,
      imageAssetId: null,
      imageAlt: null,
      imageUrl: null,
      audioAssetId: null,
      audioUrl: null,
      audioRef: null,
      createdAt: new Date(),
    },
  ],
  questions: [],
};

const mockQuestions: QuizQuestion[] = [
  {
    id: "q-1",
    lessonId: "lesson-1",
    position: 1,
    type: "pilihan_ganda",
    prompt: "Apa yang kita baca?",
    keyTerms: ["buku"],
    signOverride: null,
    payload: {
      options: [
        { id: "o1", text: "Buku", correct: true },
        { id: "o2", text: "Batu", correct: false },
      ],
    },
    linkedCardId: null,
    explanation: null,
    createdAt: new Date(),
  },
  {
    id: "q-2",
    lessonId: "lesson-1",
    position: 2,
    type: "benar_salah",
    prompt: "Membaca buku membuat kita pintar.",
    keyTerms: [],
    signOverride: null,
    payload: {
      answer: true,
    },
    linkedCardId: null,
    explanation: null,
    createdAt: new Date(),
  },
];

describe("TVPlayer & TVQuiz", () => {
  it("merender seluruh kata kalimat termasuk kata berulang secara berurutan tanpa label Kelas", () => {
    const { container } = render(
      <PreferencesProvider>
        <TVPlayer
          lesson={mockLesson}
          backHref="/tv/123456"
          quizHref="/tv/123456/lesson-1/kuis"
        />
      </PreferencesProvider>
    );

    expect(screen.getByText("Kartu 1 dari 2")).toBeDefined();
    const wordSpans = Array.from(container.querySelectorAll("span.kata"));
    expect(wordSpans.map((el) => el.textContent)).toEqual([
      "Buka",
      "buku",
      "dan",
      "baca",
      "buku",
    ]);

    // Gambar peraga dan kartu SIBI tetap tampil meski keyTerms kosong
    expect(screen.getByAltText("Buku terbuka")).toBeDefined();
    expect(screen.getByAltText("Isyarat huruf B dalam SIBI")).toBeDefined();

    // Tidak ada kebocoran kata "Kelas"
    expect(container.textContent).not.toMatch(/\bkelas\b/i);

    // Pindah ke kartu terakhir menampilkan semua kata kartu 2 & tombol Kerjakan Kuis di footer
    fireEvent.click(screen.getByRole("button", { name: /Lanjut/i }));
    expect(screen.getByText("Kartu 2 dari 2")).toBeDefined();
    const card2Spans = Array.from(container.querySelectorAll("span.kata"));
    expect(card2Spans.map((el) => el.textContent)).toEqual([
      "Lihat",
      "kupu-kupu",
      "terbang!",
    ]);
    const quizLink = screen.getByRole("link", { name: /Kerjakan Kuis/i });
    expect(quizLink.getAttribute("href")).toBe("/tv/123456/lesson-1/kuis");
    expect(container.querySelector("footer")?.contains(quizLink)).toBe(true);
    expect(container.querySelector("main")?.contains(quizLink)).toBe(false);
  });

  it("beralih mulus ke TVQuiz inline saat Kerjakan Kuis diklik jika soal tersedia dan dapat kembali ke materi", () => {
    const { container } = render(
      <PreferencesProvider>
        <TVPlayer
          lesson={mockLesson}
          questions={mockQuestions}
          backHref="/guru/materi/lesson-1/edit"
        />
      </PreferencesProvider>
    );

    // Kartu 1 -> Lanjut ke Kartu 2
    fireEvent.click(screen.getByRole("button", { name: /Lanjut/i }));
    expect(screen.getByText("Kartu 2 dari 2")).toBeDefined();

    // Klik Kerjakan Kuis di bar bawah
    const quizButton = screen.getByRole("button", { name: /Kerjakan Kuis/i });
    expect(container.querySelector("footer")?.contains(quizButton)).toBe(true);
    fireEvent.click(quizButton);

    // Masuk ke tampilan TVQuiz
    expect(screen.getByText("Soal 1 dari 2")).toBeDefined();
    expect(screen.getByText("Apa yang kita baca?")).toBeDefined();

    // Klik Lihat Materi kembali ke kartu materi
    fireEvent.click(screen.getByRole("button", { name: /Lihat Materi/i }));
    expect(screen.getByText("Kartu 2 dari 2")).toBeDefined();
  });

  it("menampilkan layar Yey! Selesai! pada kartu terakhir TVPlayer jika tidak ada soal kuis maupun quizHref", () => {
    render(
      <PreferencesProvider>
        <TVPlayer lesson={mockLesson} backHref="/guru/materi/lesson-1/edit" />
      </PreferencesProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: /Lanjut/i }));
    fireEvent.click(screen.getByRole("button", { name: /Selesai/i }));
    expect(screen.getByText(/Yey! Selesai!/i)).toBeDefined();
    const exitLinks = screen.getAllByRole("link", { name: /Keluar TV/i });
    expect(exitLinks[0]?.getAttribute("href")).toBe("/guru/materi/lesson-1/edit");
  });

  it("TVQuiz menangani soal kosong dengan tombol kembali yang bersih", () => {
    render(
      <PreferencesProvider>
        <TVQuiz lessonTitle="Membaca" questions={[]} backHref="/tv/123456" />
      </PreferencesProvider>
    );

    expect(screen.getByText(/Belum ada soal kuis TV/i)).toBeDefined();
    expect(screen.getByRole("link", { name: /Kembali ke Daftar Materi/i }).getAttribute("href")).toBe(
      "/tv/123456"
    );
  });

  it("TVQuiz mendukung pilihan ganda dan benar/salah serta menampilkan kunci jawaban", () => {
    const { container } = render(
      <PreferencesProvider>
        <TVQuiz
          lessonTitle="Membaca"
          questions={mockQuestions}
          backHref="/tv/123456"
          materialHref="/tv/123456/lesson-1"
        />
      </PreferencesProvider>
    );

    expect(screen.getByText("Soal 1 dari 2")).toBeDefined();
    const bukuButton = screen.getByRole("button", { name: /Buku/i });
    const batuButton = screen.getByRole("button", { name: /Batu/i });
    expect(bukuButton).toBeDefined();
    expect(batuButton).toBeDefined();
    expect(screen.getByRole("link", { name: /Lihat Materi/i }).getAttribute("href")).toBe(
      "/tv/123456/lesson-1"
    );

    // Siswa/guru dapat mengklik opsi salah lalu opsi benar seperti di ruang siswa
    fireEvent.click(batuButton);
    expect(screen.getByText(/Belum tepat/i)).toBeDefined();
    fireEvent.click(bukuButton);
    expect(screen.getByText(/Bagus! Jawaban tepat/i)).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: /Tampilkan Kunci Jawaban/i }));
    expect(screen.getByRole("button", { name: /Sembunyikan Kunci/i })).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: /Berikutnya/i }));
    expect(screen.getByText("Soal 2 dari 2")).toBeDefined();
    const benarButton = screen.getByRole("button", { name: /Benar/i });
    const salahButton = screen.getByRole("button", { name: /Salah/i });
    expect(benarButton).toBeDefined();
    expect(salahButton).toBeDefined();
    fireEvent.click(benarButton);
    expect(screen.getByText(/Bagus! Jawaban tepat/i)).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: /Selesai/i }));
    expect(screen.getByText(/Yey! Selesai!/i)).toBeDefined();
    expect(screen.getByRole("link", { name: /Keluar TV/i }).getAttribute("href")).toBe("/tv/123456");
    expect(container.textContent).not.toMatch(/\bkelas\b/i);
  });
});
