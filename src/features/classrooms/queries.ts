import "server-only";

import { db } from "@/server/db/client";
import {
  classrooms,
  students,
  publications,
  lessons,
  type Classroom,
  type Student,
  type Lesson,
  type Publication,
} from "@/server/db/schema";
import { eq, and, isNull, sql } from "drizzle-orm";
import { DEMO_TEACHER_ID } from "@/server/db/demo-lesson-data";

export interface ClassroomSummary extends Classroom {
  studentCount: number;
  lessonCount: number;
}

export interface ClassroomDetailData {
  classroom: Classroom;
  students: Student[];
  publications: Array<Publication & { lesson: Lesson }>;
}

export async function listClassroomsWithStats(
  teacherId: string
): Promise<ClassroomSummary[]> {
  let teacherClassrooms = await db
    .select()
    .from(classrooms)
    .where(and(eq(classrooms.teacherId, teacherId), isNull(classrooms.archivedAt)))
    .orderBy(classrooms.createdAt);

  if (
    teacherClassrooms.length === 0 &&
    teacherId === DEMO_TEACHER_ID &&
    process.env.NODE_ENV !== "test"
  ) {
    try {
      const { seedDatabase } = await import("@/server/db/seed");
      await seedDatabase();
      teacherClassrooms = await db
        .select()
        .from(classrooms)
        .where(and(eq(classrooms.teacherId, teacherId), isNull(classrooms.archivedAt)))
        .orderBy(classrooms.createdAt);
    } catch (e) {
      console.error("Gagal auto-seed di listClassroomsWithStats:", e);
    }
  }

  if (teacherClassrooms.length === 0) {
    return [];
  }

  const results: ClassroomSummary[] = [];

  for (const c of teacherClassrooms) {
    const studentCountRes = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(students)
      .where(eq(students.classroomId, c.id))
      .then((rows) => rows[0]?.count ?? 0);

    const lessonCountRes = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(publications)
      .where(eq(publications.classroomId, c.id))
      .then((rows) => rows[0]?.count ?? 0);

    results.push({
      ...c,
      studentCount: studentCountRes,
      lessonCount: lessonCountRes,
    });
  }

  return results;
}

export async function getClassroomDetail(
  classroomId: string,
  teacherId: string
): Promise<ClassroomDetailData | null> {
  let classroom = await db
    .select()
    .from(classrooms)
    .where(
      and(
        eq(classrooms.id, classroomId),
        eq(classrooms.teacherId, teacherId),
        isNull(classrooms.archivedAt)
      )
    )
    .limit(1)
    .then((rows) => rows[0]);

  if (
    !classroom &&
    teacherId === DEMO_TEACHER_ID &&
    process.env.NODE_ENV !== "test"
  ) {
    try {
      const { seedDatabase } = await import("@/server/db/seed");
      await seedDatabase();
      classroom = await db
        .select()
        .from(classrooms)
        .where(
          and(
            eq(classrooms.id, classroomId),
            eq(classrooms.teacherId, teacherId),
            isNull(classrooms.archivedAt)
          )
        )
        .limit(1)
        .then((rows) => rows[0]);
    } catch (e) {
      console.error("Gagal auto-seed di getClassroomDetail:", e);
    }
  }

  if (!classroom) {
    return null;
  }

  const classroomStudents = await db
    .select()
    .from(students)
    .where(eq(students.classroomId, classroom.id))
    .orderBy(students.displayName);

  const pubs = await db
    .select()
    .from(publications)
    .where(eq(publications.classroomId, classroom.id))
    .innerJoin(lessons, eq(publications.lessonId, lessons.id));

  const formattedPubs = pubs.map((row) => ({
    ...row.publications,
    lesson: row.lessons,
  }));

  return {
    classroom,
    students: classroomStudents,
    publications: formattedPubs,
  };
}
