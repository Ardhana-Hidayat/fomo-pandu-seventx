"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTeacher } from "@/features/auth";
import {
  createLesson,
  updateLesson,
  updatePresentation,
  type CreateCardInput,
  type CreateQuestionInput,
  type UpdatePresentationPatch,
} from "@/server/repos/lessons";
import { publishLesson } from "@/server/repos/publications";
import type { Result } from "@/shared/lib/result";
import { ok, err, makeAppError } from "@/shared/lib/result";

export interface CreateLessonPayload {
  title: string;
  topic?: string;
  level?: string;
  sourceType?: "topik" | "teks" | "pdf" | "foto";
  generatedBy?: "ai" | "fallback" | "manual";
  generationBadge?: string;
  cards: CreateCardInput[];
  questions: CreateQuestionInput[];
  classroomIdsToPublish?: string[];
  signSystem?: "SIBI" | "BISINDO";
  signScope?: "key_terms" | "all";
  signSpeed?: number;
  voiceKey?: string;
  voiceSpeed?: number;
}

export async function createLessonAction(
  payload: CreateLessonPayload
): Promise<Result<{ id: string }>> {
  const teacherSession = await getCurrentTeacher();
  if (!teacherSession) {
    return err(makeAppError("UNAUTHORIZED", "Sesi guru tidak valid."));
  }

  const {
    title,
    topic,
    level,
    sourceType,
    generatedBy,
    cards,
    questions,
    classroomIdsToPublish,
    signSystem,
    signScope,
    signSpeed,
    voiceKey,
    voiceSpeed,
  } = payload;

  const res = await createLesson(teacherSession.teacher.id, {
    title,
    topic: topic ?? title,
    level: level ?? "sdlb",
    sourceType,
    generatedBy: generatedBy ?? "fallback",
    cards,
    questions,
    signSystem,
    signScope,
    signSpeed,
    voiceKey,
    voiceSpeed,
  });

  if (!res.ok) {
    return res;
  }

  const lesson = res.data;

  // Jika ada kelas yang dipilih untuk diterbitkan langsung
  if (classroomIdsToPublish && classroomIdsToPublish.length > 0) {
    await publishLesson(teacherSession.teacher.id, lesson.id, classroomIdsToPublish);
  }

  revalidatePath("/guru");
  revalidatePath("/guru/materi");

  return ok({ id: lesson.id });
}

export async function approveAndPublishAction(
  lessonId: string,
  classroomIds: string[]
): Promise<Result<void>> {
  const teacherSession = await getCurrentTeacher();
  if (!teacherSession) {
    return err(makeAppError("UNAUTHORIZED", "Sesi guru tidak valid."));
  }

  if (classroomIds.length === 0) {
    return err(makeAppError("NO_CLASSROOMS", "Pilih minimal satu kelas tujuan penerbitan."));
  }

  const pubResult = await publishLesson(
    teacherSession.teacher.id,
    lessonId,
    classroomIds
  );

  if (!pubResult.ok) {
    return pubResult;
  }

  revalidatePath("/guru");
  revalidatePath("/guru/materi");
  revalidatePath(`/guru/materi/${lessonId}`);

  return ok(undefined);
}

export async function updateLessonAction(
  lessonId: string,
  patch: {
    title?: string;
    topic?: string;
    level?: string;
    status?: "draft" | "published";
  }
): Promise<Result<void>> {
  const teacherSession = await getCurrentTeacher();
  if (!teacherSession) {
    return err(makeAppError("UNAUTHORIZED", "Sesi guru tidak valid."));
  }

  const res = await updateLesson(teacherSession.teacher.id, lessonId, patch);
  if (!res.ok) {
    return res;
  }

  revalidatePath(`/guru/materi/${lessonId}`);
  return ok(undefined);
}

export async function updatePresentationAction(
  lessonId: string,
  patch: UpdatePresentationPatch
): Promise<Result<{ id: string }>> {
  const teacherSession = await getCurrentTeacher();
  if (!teacherSession) {
    return err(makeAppError("UNAUTHORIZED", "Sesi guru tidak valid."));
  }

  const res = await updatePresentation(teacherSession.teacher.id, lessonId, patch);
  if (!res.ok) return res;

  revalidatePath(`/guru/materi/${lessonId}`);
  revalidatePath(`/guru/materi/${lessonId}/edit`);
  return ok({ id: res.data.id });
}

