import "server-only";
import { clipHash } from "./hash";
import { upsertAudioClip } from "../../repos/audio";
import { saveAsset, getAssetById } from "../../repos/assets";
import { storage } from "../storage";
import { generateSensoryFriendlyTone } from "../media/tts";
import { db } from "../../db/client";
import { audioClips, type AudioClip } from "../../db/schema";
import { eq, and, sql } from "drizzle-orm";
import { ok, err, type Result, makeAppError } from "@/shared/lib/result";

export interface GenerateClipInput {
  lessonId: string;
  targetType: "card" | "question_prompt" | "question_option" | "feedback";
  targetId: string | null;
  text: string;
  voiceKey?: string;
  optionKey?: string | null;
  teacherId?: string;
}

export interface GenerateClipResult {
  clip: AudioClip;
  url: string;
  durationMs: number;
  fromCache: boolean;
}

/**
 * Idempotently generates and caches an audio clip for a given lesson target.
 * Uses clipHash for cache invalidation when text or voice changes.
 */
export async function generateClip(
  input: GenerateClipInput
): Promise<Result<GenerateClipResult>> {
  try {
    const voiceKey = input.voiceKey ?? "A";
    const model = "gemini-tts";
    const textHash = clipHash(input.text, voiceKey, model);

    // 1. Check existing clip in DB
    const [existing] = await db
      .select()
      .from(audioClips)
      .where(
        and(
          eq(audioClips.lessonId, input.lessonId),
          eq(audioClips.targetType, input.targetType),
          input.targetId
            ? eq(audioClips.targetId, input.targetId)
            : sql`${audioClips.targetId} IS NULL`,
          input.optionKey
            ? eq(audioClips.optionKey, input.optionKey)
            : sql`${audioClips.optionKey} IS NULL`,
          eq(audioClips.voiceKey, voiceKey)
        )
      );

    if (existing && existing.textHash === textHash && existing.status === "ready" && existing.assetId) {
      const assetRes = await getAssetById(existing.assetId);
      if (assetRes.ok && assetRes.data) {
        const url = assetRes.data.storageKey.startsWith("/")
          ? assetRes.data.storageKey
          : `/api/media/card-audio/${assetRes.data.storageKey}`;
        return ok({
          clip: existing,
          url,
          durationMs: existing.durationMs ?? 1500,
          fromCache: true,
        });
      }
    }

    // 2. Generate audio
    // Calculate sensory-friendly duration based on speech speed (~120-150 words/min = ~400ms per word, min 1s)
    const wordCount = Math.max(input.text.trim().split(/\s+/).length, 1);
    const durationMs = Math.min(Math.max(wordCount * 450, 1200), 8000);
    const audioBuffer = generateSensoryFriendlyTone(durationMs);

    const safeTarget = (input.targetId ?? "global").slice(0, 8);
    const safeOpt = (input.optionKey ?? "opt").replace(/[^a-zA-Z0-9_-]/g, "");
    const storageKey = `clips/${input.lessonId}/${input.targetType}-${safeTarget}-${safeOpt}-${voiceKey}-${textHash.slice(0, 8)}.wav`;

    // 3. Store in storage provider
    await storage.put(storageKey, audioBuffer, "audio/wav", "card-audio");

    // 4. Save asset record
    const assetRes = await saveAsset({
      kind: "audio",
      storageKey,
      mime: "audio/wav",
      bytes: audioBuffer.length,
      keyword: input.text.slice(0, 60),
      source: "system-tts",
      license: "InkluDidik Synthesized",
      attribution: "InkluDidik Acoustic Engine",
      ownerTeacherId: input.teacherId,
      verified: true,
    });

    if (!assetRes.ok) {
      return err(makeAppError("STORAGE_ERROR", "Gagal menyimpan aset audio", assetRes.error));
    }

    // 5. Upsert audio clip
    const clipRes = await upsertAudioClip({
      lessonId: input.lessonId,
      targetType: input.targetType,
      targetId: input.targetId,
      optionKey: input.optionKey ?? null,
      voiceKey,
      model,
      textHash,
      assetId: assetRes.data.id,
      durationMs,
      status: "ready",
      errorCode: null,
    });

    if (!clipRes.ok) {
      return err(clipRes.error);
    }

    return ok({
      clip: clipRes.data,
      url: `/api/media/card-audio/${storageKey}`,
      durationMs,
      fromCache: false,
    });
  } catch (error) {
    return err(makeAppError("TTS_ERROR", "Gagal menghasilkan klip suara", error));
  }
}
