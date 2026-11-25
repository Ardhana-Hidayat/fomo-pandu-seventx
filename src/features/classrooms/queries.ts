import "server-only";

import { db } from "@/server/db/client";
import {
  classrooms,
  students,
  publications,
  lessons,
  sessions,
  questionAttempts,
  cardEvents,
  recommendations,
  quizQuestions,
  lessonCards,
  type Classroom,
  type Student,
  type Lesson,
  type Publication,
} from "@/server/db/schema";
import { eq, and, isNull, sql, inArray, desc, isNotNull } from "drizzle-orm";
import { DEMO_TEACHER_ID } from "@/server/db/demo-lesson-data";
import { createClassroom } from "@/server/repos/classrooms";

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

  const classroomIds = teacherClassrooms.map((c) => c.id);
  const [studentCounts, lessonCounts] = await Promise.all([
    db
      .select({
        classroomId: students.classroomId,
        count: sql<number>`count(*)::int`,
      })
      .from(students)
      .where(inArray(students.classroomId, classroomIds))
      .groupBy(students.classroomId),
    db
      .select({
        classroomId: publications.classroomId,
        count: sql<number>`count(*)::int`,
      })
      .from(publications)
      .where(inArray(publications.classroomId, classroomIds))
      .groupBy(publications.classroomId),
  ]);

  const studentCountMap = new Map(studentCounts.map((r) => [r.classroomId, r.count]));
  const lessonCountMap = new Map(lessonCounts.map((r) => [r.classroomId, r.count]));

  return teacherClassrooms.map((c) => ({
    ...c,
    studentCount: studentCountMap.get(c.id) ?? 0,
    lessonCount: lessonCountMap.get(c.id) ?? 0,
  }));
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

  const [classroomStudents, pubs] = await Promise.all([
    db
      .select()
      .from(students)
      .where(eq(students.classroomId, classroom.id))
      .orderBy(students.displayName),
    db
      .select()
      .from(publications)
      .where(eq(publications.classroomId, classroom.id))
      .innerJoin(lessons, eq(publications.lessonId, lessons.id)),
  ]);

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

export interface ClassroomDashboardItem extends ClassroomSummary {
  activeStudentCount: number;
  ketuntasanPercent: number;
}

export interface NeedsDistributionItem {
  key: "tunarungu" | "tunagrahita" | "autis" | "campuran";
  label: string;
  count: number;
  percent: number;
  color: string;
}

export interface TeacherDashboardOverview {
  classrooms: ClassroomDashboardItem[];
  kpis: {
    activeClassrooms: number;
    totalStudents: number;
    publishedLessons: number;
    averageKetuntasan: number;
  };
  needsDistribution: NeedsDistributionItem[];
}

function normalizeNeedsCategory(
  preset: string | null | undefined
): "tunarungu" | "tunagrahita" | "autis" | "campuran" {
  const val = (preset ?? "").toLowerCase().trim();
  if (val === "tunarungu") return "tunarungu";
  if (val === "tunagrahita" || val === "intelektual" || val === "hambatan_intelektual") {
    return "tunagrahita";
  }
  if (val === "autis" || val === "autisme") return "autis";
  return "campuran";
}

export async function getTeacherDashboardOverview(
  teacherId: string
): Promise<TeacherDashboardOverview> {
  const [baseClassrooms, publishedLessonsCount] = await Promise.all([
    listClassroomsWithStats(teacherId),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(lessons)
      .where(and(eq(lessons.teacherId, teacherId), eq(lessons.status, "published")))
      .then((rows) => rows[0]?.count ?? 0),
  ]);

  if (baseClassrooms.length === 0) {
    return {
      classrooms: [],
      kpis: {
        activeClassrooms: 0,
        totalStudents: 0,
        publishedLessons: publishedLessonsCount,
        averageKetuntasan: 0,
      },
      needsDistribution: [
        { key: "tunarungu", label: "Tunarungu", count: 0, percent: 0, color: "#0F766E" },
        { key: "tunagrahita", label: "Tunagrahita", count: 0, percent: 0, color: "#0284C7" },
        { key: "autis", label: "Autis", count: 0, percent: 0, color: "#D97706" },
        { key: "campuran", label: "Campuran", count: 0, percent: 0, color: "#7C3AED" },
      ],
    };
  }

  const classroomIds = baseClassrooms.map((c) => c.id);

  const allStudents = await db
    .select({
      id: students.id,
      classroomId: students.classroomId,
      needsPreset: students.needsPreset,
    })
    .from(students)
    .where(and(inArray(students.classroomId, classroomIds), isNull(students.mergedInto)));

  const studentIds = allStudents.map((s) => s.id);
  const finishedSessions =
    studentIds.length > 0
      ? await db
          .select({
            studentId: sessions.studentId,
            lessonId: sessions.lessonId,
          })
          .from(sessions)
          .where(and(inArray(sessions.studentId, studentIds), isNotNull(sessions.finishedAt)))
      : [];

  // Map student -> classroomId
  const studentClassroomMap = new Map<string, string>();
  for (const s of allStudents) {
    studentClassroomMap.set(s.id, s.classroomId);
  }

  // Track active students and completed (studentId:lessonId) pairs per classroom
  const activeStudentsByClass = new Map<string, Set<string>>();
  const completedPairsByClass = new Map<string, Set<string>>();

  for (const ses of finishedSessions) {
    const classId = studentClassroomMap.get(ses.studentId);
    if (!classId) continue;

    if (!activeStudentsByClass.has(classId)) {
      activeStudentsByClass.set(classId, new Set());
    }
    activeStudentsByClass.get(classId)!.add(ses.studentId);

    if (!completedPairsByClass.has(classId)) {
      completedPairsByClass.set(classId, new Set());
    }
    completedPairsByClass.get(classId)!.add(`${ses.studentId}:${ses.lessonId}`);
  }

  const classroomItems: ClassroomDashboardItem[] = baseClassrooms.map((c) => {
    const activeCount = activeStudentsByClass.get(c.id)?.size ?? 0;
    const completedPairs = completedPairsByClass.get(c.id)?.size ?? 0;
    let ketuntasanPercent = 0;

    if (c.studentCount > 0 && c.lessonCount > 0) {
      ketuntasanPercent = Math.min(
        100,
        Math.round((completedPairs / (c.studentCount * c.lessonCount)) * 100)
      );
    } else if (c.studentCount > 0) {
      ketuntasanPercent = Math.min(
        100,
        Math.round((activeCount / c.studentCount) * 100)
      );
    }

    return {
      ...c,
      activeStudentCount: activeCount,
      ketuntasanPercent,
    };
  });

  // Needs distribution
  const counts: Record<"tunarungu" | "tunagrahita" | "autis" | "campuran", number> = {
    tunarungu: 0,
    tunagrahita: 0,
    autis: 0,
    campuran: 0,
  };

  for (const s of allStudents) {
    counts[normalizeNeedsCategory(s.needsPreset)] += 1;
  }

  const totalStudents = allStudents.length;
  const toPercent = (n: number) => (totalStudents > 0 ? Math.round((n / totalStudents) * 100) : 0);

  const needsDistribution: NeedsDistributionItem[] = [
    {
      key: "tunarungu",
      label: "Tunarungu",
      count: counts.tunarungu,
      percent: toPercent(counts.tunarungu),
      color: "#0F766E",
    },
    {
      key: "tunagrahita",
      label: "Tunagrahita",
      count: counts.tunagrahita,
      percent: toPercent(counts.tunagrahita),
      color: "#0284C7",
    },
    {
      key: "autis",
      label: "Autis",
      count: counts.autis,
      percent: toPercent(counts.autis),
      color: "#D97706",
    },
    {
      key: "campuran",
      label: "Campuran",
      count: counts.campuran,
      percent: toPercent(counts.campuran),
      color: "#7C3AED",
    },
  ];

  const classesWithStudents = classroomItems.filter((c) => c.studentCount > 0);
  const averageKetuntasan =
    classesWithStudents.length > 0
      ? Math.round(
          classesWithStudents.reduce((acc, c) => acc + c.ketuntasanPercent, 0) /
            classesWithStudents.length
        )
      : 0;

  return {
    classrooms: classroomItems,
    kpis: {
      activeClassrooms: classroomItems.length,
      totalStudents,
      publishedLessons: publishedLessonsCount,
      averageKetuntasan,
    },
    needsDistribution,
  };
}

export type StudentEvaluationStatus =
  | "Perlu Perhatian Lebih"
  | "Cukup Baik"
  | "Tuntas"
  | "Belum Mulai";

export interface StudentWeakConcept {
  label: string;
  lessonTitle: string;
  errorCount: number;
}

export interface StudentEvaluationRecommendation {
  id: string;
  source: "sistem" | "analisa";
  priority: "tinggi" | "sedang" | "rendah";
  message: string;
}

export interface StudentEvaluationItem {
  studentId: string;
  displayName: string;
  needsPreset: string;
  sessionsTotal: number;
  sessionsCompleted: number;
  totalAttempts: number;
  correctAttempts: number;
  averageAccuracy: number | null;
  firstTryAccuracy: number | null;
  hintUsageCount: number;
  averageTimeMs: number | null;
  replayCount: number;
  lastActiveAt: string | null;
  weakConcepts: StudentWeakConcept[];
  status: StudentEvaluationStatus;
  evaluationRecommendations: StudentEvaluationRecommendation[];
}

export interface ClassroomStudentAnalytics {
  students: StudentEvaluationItem[];
  countsByStatus: Record<StudentEvaluationStatus, number>;
}

const STATUS_SORT_ORDER: Record<StudentEvaluationStatus, number> = {
  "Perlu Perhatian Lebih": 0,
  "Cukup Baik": 1,
  "Belum Mulai": 2,
  Tuntas: 3,
};

const PRIORITY_SORT_ORDER: Record<"tinggi" | "sedang" | "rendah", number> = {
  tinggi: 0,
  sedang: 1,
  rendah: 2,
};

function normalizePriority(value: string): "tinggi" | "sedang" | "rendah" {
  if (value === "tinggi" || value === "sedang" || value === "rendah") {
    return value;
  }
  return "sedang";
}

function formatConceptLabel(
  question: {
    prompt: string;
    keyTerms: string[];
    linkedCardId: string | null;
  },
  cardById: Map<string, { text: string }>
): string {
  if (question.linkedCardId) {
    const linked = cardById.get(question.linkedCardId);
    if (linked?.text) {
      return linked.text.length > 48
        ? `${linked.text.slice(0, 45)}...`
        : linked.text;
    }
  }
  if (question.keyTerms && question.keyTerms.length > 0 && question.keyTerms[0]) {
    return question.keyTerms[0];
  }
  return question.prompt.length > 48
    ? `${question.prompt.slice(0, 45)}...`
    : question.prompt;
}

/**
 * Menghitung ringkasan aktivitas, evaluasi status, dan rekomendasi guru per siswa dalam satu kelas.
 */
export async function getClassroomStudentAnalytics(
  classroomId: string,
  teacherId: string
): Promise<ClassroomStudentAnalytics | null> {
  const [classroom, classStudents] = await Promise.all([
    db
      .select({ id: classrooms.id })
      .from(classrooms)
      .where(
        and(
          eq(classrooms.id, classroomId),
          eq(classrooms.teacherId, teacherId),
          isNull(classrooms.archivedAt)
        )
      )
      .limit(1)
      .then((rows) => rows[0]),
    db
      .select()
      .from(students)
      .where(eq(students.classroomId, classroomId))
      .orderBy(students.displayName),
  ]);

  if (!classroom) {
    return null;
  }

  const emptyCounts: Record<StudentEvaluationStatus, number> = {
    "Perlu Perhatian Lebih": 0,
    "Cukup Baik": 0,
    Tuntas: 0,
    "Belum Mulai": 0,
  };

  if (classStudents.length === 0) {
    return { students: [], countsByStatus: emptyCounts };
  }

  const studentIds = classStudents.map((s) => s.id);

  const [classSessions, classRecommendations] = await Promise.all([
    db
      .select()
      .from(sessions)
      .where(inArray(sessions.studentId, studentIds))
      .orderBy(desc(sessions.startedAt)),
    db
      .select()
      .from(recommendations)
      .where(inArray(recommendations.studentId, studentIds))
      .orderBy(desc(recommendations.createdAt)),
  ]);

  const sessionIds = classSessions.map((s) => s.id);
  const lessonIds = Array.from(new Set(classSessions.map((s) => s.lessonId)));

  const [attempts, events, lessonRows, questionRows, cardRows] =
    await Promise.all([
      sessionIds.length > 0
        ? db
            .select()
            .from(questionAttempts)
            .where(inArray(questionAttempts.sessionId, sessionIds))
        : Promise.resolve([]),
      sessionIds.length > 0
        ? db
            .select()
            .from(cardEvents)
            .where(inArray(cardEvents.sessionId, sessionIds))
        : Promise.resolve([]),
      lessonIds.length > 0
        ? db
            .select({ id: lessons.id, title: lessons.title })
            .from(lessons)
            .where(inArray(lessons.id, lessonIds))
        : Promise.resolve([]),
      lessonIds.length > 0
        ? db
            .select({
              id: quizQuestions.id,
              lessonId: quizQuestions.lessonId,
              prompt: quizQuestions.prompt,
              keyTerms: quizQuestions.keyTerms,
              linkedCardId: quizQuestions.linkedCardId,
            })
            .from(quizQuestions)
            .where(inArray(quizQuestions.lessonId, lessonIds))
        : Promise.resolve([]),
      lessonIds.length > 0
        ? db
            .select({
              id: lessonCards.id,
              text: lessonCards.text,
            })
            .from(lessonCards)
            .where(inArray(lessonCards.lessonId, lessonIds))
        : Promise.resolve([]),
    ]);

  const lessonTitleById = new Map(lessonRows.map((l) => [l.id, l.title]));
  const questionById = new Map(questionRows.map((q) => [q.id, q]));
  const cardById = new Map(cardRows.map((c) => [c.id, c]));

  const sessionsByStudent = new Map<string, typeof classSessions>();
  const sessionToStudent = new Map<string, string>();
  const sessionToLesson = new Map<string, string>();
  for (const s of classSessions) {
    sessionToStudent.set(s.id, s.studentId);
    sessionToLesson.set(s.id, s.lessonId);
    const list = sessionsByStudent.get(s.studentId) ?? [];
    list.push(s);
    sessionsByStudent.set(s.studentId, list);
  }

  const attemptsByStudent = new Map<string, typeof attempts>();
  for (const a of attempts) {
    const sId = sessionToStudent.get(a.sessionId);
    if (!sId) continue;
    const list = attemptsByStudent.get(sId) ?? [];
    list.push(a);
    attemptsByStudent.set(sId, list);
  }

  const eventsByStudent = new Map<string, typeof events>();
  for (const e of events) {
    const sId = sessionToStudent.get(e.sessionId);
    if (!sId) continue;
    const list = eventsByStudent.get(sId) ?? [];
    list.push(e);
    eventsByStudent.set(sId, list);
  }

  const recsByStudent = new Map<string, typeof classRecommendations>();
  for (const r of classRecommendations) {
    if (r.status === "diabaikan") continue;
    const list = recsByStudent.get(r.studentId) ?? [];
    list.push(r);
    recsByStudent.set(r.studentId, list);
  }

  const evaluatedStudents: StudentEvaluationItem[] = classStudents.map(
    (student) => {
      const sSessions = sessionsByStudent.get(student.id) ?? [];
      const sAttempts = attemptsByStudent.get(student.id) ?? [];
      const sEvents = eventsByStudent.get(student.id) ?? [];
      const sRecs = recsByStudent.get(student.id) ?? [];

      const sessionsTotal = sSessions.length;
      const sessionsCompleted = sSessions.filter(
        (s) => s.finishedAt !== null
      ).length;

      const totalAttempts = sAttempts.length;
      const correctAttempts = sAttempts.filter((a) => a.isCorrect).length;
      const averageAccuracy =
        totalAttempts > 0
          ? Math.round((correctAttempts / totalAttempts) * 100)
          : null;

      const firstTryAttempts = sAttempts.filter((a) => a.attemptNo === 1);
      const firstTryCorrect = firstTryAttempts.filter((a) => a.isCorrect).length;
      const firstTryAccuracy =
        firstTryAttempts.length > 0
          ? Math.round((firstTryCorrect / firstTryAttempts.length) * 100)
          : null;

      const hintUsageCount = sAttempts.filter((a) => a.hintUsed).length;

      const timedAttempts = sAttempts.filter((a) => a.msToAnswer > 0);
      const averageTimeMs =
        timedAttempts.length > 0
          ? Math.round(
              timedAttempts.reduce((acc, a) => acc + a.msToAnswer, 0) /
                timedAttempts.length
            )
          : null;

      const replayCount = sEvents.filter(
        (e) =>
          e.kind === "replay_audio" ||
          e.kind === "replay_sign" ||
          e.kind === "ulang"
      ).length;

      const latestSession = sSessions[0];
      const lastActiveDate = latestSession
        ? latestSession.finishedAt ?? latestSession.startedAt
        : null;
      const lastActiveAt = lastActiveDate
        ? new Date(lastActiveDate).toISOString()
        : null;

      // Hitung konsep/soal yang sering salah
      const weakMap = new Map<
        string,
        { label: string; lessonTitle: string; errorCount: number }
      >();
      for (const attempt of sAttempts) {
        if (attempt.isCorrect) continue;
        const q = questionById.get(attempt.questionId);
        const lId = q?.lessonId ?? sessionToLesson.get(attempt.sessionId) ?? "";
        const lessonTitle = lessonTitleById.get(lId) ?? "Materi";
        const label = q
          ? formatConceptLabel(q, cardById)
          : "Soal latihan";
        const key = `${lId}:${label}`;
        const existing = weakMap.get(key);
        if (existing) {
          existing.errorCount += 1;
        } else {
          weakMap.set(key, { label, lessonTitle, errorCount: 1 });
        }
      }

      const weakConcepts = Array.from(weakMap.values())
        .sort((a, b) => b.errorCount - a.errorCount)
        .slice(0, 3);

      const hasHighPriorityRec = sRecs.some(
        (r) => r.status === "baru" && r.priority === "tinggi"
      );
      const highHintRatio =
        totalAttempts >= 3 && hintUsageCount / totalAttempts >= 0.5;
      const hasRepeatedWeakConcept = weakConcepts.some(
        (w) => w.errorCount >= 2
      );
      const primaryAccuracy = firstTryAccuracy ?? averageAccuracy;

      let status: StudentEvaluationStatus;
      if (sessionsTotal === 0 || (totalAttempts === 0 && sessionsCompleted === 0)) {
        status = "Belum Mulai";
      } else if (
        (primaryAccuracy !== null && primaryAccuracy < 60) ||
        hasHighPriorityRec ||
        highHintRatio ||
        hasRepeatedWeakConcept
      ) {
        status = "Perlu Perhatian Lebih";
      } else if (
        sessionsCompleted > 0 &&
        (primaryAccuracy === null || primaryAccuracy >= 80) &&
        !hasHighPriorityRec
      ) {
        status = "Tuntas";
      } else {
        status = "Cukup Baik";
      }

      emptyCounts[status] += 1;

      // Gabungkan rekomendasi sistem & analisa pedagogis konkret
      const evalRecs: StudentEvaluationRecommendation[] = [];
      const seenMessages = new Set<string>();

      for (const rec of sRecs) {
        if (seenMessages.has(rec.message)) continue;
        seenMessages.add(rec.message);
        evalRecs.push({
          id: rec.id,
          source: "sistem",
          priority: normalizePriority(rec.priority),
          message: rec.message,
        });
      }

      const addSyntheticRec = (
        idSuffix: string,
        priority: "tinggi" | "sedang" | "rendah",
        message: string
      ) => {
        if (seenMessages.has(message)) return;
        seenMessages.add(message);
        evalRecs.push({
          id: `${student.id}-${idSuffix}`,
          source: "analisa",
          priority,
          message,
        });
      };

      if (status === "Belum Mulai") {
        addSyntheticRec(
          "start",
          "sedang",
          "Ajak siswa masuk menggunakan kode kelas dan mulai sesi materi pertama dengan pendampingan."
        );
      } else {
        if (weakConcepts.length > 0) {
          const topWeak = weakConcepts[0];
          addSyntheticRec(
            "repeat-concept",
            topWeak.errorCount >= 2 ? "tinggi" : "sedang",
            `Ulangi materi "${topWeak.lessonTitle}" khususnya pada konsep "${topWeak.label}" menggunakan contoh benda nyata.`
          );
        }

        if (
          hintUsageCount >= 2 ||
          (firstTryAccuracy !== null && firstTryAccuracy < 65)
        ) {
          addSyntheticRec(
            "visual-reinforcement",
            "tinggi",
            "Aktifkan penguatan isyarat dan piktogram pada kartu materi serta kurangi pilihan pengecoh soal."
          );
        }

        if ((averageTimeMs !== null && averageTimeMs > 12000) || replayCount >= 3) {
          addSyntheticRec(
            "speech-rate",
            "sedang",
            "Sesuaikan kecepatan suara menjadi lebih lambat (0.75x–0.85x) dan beri jeda lebih panjang saat membaca soal."
          );
        }

        const presetLower = (student.needsPreset || "").toLowerCase();
        const latestChannels = (latestSession?.channelsOn ?? []).map((c) =>
          c.toLowerCase()
        );
        if (
          (presetLower === "tunarungu" || presetLower === "rungu") &&
          latestChannels.length > 0 &&
          !latestChannels.includes("isyarat") &&
          !latestChannels.includes("sign")
        ) {
          addSyntheticRec(
            "sign-channel",
            "tinggi",
            "Aktifkan saluran bahasa isyarat dan teks pada perangkat siswa agar materi visual tersampaikan penuh."
          );
        }

        const override =
          (student.settingsOverride as Record<string, unknown> | null) ?? {};
        if (
          (presetLower === "low_vision" ||
            presetLower === "low vision" ||
            presetLower === "netra") &&
          !override.highContrast
        ) {
          addSyntheticRec(
            "contrast",
            "tinggi",
            "Aktifkan mode kontras tinggi dan ukuran huruf 125%–150% untuk kenyamanan penglihatan siswa."
          );
        }

        if (status === "Tuntas" && evalRecs.length === 0) {
          addSyntheticRec(
            "advance",
            "rendah",
            "Capaian sudah tuntas. Pertahankan dan pertimbangkan menaikkan tingkat kesulitan atau jumlah pilihan soal."
          );
        }
      }

      evalRecs.sort(
        (a, b) => PRIORITY_SORT_ORDER[a.priority] - PRIORITY_SORT_ORDER[b.priority]
      );

      return {
        studentId: student.id,
        displayName: student.displayName,
        needsPreset: student.needsPreset,
        sessionsTotal,
        sessionsCompleted,
        totalAttempts,
        correctAttempts,
        averageAccuracy,
        firstTryAccuracy,
        hintUsageCount,
        averageTimeMs,
        replayCount,
        lastActiveAt,
        weakConcepts,
        status,
        evaluationRecommendations: evalRecs.slice(0, 4),
      };
    }
  );

  evaluatedStudents.sort((a, b) => {
    const statusDiff = STATUS_SORT_ORDER[a.status] - STATUS_SORT_ORDER[b.status];
    if (statusDiff !== 0) return statusDiff;
    return a.displayName.localeCompare(b.displayName, "id");
  });

  return {
    students: evaluatedStudents,
    countsByStatus: emptyCounts,
  };
}

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
 * Memastikan guru memiliki satu wadah kontainer default di balik layar
 * untuk memenuhi foreign-key publikasi & sesi siswa tanpa menampilkan UI "kelas".
 */
export async function ensureDefaultTeacherClassroom(
  teacherId: string
): Promise<Classroom> {
  const existing = await db
    .select()
    .from(classrooms)
    .where(and(eq(classrooms.teacherId, teacherId), isNull(classrooms.archivedAt)))
    .orderBy(classrooms.createdAt)
    .limit(1)
    .then((rows) => rows[0]);

  if (existing) {
    return existing;
  }

  const created = await createClassroom(teacherId, {
    name: "Materi Utama",
    level: "sdlb",
    defaultSignSystem: "SIBI",
  });

  if (!created.ok) {
    throw new Error(created.error.message);
  }

  return created.data;
}

/**
 * Ringkasan Beranda guru yang sepenuhnya berbasis Materi (tanpa UI kelas).
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
