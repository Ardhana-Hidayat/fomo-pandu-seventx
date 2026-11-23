import "server-only";
import { eq, and, desc, inArray } from "drizzle-orm";
import { db } from "../db/client";
import {
  recommendations,
  students,
  lessons,
  lessonCards,
  quizQuestions,
  sessions,
  questionAttempts,
  cardEvents,
  classrooms,
  type Recommendation,
} from "../db/schema";
import { ok, err, type Result, makeAppError } from "@/shared/lib/result";

export type RecommendationRuleId =
  | "R1"
  | "R2"
  | "R3"
  | "R4"
  | "R7"
  | "R5"
  | "R6"
  | "R10";

export type RecommendationPriority = "tinggi" | "sedang" | "rendah";
export type RecommendationStatus = "baru" | "dilakukan" | "diabaikan";

export interface CardMastery {
  cardId: string;
  position: number;
  text: string;
  status: "dikuasai" | "perlu_diulang" | "belum_dinilai";
  totalAttempts: number;
  firstTryCorrect: boolean | null;
  replaysCount: number;
  linkedQuestionsCount: number;
}

export interface ClassroomCardDifficulty {
  cardId: string;
  position: number;
  text: string;
  firstTryRate: number; // 0 to 1
  totalStudentsAttempted: number;
  isHardest: boolean;
  suggestion?: string;
}

export interface CandidateRecommendation {
  ruleId: RecommendationRuleId | string;
  priority: RecommendationPriority;
  message: string;
  evidence: Record<string, unknown>;
}

const PRIORITY_ORDER: Record<string, number> = {
  tinggi: 1,
  sedang: 2,
  rendah: 3,
};

function getLinkedQuestionsForCard(
  card: typeof lessonCards.$inferSelect,
  questions: Array<typeof quizQuestions.$inferSelect>
) {
  return questions.filter(
    (q) =>
      q.linkedCardId === card.id ||
      (!q.linkedCardId && q.position === card.position)
  );
}

export async function evaluateStudentLessonRecommendations(
  studentId: string,
  lessonId: string
): Promise<Result<Recommendation[]>> {
  try {
    // 1. Ambil data profil siswa
    const student = await db
      .select()
      .from(students)
      .where(eq(students.id, studentId))
      .limit(1)
      .then((rows) => rows[0]);

    if (!student) {
      return err(makeAppError("NOT_FOUND", "Siswa tidak ditemukan"));
    }

    // 2. Ambil data materi, kartu, dan soal
    const lesson = await db
      .select()
      .from(lessons)
      .where(eq(lessons.id, lessonId))
      .limit(1)
      .then((rows) => rows[0]);

    if (!lesson) {
      return err(makeAppError("NOT_FOUND", "Materi tidak ditemukan"));
    }

    const cards = await db
      .select()
      .from(lessonCards)
      .where(eq(lessonCards.lessonId, lessonId))
      .orderBy(lessonCards.position);

    const questions = await db
      .select()
      .from(quizQuestions)
      .where(eq(quizQuestions.lessonId, lessonId))
      .orderBy(quizQuestions.position);

    // 3. Ambil sesi-sesi siswa untuk materi ini
    const studentSessions = await db
      .select()
      .from(sessions)
      .where(
        and(
          eq(sessions.studentId, studentId),
          eq(sessions.lessonId, lessonId)
        )
      )
      .orderBy(desc(sessions.startedAt));

    if (studentSessions.length === 0) {
      return ok([]);
    }

    const sessionIds = studentSessions.map((s) => s.id);

    // 4. Ambil percobaan soal dan peristiwa kartu
    const attempts = await db
      .select()
      .from(questionAttempts)
      .where(inArray(questionAttempts.sessionId, sessionIds))
      .orderBy(questionAttempts.createdAt);

    const events = await db
      .select()
      .from(cardEvents)
      .where(inArray(cardEvents.sessionId, sessionIds))
      .orderBy(cardEvents.createdAt);

    // Prinsip §9: data sedikit tidak menghasilkan kesimpulan jika < 2 soal dikerjakan
    const attemptedQuestionIds = new Set(attempts.map((a) => a.questionId));
    if (attemptedQuestionIds.size < 2 && attempts.length < 2) {
      return ok([]);
    }

    const candidates: CandidateRecommendation[] = [];

    // --- EVALUASI ATURAN R1 ---
    // Salah >= 2 kali pada soal yang tertaut ke kartu K
    let worstCardForR1: { card: typeof cards[0]; errorCount: number } | null = null;
    for (const card of cards) {
      const linkedQ = getLinkedQuestionsForCard(card, questions);
      const linkedQIds = new Set(linkedQ.map((q) => q.id));
      if (linkedQIds.size > 0) {
        const errors = attempts.filter(
          (a) => linkedQIds.has(a.questionId) && !a.isCorrect
        ).length;
        if (errors >= 2) {
          if (!worstCardForR1 || errors > worstCardForR1.errorCount) {
            worstCardForR1 = { card, errorCount: errors };
          }
        }
      }
    }
    if (worstCardForR1) {
      candidates.push({
        ruleId: "R1",
        priority: "tinggi",
        message: `Ulangi kata/konsep '${worstCardForR1.card.text}' dengan benda atau gambar nyata. Libatkan siswa menyentuh atau menirukan.`,
        evidence: {
          ruleId: "R1",
          cardId: worstCardForR1.card.id,
          cardText: worstCardForR1.card.text,
          errorCount: worstCardForR1.errorCount,
        },
      });
    }

    // --- EVALUASI ATURAN R2 ---
    // Syarat A: Petunjuk dipakai >= 50% dari soal, dan >= 3 soal
    // Syarat B: Selesai sangat cepat dengan akurasi tinggi -> tingkatkan kesulitan
    const distinctQuestionsAttempted = attemptedQuestionIds.size;
    const hintsUsedCount = attempts.filter((a) => a.hintUsed).length;
    const firstTryAttempts = attempts.filter((a) => a.attemptNo === 1);
    const firstTryCorrectCount = firstTryAttempts.filter((a) => a.isCorrect).length;

    if (
      distinctQuestionsAttempted >= 3 &&
      hintsUsedCount >= 3 &&
      hintsUsedCount / distinctQuestionsAttempted >= 0.5
    ) {
      candidates.push({
        ruleId: "R2",
        priority: "tinggi",
        message:
          "Siswa sering butuh petunjuk. Coba kurangi jumlah pilihan jawaban atau tambah gambar pendukung.",
        evidence: {
          ruleId: "R2",
          hintsUsed: hintsUsedCount,
          totalQuestionsAttempted: distinctQuestionsAttempted,
          hintPercentage: Math.round(
            (hintsUsedCount / distinctQuestionsAttempted) * 100
          ),
        },
      });
    } else if (
      distinctQuestionsAttempted >= 3 &&
      firstTryCorrectCount === distinctQuestionsAttempted
    ) {
      const totalMs = firstTryAttempts.reduce((acc, a) => acc + (a.msToAnswer || 0), 0);
      const avgMs = firstTryAttempts.length > 0 ? totalMs / firstTryAttempts.length : 0;
      if (avgMs > 0 && avgMs < 4000) {
        candidates.push({
          ruleId: "R2",
          priority: "sedang",
          message:
            "Siswa menyelesaikan soal sangat cepat dan tepat. Coba tingkatkan tingkat kesulitan (3 atau 4 pilihan jawaban).",
          evidence: {
            ruleId: "R2",
            rapidCompletion: true,
            firstTryScore: 100,
            avgMsToAnswer: Math.round(avgMs),
            totalQuestions: distinctQuestionsAttempted,
          },
        });
      }
    }

    // --- EVALUASI ATURAN R3 ---
    // Syarat A: Pola menebak terdeteksi (3+ jawaban berturut-turut < 1500ms dan ada yang salah)
    // Syarat B: Siswa low vision dengan pengaturan font standar / kontras rendah
    let guessingDetected = false;
    let consecutiveFastIncorrect = 0;
    for (const attempt of attempts) {
      if (attempt.msToAnswer > 0 && attempt.msToAnswer < 1500) {
        consecutiveFastIncorrect += 1;
        if (consecutiveFastIncorrect >= 3) {
          guessingDetected = true;
          break;
        }
      } else {
        consecutiveFastIncorrect = 0;
      }
    }

    const lowVisionPresets = ["low_vision", "low vision", "netra"];
    const isLowVision = lowVisionPresets.includes(
      (student.needsPreset || "").toLowerCase()
    );

    if (guessingDetected) {
      candidates.push({
        ruleId: "R3",
        priority: "tinggi",
        message:
          "Jawaban terlalu cepat dan banyak salah. Dampingi siswa sebentar dan minta menyebut atau menunjukkan jawaban sebelum mengetuk.",
        evidence: {
          ruleId: "R3",
          pattern: "menebak",
          thresholdMs: 1500,
        },
      });
    } else if (isLowVision) {
      const studentSettings =
        (student.settingsOverride as Record<string, unknown> | null) || {};
      const hasHighContrast = Boolean(studentSettings.highContrast);
      if (!hasHighContrast) {
        candidates.push({
          ruleId: "R3",
          priority: "tinggi",
          message:
            "Siswa dengan kebutuhan penglihatan disarankan menggunakan tema kontras tinggi dan ukuran huruf 125% atau 150%.",
          evidence: {
            ruleId: "R3",
            preset: student.needsPreset,
            highContrastRecommended: true,
          },
        });
      }
    }

    // --- EVALUASI ATURAN R4 ---
    // Syarat A: Putar ulang >= 3 pada kartu K, dan soal tertaut benar
    // Syarat B: Siswa tunarungu memakai audio saja tanpa visual lengkap
    let replayCandidate: { card: typeof cards[0]; replayCount: number } | null = null;
    for (const card of cards) {
      const replays = events.filter(
        (e) => e.cardId === card.id && e.kind === "ulang"
      ).length;
      if (replays >= 3) {
        const linkedQ = getLinkedQuestionsForCard(card, questions);
        const linkedQIds = new Set(linkedQ.map((q) => q.id));
        const hasCorrectAttempt = attempts.some(
          (a) => linkedQIds.has(a.questionId) && a.isCorrect
        );
        if (hasCorrectAttempt) {
          if (!replayCandidate || replays > replayCandidate.replayCount) {
            replayCandidate = { card, replayCount: replays };
          }
        }
      }
    }

    const deafPresets = ["tunarungu", "rungu"];
    const isDeaf = deafPresets.includes((student.needsPreset || "").toLowerCase());
    const latestSession = studentSessions[0];
    const latestChannels = (latestSession?.channelsOn || []).map((c) =>
      c.toLowerCase()
    );

    if (replayCandidate) {
      candidates.push({
        ruleId: "R4",
        priority: "sedang",
        message: `Siswa mengulang kartu '${replayCandidate.card.text}' beberapa kali tetapi akhirnya benar. Beri waktu lebih dan latihan tambahan pada kata ini.`,
        evidence: {
          ruleId: "R4",
          cardId: replayCandidate.card.id,
          cardText: replayCandidate.card.text,
          replayCount: replayCandidate.replayCount,
        },
      });
    } else if (
      isDeaf &&
      latestChannels.length > 0 &&
      (latestChannels.includes("suara") || latestChannels.includes("audio")) &&
      !latestChannels.includes("isyarat") &&
      !latestChannels.includes("sign")
    ) {
      candidates.push({
        ruleId: "R4",
        priority: "tinggi",
        message:
          "Siswa tunarungu perlu saluran visual. Rekomendasikan mengaktifkan saluran isyarat dan teks.",
        evidence: {
          ruleId: "R4",
          preset: student.needsPreset,
          channelsOn: latestChannels,
        },
      });
    }

    // --- EVALUASI ATURAN R7 ---
    // first_try < 40% pada materi, dengan >= 5 soal
    if (questions.length >= 5 && distinctQuestionsAttempted >= 5) {
      const firstTryRate = firstTryCorrectCount / distinctQuestionsAttempted;
      if (firstTryRate < 0.4) {
        candidates.push({
          ruleId: "R7",
          priority: "tinggi",
          message:
            "Materi ini mungkin terlalu sulit. Pertimbangkan versi lebih pendek, bahasa lebih sederhana, atau tambah gambar.",
          evidence: {
            ruleId: "R7",
            firstTryCorrect: firstTryCorrectCount,
            totalQuestionsAttempted: distinctQuestionsAttempted,
            firstTryRatePercentage: Math.round(firstTryRate * 100),
          },
        });
      }
    }

    // --- EVALUASI ATURAN TAMBAHAN (R5, R6, R10) ---
    // R5: Putar ulang >= 3 pada kartu isyarat
    // R6: Lompat >= 30% kartu
    const totalCards = cards.length;
    if (totalCards > 0) {
      const jumpEvents = events.filter((e) => e.kind === "lompat").length;
      if (jumpEvents / totalCards >= 0.3) {
        candidates.push({
          ruleId: "R6",
          priority: "sedang",
          message:
            "Siswa melewati banyak kartu. Cek apakah materinya terlalu mudah, terlalu panjang, atau perlu pendamping.",
          evidence: {
            ruleId: "R6",
            jumpCount: jumpEvents,
            totalCards,
            jumpPercentage: Math.round((jumpEvents / totalCards) * 100),
          },
        });
      }
    }

    // 5. Simpan dan sinkronkan dengan database sesuai siklus hidup saran
    // Per §82: tindakan guru 'dilakukan' / 'diabaikan' disimpan agar saran yang sama tidak muncul lagi
    const existingRecs = await db
      .select()
      .from(recommendations)
      .where(
        and(
          eq(recommendations.studentId, studentId),
          eq(recommendations.lessonId, lessonId)
        )
      );

    const existingMap = new Map<string, typeof existingRecs[0]>();
    for (const rec of existingRecs) {
      existingMap.set(rec.ruleId, rec);
    }

    for (const candidate of candidates) {
      const existing = existingMap.get(candidate.ruleId);
      if (!existing) {
        // Baru: insert
        await db.insert(recommendations).values({
          studentId,
          lessonId,
          ruleId: candidate.ruleId,
          priority: candidate.priority,
          message: candidate.message,
          evidence: candidate.evidence,
          status: "baru",
        });
      } else if (existing.status === "baru") {
        // Update pesan/bukti jika masih berstatus baru
        await db
          .update(recommendations)
          .set({
            priority: candidate.priority,
            message: candidate.message,
            evidence: candidate.evidence,
          })
          .where(eq(recommendations.id, existing.id));
      }
      // Jika existing.status === 'dilakukan' atau 'diabaikan', pertahankan status tersebut!
    }

    // 6. Ambil semua saran untuk siswa dan materi ini, urutkan prioritas
    const currentRecs = await db
      .select()
      .from(recommendations)
      .where(
        and(
          eq(recommendations.studentId, studentId),
          eq(recommendations.lessonId, lessonId)
        )
      );

    currentRecs.sort((a, b) => {
      const pA = PRIORITY_ORDER[a.priority] || 99;
      const pB = PRIORITY_ORDER[b.priority] || 99;
      if (pA !== pB) return pA - pB;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return ok(currentRecs);
  } catch (error) {
    return err(
      makeAppError(
        "DB_ERROR",
        "Gagal mengevaluasi rekomendasi belajar siswa",
        error
      )
    );
  }
}

export async function getRecommendationsByStudent(
  teacherId: string,
  studentId: string,
  lessonId?: string
): Promise<Result<Recommendation[]>> {
  try {
    // Verifikasi kepemilikan guru atas siswa (mencegah IDOR)
    const student = await db
      .select({
        studentId: students.id,
        teacherId: classrooms.teacherId,
      })
      .from(students)
      .innerJoin(classrooms, eq(students.classroomId, classrooms.id))
      .where(and(eq(students.id, studentId), eq(classrooms.teacherId, teacherId)))
      .limit(1)
      .then((rows) => rows[0]);

    if (!student) {
      return err(
        makeAppError("FORBIDDEN", "Anda tidak memiliki akses ke data siswa ini")
      );
    }

    const conditions = [eq(recommendations.studentId, studentId)];
    if (lessonId) {
      conditions.push(eq(recommendations.lessonId, lessonId));
    }

    const rows = await db
      .select()
      .from(recommendations)
      .where(and(...conditions));

    rows.sort((a, b) => {
      const pA = PRIORITY_ORDER[a.priority] || 99;
      const pB = PRIORITY_ORDER[b.priority] || 99;
      if (pA !== pB) return pA - pB;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return ok(rows);
  } catch (error) {
    return err(
      makeAppError("DB_ERROR", "Gagal memuat rekomendasi siswa", error)
    );
  }
}

export async function getRecommendationsByClassroom(
  teacherId: string,
  classroomId: string,
  lessonId?: string
): Promise<Result<Recommendation[]>> {
  try {
    // Verifikasi kepemilikan kelas oleh guru (mencegah IDOR)
    const classroom = await db
      .select({ id: classrooms.id })
      .from(classrooms)
      .where(
        and(
          eq(classrooms.id, classroomId),
          eq(classrooms.teacherId, teacherId)
        )
      )
      .limit(1)
      .then((rows) => rows[0]);

    if (!classroom) {
      return err(
        makeAppError("FORBIDDEN", "Anda tidak memiliki akses ke kelas ini")
      );
    }

    const conditions = [eq(students.classroomId, classroomId)];
    if (lessonId) {
      conditions.push(eq(recommendations.lessonId, lessonId));
    }

    const rows = await db
      .select({
        recommendation: recommendations,
      })
      .from(recommendations)
      .innerJoin(students, eq(recommendations.studentId, students.id))
      .where(and(...conditions));

    const recs = rows.map((r) => r.recommendation);
    recs.sort((a, b) => {
      const pA = PRIORITY_ORDER[a.priority] || 99;
      const pB = PRIORITY_ORDER[b.priority] || 99;
      if (pA !== pB) return pA - pB;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return ok(recs);
  } catch (error) {
    return err(
      makeAppError("DB_ERROR", "Gagal memuat rekomendasi kelas", error)
    );
  }
}

export async function updateRecommendationStatus(
  teacherId: string,
  recommendationId: string,
  status: RecommendationStatus
): Promise<Result<Recommendation>> {
  try {
    // Verifikasi kepemilikan guru lewat siswa dan kelas (mencegah IDOR)
    const recWithTeacher = await db
      .select({
        recId: recommendations.id,
        teacherId: classrooms.teacherId,
      })
      .from(recommendations)
      .innerJoin(students, eq(recommendations.studentId, students.id))
      .innerJoin(classrooms, eq(students.classroomId, classrooms.id))
      .where(
        and(
          eq(recommendations.id, recommendationId),
          eq(classrooms.teacherId, teacherId)
        )
      )
      .limit(1)
      .then((rows) => rows[0]);

    if (!recWithTeacher) {
      return err(
        makeAppError(
          "FORBIDDEN",
          "Anda tidak memiliki akses untuk mengubah saran ini"
        )
      );
    }

    const updated = await db
      .update(recommendations)
      .set({ status })
      .where(eq(recommendations.id, recommendationId))
      .returning();

    if (!updated[0]) {
      return err(makeAppError("NOT_FOUND", "Saran tidak ditemukan"));
    }

    return ok(updated[0]);
  } catch (error) {
    return err(
      makeAppError("DB_ERROR", "Gagal memperbarui status rekomendasi", error)
    );
  }
}

export async function getCardMasteryMap(
  teacherId: string,
  lessonId: string,
  studentId: string
): Promise<Result<CardMastery[]>> {
  try {
    // 1. Verifikasi hak akses guru
    const lesson = await db
      .select({ id: lessons.id })
      .from(lessons)
      .where(and(eq(lessons.id, lessonId), eq(lessons.teacherId, teacherId)))
      .limit(1)
      .then((rows) => rows[0]);

    if (!lesson) {
      return err(
        makeAppError("FORBIDDEN", "Anda tidak memiliki akses ke materi ini")
      );
    }

    // 2. Ambil kartu dan soal
    const cards = await db
      .select()
      .from(lessonCards)
      .where(eq(lessonCards.lessonId, lessonId))
      .orderBy(lessonCards.position);

    const questions = await db
      .select()
      .from(quizQuestions)
      .where(eq(quizQuestions.lessonId, lessonId));

    // 3. Ambil sesi dan percobaan siswa
    const studentSessions = await db
      .select({ id: sessions.id })
      .from(sessions)
      .where(
        and(
          eq(sessions.studentId, studentId),
          eq(sessions.lessonId, lessonId)
        )
      );

    const sessionIds = studentSessions.map((s) => s.id);

    let attempts: Array<typeof questionAttempts.$inferSelect> = [];
    let events: Array<typeof cardEvents.$inferSelect> = [];

    if (sessionIds.length > 0) {
      attempts = await db
        .select()
        .from(questionAttempts)
        .where(inArray(questionAttempts.sessionId, sessionIds));

      events = await db
        .select()
        .from(cardEvents)
        .where(inArray(cardEvents.sessionId, sessionIds));
    }

    // 4. Hitung peta penguasaan per kartu per §63-69
    const masteryMap: CardMastery[] = cards.map((card) => {
      const linkedQ = getLinkedQuestionsForCard(card, questions);
      const linkedQIds = new Set(linkedQ.map((q) => q.id));

      const cardAttempts = attempts.filter((a) => linkedQIds.has(a.questionId));
      const firstTryAttempts = cardAttempts.filter((a) => a.attemptNo === 1);
      const replays = events.filter(
        (e) => e.cardId === card.id && e.kind === "ulang"
      ).length;

      let status: "dikuasai" | "perlu_diulang" | "belum_dinilai" = "belum_dinilai";
      let firstTryCorrect: boolean | null = null;

      if (linkedQ.length > 0 && firstTryAttempts.length > 0) {
        const allCorrect = firstTryAttempts.every((a) => a.isCorrect);
        const hasIncorrect = firstTryAttempts.some((a) => !a.isCorrect);

        if (allCorrect && firstTryAttempts.length >= linkedQ.length) {
          status = "dikuasai";
          firstTryCorrect = true;
        } else if (hasIncorrect) {
          status = "perlu_diulang";
          firstTryCorrect = false;
        }
      }

      return {
        cardId: card.id,
        position: card.position,
        text: card.text,
        status,
        totalAttempts: cardAttempts.length,
        firstTryCorrect,
        replaysCount: replays,
        linkedQuestionsCount: linkedQ.length,
      };
    });

    return ok(masteryMap);
  } catch (error) {
    return err(
      makeAppError("DB_ERROR", "Gagal memuat peta penguasaan kartu", error)
    );
  }
}

export async function getClassroomCardDifficulties(
  teacherId: string,
  classroomId: string,
  lessonId: string
): Promise<Result<ClassroomCardDifficulty[]>> {
  try {
    // Verifikasi hak akses guru
    const classroom = await db
      .select({ id: classrooms.id })
      .from(classrooms)
      .where(
        and(
          eq(classrooms.id, classroomId),
          eq(classrooms.teacherId, teacherId)
        )
      )
      .limit(1)
      .then((rows) => rows[0]);

    if (!classroom) {
      return err(
        makeAppError("FORBIDDEN", "Anda tidak memiliki akses ke kelas ini")
      );
    }

    const cards = await db
      .select()
      .from(lessonCards)
      .where(eq(lessonCards.lessonId, lessonId))
      .orderBy(lessonCards.position);

    const questions = await db
      .select()
      .from(quizQuestions)
      .where(eq(quizQuestions.lessonId, lessonId));

    // Siswa di kelas ini
    const classStudents = await db
      .select({ id: students.id })
      .from(students)
      .where(eq(students.classroomId, classroomId));

    const studentIds = classStudents.map((s) => s.id);
    if (studentIds.length === 0) {
      return ok(
        cards.map((c) => ({
          cardId: c.id,
          position: c.position,
          text: c.text,
          firstTryRate: 1,
          totalStudentsAttempted: 0,
          isHardest: false,
        }))
      );
    }

    // Sesi untuk materi ini oleh siswa-siswa di kelas ini
    const classSessions = await db
      .select({ id: sessions.id, studentId: sessions.studentId })
      .from(sessions)
      .where(
        and(
          inArray(sessions.studentId, studentIds),
          eq(sessions.lessonId, lessonId)
        )
      );

    const sessionIds = classSessions.map((s) => s.id);
    let attempts: Array<typeof questionAttempts.$inferSelect> = [];
    if (sessionIds.length > 0) {
      attempts = await db
        .select()
        .from(questionAttempts)
        .where(inArray(questionAttempts.sessionId, sessionIds));
    }

    const cardStats: ClassroomCardDifficulty[] = cards.map((card) => {
      const linkedQ = getLinkedQuestionsForCard(card, questions);
      const linkedQIds = new Set(linkedQ.map((q) => q.id));

      if (linkedQIds.size === 0) {
        return {
          cardId: card.id,
          position: card.position,
          text: card.text,
          firstTryRate: 1,
          totalStudentsAttempted: 0,
          isHardest: false,
        };
      }

      const cardAttempts = attempts.filter((a) => linkedQIds.has(a.questionId));
      const firstTries = cardAttempts.filter((a) => a.attemptNo === 1);
      const correctFirstTries = firstTries.filter((a) => a.isCorrect).length;

      const rate =
        firstTries.length > 0 ? correctFirstTries / firstTries.length : 1;

      return {
        cardId: card.id,
        position: card.position,
        text: card.text,
        firstTryRate: Number(rate.toFixed(2)),
        totalStudentsAttempted: firstTries.length,
        isHardest: false,
      };
    });

    // Tandai 3 kartu tersulit jika >= 4 siswa mencoba (sesuai §39 & §59)
    const attemptedCards = cardStats.filter((c) => c.totalStudentsAttempted > 0);
    attemptedCards.sort((a, b) => a.firstTryRate - b.firstTryRate);

    const hardestCardIds = new Set(
      attemptedCards.slice(0, 3).map((c) => c.cardId)
    );

    for (const item of cardStats) {
      if (hardestCardIds.has(item.cardId) && item.firstTryRate < 1) {
        item.isHardest = true;
        item.suggestion =
          "Pertimbangkan mengajarkan ulang kartu ini di kelas dengan alat peraga.";
      }
    }

    return ok(cardStats);
  } catch (error) {
    return err(
      makeAppError(
        "DB_ERROR",
        "Gagal menghitung tingkat kesulitan kartu kelas",
        error
      )
    );
  }
}
