"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getCurrentTeacher } from "@/features/auth";
import { db } from "@/server/db/client";
import { teachers, type Teacher } from "@/server/db/schema";
import {
  createLesson,
  updateLesson,
  deleteLesson,
  updatePresentation,
  saveCard,
  saveQuizQuestion,
  type CreateCardInput,
  type CreateQuestionInput,
  type UpdatePresentationPatch,
  type SaveCardInput,
  type SaveQuestionInput,
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

async function verifyTeacherExists(teacher: Teacher): Promise<Result<string>> {
  try {
    const existing = await db
      .select({ id: teachers.id })
      .from(teachers)
      .where(eq(teachers.id, teacher.id))
      .limit(1)
      .then((rows) => rows[0]);

    if (existing) {
      return ok(existing.id);
    }

    await db
      .insert(teachers)
      .values({
        id: teacher.id,
        email: teacher.email,
        displayName: teacher.displayName,
        schoolName: teacher.schoolName,
        authProvider: teacher.authProvider,
      })
      .onConflictDoNothing();

    const verified = await db
      .select({ id: teachers.id })
      .from(teachers)
      .where(eq(teachers.id, teacher.id))
      .limit(1)
      .then((rows) => rows[0]);

    if (!verified) {
      return err(
        makeAppError("UNAUTHORIZED", "Data guru tidak ditemukan di basis data.")
      );
    }

    return ok(verified.id);
  } catch (error) {
    return err(
      makeAppError("DB_ERROR", "Gagal memverifikasi akun guru di basis data.", error)
    );
  }
}

export async function createLessonAction(
  payload: CreateLessonPayload
): Promise<Result<{ id: string }>> {
  const teacherSession = await getCurrentTeacher();
  if (!teacherSession) {
    return err(makeAppError("UNAUTHORIZED", "Sesi guru tidak valid."));
  }

  const teacherCheck = await verifyTeacherExists(teacherSession.teacher);
  if (!teacherCheck.ok) {
    return teacherCheck;
  }
  const teacherId = teacherCheck.data;

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

  const res = await createLesson(teacherId, {
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
    const pubRes = await publishLesson(teacherId, lesson.id, classroomIdsToPublish);
    if (!pubRes.ok) {
      return pubRes;
    }
  }

  revalidatePath("/guru");
  revalidatePath("/guru/materi");
  revalidatePath(`/guru/materi/${lesson.id}`);
  revalidatePath(`/guru/materi/${lesson.id}/edit`);

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

  const teacherCheck = await verifyTeacherExists(teacherSession.teacher);
  if (!teacherCheck.ok) {
    return teacherCheck;
  }
  const teacherId = teacherCheck.data;
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

  revalidatePath("/guru");
  revalidatePath("/guru/materi");
  revalidatePath(`/guru/materi/${lessonId}`);
  revalidatePath(`/guru/materi/${lessonId}/edit`);
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

  revalidatePath("/guru");
  revalidatePath("/guru/materi");
  revalidatePath(`/guru/materi/${lessonId}`);
  revalidatePath(`/guru/materi/${lessonId}/edit`);
  return ok({ id: res.data.id });
}

export async function saveCardAction(
  lessonId: string,
  input: SaveCardInput
): Promise<Result<{ id: string }>> {
  const teacherSession = await getCurrentTeacher();
  if (!teacherSession) {
    return err(makeAppError("UNAUTHORIZED", "Sesi guru tidak valid."));
  }

  const res = await saveCard(teacherSession.teacher.id, lessonId, input);
  if (!res.ok) return res;

  revalidatePath(`/guru/materi/${lessonId}`);
  revalidatePath(`/guru/materi/${lessonId}/edit`);
  return ok({ id: res.data.id });
}

export async function saveQuizQuestionAction(
  lessonId: string,
  input: SaveQuestionInput
): Promise<Result<{ id: string }>> {
  const teacherSession = await getCurrentTeacher();
  if (!teacherSession) {
    return err(makeAppError("UNAUTHORIZED", "Sesi guru tidak valid."));
  }

  const res = await saveQuizQuestion(teacherSession.teacher.id, lessonId, input);
  if (!res.ok) return res;

  revalidatePath(`/guru/materi/${lessonId}`);
  revalidatePath(`/guru/materi/${lessonId}/edit`);
  return ok({ id: res.data.id });
}

export async function deleteLessonAction(
  lessonId: string
): Promise<Result<void>> {
  const teacherSession = await getCurrentTeacher();
  if (!teacherSession) {
    return err(makeAppError("UNAUTHORIZED", "Sesi guru tidak valid."));
  }

  const res = await deleteLesson(teacherSession.teacher.id, lessonId);
  if (!res.ok) return res;

  revalidatePath("/guru");
  revalidatePath("/guru/materi");
  revalidatePath(`/guru/materi/${lessonId}`);
  return ok(undefined);
}

