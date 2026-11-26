import "server-only";
import { eq, and, isNull, desc } from "drizzle-orm";
import { db } from "../db/client";
import {
  sessions,
  cardEvents,
  questionAttempts,
  quizQuestions,
  lessons,
  students,
  classrooms,
  type Session,
  type CardEvent,
  type QuestionAttempt,
  type Classroom,
  type Student,
} from "../db/schema";
import { ok, err, type Result, makeAppError } from "@/shared/lib/result";
import { createStudentSession } from "../security/session";
import { joinClassroom } from "./students";

export interface StartSessionInput {
  lessonId: string;
  publicationId?: string;
  device?: string;
  channelsOn?: string[];
  signSystem?: string;
  speechRate?: number;
  signSpeed?: number;
}

export interface CardEventInput {
  eventId?: string;
  cardId: string;
  kind: "view" | "replay_audio" | "replay_sign";
  atMs: number;
  dwellMs?: number;
}

export interface AttemptInput {
  eventId?: string;
  questionId: string;
  attemptNo?: number;
  chosen?: Record<string, unknown>;
  isCorrect: boolean;
  hintUsed?: boolean;
  msToAnswer?: number;
  channelsOn?: string[];
}

export interface SessionWithResults extends Session {
  studentName: string;
  totalAttempts: number;
  correctAttempts: number;
  durationMs: number | null;
}

export async function startSession(
  studentId: string,
  input: StartSessionInput
): Promise<Result<Session>> {
  try {
    const inserted = await db
      .insert(sessions)
      .values({
        studentId,
        lessonId: input.lessonId,
        publicationId: input.publicationId,
        device: input.device ?? "ponsel",
        channelsOn: input.channelsOn ?? [],
        signSystem: "SIBI",
        speechRate: input.speechRate ?? 1.0,
        signSpeed: input.signSpeed ?? 1.0,
      })
      .returning();

    const created = inserted[0];
    if (!created) {
      return err(makeAppError("CREATE_FAILED", "Gagal memulai sesi belajar"));
    }
    return ok(created);
  } catch (error) {
    return err(
      makeAppError("DB_ERROR", "Terjadi kesalahan saat memulai sesi", error)
    );
  }
}

export async function recordCardEvents(
  studentId: string,
  sessionId: string,
  events: CardEventInput[]
): Promise<Result<CardEvent[]>> {
  if (events.length === 0) {
    return ok([]);
  }

  try {
    // 1. Verifikasi kepemilikan sesi oleh siswa
    const session = await db
      .select({ id: sessions.id })
      .from(sessions)
      .where(and(eq(sessions.id, sessionId), eq(sessions.studentId, studentId)))
      .limit(1)
      .then((rows) => rows[0]);

    if (!session) {
      return err(
        makeAppError("FORBIDDEN", "Sesi tidak ditemukan atau bukan milik Anda")
      );
    }

    // 2. Simpan events dengan idempotensi eventId
    const saved: CardEvent[] = [];
    for (const ev of events) {
      if (ev.eventId) {
        const existing = await db
          .select()
          .from(cardEvents)
          .where(eq(cardEvents.eventId, ev.eventId))
          .limit(1)
          .then((rows) => rows[0]);
        if (existing) {
          saved.push(existing);
          continue;
        }
      }

      const inserted = await db
        .insert(cardEvents)
        .values({
          eventId: ev.eventId,
          sessionId,
          cardId: ev.cardId,
          kind: ev.kind,
          atMs: ev.atMs,
          dwellMs: ev.dwellMs ?? 0,
        })
        .returning();

      if (inserted[0]) saved.push(inserted[0]);
    }

    return ok(saved);
  } catch (error) {
    return err(
      makeAppError("DB_ERROR", "Gagal menyimpan peristiwa kartu", error)
    );
  }
}

export async function recordAttempt(
  studentId: string,
  sessionId: string,
  input: AttemptInput
): Promise<Result<QuestionAttempt>> {
  try {
    // 1. Verifikasi kepemilikan sesi oleh siswa
    const session = await db
      .select({ id: sessions.id })
      .from(sessions)
      .where(and(eq(sessions.id, sessionId), eq(sessions.studentId, studentId)))
      .limit(1)
      .then((rows) => rows[0]);

    if (!session) {
      return err(
        makeAppError("FORBIDDEN", "Sesi tidak ditemukan atau bukan milik Anda")
      );
    }

    // 2. Idempotensi berdasarkan eventId
    if (input.eventId) {
      const existing = await db
        .select()
        .from(questionAttempts)
        .where(eq(questionAttempts.eventId, input.eventId))
        .limit(1)
        .then((rows) => rows[0]);
      if (existing) {
        return ok(existing);
      }
    }

    const inserted = await db
      .insert(questionAttempts)
      .values({
        eventId: input.eventId,
        sessionId,
        questionId: input.questionId,
        attemptNo: input.attemptNo ?? 1,
        chosen: input.chosen,
        isCorrect: input.isCorrect,
        hintUsed: input.hintUsed ?? false,
        msToAnswer: input.msToAnswer ?? 0,
        channelsOn: input.channelsOn ?? [],
      })
      .returning();

    const record = inserted[0];
    if (!record) {
      return err(makeAppError("CREATE_FAILED", "Gagal menyimpan jawaban"));
    }
    return ok(record);
  } catch (error) {
    return err(
      makeAppError("DB_ERROR", "Gagal mencatat percobaan soal", error)
    );
  }
}

export async function finishSession(
  studentId: string,
  sessionId: string
): Promise<Result<Session>> {
  try {
    const updated = await db
      .update(sessions)
      .set({ finishedAt: new Date() })
      .where(
        and(eq(sessions.id, sessionId), eq(sessions.studentId, studentId))
      )
      .returning();

    const record = updated[0];
    if (!record) {
      return err(makeAppError("NOT_FOUND", "Sesi tidak ditemukan untuk diselesaikan"));
    }
    return ok(record);
  } catch (error) {
    return err(
      makeAppError("DB_ERROR", "Gagal menyelesaikan sesi", error)
    );
  }
}

export async function listSessionsByLesson(
  teacherId: string,
  lessonId: string
): Promise<Result<SessionWithResults[]>> {
  try {
    // 1. Verifikasi materi milik guru (mencegah IDOR)
    const lesson = await db
      .select({ id: lessons.id })
      .from(lessons)
      .where(
        and(eq(lessons.id, lessonId), eq(lessons.teacherId, teacherId))
      )
      .limit(1)
      .then((rows) => rows[0]);

    if (!lesson) {
      return err(
        makeAppError("FORBIDDEN", "Anda tidak memiliki akses ke materi ini")
      );
    }

    // 2. Ambil seluruh sesi beserta nama siswa
    const sessionRows = await db
      .select({
        session: sessions,
        studentName: students.displayName,
      })
      .from(sessions)
      .innerJoin(students, eq(sessions.studentId, students.id))
      .where(eq(sessions.lessonId, lessonId));

    const results: SessionWithResults[] = [];
    for (const r of sessionRows) {
      const attempts = await db
        .select({
          isCorrect: questionAttempts.isCorrect,
        })
        .from(questionAttempts)
        .where(eq(questionAttempts.sessionId, r.session.id));

      const totalAttempts = attempts.length;
      const correctAttempts = attempts.filter((a) => a.isCorrect).length;
      const durationMs =
        r.session.finishedAt && r.session.startedAt
          ? new Date(r.session.finishedAt).getTime() -
            new Date(r.session.startedAt).getTime()
          : null;

      results.push({
        ...r.session,
        studentName: r.studentName,
        totalAttempts,
        correctAttempts,
        durationMs,
      });
    }

    return ok(results);
  } catch (error) {
    return err(
      makeAppError("DB_ERROR", "Gagal memuat rekap hasil sesi", error)
    );
  }
}

export async function joinStudentSession(
  joinCode: string,
  nickname: string,
  needsPreset?: string
): Promise<Result<{ student: Student; classroom: Classroom; token: string }>> {
  const cleanCode = joinCode.trim();
  const cleanName = nickname.trim();

  if (!cleanCode || cleanCode.length !== 6) {
    return err(makeAppError("INVALID_CODE", "Kode kelas harus 6 digit angka"));
  }
  if (!cleanName) {
    return err(makeAppError("INVALID_NAME", "Nama panggilan tidak boleh kosong"));
  }

  try {
    const classRow = await db
      .select()
      .from(classrooms)
      .where(
        and(
          eq(classrooms.joinCode, cleanCode),
          isNull(classrooms.archivedAt)
        )
      )
      .limit(1)
      .then((rows) => rows[0]);

    if (!classRow) {
      return err(
        makeAppError("INVALID_CODE", "Kode kelas salah atau kelas tidak aktif")
      );
    }

    const studentRes = await joinClassroom(classRow.id, cleanName, needsPreset);
    if (!studentRes.ok) {
      return studentRes;
    }

    const { token } = await createStudentSession(studentRes.data.id, classRow.id);

    return ok({
      student: studentRes.data,
      classroom: classRow,
      token,
    });
  } catch (error) {
    return err(
      makeAppError("DB_ERROR", "Gagal memproses sesi siswa", error)
    );
  }
}

/**
 * Ambil sesi aktif (belum selesai) terbaru untuk (studentId, lessonId),
 * atau buat baru jika belum ada agar seluruh soal dalam 1 kuis masuk ke 1 sesi.
 */
export async function getOrCreateActiveSession(
  studentId: string,
  input: StartSessionInput
): Promise<Result<Session>> {
  try {
    const existing = await db
      .select()
      .from(sessions)
      .where(
        and(
          eq(sessions.studentId, studentId),
          eq(sessions.lessonId, input.lessonId),
          isNull(sessions.finishedAt)
        )
      )
      .orderBy(desc(sessions.startedAt))
      .limit(1)
      .then((rows) => rows[0]);

    if (existing) {
      return ok(existing);
    }

    return startSession(studentId, input);
  } catch (error) {
    return err(
      makeAppError("DB_ERROR", "Gagal mengambil sesi aktif siswa", error)
    );
  }
}

export async function finishActiveLessonSession(
  studentId: string,
  lessonId: string
): Promise<Result<Session | null>> {
  try {
    const active = await db
      .select()
      .from(sessions)
      .where(
        and(
          eq(sessions.studentId, studentId),
          eq(sessions.lessonId, lessonId),
          isNull(sessions.finishedAt)
        )
      )
      .orderBy(desc(sessions.startedAt))
      .limit(1)
      .then((rows) => rows[0]);

    if (!active) {
      return ok(null);
    }

    return finishSession(studentId, active.id);
  } catch (error) {
    return err(
      makeAppError("DB_ERROR", "Gagal menyelesaikan sesi belajar", error)
    );
  }
}

export interface UpdateSessionResultInput {
  studentName?: string;
  correctAttempts?: number;
  totalAttempts?: number;
}

/**
 * Memperbarui data rekap hasil belajar siswa (nama & skor) oleh guru pemilik materi.
 */
export async function updateSessionResult(
  teacherId: string,
  sessionId: string,
  input: UpdateSessionResultInput
): Promise<Result<{ sessionId: string; lessonId: string }>> {
  try {
    const row = await db
      .select({
        sessionId: sessions.id,
        lessonId: sessions.lessonId,
        studentId: sessions.studentId,
      })
      .from(sessions)
      .innerJoin(lessons, eq(sessions.lessonId, lessons.id))
      .where(and(eq(sessions.id, sessionId), eq(lessons.teacherId, teacherId)))
      .limit(1)
      .then((rows) => rows[0]);

    if (!row) {
      return err(
        makeAppError("FORBIDDEN", "Sesi hasil belajar tidak ditemukan atau bukan milik Anda.")
      );
    }

    if (input.studentName !== undefined) {
      const cleanName = input.studentName.trim();
      if (!cleanName) {
        return err(makeAppError("VALIDATION", "Nama siswa tidak boleh kosong."));
      }
      await db
        .update(students)
        .set({ displayName: cleanName })
        .where(eq(students.id, row.studentId));
    }

    if (
      input.correctAttempts !== undefined &&
      input.totalAttempts !== undefined
    ) {
      const total = Math.max(1, Math.min(50, Math.round(input.totalAttempts)));
      const correct = Math.max(0, Math.min(total, Math.round(input.correctAttempts)));

      const lessonQuestion = await db
        .select({ id: quizQuestions.id })
        .from(quizQuestions)
        .where(eq(quizQuestions.lessonId, row.lessonId))
        .limit(1)
        .then((rows) => rows[0]);

      if (!lessonQuestion) {
        return err(
          makeAppError("VALIDATION", "Materi belum memiliki soal kuis untuk menyimpan skor.")
        );
      }

      await db
        .delete(questionAttempts)
        .where(eq(questionAttempts.sessionId, row.sessionId));

      for (let i = 0; i < total; i++) {
        await db.insert(questionAttempts).values({
          sessionId: row.sessionId,
          questionId: lessonQuestion.id,
          attemptNo: i + 1,
          isCorrect: i < correct,
          hintUsed: false,
          msToAnswer: 0,
          channelsOn: [],
        });
      }

      await db
        .update(sessions)
        .set({ finishedAt: new Date() })
        .where(eq(sessions.id, row.sessionId));
    }

    return ok({ sessionId: row.sessionId, lessonId: row.lessonId });
  } catch (error) {
    return err(
      makeAppError("DB_ERROR", "Gagal memperbarui rekap hasil belajar", error)
    );
  }
}

/**
 * Menghapus satu sesi hasil belajar siswa oleh guru pemilik materi.
 */
export async function deleteSessionResult(
  teacherId: string,
  sessionId: string
): Promise<Result<{ lessonId: string }>> {
  try {
    const row = await db
      .select({
        sessionId: sessions.id,
        lessonId: sessions.lessonId,
      })
      .from(sessions)
      .innerJoin(lessons, eq(sessions.lessonId, lessons.id))
      .where(and(eq(sessions.id, sessionId), eq(lessons.teacherId, teacherId)))
      .limit(1)
      .then((rows) => rows[0]);

    if (!row) {
      return err(
        makeAppError("FORBIDDEN", "Sesi hasil belajar tidak ditemukan atau bukan milik Anda.")
      );
    }

    await db.delete(sessions).where(eq(sessions.id, row.sessionId));
    return ok({ lessonId: row.lessonId });
  } catch (error) {
    return err(
      makeAppError("DB_ERROR", "Gagal menghapus rekap hasil belajar", error)
    );
  }
}
