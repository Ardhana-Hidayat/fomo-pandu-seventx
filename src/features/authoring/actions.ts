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
import {
  listClassroomsByTeacher,
  createClassroom,
} from "@/server/repos/classrooms";
import type { LessonShareInfo } from "./queries";
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
  exerciseType?: "match" | "order" | "both";
  optionCount?: number;
  classroomIdsToPublish?: string[];
  signSystem?: "SIBI";
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
    exerciseType,
    optionCount,
    classroomIdsToPublish,
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
    exerciseType,
    optionCount,
    signSystem: "SIBI",
    signScope,
    signSpeed,
    voiceKey,
    voiceSpeed,
  });

  if (!res.ok) {
    return res;
  }

  const lesson = res.data;

  // Jika ada wadah yang dipilih untuk diterbitkan langsung
  if (classroomIdsToPublish && classroomIdsToPublish.length > 0) {
    await publishLesson(teacherSession.teacher.id, lesson.id, classroomIdsToPublish);
  }

  revalidatePath("/guru");
  revalidatePath("/guru/materi");

  return ok({ id: lesson.id });
}

async function ensureDefaultTeacherContainer(
  teacherId: string
): Promise<Result<{ id: string; name: string; joinCode: string }>> {
  const existingRes = await listClassroomsByTeacher(teacherId);
  if (!existingRes.ok) {
    return existingRes;
  }

  const existing = existingRes.data[0];
  if (existing) {
    return ok({
      id: existing.id,
      name: existing.name,
      joinCode: existing.joinCode,
    });
  }

  const createdRes = await createClassroom(teacherId, {
    name: "Pustaka PanduIn",
    level: "sdlb",
  });
  if (!createdRes.ok) {
    return createdRes;
  }

  return ok({
    id: createdRes.data.id,
    name: createdRes.data.name,
    joinCode: createdRes.data.joinCode,
  });
}

export async function approveAndPublishAction(
  lessonId: string,
  classroomIds?: string[]
): Promise<Result<LessonShareInfo>> {
  const teacherSession = await getCurrentTeacher();
  if (!teacherSession) {
    return err(makeAppError("UNAUTHORIZED", "Sesi guru tidak valid."));
  }

  const teacherId = teacherSession.teacher.id;
  let targetIds = classroomIds?.filter(Boolean) ?? [];
  let containerMeta: { id: string; name: string; joinCode: string } | null = null;

  if (targetIds.length === 0) {
    const containerRes = await ensureDefaultTeacherContainer(teacherId);
    if (!containerRes.ok) {
      return containerRes;
    }
    containerMeta = containerRes.data;
    targetIds = [containerRes.data.id];
  }

  const pubResult = await publishLesson(teacherId, lessonId, targetIds);
  if (!pubResult.ok) {
    return pubResult;
  }

  const primaryPub = pubResult.data[0];
  if (!primaryPub?.shareCode) {
    return err(
      makeAppError("PUBLISH_FAILED", "Gagal membuat kode bagikan materi.")
    );
  }

  if (!containerMeta || containerMeta.id !== primaryPub.classroomId) {
    const listRes = await listClassroomsByTeacher(teacherId);
    const matched = listRes.ok
      ? listRes.data.find((c) => c.id === primaryPub.classroomId)
      : undefined;
    containerMeta = {
      id: primaryPub.classroomId,
      name: matched?.name ?? "Pustaka PanduIn",
      joinCode: matched?.joinCode ?? "",
    };
  }

  revalidatePath("/guru");
  revalidatePath("/guru/materi");
  revalidatePath(`/guru/materi/${lessonId}`);
  revalidatePath(`/guru/materi/${lessonId}/edit`);

  return ok({
    shareCode: primaryPub.shareCode,
    classroomId: primaryPub.classroomId,
    classroomName: containerMeta.name,
    classroomJoinCode: containerMeta.joinCode,
  });
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

  const res = await updatePresentation(teacherSession.teacher.id, lessonId, {
    ...patch,
    signSystem: "SIBI",
  });
  if (!res.ok) return res;

  revalidatePath(`/guru/materi/${lessonId}`);
  revalidatePath(`/guru/materi/${lessonId}/edit`);
  return ok({ id: res.data.id });
}

