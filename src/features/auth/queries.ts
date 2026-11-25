import "server-only";

import { cache } from "react";
import { connection } from "next/server";
import { cookies } from "next/headers";
import {
  TEACHER_COOKIE_NAME,
  STUDENT_COOKIE_NAME,
  TEACHER_SESSION_TTL_MS,
  validateSession,
  verifyTeacherCookieStateless,
  parseTeacherCookiePayload,
  parseStudentCookiePayload,
  createStudentSession,
  hashToken,
} from "@/server/security/session";
import { db } from "@/server/db/client";
import { teachers, students, classrooms, type Teacher, type Student, type Classroom } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import {
  DEMO_TEACHER_ID,
  DEMO_CLASSROOM_ID,
  DEMO_CLASS_2B_ID,
} from "@/server/db/demo-lesson-data";

export interface CurrentTeacherSession {
  teacher: Teacher;
  sessionId: string;
}

export interface CurrentStudentSession {
  student: Student;
  classroom: Classroom;
  sessionId: string;
}

const getCurrentTeacherCached = cache(async (): Promise<CurrentTeacherSession | null> => {
  await connection();
  try {
    const cookieStore = await cookies();
    const rawCookie = cookieStore.get(TEACHER_COOKIE_NAME)?.value;

    if (!rawCookie) {
      return null;
    }

    // Fast path: verifikasi stateless HMAC v1 cookie tanpa roundtrip DB berulang saat navigasi
    const stateless = verifyTeacherCookieStateless(rawCookie);
    if (stateless) {
      if (!stateless.teacherId || stateless.teacherId === DEMO_TEACHER_ID) {
        return null;
      }

      const createdAtMs =
        typeof stateless.expiresAt === "number"
          ? stateless.expiresAt - TEACHER_SESSION_TTL_MS
          : Date.now();

      const teacher: Teacher = {
        id: stateless.teacherId,
        email: stateless.email ?? null,
        displayName: stateless.displayName || "Guru",
        schoolName: null,
        authProvider: "google",
        settings: null,
        createdAt: new Date(createdAtMs),
      };

      return {
        teacher,
        sessionId: `stateless-${hashToken(stateless.token).slice(0, 16)}`,
      };
    }

    // Tolak langsung jika cookie v1 tidak valid/kedaluwarsa/di-revoke atau token demo
    const parsed = parseTeacherCookiePayload(rawCookie);
    if (!parsed || parsed.teacherId) {
      return null;
    }

    // Fallback untuk token sesi legacy berbasis DB (bukan v1 dan bukan demo)
    const session = await validateSession(rawCookie, "guru");
    if (
      !session ||
      session.role !== "guru" ||
      !session.teacherId ||
      session.teacherId === DEMO_TEACHER_ID
    ) {
      return null;
    }

    const teacher = await db
      .select()
      .from(teachers)
      .where(eq(teachers.id, session.teacherId))
      .limit(1)
      .then((rows) => rows[0]);

    if (!teacher || teacher.id === DEMO_TEACHER_ID) {
      return null;
    }

    return { teacher, sessionId: session.id };
  } catch (err) {
    console.error("getCurrentTeacher error:", err instanceof Error ? err.message : err);
    return null;
  }
});

export async function getCurrentTeacher(): Promise<CurrentTeacherSession | null> {
  return getCurrentTeacherCached();
}

export async function getCurrentStudent(): Promise<CurrentStudentSession | null> {
  await connection();
  try {
    const cookieStore = await cookies();
    const rawCookie = cookieStore.get(STUDENT_COOKIE_NAME)?.value;

    if (!rawCookie) {
      return null;
    }

    let decoded = rawCookie;
    try {
      decoded = decodeURIComponent(rawCookie);
    } catch {}

    const parsed = parseStudentCookiePayload(decoded);
    const token = parsed ? parsed.token : decoded;

    let session = await validateSession(token, "siswa");
    if (!session && parsed && parsed.studentId && parsed.classroomId) {
      try {
        const restored = await createStudentSession(parsed.studentId, parsed.classroomId);
        session = restored.session;
      } catch {}
    }

    if (!session || session.role !== "siswa" || !session.studentId || !session.classroomId) {
      return null;
    }

    let student = await db
      .select()
      .from(students)
      .where(eq(students.id, session.studentId))
      .limit(1)
      .then((rows) => rows[0]);

    let classroom = await db
      .select()
      .from(classrooms)
      .where(eq(classrooms.id, session.classroomId))
      .limit(1)
      .then((rows) => rows[0]);

    const ALL_DEMO_CLASS_IDS = [
      DEMO_CLASSROOM_ID,
      DEMO_CLASS_2B_ID,
    ];

    if (!classroom && (ALL_DEMO_CLASS_IDS.includes(session.classroomId) || !session.classroomId)) {
      const { seedDatabase } = await import("@/server/db/seed");
      await seedDatabase();
      classroom = await db
        .select()
        .from(classrooms)
        .where(eq(classrooms.id, session.classroomId))
        .limit(1)
        .then((rows) => rows[0]);
    }

    if (!student && classroom) {
      // Pulihkan siswa jika sesi valid tapi instans baru di serverless
      const displayName = parsed?.studentName || "Siswa";
      const inserted = await db
        .insert(students)
        .values({
          id: session.studentId,
          classroomId: classroom.id,
          displayName,
          needsPreset: "campuran",
        })
        .returning();
      student = inserted[0];
    }

    if (!student || !classroom) {
      return null;
    }

    return { student, classroom, sessionId: session.id };
  } catch {
    return null;
  }
}
