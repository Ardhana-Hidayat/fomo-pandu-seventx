import { NextResponse } from "next/server";
import { generateLessonContent } from "@/server/services/ai";
import { getCurrentTeacher } from "@/features/auth";
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
    let exerciseType: "match" | "order" | "both" = "both";
    let optionCount = 3;
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
      const rawCardCount = formData.get("cardCount");
      if (rawCardCount) cardCount = Math.min(15, Math.max(3, Number(rawCardCount) || 6));
      const rawQuestionCount = formData.get("questionCount");
      if (rawQuestionCount !== null && rawQuestionCount !== "") {
        questionCount = Math.min(10, Math.max(0, Number(rawQuestionCount)));
      }
      const rawExerciseType = formData.get("exerciseType") as string | null;
      if (rawExerciseType === "match" || rawExerciseType === "order" || rawExerciseType === "both") {
        exerciseType = rawExerciseType;
      }
      const rawOptionCount = formData.get("optionCount");
      if (rawOptionCount) optionCount = Math.min(4, Math.max(2, Number(rawOptionCount) || 3));

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

    // Periksa sesi guru terautentikasi sekaligus pulihkan baris guru di DB bila perlu
    const teacherSession = await getCurrentTeacher();
    if (sourceType === "pdf" && !teacherSession) {
      return NextResponse.json(
        { error: "Sesi guru tidak valid. Silakan masuk kembali." },
        { status: 401 }
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

    let createdLessonId: string | undefined;

    if (teacherSession?.teacher) {
      const teacher = teacherSession.teacher;
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

      const questionsToInsert: CreateQuestionInput[] =
        questionCount === 0
          ? []
          : aiResult.lesson.questions.slice(0, questionCount).map((q, i) => ({
              position: i + 1,
              type: q.type,
              prompt: q.prompt,
              payload: {
                options: q.options?.slice(0, optionCount).map((opt, optIdx) => ({
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
        exerciseType,
        optionCount,
        generatedBy: aiResult.generatedBy,
        cards: cardsToInsert,
        questions: questionsToInsert,
      });

      if (!dbRes.ok) {
        console.error("Gagal menyimpan materi ke DB pada /api/ai/generate-lesson:", dbRes.error);
        return NextResponse.json(
          { error: dbRes.error.message || "Gagal menyimpan materi pembelajaran." },
          { status: 500 }
        );
      }

      createdLessonId = dbRes.data.id;
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
