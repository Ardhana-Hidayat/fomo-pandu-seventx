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
import { storage } from "../services/storage";

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
        signSystem: "SIBI",
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

function getPictoUrl(slug: string): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  if (supabaseUrl && (process.env.STORAGE_DRIVER === "supabase" || process.env.NODE_ENV === "production")) {
    return `${supabaseUrl}/storage/v1/object/public/card-images/${slug}.webp`;
  }
  return `/media/pictograms/${slug}.webp`;
}

const DEMO_PICTO_MAP: Record<number, string> = {
  1: getPictoUrl("air"),
  2: getPictoUrl("cuci-tangan"),
  3: getPictoUrl("sabun"),
  4: getPictoUrl("gosok-tangan"),
  5: getPictoUrl("bilas"),
  6: getPictoUrl("handuk"),
  7: getPictoUrl("tangan-bersih"),
};

const DEMO_QUESTION_PICTO_MAP: Record<string, string> = {
  sabun: getPictoUrl("sabun"),
  soap: getPictoUrl("sabun"),
  minyak: getPictoUrl("minyak"),
  "minyak goreng": getPictoUrl("minyak"),
  pasir: getPictoUrl("pasir"),
  handuk: getPictoUrl("handuk"),
  "handuk bersih": getPictoUrl("handuk"),
  towel: getPictoUrl("handuk"),
  "baju kotor": getPictoUrl("baju"),
  "kertas koran": getPictoUrl("koran"),
  koran: getPictoUrl("koran"),
  "sikat gigi": getPictoUrl("sikat-gigi"),
  toothbrush: getPictoUrl("sikat-gigi"),
  "cuci tangan": getPictoUrl("cuci-tangan"),
  "cuci tangan bersih": getPictoUrl("cuci-tangan"),
  "wash hands": getPictoUrl("cuci-tangan"),
  "basahi tangan": getPictoUrl("cuci-tangan"),
  air: getPictoUrl("air"),
  "air mengalir": getPictoUrl("air"),
  "air kotor": getPictoUrl("air"),
  water: getPictoUrl("air"),
  bilas: getPictoUrl("bilas"),
  rinse: getPictoUrl("bilas"),
  "pagi dan malam": getPictoUrl("pagi"),
  "hanya hari minggu": getPictoUrl("matahari"),
  "saat tidur": getPictoUrl("tidur"),
  "tanah kering": getPictoUrl("tanah"),
  "zebra cross": getPictoUrl("zebra-cross"),
  "tengah jalan raya": getPictoUrl("jalan"),
  "tikungan tajam": getPictoUrl("tikungan"),
  "tengok kanan dan kiri": getPictoUrl("tengok"),
  "langsung lari kencang": getPictoUrl("lari"),
  "bermain ponsel": getPictoUrl("ponsel"),
  "oleskan pasta gigi ke sikat": getPictoUrl("pasta-gigi"),
  "sikat seluruh permukaan gigi": getPictoUrl("sikat-gigi"),
  "berkumur dengan air bersih": getPictoUrl("air"),
  "kupas kulit pisang": getPictoUrl("pisang"),
  "makan buah pisang": getPictoUrl("pisang"),
  "berhenti di pinggir trotoar": getPictoUrl("jalan"),
  "menyeberang di zebra cross": getPictoUrl("zebra-cross"),
};

function loadPictoMap(): Record<string, string> {
  const map: Record<string, string> = { ...DEMO_QUESTION_PICTO_MAP };
  try {
    const manifestPath = path.resolve(process.cwd(), "public/media/pictograms/manifest.json");
    if (fs.existsSync(manifestPath)) {
      const data = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
      if (data && data.items) {
        for (const [key, item] of Object.entries(data.items as Record<string, { id: number; name?: string }>)) {
          const file = getPictoUrl(key);
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
          : storage.url(a.storageKey, "card-images");
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
      const safeAudioKey = path.basename(a.storageKey);
      audioUrl =
        a.storageKey.startsWith("/") || a.storageKey.startsWith("http")
          ? a.storageKey
          : storage.url(safeAudioKey, "card-audio");
    }

    return {
      ...c,
      imageUrl,
      audioUrl,
      audioRef: audioUrl,
    };
  });
}

function resolveQuizVisualUrl(textKey: string, enKey: string): string | undefined {
  const direct =
    EXTENDED_PICTO_MAP[textKey] ||
    EXTENDED_PICTO_MAP[enKey] ||
    DEMO_QUESTION_PICTO_MAP[textKey] ||
    DEMO_QUESTION_PICTO_MAP[enKey];
  if (direct) return direct;

  const words = textKey.replace(/[^a-z0-9\s-]/g, "").split(/[\s-]+/).filter(Boolean);
  for (const w of words) {
    if (EXTENDED_PICTO_MAP[w]) return EXTENDED_PICTO_MAP[w];
    if (DEMO_QUESTION_PICTO_MAP[w]) return DEMO_QUESTION_PICTO_MAP[w];
  }
  return undefined;
}

function enrichQuestionsWithMedia(
  questions: QuizQuestion[],
  cards: LessonCardWithMedia[] = []
): QuizQuestion[] {
  const cardById = new Map(cards.map((c) => [c.id, c]));
  return questions.map((q) => {
    const payload: Record<string, unknown> = { ...q.payload };
    if (!payload.promptImageUrl) {
      const rawPromptImg = payload.prompt_image;
      if (typeof rawPromptImg === "string" && rawPromptImg) {
        const slug = rawPromptImg.replace(/^\/media\/pictograms\//, "").replace(/\.webp$/, "");
        payload.promptImageUrl = getPictoUrl(slug);
      } else if (q.linkedCardId && cardById.has(q.linkedCardId)) {
        const linked = cardById.get(q.linkedCardId);
        if (linked?.imageUrl) {
          payload.promptImageUrl = linked.imageUrl;
        }
      }
    }
    if (payload.options && Array.isArray(payload.options)) {
      payload.options = payload.options.map((rawOpt: unknown, idx: number) => {
        const isString = typeof rawOpt === "string";
        const opt = (isString ? { text: rawOpt } : (rawOpt as Record<string, unknown>)) as {
          id?: string;
          text?: string;
          label?: string;
          imageUrl?: string;
          image?: { url?: string; keyword_en?: string };
          correct?: boolean;
        };

        const text = opt.text ?? opt.label ?? (isString ? rawOpt : "");
        const textKey = text.toLowerCase().trim();
        const enKey = opt.image?.keyword_en?.toLowerCase().trim() || "";
        const picUrl = resolveQuizVisualUrl(textKey, enKey);

        const id = opt.id ?? `opt-${idx}`;
        const isCorrect =
          typeof opt.correct === "boolean"
            ? opt.correct
            : payload.answer !== undefined
            ? String(payload.answer).trim().toLowerCase() === textKey ||
              String(payload.answer).trim().toLowerCase() === id.toLowerCase()
            : idx === 0;

        const imageUrl = picUrl || opt.imageUrl || opt.image?.url;

        return {
          ...opt,
          id,
          text,
          imageUrl,
          correct: isCorrect,
          ...(picUrl ? { image: { ...(opt.image ?? {}), url: picUrl } } : {}),
        };
      });
    }

    if (payload.steps && Array.isArray(payload.steps)) {
      payload.steps = payload.steps.map((rawSt: unknown, sIdx: number) => {
        const isString = typeof rawSt === "string";
        const st = (isString ? { text: rawSt } : (rawSt as Record<string, unknown>)) as {
          id?: string;
          text?: string;
          imageUrl?: string;
          image?: { url?: string; keyword_en?: string };
        };

        const text = st.text ?? (isString ? rawSt : "");
        const textKey = text.toLowerCase().trim();
        const enKey = st.image?.keyword_en?.toLowerCase().trim() || "";
        const picUrl = resolveQuizVisualUrl(textKey, enKey);

        const id = st.id ?? `step-${sIdx}`;
        const imageUrl = picUrl || st.imageUrl || st.image?.url;

        return {
          ...st,
          id,
          text,
          imageUrl,
          ...(picUrl ? { image: { ...(st.image ?? {}), url: picUrl } } : {}),
        };
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
    const questions = enrichQuestionsWithMedia(rawQuestions, cards);

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
    const questions = enrichQuestionsWithMedia(rawQuestions, cards);

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
  input: UpdateCardMediaInput,
  teacherId?: string
): Promise<Result<LessonCard>> {
  try {
    if (teacherId) {
      const cardWithLesson = await db
        .select({ id: lessonCards.id })
        .from(lessonCards)
        .innerJoin(lessons, eq(lessonCards.lessonId, lessons.id))
        .where(
          and(
            eq(lessonCards.id, cardId),
            eq(lessons.teacherId, teacherId)
          )
        )
        .limit(1);

      if (cardWithLesson.length === 0) {
        return err(
          makeAppError("FORBIDDEN", "Anda tidak berhak mengubah kartu materi ini")
        );
      }
    }

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
  const effectiveSign: "SIBI" | null = card.signOverride === "NONE" ? null : "SIBI";

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
  teacherId: string,
  lessonId: string,
  patch: UpdatePresentationPatch
): Promise<Result<Lesson>> {
  try {
    const [updated] = await db
      .update(lessons)
      .set({
        ...patch,
        signSystem: "SIBI",
        audioVersion: sql`${lessons.audioVersion} + 1`,
      })
      .where(
        and(
          eq(lessons.id, lessonId),
          eq(lessons.teacherId, teacherId)
        )
      )
      .returning();

    if (!updated) {
      return err(makeAppError("NOT_FOUND", "Materi tidak ditemukan atau bukan milik Anda"));
    }
    return ok(updated);
  } catch (error) {
    return err(makeAppError("DB_ERROR", "Gagal memperbarui pengaturan penyajian", error));
  }
}


