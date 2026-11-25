import "server-only";

import { connection } from "next/server";
import { cookies } from "next/headers";
import {
  TEACHER_COOKIE_NAME,
  STUDENT_COOKIE_NAME,
  validateSession,
  parseStudentCookiePayload,
  createStudentSession,
} from "@/server/security/session";
import { db } from "@/server/db/client";
import { teachers, students, classrooms, lessons, type Teacher, type Student, type Classroom } from "@/server/db/schema";
import { eq, sql } from "drizzle-orm";
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

export async function getCurrentTeacher(): Promise<CurrentTeacherSession | null> {
  await connection();
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(TEACHER_COOKIE_NAME)?.value;

    if (!token) {
      return null;
    }

    const session = await validateSession(token, "guru");
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

    if (!teacher) {
      return null;
    }

    if (teacher.id === DEMO_TEACHER_ID && process.env.NODE_ENV !== "test") {
      try {
        const hasLessons = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(lessons)
          .where(eq(lessons.teacherId, teacher.id))
          .then((rows) => rows[0]?.count ?? 0);
        if (hasLessons === 0) {
          const { seedDatabase } = await import("@/server/db/seed");
          await seedDatabase();
        }
      } catch (e) {
        console.error("Gagal auto-seed di getCurrentTeacher:", e);
      }
    }

    return { teacher, sessionId: session.id };
  } catch {
    return null;
  }
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
