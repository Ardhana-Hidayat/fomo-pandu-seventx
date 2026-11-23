import "server-only";
import { eq, and, sql } from "drizzle-orm";
import { db } from "../db/client";
import { audioClips, type AudioClip, type NewAudioClip } from "../db/schema";
import { ok, err, type Result, makeAppError } from "@/shared/lib/result";

export interface AudioTarget {
  targetType: "card" | "question_prompt" | "question_option" | "feedback";
  targetId: string | null;
  optionKey?: string | null;
  text: string;
  hash: string;
  clip?: AudioClip | null;
  status: "siap" | "kedaluwarsa" | "belum";
}

export async function listAudioTargets(lessonId: string): Promise<Result<AudioTarget[]>> {
  try {
    const clips = await db
      .select()
      .from(audioClips)
      .where(eq(audioClips.lessonId, lessonId));

    const targets: AudioTarget[] = clips.map((c) => ({
      targetType: c.targetType as AudioTarget["targetType"],
      targetId: c.targetId,
      optionKey: c.optionKey,
      text: "",
      hash: c.textHash,
      clip: c,
      status: c.status === "ready" ? "siap" : "belum",
    }));
    return ok(targets);
  } catch (error) {
    return err(makeAppError("DB_ERROR", "Gagal mengambil sasaran audio", error));
  }
}

export async function upsertAudioClip(
  data: Omit<NewAudioClip, "id" | "createdAt">
): Promise<Result<AudioClip>> {
  try {
    const [existing] = await db
      .select()
      .from(audioClips)
      .where(
        and(
          eq(audioClips.lessonId, data.lessonId),
          eq(audioClips.targetType, data.targetType),
          data.targetId
            ? eq(audioClips.targetId, data.targetId)
            : sql`${audioClips.targetId} IS NULL`,
          data.optionKey
            ? eq(audioClips.optionKey, data.optionKey)
            : sql`${audioClips.optionKey} IS NULL`,
          eq(audioClips.voiceKey, data.voiceKey)
        )
      );

    if (existing) {
      const [updated] = await db
        .update(audioClips)
        .set({
          model: data.model,
          textHash: data.textHash,
          assetId: data.assetId,
          durationMs: data.durationMs,
          status: data.status,
          errorCode: data.errorCode,
        })
        .where(eq(audioClips.id, existing.id))
        .returning();
      return ok(updated!);
    }

    const [inserted] = await db.insert(audioClips).values(data).returning();
    return ok(inserted!);
  } catch (error) {
    return err(makeAppError("DB_ERROR", "Gagal menyimpan klip audio", error));
  }
}

export async function getClipsForLesson(lessonId: string): Promise<Result<AudioClip[]>> {
  try {
    const clips = await db
      .select()
      .from(audioClips)
      .where(eq(audioClips.lessonId, lessonId));
    return ok(clips);
  } catch (error) {
    return err(makeAppError("DB_ERROR", "Gagal memuat klip audio materi", error));
  }
}
