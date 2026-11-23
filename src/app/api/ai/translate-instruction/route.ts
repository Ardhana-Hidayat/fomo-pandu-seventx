import { NextResponse } from "next/server";
import { z } from "zod";
import { translateInstructionWithAI } from "@/lib/gemini";
import { resolveSign } from "@/server/services/signs";
import { findOrFetchPictogram } from "@/server/services/media/arasaac";
import { storage } from "@/server/services/storage";

const RequestSchema = z.object({
  instruction: z.string().min(2, "Instruksi lisan harus diisi minimal 2 karakter."),
  signPreference: z.enum(["SIBI", "BISINDO"]).default("SIBI"),
});

export interface EnhancedInstructionStep {
  step_number: number;
  action_label: string;
  simple_explanation: string;
  sign_letters: string[];
  sign_hints: Array<{
    letter: string;
    src: string | null;
    status: "verified" | "draft" | "missing";
  }>;
  pictogram_keyword: string;
  pictogram_url: string | null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = RequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Input instruksi tidak valid." },
        { status: 400 }
      );
    }

    const { instruction, signPreference } = parsed.data;

    const steps = await translateInstructionWithAI(instruction, signPreference);

    // Perkecil langkah dan lengkapi dengan isyarat dan piktogram visual
    const enhancedSteps: EnhancedInstructionStep[] = await Promise.all(
      steps.map(async (step) => {
        // Ambil isyarat untuk setiap huruf dalam sign_letters
        const sign_hints = await Promise.all(
          (step.sign_letters || []).map(async (letter) => {
            const resolved = await resolveSign(signPreference, letter, {
              allowDraft: true,
            });
            return {
              letter: letter.toUpperCase(),
              src: resolved ? resolved.src : null,
              status: (resolved ? resolved.status : "missing") as
                | "verified"
                | "draft"
                | "missing",
            };
          })
        );

        // Cari piktogram berdasarkan kata pertama atau kedua dari action_label
        const words = step.action_label.split(/\s+/).filter(Boolean);
        const keyword = words[1] || words[0] || "siap";
        let pictogram_url: string | null = null;

        try {
          const picRes = await findOrFetchPictogram(keyword);
          if (picRes.ok && picRes.data) {
            pictogram_url = storage.url(picRes.data.storageKey, "card-images");
          }
        } catch {
          // Abaikan jika piktogram gagal, kartu tetap berfungsi
        }

        return {
          step_number: step.step_number,
          action_label: step.action_label,
          simple_explanation: step.simple_explanation,
          sign_letters: step.sign_letters,
          sign_hints,
          pictogram_keyword: keyword,
          pictogram_url,
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: enhancedSteps,
    });
  } catch (error) {
    console.error("API Error /api/ai/translate-instruction:", error);
    return NextResponse.json(
      { error: "Gagal menerjemahkan instruksi. Coba beberapa saat lagi." },
      { status: 500 }
    );
  }
}
