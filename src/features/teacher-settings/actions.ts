"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getCurrentTeacher } from "@/features/auth";
import { db } from "@/server/db/client";
import { teachers } from "@/server/db/schema";
import {
  decryptSecret,
  encryptSecret,
  fingerprintKey,
  maskApiKey,
} from "@/server/security/crypto";
import {
  defaultKeyManager,
  verifyGeminiKey,
} from "@/server/services/ai/key-manager";
import type { Result } from "@/shared/lib/result";
import { ok, err, makeAppError } from "@/shared/lib/result";

const MAX_TEACHER_GEMINI_KEYS = 5;

export type TeacherKeyStatus = "active" | "cooldown" | "invalid";

export interface TeacherKeySummary {
  fingerprint: string;
  masked: string;
  status: TeacherKeyStatus;
  isDailyQuota?: boolean;
}

export type TeacherKeyInputItem =
  | { kind: "existing"; fingerprint: string }
  | { kind: "new"; apiKey: string };

function summarizeEncryptedKeys(encryptedKeys: string[]): TeacherKeySummary[] {
  const summaries: TeacherKeySummary[] = [];
  const seen = new Set<string>();

  for (const stored of encryptedKeys) {
    if (!stored || typeof stored !== "string") continue;
    try {
      const plain = decryptSecret(stored).trim();
      if (!plain) continue;
      const fingerprint = fingerprintKey(plain);
      if (seen.has(fingerprint)) continue;
      seen.add(fingerprint);

      const runtime = defaultKeyManager.getKeyStatus(fingerprint);
      summaries.push({
        fingerprint,
        masked: maskApiKey(plain),
        status: runtime.status,
        isDailyQuota: runtime.isDailyQuota,
      });
    } catch {
      // Skip corrupted entry
    }
  }

  return summaries;
}

export async function getTeacherGeminiKeysAction(): Promise<
  Result<{ keys: TeacherKeySummary[] }>
> {
  const session = await getCurrentTeacher();
  if (!session) {
    return err(makeAppError("UNAUTHORIZED", "Sesi guru tidak valid."));
  }

  const storedKeys = session.teacher.settings?.geminiApiKeys ?? [];
  return ok({ keys: summarizeEncryptedKeys(storedKeys) });
}

export async function saveTeacherGeminiKeysAction(
  items: Array<TeacherKeyInputItem | string>
): Promise<Result<{ keys: TeacherKeySummary[] }>> {
  const session = await getCurrentTeacher();
  if (!session) {
    return err(makeAppError("UNAUTHORIZED", "Sesi guru tidak valid."));
  }

  const existingStored = session.teacher.settings?.geminiApiKeys ?? [];
  const existingByFingerprint = new Map<string, string>();

  for (const stored of existingStored) {
    if (!stored || typeof stored !== "string") continue;
    try {
      const plain = decryptSecret(stored).trim();
      if (!plain) continue;
      const fp = fingerprintKey(plain);
      if (!existingByFingerprint.has(fp)) {
        // Re-encrypt legacy plaintext keys on save
        existingByFingerprint.set(fp, encryptSecret(plain));
      }
    } catch {
      // Ignore unreadable legacy entry
    }
  }

  const nextEncrypted: string[] = [];
  const seenFingerprints = new Set<string>();

  for (const item of items) {
    if (nextEncrypted.length >= MAX_TEACHER_GEMINI_KEYS) break;

    if (typeof item === "string") {
      const trimmed = item.trim();
      if (!trimmed) continue;
      if (trimmed.startsWith("fp:")) {
        const fp = trimmed.slice(3);
        const existingEnc = existingByFingerprint.get(fp);
        if (existingEnc && !seenFingerprints.has(fp)) {
          seenFingerprints.add(fp);
          nextEncrypted.push(existingEnc);
        }
      } else {
        const fp = fingerprintKey(trimmed);
        if (!seenFingerprints.has(fp)) {
          seenFingerprints.add(fp);
          nextEncrypted.push(encryptSecret(trimmed));
        }
      }
      continue;
    }

    if (item.kind === "existing") {
      const existingEnc = existingByFingerprint.get(item.fingerprint);
      if (existingEnc && !seenFingerprints.has(item.fingerprint)) {
        seenFingerprints.add(item.fingerprint);
        nextEncrypted.push(existingEnc);
      }
    } else if (item.kind === "new") {
      const trimmed = item.apiKey.trim();
      if (!trimmed) continue;
      const fp = fingerprintKey(trimmed);
      if (!seenFingerprints.has(fp)) {
        seenFingerprints.add(fp);
        nextEncrypted.push(encryptSecret(trimmed));
      }
    }
  }

  try {
    const nextSettings = {
      ...(session.teacher.settings ?? {}),
      geminiApiKeys: nextEncrypted,
    };

    await db
      .update(teachers)
      .set({ settings: nextSettings })
      .where(eq(teachers.id, session.teacher.id));

    revalidatePath("/guru/pengaturan");
    return ok({ keys: summarizeEncryptedKeys(nextEncrypted) });
  } catch (error) {
    return err(
      makeAppError(
        "SAVE_SETTINGS_FAILED",
        "Gagal menyimpan daftar API key Gemini.",
        error
      )
    );
  }
}

export async function testTeacherGeminiKeyAction(
  input: TeacherKeyInputItem
): Promise<
  Result<{
    fingerprint: string;
    masked: string;
    valid: boolean;
    status: "valid" | "quota" | "invalid_key" | "error";
    message: string;
  }>
> {
  const session = await getCurrentTeacher();
  if (!session) {
    return err(makeAppError("UNAUTHORIZED", "Sesi guru tidak valid."));
  }

  let rawKey = "";

  if (input.kind === "new") {
    rawKey = input.apiKey.trim();
  } else {
    const storedKeys = session.teacher.settings?.geminiApiKeys ?? [];
    for (const stored of storedKeys) {
      if (!stored || typeof stored !== "string") continue;
      try {
        const plain = decryptSecret(stored).trim();
        if (plain && fingerprintKey(plain) === input.fingerprint) {
          rawKey = plain;
          break;
        }
      } catch {
        // Ignore unreadable entry
      }
    }
  }

  if (!rawKey) {
    return err(
      makeAppError("KEY_NOT_FOUND", "API key tidak ditemukan atau kosong.")
    );
  }

  const result = await verifyGeminiKey(rawKey);
  return ok({
    fingerprint: result.fingerprint,
    masked: result.masked,
    valid: result.valid,
    status: result.status,
    message: result.message,
  });
}
