import { NextResponse } from "next/server";
import { GoogleGenAI, Type, type Schema } from "@google/genai";
import { z } from "zod";
import { getCurrentTeacher } from "@/features/auth";
import { env } from "@/server/config/env";
import { getConceptIndex } from "@/server/services/catalog";
import {
  formatVocabularyLines,
  resolveDomainsForSubject,
} from "@/server/services/ai/ingest";
import { defaultKeyManager, resolveCandidateKeys } from "@/server/services/ai/key-manager";
import { resolveMaxWords } from "@/server/services/ai/prompts";
import { sanitizeAndValidateLesson } from "@/server/services/ai/validator";
import { resolveCatalogAssetToDb } from "@/server/services/media/arasaac";
import { selectVocabulary } from "@/shared/lib/grounding/visual-retrieval";

const requestSchema = z.object({
  lessonId: z.string().optional(),
  cardText: z.string().min(1),
  topic: z.string().optional(),
  subject: z.string().optional(),
  level: z
    .enum([
      "sdlb",
      "sdlb_awal",
      "sdlb_menengah",
      "sdlb_lanjut",
      "smplb",
      "smalb",
    ])
    .optional(),
  languageComplexity: z
    .enum(["sangat_sederhana", "sederhana", "biasa"])
    .optional(),
});

const SINGLE_CARD_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    text: { type: Type.STRING },
    key_terms: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    concept: { type: Type.STRING, nullable: true },
  },
  required: ["text", "key_terms", "concept"],
};

const singleCardOutputSchema = z.object({
  text: z.string().min(1),
  key_terms: z.array(z.string()).default([]),
  concept: z.string().nullable().default(null),
});

export async function POST(request: Request) {
  try {
    const teacherSession = await getCurrentTeacher();
    if (!teacherSession) {
      return NextResponse.json(
        {
          success: false,
          error: "Sesi guru tidak valid atau telah berakhir.",
        },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parsedReq = requestSchema.safeParse(body);
    if (!parsedReq.success) {
      return NextResponse.json(
        { success: false, error: "Data kartu tidak lengkap." },
        { status: 400 }
      );
    }

    const { cardText, topic, subject, level, languageComplexity, lessonId } =
      parsedReq.data;
    const index = getConceptIndex();
    const domains = resolveDomainsForSubject(subject, `${topic ?? ""} ${cardText}`);
    const vocab = selectVocabulary(`${topic ?? ""} ${cardText}`, index, {
      limit: 60,
      domains: domains.length > 0 ? domains : undefined,
    });
    const vocabLines = formatVocabularyLines(vocab);

    const maxWords = resolveMaxWords({
      sourceType: "teks",
      level,
      languageComplexity,
    });

    const teacherEncryptedKeys =
      teacherSession.teacher.settings?.geminiApiKeys ?? [];
    const availableKeys = resolveCandidateKeys(teacherEncryptedKeys);

    let regenerated = {
      text: cardText.trim(),
      key_terms: [] as string[],
      concept: null as string | null,
    };
    let generatedBy: "ai" | "fallback" = "fallback";

    if (availableKeys.length > 0) {
      try {
        const systemInstruction = `Kamu adalah penyusun materi SLB di Indonesia.
Tulis ulang satu kalimat kartu belajar menjadi lebih jelas, konkret, pola SPO, maksimal ${maxWords} kata, dan tetap mempertahankan makna asli.
Pilih "concept" persis dari daftar id|label|group jika cocok, atau null jika tidak ada yang cocok. DILARANG mengarang id konsep.`;

        const userPrompt = [
          topic ? `Topik: ${topic}` : "",
          `Kalimat asli: "${cardText}"`,
          vocabLines.length > 0
            ? `KOSAKATA VISUAL (id|label|group):\n${vocabLines.join("\n")}`
            : "KOSAKATA VISUAL: (kosong, setel concept: null)",
        ]
          .filter(Boolean)
          .join("\n\n");

        const kmResult = await defaultKeyManager.execute({
          teacherEncryptedKeys,
          primaryModel: env.GEMINI_MODEL,
          run: async ({ apiKey, model, signal }) => {
            const ai = new GoogleGenAI({ apiKey });
            const res = await ai.models.generateContent({
              model,
              contents: [userPrompt],
              config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: SINGLE_CARD_SCHEMA,
                temperature: 0.3,
                abortSignal: AbortSignal.any([
                  signal,
                  AbortSignal.timeout(25_000),
                ]),
              },
            });
            const raw = res.text?.trim() || "";
            if (!raw) throw new Error("Respons kosong dari Gemini");
            const json = JSON.parse(raw);
            return singleCardOutputSchema.parse(json);
          },
        });
        regenerated = kmResult.value;
        generatedBy = "ai";
      } catch (err) {
        console.warn(
          "[regenerate-card] AI failed, using catalog verification only:",
          err instanceof Error ? err.message : "unknown"
        );
      }
    }

    const validated = sanitizeAndValidateLesson(
      {
        title: topic || "Kartu",
        cards: [
          {
            text: regenerated.text,
            key_terms: regenerated.key_terms,
            concept: regenerated.concept,
            image: { keyword_id: "", keyword_en: "", alt: "" },
          },
        ],
        questions: [],
      },
      {
        questionCount: 0,
        subject,
        lessonId,
        preferDomains: domains,
        conceptIndex: index,
      }
    );

    const card = validated.lesson.cards[0]!;
    let resolvedAssetId: string | null = null;
    if (card.visual?.asset_id) {
      const dbAsset = await resolveCatalogAssetToDb(
        card.visual.asset_id,
        card.visual.alt
      );
      if (dbAsset.ok) {
        resolvedAssetId = dbAsset.data.id;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        text: card.text,
        keyTerms: card.key_terms,
        imageAssetId: resolvedAssetId,
        imageUrl: card.visual?.url ?? null,
        imageAlt: card.visual?.alt ?? null,
        imageSource: resolvedAssetId ? "pictogram" : "none",
        imageStatus: card.imageStatus ?? (resolvedAssetId ? "cocok" : "tanpa_gambar"),
        suggestions: card.suggestions ?? [],
        generatedBy,
      },
    });
  } catch (error) {
    console.error("[regenerate-card] Error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal membuat ulang kartu." },
      { status: 500 }
    );
  }
}
