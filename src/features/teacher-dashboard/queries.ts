import "server-only";

import { db } from "@/server/db/client";
import {
  lessons,
  publications,
  sessions,
} from "@/server/db/schema";
import { eq, and, inArray, desc } from "drizzle-orm";

export interface TeacherMateriItem {
  id: string;
  title: string;
  topic: string;
  level: string;
  status: string;
  createdAt: Date;
  shareCode: string | null;
  studentCount: number;
  completedCount: number;
  ketuntasanPercent: number;
}

export interface TeacherMateriDashboardOverview {
  lessons: TeacherMateriItem[];
  kpis: {
    totalLessons: number;
    publishedLessons: number;
    activeStudents: number;
    averageKetuntasan: number;
  };
}

/**
 * Ringkasan Beranda guru yang sepenuhnya berbasis Materi.
 */
export async function getTeacherMateriDashboardOverview(
  teacherId: string
): Promise<TeacherMateriDashboardOverview> {
  const teacherLessons = await db
    .select({
      id: lessons.id,
      title: lessons.title,
      topic: lessons.topic,
      level: lessons.level,
      status: lessons.status,
      createdAt: lessons.createdAt,
    })
    .from(lessons)
    .where(eq(lessons.teacherId, teacherId))
    .orderBy(desc(lessons.createdAt));

  if (teacherLessons.length === 0) {
    return {
      lessons: [],
      kpis: {
        totalLessons: 0,
        publishedLessons: 0,
        activeStudents: 0,
        averageKetuntasan: 0,
      },
    };
  }

  const lessonIds = teacherLessons.map((l) => l.id);

  const [pubRows, sessionRows] = await Promise.all([
    db
      .select({
        lessonId: publications.lessonId,
        shareCode: publications.shareCode,
      })
      .from(publications)
      .where(and(inArray(publications.lessonId, lessonIds), eq(publications.visible, true))),
    db
      .select({
        lessonId: sessions.lessonId,
        studentId: sessions.studentId,
        finishedAt: sessions.finishedAt,
      })
      .from(sessions)
      .where(inArray(sessions.lessonId, lessonIds)),
  ]);

  const shareCodeByLesson = new Map<string, string>();
  for (const p of pubRows) {
    if (p.shareCode && !shareCodeByLesson.has(p.lessonId)) {
      shareCodeByLesson.set(p.lessonId, p.shareCode);
    }
  }

  const studentsByLesson = new Map<string, Set<string>>();
  const completedByLesson = new Map<string, Set<string>>();
  const allActiveStudents = new Set<string>();

  for (const s of sessionRows) {
    allActiveStudents.add(s.studentId);
    let stuSet = studentsByLesson.get(s.lessonId);
    if (!stuSet) {
      stuSet = new Set();
      studentsByLesson.set(s.lessonId, stuSet);
    }
    stuSet.add(s.studentId);

    if (s.finishedAt !== null) {
      let doneSet = completedByLesson.get(s.lessonId);
      if (!doneSet) {
        doneSet = new Set();
        completedByLesson.set(s.lessonId, doneSet);
      }
      doneSet.add(s.studentId);
    }
  }

  const items: TeacherMateriItem[] = teacherLessons.map((l) => {
    const studentCount = studentsByLesson.get(l.id)?.size ?? 0;
    const completedCount = completedByLesson.get(l.id)?.size ?? 0;
    const ketuntasanPercent =
      studentCount > 0
        ? Math.min(100, Math.round((completedCount / studentCount) * 100))
        : 0;

    return {
      ...l,
      shareCode: shareCodeByLesson.get(l.id) ?? null,
      studentCount,
      completedCount,
      ketuntasanPercent,
    };
  });

  const publishedLessons = items.filter((l) => l.status === "published").length;
  const lessonsWithStudents = items.filter((l) => l.studentCount > 0);
  const averageKetuntasan =
    lessonsWithStudents.length > 0
      ? Math.round(
          lessonsWithStudents.reduce((acc, l) => acc + l.ketuntasanPercent, 0) /
            lessonsWithStudents.length
        )
      : 0;

  return {
    lessons: items,
    kpis: {
      totalLessons: items.length,
      publishedLessons,
      activeStudents: allActiveStudents.size,
      averageKetuntasan,
    },
  };
}
