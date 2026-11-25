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
): Promise<Result<{ classroomId: string; studentId: string; lessonId?: string }>> {
  const cleanCode = joinCode.trim();
  const cleanName = studentName.trim();

  if (cleanCode.length !== 6 || !/^\d{6}$/.test(cleanCode)) {
    return err(
      makeAppError("INVALID_CODE", "Kode kelas harus terdiri dari 6 angka.")
    );
  }

  if (!cleanName || cleanName.length < 2) {
    return err(
      makeAppError("INVALID_NAME", "Masukkan nama panggilan minimal 2 huruf.")
    );
  }

  // 1. Cari kelas aktif berdasarkan joinCode
  let classroom = await db
    .select()
    .from(classrooms)
    .where(and(eq(classrooms.joinCode, cleanCode), isNull(classrooms.archivedAt)))
    .limit(1)
    .then((rows) => rows[0]);

  const DEMO_CODES = ["123456", "222333"];
  if (!classroom && DEMO_CODES.includes(cleanCode)) {
    const { seedDatabase } = await import("@/server/db/seed");
    await seedDatabase();
    classroom = await db
      .select()
      .from(classrooms)
      .where(and(eq(classrooms.joinCode, cleanCode), isNull(classrooms.archivedAt)))
      .limit(1)
      .then((rows) => rows[0]);
  }

  if (!classroom) {
    return err(
      makeAppError(
        "CLASSROOM_NOT_FOUND",
        "Kode kelas tidak ditemukan. Cek kembali kode dari guru."
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

  const latestPub = await db
    .select({ lessonId: publications.lessonId })
    .from(publications)
    .where(eq(publications.classroomId, classroom.id))
    .orderBy(desc(publications.publishedAt))
    .limit(1)
    .then((rows) => rows[0]);

  return ok({
    classroomId: classroom.id,
    studentId,
    lessonId: latestPub?.lessonId,
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
