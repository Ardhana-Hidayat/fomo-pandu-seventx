import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PrintPageClient } from "../components/PrintPageClient";
import type { LessonWithContent } from "@/server/repos/lessons";

describe("PrintPageClient Component", () => {
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
    questions: [],
    publications: [
      {
        id: "pub-1",
        lessonId: "l-1",
        classroomId: "cls-1",
        shareCode: "ABC12345",
        visible: true,
        publishedAt: new Date(),
        createdAt: new Date(),
      },
    ],
  };

  it("merender kartu fisik dengan teks, gambar, ejaan SIBI, QR, dan panduan potong", () => {
    render(
      <PrintPageClient
        lesson={dummyLesson}
        shareUrl="http://localhost:3000/m/ABC12345"
        shareCode="ABC12345"
      />
    );

    expect(screen.getByText(/Cetak Kartu Fisik: Belajar Sayuran/i)).toBeDefined();
    expect(screen.getByText("Wortel berwarna oranye")).toBeDefined();
    expect(screen.getByAltText("Foto wortel segar")).toBeDefined();
    expect(screen.getByText(/Isyarat SIBI: WORTEL/i)).toBeDefined();
    expect(screen.getByAltText("Isyarat SIBI huruf W")).toBeDefined();
    expect(screen.getByText("ABC12345")).toBeDefined();
    expect(screen.getByText(/Gunting mengikuti garis putus-putus/i)).toBeDefined();
    expect(screen.getByRole("button", { name: /Cetak Sekarang/i })).toBeDefined();
  });

  it("memanggil window.print saat tombol Cetak Sekarang diklik", () => {
    const printSpy = vi.spyOn(window, "print").mockImplementation(() => {});

    render(
      <PrintPageClient
        lesson={dummyLesson}
        shareUrl="http://localhost:3000/m/ABC12345"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Cetak Sekarang/i }));
    expect(printSpy).toHaveBeenCalledTimes(1);

    printSpy.mockRestore();
  });

  it("menyembunyikan QR dan ejaan SIBI saat kotak centang dimatikan", () => {
    render(
      <PrintPageClient
        lesson={dummyLesson}
        shareUrl="http://localhost:3000/m/ABC12345"
        shareCode="ABC12345"
      />
    );

    const qrToggle = screen.getByLabelText(/Sertakan Kode QR/i);
    const sibiToggle = screen.getByLabelText(/Sertakan Isyarat SIBI/i);

    fireEvent.click(qrToggle);
    expect(screen.queryByText("ABC12345")).toBeNull();

    fireEvent.click(sibiToggle);
    expect(screen.queryByText(/Isyarat SIBI: WORTEL/i)).toBeNull();
  });
});
