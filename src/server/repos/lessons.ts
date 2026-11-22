import "server-only";
import { eq, and, asc } from "drizzle-orm";
import { db } from "../db/client";
import {
  lessons,
  lessonCards,
  quizQuestions,
  publications,
  students,
  type Lesson,
  type LessonCard,
  type QuizQuestion,
  type Publication,
  type LessonSettings,
  type QuizQuestionPayload,
} from "../db/schema";
import { ok, err, type Result, makeAppError } from "@/shared/lib/result";

export type LessonCardWithMedia = LessonCard & {
  imageUrl?: string | null;
  audioUrl?: string | null;
  audioRef?: string | null;
};

export interface LessonWithContent extends Lesson {
  cards: LessonCardWithMedia[];
  questions: QuizQuestion[];
  publications?: Publication[];
}

export interface CreateCardInput {
  position: number;
  text: string;
  keyTerms?: string[];
  cardType?: "vocabulary" | "instruction" | "step";
  imageSource?: "upload" | "pictogram" | "ai";
  imageAlt?: string;
  imageAssetId?: string;
  audioSource?: "tts" | "recording" | "none";
  audioAssetId?: string;
}

export interface CreateQuestionInput {
  position: number;
  type: string;
  prompt: string;
  payload: QuizQuestionPayload;
  linkedCardId?: string;
  explanation?: string;
}

export interface CreateLessonInput {
  title: string;
  topic: string;
  level?: string;
  slug?: string;
  sourceType?: string;
  sourceTextHash?: string;
  sourceAssetId?: string;
  generatedBy?: "ai" | "fallback" | "manual";
  status?: "draft" | "published";
  exerciseType?: "match" | "order" | "both";
  optionCount?: number;
  showTextHint?: boolean;
  settings?: LessonSettings;
  options?: Record<string, unknown>;
  cards?: CreateCardInput[];
  questions?: CreateQuestionInput[];
}

export interface UpdateLessonInput {
  title?: string;
  topic?: string;
  level?: string;
  status?: "draft" | "published";
  exerciseType?: "match" | "order" | "both";
  optionCount?: number;
  showTextHint?: boolean;
  settings?: LessonSettings;
  options?: Record<string, unknown>;
}

export async function createLesson(
  teacherId: string,
  input: CreateLessonInput
): Promise<Result<LessonWithContent>> {
  if (!input.title || input.title.trim().length === 0) {
    return err(makeAppError("INVALID_TITLE", "Judul materi tidak boleh kosong"));
  }

  try {
    const inserted = await db
      .insert(lessons)
      .values({
        teacherId,
        title: input.title.trim(),
        topic: input.topic ?? "",
        level: input.level ?? "sdlb",
        slug: input.slug,
        sourceType: input.sourceType ?? "topik",
        sourceTextHash: input.sourceTextHash,
        sourceAssetId: input.sourceAssetId,
        generatedBy: input.generatedBy ?? "manual",
        status: input.status ?? "draft",
        exerciseType: input.exerciseType ?? "both",
        optionCount: input.optionCount ?? 3,
        showTextHint: input.showTextHint ?? true,
        settings: input.settings,
        options: input.options,
      })
      .returning();

    const lesson = inserted[0];
    if (!lesson) {
      return err(makeAppError("CREATE_FAILED", "Gagal menyimpan materi"));
    }

    const createdCards: LessonCard[] = [];
    if (input.cards && input.cards.length > 0) {
      for (const c of input.cards) {
        const cardRows = await db
          .insert(lessonCards)
          .values({
            lessonId: lesson.id,
            position: c.position,
            text: c.text,
            keyTerms: c.keyTerms ?? [],
            cardType: c.cardType ?? "instruction",
            imageSource: c.imageSource ?? "pictogram",
            imageAlt: c.imageAlt,
            imageAssetId: c.imageAssetId,
            audioSource: c.audioSource ?? "none",
            audioAssetId: c.audioAssetId,
          })
          .returning();
        if (cardRows[0]) createdCards.push(cardRows[0]);
      }
    }

    const createdQuestions: QuizQuestion[] = [];
    if (input.questions && input.questions.length > 0) {
      for (const q of input.questions) {
        const qRows = await db
          .insert(quizQuestions)
          .values({
            lessonId: lesson.id,
            position: q.position,
            type: q.type,
            prompt: q.prompt,
            payload: q.payload,
            linkedCardId: q.linkedCardId,
            explanation: q.explanation,
          })
          .returning();
        if (qRows[0]) createdQuestions.push(qRows[0]);
      }
    }

    return ok({
      ...lesson,
      cards: createdCards,
      questions: createdQuestions,
    });
  } catch (error) {
    return err(
      makeAppError("DB_ERROR", "Terjadi kesalahan pembuatan materi", error)
    );
  }
}

export async function getLessonWithContent(
  teacherId: string,
  lessonId: string
): Promise<Result<LessonWithContent>> {
  try {
    const lessonRows = await db
      .select()
      .from(lessons)
      .where(
        and(eq(lessons.id, lessonId), eq(lessons.teacherId, teacherId))
      )
      .limit(1);

    const lesson = lessonRows[0];
    if (!lesson) {
      return err(makeAppError("NOT_FOUND", "Materi tidak ditemukan"));
    }

    const cards = await db
      .select()
      .from(lessonCards)
      .where(eq(lessonCards.lessonId, lesson.id))
      .orderBy(asc(lessonCards.position));

    const questions = await db
      .select()
      .from(quizQuestions)
      .where(eq(quizQuestions.lessonId, lesson.id))
      .orderBy(asc(quizQuestions.position));

    const pubList = await db
      .select()
      .from(publications)
      .where(eq(publications.lessonId, lesson.id));

    return ok({
      ...lesson,
      cards,
      questions,
      publications: pubList,
    });
  } catch (error) {
    return err(
      makeAppError("DB_ERROR", "Gagal memuat materi", error)
    );
  }
}

export async function getLessonForStudent(
  studentId: string,
  lessonId: string
): Promise<Result<LessonWithContent>> {
  try {
    // Siswa hanya boleh membuka materi yang terbit dan berstatus published di kelasnya
    const student = await db
      .select({ classroomId: students.classroomId })
      .from(students)
      .where(eq(students.id, studentId))
      .limit(1)
      .then((rows) => rows[0]);

    if (!student) {
      return err(makeAppError("FORBIDDEN", "Siswa tidak valid"));
    }

    const pub = await db
      .select({ id: publications.id })
      .from(publications)
      .where(
        and(
          eq(publications.lessonId, lessonId),
          eq(publications.classroomId, student.classroomId),
          eq(publications.visible, true)
        )
      )
      .limit(1)
      .then((rows) => rows[0]);

    if (!pub) {
      return err(
        makeAppError("FORBIDDEN", "Materi belum diterbitkan di kelas ini")
      );
    }

    const lessonRows = await db
      .select()
      .from(lessons)
      .where(
        and(eq(lessons.id, lessonId), eq(lessons.status, "published"))
      )
      .limit(1);

    const lesson = lessonRows[0];
    if (!lesson) {
      return err(makeAppError("NOT_FOUND", "Materi tidak ditemukan"));
    }

    const cards = await db
      .select()
      .from(lessonCards)
      .where(eq(lessonCards.lessonId, lesson.id))
      .orderBy(asc(lessonCards.position));

    const questions = await db
      .select()
      .from(quizQuestions)
      .where(eq(quizQuestions.lessonId, lesson.id))
      .orderBy(asc(quizQuestions.position));

    const pubList = await db
      .select()
      .from(publications)
      .where(eq(publications.lessonId, lesson.id));

    return ok({
      ...lesson,
      cards,
      questions,
      publications: pubList,
    });
  } catch (error) {
    return err(
      makeAppError("DB_ERROR", "Gagal memuat materi untuk siswa", error)
    );
  }
}

export async function listLessonsByTeacher(
  teacherId: string
): Promise<Result<Lesson[]>> {
  try {
    const rows = await db
      .select()
      .from(lessons)
      .where(eq(lessons.teacherId, teacherId));
    return ok(rows);
  } catch (error) {
    return err(
      makeAppError("DB_ERROR", "Gagal memuat daftar materi", error)
    );
  }
}

export async function updateLesson(
  teacherId: string,
  lessonId: string,
  input: UpdateLessonInput
): Promise<Result<Lesson>> {
  try {
    const updated = await db
      .update(lessons)
      .set(input)
      .where(
        and(eq(lessons.id, lessonId), eq(lessons.teacherId, teacherId))
      )
      .returning();

    const record = updated[0];
    if (!record) {
      return err(makeAppError("NOT_FOUND", "Materi tidak ditemukan untuk diubah"));
    }
    return ok(record);
  } catch (error) {
    return err(
      makeAppError("DB_ERROR", "Gagal memperbarui materi", error)
    );
  }
}

export async function deleteLesson(
  teacherId: string,
  lessonId: string
): Promise<Result<void>> {
  try {
    const deleted = await db
      .delete(lessons)
      .where(
        and(eq(lessons.id, lessonId), eq(lessons.teacherId, teacherId))
      )
      .returning();

    if (deleted.length === 0) {
      return err(makeAppError("NOT_FOUND", "Materi tidak ditemukan untuk dihapus"));
    }
    return ok(undefined);
  } catch (error) {
    return err(
      makeAppError("DB_ERROR", "Gagal menghapus materi", error)
    );
  }
}

export interface UpdateCardMediaInput {
  imageAssetId?: string | null;
  imageAlt?: string | null;
  imageSource?: "upload" | "pictogram" | "ai" | string;
  audioAssetId?: string | null;
  audioSource?: "tts" | "recording" | "none" | string;
}

export async function updateCardMedia(
  cardId: string,
  input: UpdateCardMediaInput
): Promise<Result<LessonCard>> {
  try {
    const updated = await db
      .update(lessonCards)
      .set(input)
      .where(eq(lessonCards.id, cardId))
      .returning();

    const record = updated[0];
    if (!record) {
      return err(makeAppError("NOT_FOUND", "Kartu materi tidak ditemukan"));
    }
    return ok(record);
  } catch (error) {
    return err(
      makeAppError("DB_ERROR", "Gagal memperbarui media kartu", error)
    );
  }
}

