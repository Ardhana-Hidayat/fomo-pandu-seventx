import "server-only";
import fs from "node:fs";
import path from "node:path";
import { eq, and, asc, sql, inArray } from "drizzle-orm";
import { db } from "../db/client";
import {
  lessons,
  lessonCards,
  quizQuestions,
  publications,
  students,
  assets,
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
  signSystem?: "SIBI" | "BISINDO";
  signScope?: "key_terms" | "all";
  signSpeed?: number;
  voiceKey?: string;
  voiceSpeed?: number;
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
  signSystem?: "SIBI" | "BISINDO";
  signScope?: "key_terms" | "all";
  signSpeed?: number;
  voiceKey?: string;
  voiceSpeed?: number;
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
        signSystem: input.signSystem ?? "SIBI",
        signScope: input.signScope ?? "key_terms",
        signSpeed: input.signSpeed ?? 1.0,
        voiceKey: input.voiceKey ?? "A",
        voiceSpeed: input.voiceSpeed ?? 1.0,
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

const DEMO_PICTO_MAP: Record<number, string> = {
  1: "/media/pictograms/air.webp",
  2: "/media/pictograms/cuci-tangan.webp",
  3: "/media/pictograms/sabun.webp",
  4: "/media/pictograms/gosok-tangan.webp",
  5: "/media/pictograms/bilas.webp",
  6: "/media/pictograms/handuk.webp",
  7: "/media/pictograms/tangan-bersih.webp",
};

const DEMO_QUESTION_PICTO_MAP: Record<string, string> = {
  sabun: "/media/pictograms/sabun.webp",
  soap: "/media/pictograms/sabun.webp",
  handuk: "/media/pictograms/handuk.webp",
  towel: "/media/pictograms/handuk.webp",
  "sikat gigi": "/media/pictograms/sikat-gigi.webp",
  toothbrush: "/media/pictograms/sikat-gigi.webp",
  "cuci tangan": "/media/pictograms/cuci-tangan.webp",
  "wash hands": "/media/pictograms/cuci-tangan.webp",
  "basahi tangan": "/media/pictograms/cuci-tangan.webp",
  air: "/media/pictograms/air.webp",
  water: "/media/pictograms/air.webp",
  bilas: "/media/pictograms/bilas.webp",
  rinse: "/media/pictograms/bilas.webp",
};

function loadPictoMap(): Record<string, string> {
  const map: Record<string, string> = { ...DEMO_QUESTION_PICTO_MAP };
  try {
    const manifestPath = path.resolve(process.cwd(), "public/media/pictograms/manifest.json");
    if (fs.existsSync(manifestPath)) {
      const data = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
      if (data && data.items) {
        for (const [key, item] of Object.entries(data.items as Record<string, { id: number; name?: string }>)) {
          const file = `/media/pictograms/${key}.webp`;
          map[key.toLowerCase()] = file;
          if (item.name) {
            map[item.name.toLowerCase()] = file;
          }
        }
      }
    }
  } catch {}
  return map;
}

const EXTENDED_PICTO_MAP = loadPictoMap();

async function enrichCardsWithMedia(cards: LessonCard[]): Promise<LessonCardWithMedia[]> {
  const assetIds = cards
    .flatMap((c) => [c.imageAssetId, c.audioAssetId])
    .filter((id): id is string => Boolean(id));

  const assetList =
    assetIds.length > 0
      ? await db
          .select()
          .from(assets)
          .where(inArray(assets.id, assetIds))
      : [];

  const assetMap = new Map(assetList.map((a) => [a.id, a]));

  return cards.map((c) => {
    let imageUrl: string | null = null;
    let audioUrl: string | null = null;

    if (c.imageAssetId && assetMap.has(c.imageAssetId)) {
      const a = assetMap.get(c.imageAssetId)!;
      imageUrl =
        a.storageKey.startsWith("/") || a.storageKey.startsWith("http")
          ? a.storageKey
          : `/api/media/card-images/${a.storageKey}`;
    } else if (c.imageSource === "pictogram" && DEMO_PICTO_MAP[c.position]) {
      imageUrl = DEMO_PICTO_MAP[c.position]!;
    } else {
      // Periksa kecocokan kata kunci kartu dengan pustaka piktogram lokal yang tersedia
      const terms = [
        ...(c.keyTerms || []),
        ...c.text.toLowerCase().replace(/[^a-z0-9\s-]/g, "").split(/\s+/),
      ];
      for (const t of terms) {
        const clean = t.trim();
        if (clean && EXTENDED_PICTO_MAP[clean]) {
          imageUrl = EXTENDED_PICTO_MAP[clean];
          break;
        }
      }
    }

    if (c.audioAssetId && assetMap.has(c.audioAssetId)) {
      const a = assetMap.get(c.audioAssetId)!;
      audioUrl =
        a.storageKey.startsWith("/") || a.storageKey.startsWith("http")
          ? a.storageKey
          : `/api/media/card-audio/${a.storageKey}`;
    }

    return {
      ...c,
      imageUrl,
      audioUrl,
      audioRef: audioUrl,
    };
  });
}

function enrichQuestionsWithMedia(questions: QuizQuestion[]): QuizQuestion[] {
  return questions.map((q) => {
    const payload = { ...q.payload };
    if (payload.options && Array.isArray(payload.options)) {
      payload.options = payload.options.map((opt) => {
        const textKey = opt.text?.toLowerCase().trim() || "";
        const enKey = opt.image?.keyword_en?.toLowerCase().trim() || "";
        const picUrl =
          EXTENDED_PICTO_MAP[textKey] ||
          EXTENDED_PICTO_MAP[enKey] ||
          DEMO_QUESTION_PICTO_MAP[textKey] ||
          DEMO_QUESTION_PICTO_MAP[enKey];
        if (picUrl) {
          return {
            ...opt,
            image: {
              ...opt.image,
              url: picUrl,
            },
          };
        }
        return opt;
      });
    }

    if (payload.steps && Array.isArray(payload.steps)) {
      payload.steps = payload.steps.map((st) => {
        const textKey = st.text?.toLowerCase().trim() || "";
        const enKey = st.image?.keyword_en?.toLowerCase().trim() || "";
        const picUrl =
          EXTENDED_PICTO_MAP[textKey] ||
          EXTENDED_PICTO_MAP[enKey] ||
          DEMO_QUESTION_PICTO_MAP[textKey] ||
          DEMO_QUESTION_PICTO_MAP[enKey];
        if (picUrl) {
          return {
            ...st,
            image: {
              ...st.image,
              url: picUrl,
            },
          };
        }
        return st;
      });
    }

    return {
      ...q,
      payload,
    };
  });
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

    const rawCards = await db
      .select()
      .from(lessonCards)
      .where(eq(lessonCards.lessonId, lesson.id))
      .orderBy(asc(lessonCards.position));

    const rawQuestions = await db
      .select()
      .from(quizQuestions)
      .where(eq(quizQuestions.lessonId, lesson.id))
      .orderBy(asc(quizQuestions.position));

    const pubList = await db
      .select()
      .from(publications)
      .where(eq(publications.lessonId, lesson.id));

    const cards = await enrichCardsWithMedia(rawCards);
    const questions = enrichQuestionsWithMedia(rawQuestions);

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

    const rawCards = await db
      .select()
      .from(lessonCards)
      .where(eq(lessonCards.lessonId, lesson.id))
      .orderBy(asc(lessonCards.position));

    const rawQuestions = await db
      .select()
      .from(quizQuestions)
      .where(eq(quizQuestions.lessonId, lesson.id))
      .orderBy(asc(quizQuestions.position));

    const pubList = await db
      .select()
      .from(publications)
      .where(eq(publications.lessonId, lesson.id));

    const cards = await enrichCardsWithMedia(rawCards);
    const questions = enrichQuestionsWithMedia(rawQuestions);

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

export interface EffectiveCardSettings {
  signSystem: "SIBI" | "BISINDO" | null;
  voiceKey: string;
  signScope: string;
  signSpeed: number;
  voiceSpeed: number;
  keyTerms: string[];
}

export function effectiveCardSettings(
  lesson: Pick<Lesson, "signSystem" | "signScope" | "signSpeed" | "voiceKey" | "voiceSpeed">,
  card: Pick<LessonCard, "signOverride" | "voiceOverride" | "keyTerms">
): EffectiveCardSettings {
  let effectiveSign: "SIBI" | "BISINDO" | null = (lesson.signSystem as "SIBI" | "BISINDO") ?? "SIBI";
  if (card.signOverride === "NONE") {
    effectiveSign = null;
  } else if (card.signOverride === "SIBI" || card.signOverride === "BISINDO") {
    effectiveSign = card.signOverride;
  }

  const voiceKey = card.voiceOverride ?? lesson.voiceKey ?? "A";
  const signScope = lesson.signScope ?? "key_terms";
  const signSpeed = lesson.signSpeed ?? 1.0;
  const voiceSpeed = lesson.voiceSpeed ?? 1.0;
  const keyTerms = card.keyTerms ?? [];

  return {
    signSystem: effectiveSign,
    voiceKey,
    signScope,
    signSpeed,
    voiceSpeed,
    keyTerms,
  };
}

export interface UpdatePresentationPatch {
  signSystem?: "SIBI" | "BISINDO";
  signScope?: "key_terms" | "all";
  signSpeed?: number;
  voiceKey?: string;
  voiceSpeed?: number;
}

export async function updatePresentation(
  lessonId: string,
  patch: UpdatePresentationPatch
): Promise<Result<Lesson>> {
  try {
    const [updated] = await db
      .update(lessons)
      .set({
        ...patch,
        audioVersion: sql`${lessons.audioVersion} + 1`,
      })
      .where(eq(lessons.id, lessonId))
      .returning();

    if (!updated) {
      return err(makeAppError("NOT_FOUND", "Materi tidak ditemukan"));
    }
    return ok(updated);
  } catch (error) {
    return err(makeAppError("DB_ERROR", "Gagal memperbarui pengaturan penyajian", error));
  }
}


