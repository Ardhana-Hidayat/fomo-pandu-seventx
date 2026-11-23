import "server-only";

import { connection } from "next/server";
import { cookies } from "next/headers";
import {
  TEACHER_COOKIE_NAME,
  STUDENT_COOKIE_NAME,
  validateSession,
} from "@/server/security/session";
import { db } from "@/server/db/client";
import { teachers, students, classrooms, type Teacher, type Student, type Classroom } from "@/server/db/schema";
import { eq } from "drizzle-orm";

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

    const session = await validateSession(token);
    if (!session || session.role !== "guru" || !session.teacherId) {
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

    return { teacher, sessionId: session.id };
  } catch {
    return null;
  }
}

export async function getCurrentStudent(): Promise<CurrentStudentSession | null> {
  await connection();
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(STUDENT_COOKIE_NAME)?.value;

    if (!token) {
      return null;
    }

    const session = await validateSession(token);
    if (!session || session.role !== "siswa" || !session.studentId || !session.classroomId) {
      return null;
    }

    const student = await db
      .select()
      .from(students)
      .where(eq(students.id, session.studentId))
      .limit(1)
      .then((rows) => rows[0]);

    const classroom = await db
      .select()
      .from(classrooms)
      .where(eq(classrooms.id, session.classroomId))
      .limit(1)
      .then((rows) => rows[0]);

    if (!student || !classroom) {
      return null;
    }

    return { student, classroom, sessionId: session.id };
  } catch {
    return null;
  }
}
