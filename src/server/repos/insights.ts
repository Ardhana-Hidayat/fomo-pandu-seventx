import "server-only";
import { eq, and, desc, sql } from "drizzle-orm";
import { db } from "../db/client";
import {
  lessons,
  classrooms,
  students,
  sessions,
  questionAttempts,
  quizQuestions,
  publications,
} from "../db/schema";
import { ok, err, type Result, makeAppError } from "@/shared/lib/result";

export interface StudentLessonResult {
  sessionId: string;
  studentId: string;
  studentName: string;
  exerciseType: string;
  scoreText: string;
  scorePercentage: number;
  firstTryCorrect: number;
  totalQuestions: number;
  totalAttempts: number;
  hintsUsed: number;
  durationSeconds: number;
  finishedAt: Date;
}

export interface LessonResultsRecap {
  lessonId: string;
  lessonTitle: string;
  exerciseType: string;
  totalFinished: number;
  averageScorePercentage: number;
  results: StudentLessonResult[];
}

export interface StudentClassroomSummary {
  studentId: string;
  displayName: string;
  needsPreset: string;
  completedLessonsCount: number;
  totalSessionsCount: number;
  lastActiveAt: Date | null;
  latestScoreText: string | null;
}

export interface ClassroomResultsRecap {
  classroomId: string;
  classroomName: string;
  totalStudents: number;
  activeStudents: number;
  publishedLessonsCount: number;
  publishedLessons: Array<{ id: string; title: string }>;
  students: StudentClassroomSummary[];
  recentResults: StudentLessonResult[];
}

export async function resultsByLesson(
  teacherId: string,
  lessonId: string
): Promise<Result<LessonResultsRecap>> {
  try {
    // 1. Verifikasi kepemilikan materi oleh guru (mencegah IDOR)
    const lesson = await db
      .select()
      .from(lessons)
      .where(and(eq(lessons.id, lessonId), eq(lessons.teacherId, teacherId)))
      .limit(1)
      .then((rows) => rows[0]);

    if (!lesson) {
      return err(
        makeAppError("FORBIDDEN", "Anda tidak memiliki akses ke materi ini")
      );
    }

    // 2. Hitung jumlah total soal pada materi ini
    const totalQuestionsCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(quizQuestions)
      .where(eq(quizQuestions.lessonId, lessonId))
      .then((rows) => Number(rows[0]?.count ?? 0));

    // 3. Ambil semua sesi yang telah selesai
    const finishedSessions = await db
      .select({
        session: sessions,
        studentName: students.displayName,
      })
      .from(sessions)
      .innerJoin(students, eq(sessions.studentId, students.id))
      .where(
        and(
          eq(sessions.lessonId, lessonId),
          sql`${sessions.finishedAt} IS NOT NULL`
        )
      )
      .orderBy(desc(sessions.finishedAt));

    const results: StudentLessonResult[] = [];

    for (const item of finishedSessions) {
      const attempts = await db
        .select()
        .from(questionAttempts)
        .where(eq(questionAttempts.sessionId, item.session.id));

      // Skor = jumlah soal yang benar pada percobaan pertama (attemptNo = 1)
      const firstTryAttempts = attempts.filter((a) => a.attemptNo === 1);
      const firstTryCorrect = firstTryAttempts.filter((a) => a.isCorrect).length;
      const totalQ = totalQuestionsCount > 0 ? totalQuestionsCount : (firstTryAttempts.length || 1);

      const scorePercentage = Math.round((firstTryCorrect / totalQ) * 100);
      const hintsUsed = attempts.filter((a) => a.hintUsed).length;

      const durationMs =
        item.session.finishedAt && item.session.startedAt
          ? new Date(item.session.finishedAt).getTime() -
            new Date(item.session.startedAt).getTime()
          : 0;

      const durationSeconds = Math.max(0, Math.round(durationMs / 1000));

      results.push({
        sessionId: item.session.id,
        studentId: item.session.studentId,
        studentName: item.studentName,
        exerciseType: lesson.exerciseType,
        scoreText: `${firstTryCorrect} / ${totalQ}`,
        scorePercentage,
        firstTryCorrect,
        totalQuestions: totalQ,
        totalAttempts: attempts.length,
        hintsUsed,
        durationSeconds,
        finishedAt: item.session.finishedAt!,
      });
    }

    const totalFinished = results.length;
    const avgScore =
      totalFinished > 0
        ? Math.round(
            results.reduce((acc, r) => acc + r.scorePercentage, 0) / totalFinished
          )
        : 0;

    return ok({
      lessonId: lesson.id,
      lessonTitle: lesson.title,
      exerciseType: lesson.exerciseType,
      totalFinished,
      averageScorePercentage: avgScore,
      results,
    });
  } catch (error) {
    return err(
      makeAppError("DB_ERROR", "Gagal memuat rekap hasil materi", error)
    );
  }
}

export async function resultsByClassroom(
  teacherId: string,
  classroomId: string
): Promise<Result<ClassroomResultsRecap>> {
  try {
    // 1. Verifikasi kepemilikan kelas oleh guru
    const classroom = await db
      .select()
      .from(classrooms)
      .where(
        and(
          eq(classrooms.id, classroomId),
          eq(classrooms.teacherId, teacherId),
          sql`${classrooms.archivedAt} IS NULL`
        )
      )
      .limit(1)
      .then((rows) => rows[0]);

    if (!classroom) {
      return err(
        makeAppError("FORBIDDEN", "Anda tidak memiliki akses ke kelas ini")
      );
    }

    // 2. Daftar materi terbit di kelas ini
    const published = await db
      .select({
        id: lessons.id,
        title: lessons.title,
      })
      .from(publications)
      .innerJoin(lessons, eq(publications.lessonId, lessons.id))
      .where(
        and(
          eq(publications.classroomId, classroomId),
          eq(publications.visible, true),
          eq(lessons.status, "published")
        )
      );

    // 3. Daftar siswa di kelas ini
    const classStudents = await db
      .select()
      .from(students)
      .where(
        and(
          eq(students.classroomId, classroomId),
          sql`${students.mergedInto} IS NULL`
        )
      )
      .orderBy(sql`lower(${students.displayName}) ASC`);

    const studentSummaries: StudentClassroomSummary[] = [];
    const recentResults: StudentLessonResult[] = [];

    for (const st of classStudents) {
      const studentSessions = await db
        .select()
        .from(sessions)
        .where(
          and(
            eq(sessions.studentId, st.id),
            sql`${sessions.finishedAt} IS NOT NULL`
          )
        )
        .orderBy(desc(sessions.finishedAt));

      const totalSessionsCount = studentSessions.length;
      const completedLessonIds = new Set(studentSessions.map((s) => s.lessonId));
      const lastActiveAt = studentSessions[0]?.finishedAt ?? null;

      let latestScoreText: string | null = null;

      if (studentSessions[0]) {
        const latestS = studentSessions[0];
        const attempts = await db
          .select()
          .from(questionAttempts)
          .where(eq(questionAttempts.sessionId, latestS.id));

        const firstTry = attempts.filter((a) => a.attemptNo === 1 && a.isCorrect).length;
        const totalAttemptsCount = attempts.length;
        latestScoreText = `${firstTry} / ${firstTry + attempts.filter((a) => !a.isCorrect).length || 1}`;

        const durMs =
          latestS.finishedAt && latestS.startedAt
            ? new Date(latestS.finishedAt).getTime() - new Date(latestS.startedAt).getTime()
            : 0;

        recentResults.push({
          sessionId: latestS.id,
          studentId: st.id,
          studentName: st.displayName,
          exerciseType: "both",
          scoreText: latestScoreText,
          scorePercentage: totalAttemptsCount > 0 ? Math.round((firstTry / totalAttemptsCount) * 100) : 0,
          firstTryCorrect: firstTry,
          totalQuestions: totalAttemptsCount,
          totalAttempts: attempts.length,
          hintsUsed: attempts.filter((a) => a.hintUsed).length,
          durationSeconds: Math.max(0, Math.round(durMs / 1000)),
          finishedAt: latestS.finishedAt!,
        });
      }

      studentSummaries.push({
        studentId: st.id,
        displayName: st.displayName,
        needsPreset: st.needsPreset,
        completedLessonsCount: completedLessonIds.size,
        totalSessionsCount,
        lastActiveAt,
        latestScoreText,
      });
    }

    const activeCount = studentSummaries.filter((s) => s.totalSessionsCount > 0).length;

    return ok({
      classroomId: classroom.id,
      classroomName: classroom.name,
      totalStudents: classStudents.length,
      activeStudents: activeCount,
      publishedLessonsCount: published.length,
      publishedLessons: published,
      students: studentSummaries,
      recentResults: recentResults.sort((a, b) => b.finishedAt.getTime() - a.finishedAt.getTime()),
    });
  } catch (error) {
    return err(
      makeAppError("DB_ERROR", "Gagal memuat rekap kelas", error)
    );
  }
}
