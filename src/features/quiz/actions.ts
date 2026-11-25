"use server";

import { getCurrentStudent } from "@/features/auth";
import { startSession, recordAttempt } from "@/server/repos/sessions";
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

  // Buat sesi pengerjaan kuis siswa
  const sessionRes = await startSession(studentSession.student.id, {
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

  return ok({ attemptId: String(attemptRes.data.id) });
}
