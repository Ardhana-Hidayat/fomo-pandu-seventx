import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { generateLessonContent } from "@/server/services/ai";
import { getTeacherBySessionToken } from "@/server/services/auth/demo";
import { TEACHER_COOKIE_NAME } from "@/server/security/session";
import { createLesson, type CreateCardInput, type CreateQuestionInput } from "@/server/repos/lessons";

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") || "";

    let topic = "";
    let text = "";
    let sourceType: "topik" | "teks" | "pdf" | "foto" = "topik";
    let level: "sdlb" | "smplb" | "smalb" = "sdlb";
    let needs: string[] = ["campuran"];
    let languageComplexity: "sangat_sederhana" | "sederhana" | "biasa" = "sederhana";
    let cardCount = 6;
    let questionCount = 4;
    let teacherNotes = "";
    let fileBuffer: Buffer | undefined;
    let mimeType: string | undefined;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      topic = (formData.get("topic") as string) || "";
      text = (formData.get("text") as string) || "";
      sourceType = ((formData.get("sourceType") as string) || "topik") as typeof sourceType;
      level = ((formData.get("level") as string) || "sdlb") as typeof level;
      teacherNotes = (formData.get("teacherNotes") as string) || "";

      const file = formData.get("file") as File | null;
      if (file && file.size > 0) {
        const arrayBuffer = await file.arrayBuffer();
        fileBuffer = Buffer.from(arrayBuffer);
        mimeType = file.type;
      }
    } else {
      const body = await request.json();
      topic = body.topic || "";
      text = body.text || "";
      sourceType = body.sourceType || "topik";
      level = body.level || "sdlb";
      needs = body.needs || ["campuran"];
      languageComplexity = body.languageComplexity || "sederhana";
      cardCount = body.cardCount ? Number(body.cardCount) : 6;
      questionCount = body.questionCount ? Number(body.questionCount) : 4;
      teacherNotes = body.teacherNotes || "";
    }

    if (!topic && !text && !fileBuffer) {
      return NextResponse.json(
        { error: "Mohon masukkan topik, teks, atau unggah dokumen." },
        { status: 400 }
      );
    }

    // Panggil layanan AI dengan fallback otomatis
    const aiResult = await generateLessonContent({
      sourceType,
      topic,
      text,
      fileBuffer,
      mimeType,
      level,
      needs,
      languageComplexity,
      cardCount,
      questionCount,
      teacherNotes,
    });

    // Periksa apakah guru sedang login
    const cookieStore = await cookies();
    const teacherToken = cookieStore.get(TEACHER_COOKIE_NAME)?.value;
    let createdLessonId: string | undefined;

    if (teacherToken) {
      const teacher = await getTeacherBySessionToken(teacherToken);
      if (teacher) {
        // Otomatis simpan sebagai DRAFT di database
        const cardsToInsert: CreateCardInput[] = aiResult.lesson.cards.map((c, i) => ({
          position: i + 1,
          text: c.text,
          keyTerms: c.key_terms,
          cardType: "instruction",
          imageSource: "pictogram",
          imageAlt: c.image.alt,
          audioSource: "none",
        }));

        const questionsToInsert: CreateQuestionInput[] = aiResult.lesson.questions.map((q, i) => ({
          position: i + 1,
          type: q.type,
          prompt: q.prompt,
          payload: {
            options: q.options?.map((opt, optIdx) => ({
              id: opt.id || String.fromCharCode(97 + optIdx),
              text: opt.text,
              correct: opt.correct,
              image: opt.image,
            })),
            steps: q.steps?.map((step, stepIdx) => ({
              id: step.id || `step-${stepIdx + 1}`,
              text: step.text,
              image: step.image,
            })),
            answer: q.answer,
          },
          linkedCardId: undefined,
        }));

        const dbRes = await createLesson(teacher.id, {
          title: aiResult.lesson.title || topic || "Materi Baru",
          topic: topic || aiResult.lesson.title || "",
          level,
          sourceType,
          status: "draft",
          generatedBy: aiResult.generatedBy,
          cards: cardsToInsert,
          questions: questionsToInsert,
        });

        if (dbRes.ok) {
          createdLessonId = dbRes.data.id;
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        lesson: aiResult.lesson,
        badge: aiResult.badge,
        generatedBy: aiResult.generatedBy,
        isScannedNotice: aiResult.isScannedNotice,
        lessonId: createdLessonId,
      },
    });
  } catch (error) {
    console.error("Error pada /api/ai/generate-lesson:", error);
    return NextResponse.json(
      {
        error:
          "Gagal menyusun materi pembelajaran. Coba gunakan topik yang lebih sederhana.",
      },
      { status: 500 }
    );
  }
}
