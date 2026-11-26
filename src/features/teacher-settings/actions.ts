"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getCurrentTeacher } from "@/features/auth";
import { db } from "@/server/db/client";
import { teachers } from "@/server/db/schema";
import type { Result } from "@/shared/lib/result";
import { ok, err, makeAppError } from "@/shared/lib/result";

export async function saveTeacherGeminiKeysAction(
  rawKeys: string[]
): Promise<Result<{ keys: string[] }>> {
  const session = await getCurrentTeacher();
  if (!session) {
    return err(makeAppError("UNAUTHORIZED", "Sesi guru tidak valid."));
  }

  const cleanKeys = Array.from(
    new Set(
      rawKeys
        .map((k) => k.trim())
        .filter((k) => k.length > 0)
    )
  ).slice(0, 10);

  try {
    const nextSettings = {
      ...(session.teacher.settings ?? {}),
      geminiApiKeys: cleanKeys,
    };

    await db
      .update(teachers)
      .set({ settings: nextSettings })
      .where(eq(teachers.id, session.teacher.id));

    revalidatePath("/guru/pengaturan");
    return ok({ keys: cleanKeys });
  } catch (error) {
    return err(
      makeAppError("SAVE_SETTINGS_FAILED", "Gagal menyimpan daftar API key Gemini.", error)
    );
  }
}
