import "server-only";
import { eq, and } from "drizzle-orm";
import { db } from "../db/client";
import {
  sessions,
  cardEvents,
  questionAttempts,
  lessons,
  students,
  type Session,
  type CardEvent,
  type QuestionAttempt,
} from "../db/schema";
import { ok, err, type Result, makeAppError } from "@/shared/lib/result";

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
        signSystem: input.signSystem ?? "SIBI",
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
