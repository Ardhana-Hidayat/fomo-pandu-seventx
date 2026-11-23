import "server-only";
import { eq, or } from "drizzle-orm";
import { db } from "../../db/client";
import { teachers, type Teacher } from "../../db/schema";
import {
  createTeacherSession,
  validateSession,
  invalidateSession,
} from "../../security/session";
import {
  DEMO_TEACHER_ID,
  DEMO_CLASSROOM_ID,
  DEMO_LESSON_ID,
  DEMO_PUBLICATION_ID,
  DEMO_STUDENT_BUDI_ID,
  DEMO_STUDENT_SITI_ID,
  DEMO_STUDENT_DONI_ID,
} from "../../db/demo-lesson-data";

export {
  DEMO_TEACHER_ID,
  DEMO_CLASSROOM_ID,
  DEMO_LESSON_ID,
  DEMO_PUBLICATION_ID,
  DEMO_STUDENT_BUDI_ID,
  DEMO_STUDENT_SITI_ID,
  DEMO_STUDENT_DONI_ID,
};

export const DEMO_TEACHER_EMAIL = "guru.demo@pandu.id";
export const DEMO_TEACHER_NAME = "Guru Demo";

export async function getOrCreateDemoTeacher(): Promise<Teacher> {
  const existing = await db
    .select()
    .from(teachers)
    .where(or(eq(teachers.id, DEMO_TEACHER_ID), eq(teachers.email, DEMO_TEACHER_EMAIL)))
    .limit(1)
    .then((rows) => rows[0]);

  if (existing) {
    return existing;
  }

  const inserted = await db
    .insert(teachers)
    .values({
      id: DEMO_TEACHER_ID,
      email: DEMO_TEACHER_EMAIL,
      displayName: DEMO_TEACHER_NAME,
      schoolName: "SLB Negeri Manisrejo",
      authProvider: "demo",
      settings: {
        theme: "light",
        fontSize: "normal",
        speechRate: 1.0,
      },
    })
    .returning();

  const created = inserted[0];
  if (!created) {
    throw new Error("Gagal membuat akun guru demo");
  }

  return created;
}

export async function signInDemoTeacher(): Promise<{
  teacher: Teacher;
  token: string;
}> {
  const teacher = await getOrCreateDemoTeacher();
  const { token } = await createTeacherSession(teacher.id);
  return { teacher, token };
}

export async function getTeacherBySessionToken(
  token: string
): Promise<Teacher | null> {
  const session = await validateSession(token, "guru");
  if (!session || !session.teacherId) {
    return null;
  }

  const teacher = await db
    .select()
    .from(teachers)
    .where(eq(teachers.id, session.teacherId))
    .limit(1)
    .then((rows) => rows[0]);

  return teacher ?? null;
}

export async function signOutTeacher(token: string): Promise<void> {
  await invalidateSession(token);
}
