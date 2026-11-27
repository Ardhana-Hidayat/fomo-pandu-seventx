import { describe, it, expect, vi, beforeEach } from "vitest";
import { ok, err, makeAppError } from "@/shared/lib/result";

const {
  mockGetCurrentTeacher,
  mockGenerateLessonContent,
  mockSanitizeAndValidateLesson,
  mockCreateLesson,
  mockFindOrFetchPictogram,
  mockResolveCatalogAssetToDb,
} = vi.hoisted(() => ({
  mockGetCurrentTeacher: vi.fn(),
  mockGenerateLessonContent: vi.fn(),
  mockSanitizeAndValidateLesson: vi.fn(),
  mockCreateLesson: vi.fn(),
  mockFindOrFetchPictogram: vi.fn(),
  mockResolveCatalogAssetToDb: vi.fn(),
}));

vi.mock("@/features/auth", () => ({
  getCurrentTeacher: mockGetCurrentTeacher,
}));

vi.mock("@/server/services/ai", () => ({
  generateLessonContent: mockGenerateLessonContent,
  sanitizeAndValidateLesson: mockSanitizeAndValidateLesson,
}));

vi.mock("@/server/repos/lessons", () => ({
  createLesson: mockCreateLesson,
}));

vi.mock("@/server/services/media/arasaac", () => ({
  findOrFetchPictogram: mockFindOrFetchPictogram,
  resolveCatalogAssetToDb: mockResolveCatalogAssetToDb,
}));

vi.mock("@/server/db/client", () => ({
  db: {},
}));

import { POST } from "../route";

const SAMPLE_GENERATED_LESSON = {
  title: "Mengenal Hewan Jinak",
  cards: [
    {
      text: "Kucing adalah hewan jinak yang suka bermain.",
      key_terms: ["kucing"],
      visual: null,
    },
  ],
  questions: [
    {
      type: "pilih_kata",
      prompt: "Mana hewan jinak?",
      options: [
        { id: "a", text: "Kucing", correct: true },
        { id: "b", text: "Singa", correct: false },
      ],
    },
  ],
};

function makeJsonRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/ai/generate-lesson", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/ai/generate-lesson", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockGenerateLessonContent.mockResolvedValue({
      lesson: SAMPLE_GENERATED_LESSON,
      badge: "AI",
      generatedBy: "ai",
      isScannedNotice: false,
      warnings: [],
    });

    mockSanitizeAndValidateLesson.mockImplementation((lesson) => ({
      lesson,
      warnings: [],
    }));

    mockFindOrFetchPictogram.mockResolvedValue(
      err(makeAppError("NOT_FOUND", "Not found"))
    );
    mockResolveCatalogAssetToDb.mockResolvedValue(
      err(makeAppError("NOT_FOUND", "Not found"))
    );
  });

  it("returns 401 with { success: false, error } for unauthenticated manual teks request", async () => {
    mockGetCurrentTeacher.mockResolvedValue(null);

    const res = await POST(
      makeJsonRequest({
        sourceType: "teks",
        text: "Kucing adalah hewan peliharaan yang lucu.",
      })
    );
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.success).toBe(false);
    expect(typeof json.error).toBe("string");
    expect(json.error.length).toBeGreaterThan(0);
    expect(mockGenerateLessonContent).not.toHaveBeenCalled();
    expect(mockCreateLesson).not.toHaveBeenCalled();
  });

  it("returns 400 with { success: false, error } when input is empty", async () => {
    mockGetCurrentTeacher.mockResolvedValue({
      teacher: { id: "teacher-1", settings: {} },
    });

    const res = await POST(
      makeJsonRequest({
        sourceType: "teks",
        topic: "",
        text: "   ",
      })
    );
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
    expect(typeof json.error).toBe("string");
    expect(json.error.length).toBeGreaterThan(0);
    expect(mockGenerateLessonContent).not.toHaveBeenCalled();
  });

  it("creates draft lesson in DB and returns 200 with lessonId for authenticated teks request", async () => {
    mockGetCurrentTeacher.mockResolvedValue({
      teacher: { id: "teacher-123", settings: { geminiApiKeys: [] } },
    });
    mockCreateLesson.mockResolvedValue(
      ok({
        id: "lesson-uuid-123",
        teacherId: "teacher-123",
        title: "Mengenal Hewan Jinak",
        topic: "Mengenal Hewan Jinak",
        level: "sdlb",
        sourceType: "teks",
        status: "draft",
        cards: [],
        questions: [],
      })
    );

    const res = await POST(
      makeJsonRequest({
        sourceType: "teks",
        text: "Kucing adalah hewan jinak di rumah.",
        level: "sdlb",
      })
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.lessonId).toBe("lesson-uuid-123");
    expect(mockCreateLesson).toHaveBeenCalledTimes(1);
    expect(mockCreateLesson).toHaveBeenCalledWith(
      "teacher-123",
      expect.objectContaining({
        title: "Mengenal Hewan Jinak",
        sourceType: "teks",
        status: "draft",
        level: "sdlb",
      })
    );
  });

  it("returns 500 with { success: false, error } when createLesson fails", async () => {
    mockGetCurrentTeacher.mockResolvedValue({
      teacher: { id: "teacher-123", settings: {} },
    });
    mockCreateLesson.mockResolvedValue(
      err(makeAppError("DB_ERROR", "Terjadi kesalahan pembuatan materi"))
    );

    const res = await POST(
      makeJsonRequest({
        sourceType: "teks",
        text: "Kucing adalah hewan jinak di rumah.",
      })
    );
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.success).toBe(false);
    expect(json.error).toBe("Terjadi kesalahan pembuatan materi");
  });
});
