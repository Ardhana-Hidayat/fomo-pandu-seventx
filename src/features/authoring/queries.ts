import "server-only";

import {
  listLessonsByTeacher,
  getLessonWithContent,
  type LessonWithContent,
} from "@/server/repos/lessons";
import { type Lesson } from "@/server/db/schema";
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
