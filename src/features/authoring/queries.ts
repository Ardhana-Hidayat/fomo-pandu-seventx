import "server-only";

import {
  listLessonsByTeacher,
  getLessonWithContent,
  type LessonWithContent,
} from "@/server/repos/lessons";
import { type Lesson } from "@/server/db/schema";

export async function listTeacherLessons(
  teacherId: string
): Promise<Lesson[]> {
  const res = await listLessonsByTeacher(teacherId);
  return res.ok ? res.data : [];
}

export async function getTeacherLesson(
  lessonId: string,
  teacherId: string
): Promise<LessonWithContent | null> {
  const res = await getLessonWithContent(teacherId, lessonId);
  return res.ok ? res.data : null;
}
