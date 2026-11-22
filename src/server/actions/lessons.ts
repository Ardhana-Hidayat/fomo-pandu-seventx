"use server";

import { cookies } from "next/headers";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { ok, err, type Result, makeAppError } from "@/shared/lib/result";
import { TEACHER_COOKIE_NAME, STUDENT_COOKIE_NAME, validateSession } from "../security/session";
import { getTeacherBySessionToken } from "../services/auth/demo";
import { generateLessonContent } from "../services/ai";
import {
  createLesson,
  updateLesson,
  type LessonWithContent,
  type CreateCardInput,
  type CreateQuestionInput,
} from "../repos/lessons";
import { publishLesson } from "../repos/publications";
import { recordAttempt } from "../repos/sessions";
import type { Lesson, Publication, QuestionAttempt } from "../db/schema";

const generateLessonInputSchema = z.object({
  sourceType: z.enum(["topik", "teks", "pdf", "foto"]).default("topik"),
  topic: z.string().optional(),
  text: z.string().optional(),
  level: z.enum(["sdlb", "smplb", "smalb"]).default("sdlb"),
  needs: z.array(z.string()).default(["campuran"]),
  languageComplexity: z.enum(["sangat_sederhana", "sederhana", "biasa"]).default("sederhana"),
  cardCount: z.number().int().min(1).max(20).default(6),
  questionCount: z.number().int().min(1).max(10).default(4),
  teacherNotes: z.string().optional(),
});

export async function generateLessonAction(
  rawInput: z.infer<typeof generateLessonInputSchema>
): Promise<Result<LessonWithContent>> {
  // 1. Periksa sesi dan peran guru
  const cookieStore = await cookies();
  const token = cookieStore.get(TEACHER_COOKIE_NAME)?.value;
  if (!token) {
    return err(makeAppError("UNAUTHORIZED", "Silakan masuk sebagai guru terlebih dahulu"));
  }

  const teacher = await getTeacherBySessionToken(token);
  if (!teacher) {
    return err(makeAppError("UNAUTHORIZED", "Sesi guru tidak valid atau telah berakhir"));
  }

  // 2. Validasi masukan dengan Zod
  const parsed = generateLessonInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return err(makeAppError("INVALID_INPUT", parsed.error.issues[0]?.message || "Masukan tidak valid"));
  }
  const input = parsed.data;

  // 3. Panggil layanan AI dengan fallback otomatis
  const aiResult = await generateLessonContent({
    sourceType: input.sourceType,
    topic: input.topic,
    text: input.text,
    level: input.level,
    needs: input.needs,
    languageComplexity: input.languageComplexity,
    cardCount: input.cardCount,
    questionCount: input.questionCount,
    teacherNotes: input.teacherNotes,
  });

  // 4. Petakan kartu dan soal ke format repositori
  const cardsToInsert: CreateCardInput[] = aiResult.lesson.cards.map((c, i) => ({
    position: i + 1,
    text: c.text,
    keyTerms: c.key_terms,
    cardType: "instruction",
    imageSource: "pictogram",
    imageAlt: c.image.alt,
    audioSource: "none",
  }));

  const questionsToInsert: CreateQuestionInput[] = aiResult.lesson.questions.map((q, i) => ({
    position: i + 1,
    type: q.type,
    prompt: q.prompt,
    payload: {
      options: q.options?.map((opt, optIdx) => ({
        id: opt.id || String.fromCharCode(97 + optIdx),
        text: opt.text,
        correct: opt.correct,
        image: opt.image,
      })),
      steps: q.steps?.map((step, stepIdx) => ({
        id: step.id || `step-${stepIdx + 1}`,
        text: step.text,
        image: step.image,
      })),
      answer: q.answer,
    },
    linkedCardId: undefined,
  }));

  // 5. Simpan selalu sebagai DRAFT di basis data
  const result = await createLesson(teacher.id, {
    title: aiResult.lesson.title || input.topic || "Materi Baru",
    topic: input.topic || aiResult.lesson.title || "",
    level: input.level,
    sourceType: input.sourceType,
    status: "draft",
    generatedBy: aiResult.generatedBy,
    cards: cardsToInsert,
    questions: questionsToInsert,
  });

  if (result.ok) {
    revalidatePath("/guru");
    revalidatePath("/guru/materi");
  }

  return result;
}

const approveLessonInputSchema = z.object({
  lessonId: z.string().uuid(),
  classroomIds: z.array(z.string().uuid()).min(1, "Pilih minimal satu kelas tujuan"),
});

export async function approveLessonAction(
  rawInput: z.infer<typeof approveLessonInputSchema>
): Promise<Result<Publication[]>> {
  // 1. Periksa sesi guru
  const cookieStore = await cookies();
  const token = cookieStore.get(TEACHER_COOKIE_NAME)?.value;
  if (!token) {
    return err(makeAppError("UNAUTHORIZED", "Silakan masuk sebagai guru terlebih dahulu"));
  }

  const teacher = await getTeacherBySessionToken(token);
  if (!teacher) {
    return err(makeAppError("UNAUTHORIZED", "Sesi guru tidak valid"));
  }

  // 2. Validasi masukan
  const parsed = approveLessonInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return err(makeAppError("INVALID_INPUT", parsed.error.issues[0]?.message || "Masukan tidak valid"));
  }

  // 3. Terbitkan materi ke kelas terpilih (otomatis mengubah status lesson menjadi 'published')
  const res = await publishLesson(teacher.id, parsed.data.lessonId, parsed.data.classroomIds);

  if (res.ok) {
    revalidatePath(`/guru/materi/${parsed.data.lessonId}`);
    revalidatePath("/guru");
  }

  return res;
}

const updateLessonInputSchema = z.object({
  lessonId: z.string().uuid(),
  title: z.string().min(1).optional(),
  topic: z.string().optional(),
  level: z.string().optional(),
  exerciseType: z.enum(["match", "order", "both"]).optional(),
  optionCount: z.number().int().min(2).max(4).optional(),
  showTextHint: z.boolean().optional(),
  status: z.enum(["draft", "published"]).optional(),
});

export async function updateLessonAction(
  rawInput: z.infer<typeof updateLessonInputSchema>
): Promise<Result<Lesson>> {
  // 1. Periksa sesi guru
  const cookieStore = await cookies();
  const token = cookieStore.get(TEACHER_COOKIE_NAME)?.value;
  if (!token) {
    return err(makeAppError("UNAUTHORIZED", "Silakan masuk terlebih dahulu"));
  }

  const teacher = await getTeacherBySessionToken(token);
  if (!teacher) {
    return err(makeAppError("UNAUTHORIZED", "Sesi guru tidak valid"));
  }

  // 2. Validasi masukan
  const parsed = updateLessonInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return err(makeAppError("INVALID_INPUT", parsed.error.issues[0]?.message || "Masukan tidak valid"));
  }

  const { lessonId, ...updates } = parsed.data;
  const res = await updateLesson(teacher.id, lessonId, updates);

  if (res.ok) {
    revalidatePath(`/guru/materi/${lessonId}`);
  }

  return res;
}

const submitAttemptInputSchema = z.object({
  sessionId: z.string().uuid(),
  questionId: z.string().uuid(),
  attemptNo: z.number().int().positive().default(1),
  chosen: z.record(z.unknown()).optional(),
  isCorrect: z.boolean(),
  hintUsed: z.boolean().default(false),
  msToAnswer: z.number().int().nonnegative().default(0),
  eventId: z.string().optional(),
});

export async function submitAttemptAction(
  rawInput: z.infer<typeof submitAttemptInputSchema>
): Promise<Result<QuestionAttempt>> {
  // 1. Periksa sesi siswa
  const cookieStore = await cookies();
  const studentToken = cookieStore.get(STUDENT_COOKIE_NAME)?.value;
  if (!studentToken) {
    return err(makeAppError("UNAUTHORIZED", "Sesi siswa tidak ditemukan"));
  }

  const session = await validateSession(studentToken, "siswa");
  if (!session || !session.studentId) {
    return err(makeAppError("UNAUTHORIZED", "Sesi siswa tidak valid"));
  }

  // 2. Validasi masukan
  const parsed = submitAttemptInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return err(makeAppError("INVALID_INPUT", parsed.error.issues[0]?.message || "Masukan tidak valid"));
  }

  return recordAttempt(session.studentId, parsed.data.sessionId, {
    questionId: parsed.data.questionId,
    attemptNo: parsed.data.attemptNo,
    chosen: parsed.data.chosen,
    isCorrect: parsed.data.isCorrect,
    hintUsed: parsed.data.hintUsed,
    msToAnswer: parsed.data.msToAnswer,
    eventId: parsed.data.eventId,
  });
}
