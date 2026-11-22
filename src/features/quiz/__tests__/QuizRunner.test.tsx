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
});
