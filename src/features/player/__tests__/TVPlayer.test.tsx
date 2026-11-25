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

    // Pindah ke kartu terakhir menampilkan semua kata kartu 2 & CTA Kuis TV
    fireEvent.click(screen.getByRole("button", { name: /Lanjut/i }));
    expect(screen.getByText("Kartu 2 dari 2")).toBeDefined();
    const card2Spans = Array.from(container.querySelectorAll("span.kata"));
    expect(card2Spans.map((el) => el.textContent)).toEqual([
      "Lihat",
      "kupu-kupu",
      "terbang!",
    ]);
    expect(screen.getByRole("link", { name: /Mulai Kuis TV/i })).toBeDefined();
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
        />
      </PreferencesProvider>
    );

    expect(screen.getByText("Soal 1 dari 2")).toBeDefined();
    expect(screen.getByText("Buku")).toBeDefined();
    expect(screen.getByText("Batu")).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: /Tampilkan Kunci Jawaban/i }));
    expect(screen.getByRole("button", { name: /Sembunyikan Kunci/i })).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: /Berikutnya/i }));
    expect(screen.getByText("Soal 2 dari 2")).toBeDefined();
    expect(screen.getByText("Benar")).toBeDefined();
    expect(screen.getByText("Salah")).toBeDefined();
    expect(container.textContent).not.toMatch(/\bkelas\b/i);
  });
});
