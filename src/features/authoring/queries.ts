import "server-only";

import { and, eq, isNull } from "drizzle-orm";
import {
  listLessonsByTeacher,
  getLessonWithContent,
  type LessonWithContent,
} from "@/server/repos/lessons";
import { db } from "@/server/db/client";
import { classrooms, lessons, publications, type Lesson } from "@/server/db/schema";
import { DEMO_TEACHER_ID } from "@/server/db/demo-lesson-data";

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

export interface LessonShareInfo {
  shareCode: string;
  joinCode: string;
  classroomName: string;
}

export async function listTeacherLessonShares(
  teacherId: string
): Promise<Record<string, LessonShareInfo>> {
  try {
    const rows = await db
      .select({
        lessonId: publications.lessonId,
        shareCode: publications.shareCode,
        joinCode: classrooms.joinCode,
        classroomName: classrooms.name,
      })
      .from(publications)
      .innerJoin(lessons, eq(publications.lessonId, lessons.id))
      .innerJoin(classrooms, eq(publications.classroomId, classrooms.id))
      .where(
        and(
          eq(lessons.teacherId, teacherId),
          eq(lessons.status, "published"),
          eq(publications.visible, true),
          isNull(classrooms.archivedAt)
        )
      );

    const shareMap: Record<string, LessonShareInfo> = {};
    for (const row of rows) {
      if (row.shareCode && !shareMap[row.lessonId]) {
        shareMap[row.lessonId] = {
          shareCode: row.shareCode,
          joinCode: row.joinCode,
          classroomName: row.classroomName,
        };
      }
    }
    return shareMap;
  } catch (error) {
    console.error("Gagal memuat kode bagikan materi:", error);
    return {};
  }
}
