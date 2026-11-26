"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTeacher } from "@/features/auth";
import {
  updateSessionResult,
  deleteSessionResult,
} from "@/server/repos/sessions";
import { err, makeAppError, ok, type Result } from "@/shared/lib/result";

export async function updateLessonResultAction(
  sessionId: string,
  input: {
    studentName?: string;
    correctAttempts?: number;
    totalAttempts?: number;
  }
): Promise<Result<{ sessionId: string }>> {
  const session = await getCurrentTeacher();
  if (!session) {
    return err(makeAppError("UNAUTHORIZED", "Silakan masuk sebagai guru."));
  }

  const res = await updateSessionResult(session.teacher.id, sessionId, input);
  if (!res.ok) return res;

  revalidatePath(`/guru/materi/${res.data.lessonId}/hasil`);
  return ok({ sessionId: res.data.sessionId });
}

export async function deleteLessonResultAction(
  sessionId: string
): Promise<Result<{ deleted: true }>> {
  const session = await getCurrentTeacher();
  if (!session) {
    return err(makeAppError("UNAUTHORIZED", "Silakan masuk sebagai guru."));
  }

  const res = await deleteSessionResult(session.teacher.id, sessionId);
  if (!res.ok) return res;

  revalidatePath(`/guru/materi/${res.data.lessonId}/hasil`);
  return ok({ deleted: true });
}
