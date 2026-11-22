import "server-only";
import { eq, and } from "drizzle-orm";
import { db } from "../db/client";
import {
  sessions,
  questionAttempts,
  cardEvents,
  type QuestionAttempt,
  type CardEvent,
} from "../db/schema";
import { ok, err, type Result, makeAppError } from "@/shared/lib/result";

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

export interface CardEventInput {
  eventId?: string;
  cardId: string;
  kind: "view" | "replay_audio" | "replay_sign";
  atMs: number;
  dwellMs?: number;
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

export async function recordBatchAttempts(
  studentId: string,
  sessionId: string,
  attempts: AttemptInput[]
): Promise<Result<QuestionAttempt[]>> {
  const saved: QuestionAttempt[] = [];
  for (const item of attempts) {
    const res = await recordAttempt(studentId, sessionId, item);
    if (!res.ok) {
      return res;
    }
    saved.push(res.data);
  }
  return ok(saved);
}

export async function listAttemptsBySession(
  studentId: string,
  sessionId: string
): Promise<Result<QuestionAttempt[]>> {
  try {
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

    const rows = await db
      .select()
      .from(questionAttempts)
      .where(eq(questionAttempts.sessionId, sessionId))
      .orderBy(questionAttempts.createdAt);

    return ok(rows);
  } catch (error) {
    return err(
      makeAppError("DB_ERROR", "Gagal memuat riwayat percobaan", error)
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
