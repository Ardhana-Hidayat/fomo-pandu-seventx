"use server";

import { revalidatePath } from "next/cache";
import { getCurrentStudent } from "@/features/auth";
import {
  getOrCreateActiveSession,
  finishActiveLessonSession,
  recordAttempt,
} from "@/server/repos/sessions";
import type { Result } from "@/shared/lib/result";
import { ok, err, makeAppError } from "@/shared/lib/result";

export interface RecordQuizProgressInput {
  lessonId: string;
  questionId: string;
  isCorrect: boolean;
  attemptNo: number;
  hintUsed: boolean;
  chosen?: Record<string, unknown>;
  msToAnswer?: number;
}

export async function submitQuizAnswerAction(
  input: RecordQuizProgressInput
): Promise<Result<{ attemptId: string }>> {
  const studentSession = await getCurrentStudent();
  if (!studentSession) {
    return err(makeAppError("UNAUTHORIZED", "Sesi siswa tidak valid."));
  }

  // Gunakan sesi aktif (atau buat 1 sesi untuk seluruh kuis ini)
  const sessionRes = await getOrCreateActiveSession(studentSession.student.id, {
    lessonId: input.lessonId,
    device: "ponsel",
  });

  if (!sessionRes.ok) {
    return sessionRes;
  }

  const attemptRes = await recordAttempt(studentSession.student.id, sessionRes.data.id, {
    questionId: input.questionId,
    attemptNo: input.attemptNo,
    isCorrect: input.isCorrect,
    hintUsed: input.hintUsed,
    chosen: input.chosen,
    msToAnswer: input.msToAnswer,
  });

  if (!attemptRes.ok) {
    return attemptRes;
  }

  revalidatePath(`/guru/materi/${input.lessonId}/hasil`);
  return ok({ attemptId: String(attemptRes.data.id) });
}

export async function finishQuizSessionAction(
  lessonId: string
): Promise<Result<{ finished: boolean }>> {
  const studentSession = await getCurrentStudent();
  if (!studentSession) {
    return err(makeAppError("UNAUTHORIZED", "Sesi siswa tidak valid."));
  }

  const res = await finishActiveLessonSession(studentSession.student.id, lessonId);
  if (!res.ok) {
    return res;
  }

  revalidatePath(`/guru/materi/${lessonId}/hasil`);
  return ok({ finished: Boolean(res.data) });
}
