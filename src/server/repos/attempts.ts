import "server-only";
import { eq, and, inArray } from "drizzle-orm";
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
  if (attempts.length === 0) {
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

    const eventIds = attempts
      .map((a) => a.eventId)
      .filter((id): id is string => Boolean(id));

    const existingRows =
      eventIds.length > 0
        ? await db
            .select()
            .from(questionAttempts)
            .where(inArray(questionAttempts.eventId, eventIds))
        : [];

    const existingByEventId = new Map<string, QuestionAttempt>();
    for (const row of existingRows) {
      if (row.eventId) existingByEventId.set(row.eventId, row);
    }

    const seenBatchEventIds = new Set<string>();
    const saved: QuestionAttempt[] = [];
    const toInsert: Array<{
      eventId?: string;
      sessionId: string;
      questionId: string;
      attemptNo: number;
      chosen?: Record<string, unknown>;
      isCorrect: boolean;
      hintUsed: boolean;
      msToAnswer: number;
      channelsOn: string[];
    }> = [];

    for (const item of attempts) {
      if (item.eventId) {
        const existing = existingByEventId.get(item.eventId);
        if (existing) {
          saved.push(existing);
          continue;
        }
        if (seenBatchEventIds.has(item.eventId)) {
          continue;
        }
        seenBatchEventIds.add(item.eventId);
      }

      toInsert.push({
        eventId: item.eventId,
        sessionId,
        questionId: item.questionId,
        attemptNo: item.attemptNo ?? 1,
        chosen: item.chosen,
        isCorrect: item.isCorrect,
        hintUsed: item.hintUsed ?? false,
        msToAnswer: item.msToAnswer ?? 0,
        channelsOn: item.channelsOn ?? [],
      });
    }

    const inserted =
      toInsert.length > 0
        ? await db.insert(questionAttempts).values(toInsert).returning()
        : [];

    return ok([...saved, ...inserted]);
  } catch (error) {
    return err(
      makeAppError("DB_ERROR", "Gagal mencatat percobaan soal", error)
    );
  }
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

    const eventIds = events
      .map((ev) => ev.eventId)
      .filter((id): id is string => Boolean(id));

    const existingRows =
      eventIds.length > 0
        ? await db
            .select()
            .from(cardEvents)
            .where(inArray(cardEvents.eventId, eventIds))
        : [];

    const existingByEventId = new Map<string, CardEvent>();
    for (const row of existingRows) {
      if (row.eventId) existingByEventId.set(row.eventId, row);
    }

    const seenBatchEventIds = new Set<string>();
    const saved: CardEvent[] = [];
    const toInsert: Array<{
      eventId?: string;
      sessionId: string;
      cardId: string;
      kind: "view" | "replay_audio" | "replay_sign";
      atMs: number;
      dwellMs: number;
    }> = [];

    for (const ev of events) {
      if (ev.eventId) {
        const existing = existingByEventId.get(ev.eventId);
        if (existing) {
          saved.push(existing);
          continue;
        }
        if (seenBatchEventIds.has(ev.eventId)) {
          continue;
        }
        seenBatchEventIds.add(ev.eventId);
      }

      toInsert.push({
        eventId: ev.eventId,
        sessionId,
        cardId: ev.cardId,
        kind: ev.kind,
        atMs: ev.atMs,
        dwellMs: ev.dwellMs ?? 0,
      });
    }

    const inserted =
      toInsert.length > 0
        ? await db.insert(cardEvents).values(toInsert).returning()
        : [];

    return ok([...saved, ...inserted]);
  } catch (error) {
    return err(
      makeAppError("DB_ERROR", "Gagal menyimpan peristiwa kartu", error)
    );
  }
}
