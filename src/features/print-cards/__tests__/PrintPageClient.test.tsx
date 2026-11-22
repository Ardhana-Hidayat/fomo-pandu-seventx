import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
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
        imageUrl: null,
        audioRef: null,
        audioUrl: null,
        keyTerms: ["wortel"],
        createdAt: new Date(),
      },
    ],
    questions: [],
    publications: [],
  };

  it("merender kartu fisik dengan teks dan panduan potong", () => {
    render(
      <PrintPageClient
        lesson={dummyLesson}
        shareUrl="http://localhost:3000/m/abc12345"
      />
    );

    expect(screen.getByText(/Cetak Kartu Fisik: Belajar Sayuran/i)).toBeDefined();
    expect(screen.getByText("Wortel berwarna oranye")).toBeDefined();
    expect(screen.getByText(/Gunting mengikuti garis putus-putus/i)).toBeDefined();
    expect(screen.getByRole("button", { name: /Cetak Sekarang/i })).toBeDefined();
  });
});
