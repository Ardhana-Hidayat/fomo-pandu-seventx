import "server-only";
import fs from "node:fs";
import path from "node:path";
import { eq, and } from "drizzle-orm";
import { db } from "../db/client";
import { signOverrides, lessonCards, quizQuestions, type SignOverride } from "../db/schema";
import { ok, err, type Result, makeAppError } from "@/shared/lib/result";
import { SignsManifestV2Schema, type SignItem } from "../services/signs/schema";
import { resolveSign, type ResolvedSignResult } from "../services/signs/resolve";

let cachedManifest: SignItem[] | null = null;

export function loadSignManifest(): SignItem[] {
  if (cachedManifest) return cachedManifest;
  try {
    const manifestPath = path.resolve(process.cwd(), "public/signs/manifest.json");
    if (fs.existsSync(manifestPath)) {
      const content = fs.readFileSync(manifestPath, "utf-8");
      const parsed = JSON.parse(content);
      const validated = SignsManifestV2Schema.safeParse(parsed);
      if (validated.success) {
        cachedManifest = validated.data.items;
        return cachedManifest;
      }
    }
  } catch (err) {
    console.error("Gagal membaca manifest isyarat:", err);
  }
  return [];
}

export async function getSignLibrary(
  teacherId: string,
  system?: "SIBI" | "BISINDO"
): Promise<Result<ResolvedSignResult[]>> {
  try {
    const manifestItems = loadSignManifest();
    const query = db
      .select()
      .from(signOverrides)
      .where(
        system
          ? and(eq(signOverrides.teacherId, teacherId), eq(signOverrides.system, system))
          : eq(signOverrides.teacherId, teacherId)
      );
    const overrides = await query;

    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
    const systems: Array<"SIBI" | "BISINDO"> = system ? [system] : ["SIBI", "BISINDO"];
    const results: ResolvedSignResult[] = [];

    for (const sys of systems) {
      for (const letter of alphabet) {
        const resolved = resolveSign(sys, letter, {
          manifestItems,
          dbOverrides: overrides.map((o) => ({
            system: o.system,
            key: o.key,
            status: o.status as "verified" | "source" | "draft" | "missing",
            verifiedBy: o.verifiedBy,
            verifiedAt: o.verifiedAt,
          })),
          isTeacherPreview: true,
        });
        results.push(resolved);
      }
    }

    return ok(results);
  } catch (error) {
    return err(makeAppError("DB_ERROR", "Gagal memuat pustaka isyarat", error));
  }
}

export async function getLessonUsedLetters(
  lessonId: string
): Promise<Result<{ letters: string[]; terms: string[] }>> {
  try {
    const cards = await db
      .select({ keyTerms: lessonCards.keyTerms })
      .from(lessonCards)
      .where(eq(lessonCards.lessonId, lessonId));

    const questions = await db
      .select({ keyTerms: quizQuestions.keyTerms })
      .from(quizQuestions)
      .where(eq(quizQuestions.lessonId, lessonId));

    const termsSet = new Set<string>();
    for (const c of cards) {
      (c.keyTerms ?? []).forEach((t) => termsSet.add(t));
    }
    for (const q of questions) {
      (q.keyTerms ?? []).forEach((t) => termsSet.add(t));
    }

    const terms = Array.from(termsSet);
    const lettersSet = new Set<string>();
    for (const term of terms) {
      const clean = term.toUpperCase().replace(/[^A-Z]/g, "");
      for (const char of clean) {
        lettersSet.add(char);
      }
    }

    const letters = Array.from(lettersSet).sort();
    return ok({ letters, terms });
  } catch (error) {
    return err(makeAppError("DB_ERROR", "Gagal memuat huruf yang digunakan", error));
  }
}

export async function markSignVerified(
  teacherId: string,
  system: "SIBI" | "BISINDO",
  letter: string,
  verifiedBy: string
): Promise<Result<SignOverride>> {
  const key = letter.trim().toUpperCase();
  try {
    const [existing] = await db
      .select()
      .from(signOverrides)
      .where(
        and(
          eq(signOverrides.teacherId, teacherId),
          eq(signOverrides.system, system),
          eq(signOverrides.key, key)
        )
      );

    if (existing) {
      const [updated] = await db
        .update(signOverrides)
        .set({
          status: "verified",
          verifiedBy,
          verifiedAt: new Date(),
        })
        .where(eq(signOverrides.id, existing.id))
        .returning();
      return ok(updated!);
    }

    const [inserted] = await db
      .insert(signOverrides)
      .values({
        teacherId,
        system,
        key,
        status: "verified",
        verifiedBy,
        verifiedAt: new Date(),
      })
      .returning();
    return ok(inserted!);
  } catch (error) {
    return err(makeAppError("DB_ERROR", "Gagal menandai isyarat terverifikasi", error));
  }
}
