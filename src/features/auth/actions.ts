"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { signInDemoTeacher } from "@/server/services/auth/demo";
import {
  TEACHER_COOKIE_NAME,
  STUDENT_COOKIE_NAME,
  TEACHER_SESSION_TTL_MS,
  STUDENT_SESSION_TTL_MS,
  createStudentSession,
  invalidateSession,
  getDemoTeacherToken,
  signStudentCookiePayload,
} from "@/server/security/session";
import { db } from "@/server/db/client";
import { classrooms, publications, students } from "@/server/db/schema";
import { eq, and, isNull, sql, desc } from "drizzle-orm";
import type { Result } from "@/shared/lib/result";
import { ok, err, makeAppError } from "@/shared/lib/result";

export async function signInDemoAction(): Promise<void> {
  await signInDemoTeacher();
  const token = getDemoTeacherToken();
  const cookieStore = await cookies();

  cookieStore.set(TEACHER_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(TEACHER_SESSION_TTL_MS / 1000),
  });

  redirect("/guru");
}

export async function joinClassroomAction(
  joinCode: string,
  studentName: string
): Promise<Result<{ classroomId: string; studentId: string; lessonId?: string; joinCode: string }>> {
  const cleanCode = joinCode.trim();
  const cleanName = studentName.trim();

  if (!/^\d{6}$/.test(cleanCode)) {
    return err(
      makeAppError("INVALID_CODE", "Kode belajar harus terdiri dari 6 angka.")
    );
  }

  if (!cleanName || cleanName.length < 2) {
    return err(
      makeAppError("INVALID_NAME", "Masukkan nama panggilan minimal 2 huruf.")
    );
  }

  // 1. Cari publikasi materi berdasarkan shareCode 6 angka terlebih dahulu, lalu fallback ke joinCode 6 angka
  let targetLessonId: string | undefined;
  let classroom: typeof classrooms.$inferSelect | undefined;

  const matchedPub = await db
    .select({
      lessonId: publications.lessonId,
      classroomId: publications.classroomId,
    })
    .from(publications)
    .where(and(eq(publications.shareCode, cleanCode), eq(publications.visible, true)))
    .limit(1)
    .then((rows) => rows[0]);

  if (matchedPub) {
    targetLessonId = matchedPub.lessonId;
    classroom = await db
      .select()
      .from(classrooms)
      .where(and(eq(classrooms.id, matchedPub.classroomId), isNull(classrooms.archivedAt)))
      .limit(1)
      .then((rows) => rows[0]);
  }

  if (!classroom) {
    classroom = await db
      .select()
      .from(classrooms)
      .where(and(eq(classrooms.joinCode, cleanCode), isNull(classrooms.archivedAt)))
      .limit(1)
      .then((rows) => rows[0]);
  }

  const DEMO_CLASS_CODES = ["123456", "222333"];
  const DEMO_SHARE_CODES = ["100101", "100102"];
  if (!classroom && (DEMO_CLASS_CODES.includes(cleanCode) || DEMO_SHARE_CODES.includes(cleanCode))) {
    const { seedDatabase } = await import("@/server/db/seed");
    await seedDatabase();
    if (DEMO_SHARE_CODES.includes(cleanCode)) {
      const seededPub = await db
        .select({
          lessonId: publications.lessonId,
          classroomId: publications.classroomId,
        })
        .from(publications)
        .where(and(eq(publications.shareCode, cleanCode), eq(publications.visible, true)))
        .limit(1)
        .then((rows) => rows[0]);
      if (seededPub) {
        targetLessonId = seededPub.lessonId;
        classroom = await db
          .select()
          .from(classrooms)
          .where(and(eq(classrooms.id, seededPub.classroomId), isNull(classrooms.archivedAt)))
          .limit(1)
          .then((rows) => rows[0]);
      }
    } else {
      classroom = await db
        .select()
        .from(classrooms)
        .where(and(eq(classrooms.joinCode, cleanCode), isNull(classrooms.archivedAt)))
        .limit(1)
        .then((rows) => rows[0]);
    }
  }

  if (!classroom) {
    return err(
      makeAppError(
        "CLASSROOM_NOT_FOUND",
        "Kode belajar tidak ditemukan. Cek kembali kode dari guru."
      )
    );
  }

  // 2. Cari atau buat siswa berdasarkan nama dalam kelas
  const existingStudent = await db
    .select()
    .from(students)
    .where(
      and(
        eq(students.classroomId, classroom.id),
        eq(sql`lower(${students.displayName})`, cleanName.toLowerCase())
      )
    )
    .limit(1)
    .then((rows) => rows[0]);

  let studentId: string;
  if (existingStudent) {
    studentId = existingStudent.id;
  } else {
    const inserted = await db
      .insert(students)
      .values({
        classroomId: classroom.id,
        displayName: cleanName,
        needsPreset: "campuran",
      })
      .returning();

    const created = inserted[0];
    if (!created) {
      return err(
        makeAppError("CREATE_STUDENT_FAILED", "Gagal mendaftarkan nama siswa.")
      );
    }
    studentId = created.id;
  }

  // 3. Buat sesi siswa dan simpan di cookie (dengan signature payload tahan serverless)
  const { token } = await createStudentSession(studentId, classroom.id);
  const cookieStore = await cookies();
  const signedCookie = signStudentCookiePayload(token, studentId, classroom.id, cleanName);

  cookieStore.set(STUDENT_COOKIE_NAME, signedCookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(STUDENT_SESSION_TTL_MS / 1000),
  });

  if (!targetLessonId) {
    const latestPub = await db
      .select({ lessonId: publications.lessonId })
      .from(publications)
      .where(eq(publications.classroomId, classroom.id))
      .orderBy(desc(publications.publishedAt))
      .limit(1)
      .then((rows) => rows[0]);
    targetLessonId = latestPub?.lessonId;
  }

  return ok({
    classroomId: classroom.id,
    studentId,
    lessonId: targetLessonId,
    joinCode: classroom.joinCode,
  });
}

export async function signOutAction(): Promise<void> {
  const cookieStore = await cookies();
  const teacherToken = cookieStore.get(TEACHER_COOKIE_NAME)?.value;
  const studentToken = cookieStore.get(STUDENT_COOKIE_NAME)?.value;

  if (teacherToken) {
    await invalidateSession(teacherToken);
    cookieStore.delete(TEACHER_COOKIE_NAME);
  }

  if (studentToken) {
    await invalidateSession(studentToken);
    cookieStore.delete(STUDENT_COOKIE_NAME);
  }

  redirect("/");
}
