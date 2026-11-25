import "server-only";

import { eq, and, isNull } from "drizzle-orm";
import { db } from "@/server/db/client";
import {
  listLessonsByTeacher,
  getLessonWithContent,
  type LessonWithContent,
} from "@/server/repos/lessons";
import {
  lessons,
  publications,
  classrooms,
  type Lesson,
} from "@/server/db/schema";
import { DEMO_TEACHER_ID } from "@/server/db/demo-lesson-data";

export interface LessonShareInfo {
  shareCode: string;
  classroomId: string;
  classroomName: string;
  classroomJoinCode: string;
}

async function queryLessonShares(
  teacherId: string,
  lessonId?: string
): Promise<Array<LessonShareInfo & { lessonId: string }>> {
  const conditions = [
    eq(lessons.teacherId, teacherId),
    eq(publications.visible, true),
    isNull(classrooms.archivedAt),
  ];
  if (lessonId) {
    conditions.push(eq(publications.lessonId, lessonId));
  }

  const rows = await db
    .select({
      lessonId: publications.lessonId,
      shareCode: publications.shareCode,
      classroomId: classrooms.id,
      classroomName: classrooms.name,
      classroomJoinCode: classrooms.joinCode,
    })
    .from(publications)
    .innerJoin(lessons, eq(publications.lessonId, lessons.id))
    .innerJoin(classrooms, eq(publications.classroomId, classrooms.id))
    .where(and(...conditions));

  return rows
    .filter((row): row is typeof row & { shareCode: string } => Boolean(row.shareCode))
    .map((row) => ({
      lessonId: row.lessonId,
      shareCode: row.shareCode,
      classroomId: row.classroomId,
      classroomName: row.classroomName,
      classroomJoinCode: row.classroomJoinCode,
    }));
}

export async function listTeacherLessonShares(
  teacherId: string
): Promise<Record<string, LessonShareInfo[]>> {
  try {
    const rows = await queryLessonShares(teacherId);
    const map: Record<string, LessonShareInfo[]> = {};
    for (const row of rows) {
      if (!map[row.lessonId]) {
        map[row.lessonId] = [];
      }
      map[row.lessonId].push({
        shareCode: row.shareCode,
        classroomId: row.classroomId,
        classroomName: row.classroomName,
        classroomJoinCode: row.classroomJoinCode,
      });
    }
    return map;
  } catch (error) {
    console.error("Gagal memuat info bagikan materi:", error);
    return {};
  }
}

export async function getLessonShares(
  lessonId: string,
  teacherId: string
): Promise<LessonShareInfo[]> {
  try {
    const rows = await queryLessonShares(teacherId, lessonId);
    return rows.map(({ shareCode, classroomId, classroomName, classroomJoinCode }) => ({
      shareCode,
      classroomId,
      classroomName,
      classroomJoinCode,
    }));
  } catch (error) {
    console.error("Gagal memuat info bagikan materi:", error);
    return [];
  }
}

export async function listTeacherLessons(
  teacherId: string
): Promise<Lesson[]> {
  let res = await listLessonsByTeacher(teacherId);
  if (
    res.ok &&
    res.data.length === 0 &&
    teacherId === DEMO_TEACHER_ID &&
    process.env.NODE_ENV !== "test"
  ) {
    try {
      const { seedDatabase } = await import("@/server/db/seed");
      await seedDatabase();
      res = await listLessonsByTeacher(teacherId);
    } catch (e) {
      console.error("Gagal auto-seed di listTeacherLessons:", e);
    }
  }
  return res.ok ? res.data : [];
}

export async function getTeacherLesson(
  lessonId: string,
  teacherId: string
): Promise<LessonWithContent | null> {
  let res = await getLessonWithContent(teacherId, lessonId);
  if (
    !res.ok &&
    teacherId === DEMO_TEACHER_ID &&
    process.env.NODE_ENV !== "test"
  ) {
    try {
      const { seedDatabase } = await import("@/server/db/seed");
      await seedDatabase();
      res = await getLessonWithContent(teacherId, lessonId);
    } catch (e) {
      console.error("Gagal auto-seed di getTeacherLesson:", e);
    }
  }
  return res.ok ? res.data : null;
}
