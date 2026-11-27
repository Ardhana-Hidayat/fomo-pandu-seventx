import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PrintPageClient } from "../components/PrintPageClient";
import type { LessonWithContent } from "@/server/repos/lessons";
import type { QuizQuestion } from "@/server/db/schema";

describe("PrintPageClient Component", () => {
  const dummyQuestions: QuizQuestion[] = [
    {
      id: "q-1",
      lessonId: "l-1",
      position: 1,
      type: "pilihan_ganda",
      prompt: "Manakah gambar wortel yang sehat?",
      keyTerms: ["wortel"],
      signOverride: null,
      linkedCardId: "c-1",
      explanation: null,
      createdAt: new Date(),
      payload: {
        options: [
          {
            id: "opt-a",
            text: "Wortel Segar",
            imageUrl: "/media/pictograms/wortel.webp",
            correct: true,
          },
          {
            id: "opt-b",
            text: "Batu Kerikil",
            correct: false,
          },
          {
            id: "opt-c",
            text: "Kertas Bekas",
            correct: false,
          },
        ],
      },
    },
    {
      id: "q-2",
      lessonId: "l-1",
      position: 2,
      type: "benar_salah",
      prompt: "Wortel adalah sayuran berwarna oranye.",
      keyTerms: [],
      signOverride: null,
      linkedCardId: null,
      explanation: null,
      createdAt: new Date(),
      payload: {
        answer: true,
      },
    },
    {
      id: "q-3",
      lessonId: "l-1",
      position: 3,
      type: "arrange_steps",
      prompt: "Urutkan langkah mencuci sayuran.",
      keyTerms: [],
      signOverride: null,
      linkedCardId: null,
      explanation: null,
      createdAt: new Date(),
      payload: {
        steps: [
          { id: "s-1", text: "Ambil sayuran segar" },
          { id: "s-2", text: "Bilas dengan air mengalir" },
          { id: "s-3", text: "Tiriskan di wadah bersih" },
        ],
      },
    },
    {
      id: "q-4",
      lessonId: "l-1",
      position: 4,
      type: "matching",
      prompt: "Pasangkan warna dengan sayuran yang tepat.",
      keyTerms: [],
      signOverride: null,
      linkedCardId: null,
      explanation: null,
      createdAt: new Date(),
      payload: {
        pairs: [
          { id: "p-1", left: "Oranye", right: "Wortel" },
          { id: "p-2", left: "Hijau", right: "Bayam" },
        ],
      },
    },
    {
      id: "q-5",
      lessonId: "l-1",
      position: 5,
      type: "cocokkan_isyarat",
      prompt: "Kata apa yang ditunjukkan isyarat SIBI berikut?",
      keyTerms: ["AIR"],
      signOverride: null,
      linkedCardId: null,
      explanation: null,
      createdAt: new Date(),
      payload: {
        signWord: "AIR",
        options: ["Air", "Api", "Tanah"],
        answer: "Air",
      },
    },
  ];

  const dummyLesson: LessonWithContent = {
    id: "l-1",
    teacherId: "t-1",
    title: "Belajar Sayuran",
    topic: "Sayuran",
    level: "sdlb",
    slug: null,
    sourceType: "topik",
    sourceTextHash: null,
    sourceAssetId: null,
    generatedBy: "manual",
    status: "published",
    exerciseType: "both",
    optionCount: 3,
    showTextHint: true,
    signSystem: "SIBI" as const,
    signScope: "key_terms" as const,
    signSpeed: 1,
    voiceKey: "kore_id",
    voiceSpeed: 1,
    audioVersion: 1,
    settings: null,
    options: null,
    createdAt: new Date(),
    cards: [
      {
        id: "c-1",
        lessonId: "l-1",
        position: 1,
        text: "Wortel berwarna oranye",
        cardType: "instruction",
        imageSource: "pictogram",
        audioSource: "none",
        imageAssetId: null,
        imageAlt: "Foto wortel segar",
        audioAssetId: null,
        imageUrl: "/media/pictograms/wortel.webp",
        audioRef: null,
        audioUrl: null,
        keyTerms: ["wortel"],
        signOverride: null,
        voiceOverride: null,
        createdAt: new Date(),
      },
    ],
    questions: dummyQuestions,
    publications: [
      {
        id: "pub-1",
        lessonId: "l-1",
        classroomId: "cls-1",
        shareCode: "100101",
        visible: true,
        publishedAt: new Date(),
        createdAt: new Date(),
      },
    ],
  };

  it("merender header PanduIn, kotak Identitas Siswa, kartu materi, dan metadata jumlah kartu & kuis", () => {
    render(
      <PrintPageClient
        lesson={dummyLesson}
        questions={dummyQuestions}
        shareUrl="http://localhost:3000/m/100101"
        shareCode="100101"
      />
    );

    // Header PanduIn & metadata
    expect(screen.getAllByText("PanduIn").length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByRole("heading", { name: "Belajar Sayuran" })
    ).toBeDefined();
    expect(screen.getByText(/1 Kartu Materi/i)).toBeDefined();
    expect(screen.getByText(/5 Soal Kuis/i)).toBeDefined();
    expect(screen.getByText("100101")).toBeDefined();

    // Form Identitas Siswa
    expect(screen.getByText("Identitas Siswa")).toBeDefined();
    expect(screen.getByText("Nama Siswa")).toBeDefined();
    expect(screen.getByText("Tanggal")).toBeDefined();
    expect(screen.getByText("Catatan / Nilai")).toBeDefined();

    // Kartu Materi & Isyarat SIBI
    expect(screen.getByText(/Bagian 1: Kartu Belajar/i)).toBeDefined();
    expect(screen.getByText("Wortel berwarna oranye")).toBeDefined();
    expect(screen.getByAltText("Foto wortel segar")).toBeDefined();
    expect(screen.getByText(/Isyarat SIBI: WORTEL/i)).toBeDefined();
    expect(screen.getByAltText("Isyarat SIBI huruf W")).toBeDefined();
    expect(
      screen.getAllByText(/Gunting mengikuti garis putus-putus/i).length
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByRole("button", { name: /Cetak Sekarang \(A4 Potrait\)/i })
    ).toBeDefined();
  });

  it("merender Lembar Kuis Siswa untuk pilihan ganda (A/B/C), benar/salah, urutan, pasangkan, dan isyarat", () => {
    render(
      <PrintPageClient
        lesson={dummyLesson}
        questions={dummyQuestions}
        shareUrl="http://localhost:3000/m/100101"
        shareCode="100101"
      />
    );

    expect(screen.getByText(/Bagian 2: Lembar Kuis Siswa/i)).toBeDefined();

    // Pilihan ganda + thumbnail
    expect(screen.getByText("Manakah gambar wortel yang sehat?")).toBeDefined();
    expect(screen.getByText("Wortel Segar")).toBeDefined();
    expect(screen.getByAltText("Wortel Segar")).toBeDefined();
    expect(screen.getByText("Batu Kerikil")).toBeDefined();
    expect(screen.getByText("Kertas Bekas")).toBeDefined();
    expect(screen.getAllByText("A").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("B").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("C").length).toBeGreaterThanOrEqual(1);

    // Benar / Salah
    expect(screen.getByText("Wortel adalah sayuran berwarna oranye.")).toBeDefined();
    expect(screen.getByText("Benar")).toBeDefined();
    expect(screen.getByText("Salah")).toBeDefined();

    // Urutkan langkah
    expect(screen.getByText("Urutkan langkah mencuci sayuran.")).toBeDefined();
    expect(screen.getByText("Ambil sayuran segar")).toBeDefined();
    expect(screen.getByText("Bilas dengan air mengalir")).toBeDefined();
    expect(screen.getByText("Tiriskan di wadah bersih")).toBeDefined();

    // Pasangkan (Matching)
    expect(screen.getByText("Pasangkan warna dengan sayuran yang tepat.")).toBeDefined();
    expect(screen.getByText(/Oranye/)).toBeDefined();
    expect(screen.getByText("Wortel")).toBeDefined();
    expect(screen.getByText(/Hijau/)).toBeDefined();
    expect(screen.getByText("Bayam")).toBeDefined();

    // Cocokkan Isyarat
    expect(
      screen.getByText("Kata apa yang ditunjukkan isyarat SIBI berikut?")
    ).toBeDefined();
    expect(screen.getByText("Air")).toBeDefined();
    expect(screen.getByText("Api")).toBeDefined();
  });

  it("memanggil window.print saat tombol Cetak Sekarang (A4 Potrait) diklik", () => {
    const printSpy = vi.spyOn(window, "print").mockImplementation(() => {});

    render(
      <PrintPageClient
        lesson={dummyLesson}
        questions={dummyQuestions}
        shareUrl="http://localhost:3000/m/100101"
      />
    );

    fireEvent.click(
      screen.getByRole("button", { name: /Cetak Sekarang \(A4 Potrait\)/i })
    );
    expect(printSpy).toHaveBeenCalledTimes(1);

    printSpy.mockRestore();
  });

  it("menyembunyikan QR, ejaan SIBI, kartu, dan kuis sesuai kotak centang", () => {
    render(
      <PrintPageClient
        lesson={dummyLesson}
        questions={dummyQuestions}
        shareUrl="http://localhost:3000/m/100101"
        shareCode="100101"
      />
    );

    const qrToggle = screen.getByRole("checkbox", { name: /Sertakan Kode QR/i });
    const sibiToggle = screen.getByRole("checkbox", { name: /Sertakan Isyarat SIBI/i });
    const cardsToggle = screen.getByRole("checkbox", { name: /Kartu Materi/i });
    const quizToggle = screen.getByRole("checkbox", { name: /Lembar Kuis/i });

    fireEvent.click(qrToggle);
    expect(screen.queryByText("100101")).toBeNull();

    fireEvent.click(sibiToggle);
    expect(screen.queryByText(/Isyarat SIBI: WORTEL/i)).toBeNull();

    fireEvent.click(cardsToggle);
    expect(screen.queryByText(/Bagian 1: Kartu Belajar/i)).toBeNull();

    fireEvent.click(quizToggle);
    expect(screen.queryByText(/Bagian 2: Lembar Kuis Siswa/i)).toBeNull();
  });
});
