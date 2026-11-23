import "server-only";
import fs from "node:fs";
import path from "node:path";
import { eq, and, or, sql } from "drizzle-orm";
import { db } from "./client";
import {
  teachers,
  classrooms,
  students,
  lessons,
  lessonCards,
  quizQuestions,
  publications,
  sessions,
  questionAttempts,
  assets,
  audioClips,
} from "./schema";
import { clipHash } from "../services/tts/hash";
import { generateSensoryFriendlyTone } from "../services/media/tts";
import { storage } from "../services/storage";
import {
  demoLessonData,
  DEMO_TEACHER_ID,
  DEMO_CLASSROOM_ID,
  DEMO_LESSON_ID,
  DEMO_PUBLICATION_ID,
} from "./demo-lesson-data";

export async function seedDatabase(): Promise<{
  teacherId: string;
  classroomId: string;
  lessonId: string;
  publicationId: string;
}> {
  // 1. Guru Demo
  let teacher = await db
    .select()
    .from(teachers)
    .where(
      or(
        eq(teachers.email, "guru.demo@pandu.id"),
        eq(teachers.email, "guru@inkludidik.id")
      )
    )
    .limit(1)
    .then((rows) => rows[0]);

  if (!teacher) {
    const inserted = await db
      .insert(teachers)
      .values({
        id: DEMO_TEACHER_ID,
        email: "guru.demo@pandu.id",
        displayName: "Guru Demo",
        schoolName: "SLB Negeri Manisrejo",
        authProvider: "demo",
        settings: {
          theme: "light",
          fontSize: "normal",
          speechRate: 1.0,
          highContrast: false,
          dyslexicFont: false,
          reducedMotion: false,
        },
      })
      .returning();
    teacher = inserted[0];
  } else if (teacher.email !== "guru.demo@pandu.id") {
    await db
      .update(teachers)
      .set({ email: "guru.demo@pandu.id" })
      .where(eq(teachers.id, teacher.id));
  }

  if (!teacher) {
    throw new Error("Gagal membuat guru demo");
  }

  // 2. Kelas Demo
  let classroom = await db
    .select()
    .from(classrooms)
    .where(eq(classrooms.joinCode, demoLessonData.classroom.join_code))
    .limit(1)
    .then((rows) => rows[0]);

  if (!classroom) {
    const inserted = await db
      .insert(classrooms)
      .values({
        id: DEMO_CLASSROOM_ID,
        teacherId: teacher.id,
        name: demoLessonData.classroom.name,
        level: demoLessonData.classroom.level,
        joinCode: demoLessonData.classroom.join_code,
        rosterOnly: false,
        defaultSignSystem: demoLessonData.classroom.default_sign_system,
        defaultChannels: { text: true, audio: true, image: true, sign: true },
      })
      .returning();
    classroom = inserted[0];
  } else if (classroom.teacherId !== teacher.id) {
    await db
      .update(classrooms)
      .set({ teacherId: teacher.id })
      .where(eq(classrooms.id, classroom.id));
  }

  if (!classroom) {
    throw new Error("Gagal membuat kelas demo");
  }

  // 3. Siswa Demo
  const createdStudents = new Map<string, string>();
  for (const s of demoLessonData.students) {
    let student = await db
      .select()
      .from(students)
      .where(
        and(
          eq(students.classroomId, classroom.id),
          sql`lower(${students.displayName}) = lower(${s.display_name})`
        )
      )
      .limit(1)
      .then((rows) => rows[0]);

    if (!student) {
      const inserted = await db
        .insert(students)
        .values({
          classroomId: classroom.id,
          displayName: s.display_name,
          needsPreset: s.needs_preset,
        })
        .returning();
      student = inserted[0];
    }
    if (student) {
      createdStudents.set(s.display_name, student.id);
    }
  }

  // 4. Materi Demo
  let lesson = await db
    .select()
    .from(lessons)
    .where(
      and(
        eq(lessons.teacherId, teacher.id),
        eq(lessons.slug, demoLessonData.lesson.slug)
      )
    )
    .limit(1)
    .then((rows) => rows[0]);

  if (!lesson) {
    const inserted = await db
      .insert(lessons)
      .values({
        id: DEMO_LESSON_ID,
        teacherId: teacher.id,
        slug: demoLessonData.lesson.slug,
        title: demoLessonData.lesson.title,
        topic: demoLessonData.lesson.topic,
        level: demoLessonData.lesson.level,
        sourceType: demoLessonData.lesson.source_type,
        generatedBy: demoLessonData.lesson.generated_by,
        status: demoLessonData.lesson.status,
        exerciseType: "both",
        optionCount: demoLessonData.lesson.exercise.option_count,
        showTextHint: demoLessonData.lesson.exercise.show_text_hint,
        settings: demoLessonData.lesson.settings,
      })
      .returning();
    lesson = inserted[0];
  }

  if (!lesson) {
    throw new Error("Gagal membuat materi demo");
  }

  // 4b. Pustaka Piktogram ARASAAC (85 Konsep Umum SLB)
  const manifestPath = path.resolve(process.cwd(), "public/media/pictograms/manifest.json");
  let manifestItems: Record<string, { id: number; name: string; alt: string }> = {};
  if (fs.existsSync(manifestPath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
      manifestItems = parsed.items || {};
    } catch {}
  }

  const pictoAssetIdMap = new Map<number, string>();

  // Ambil aset piktogram yang sudah ada sekaligus (1 query alih-alih ratusan query)
  const existingAssets = await db
    .select({ id: assets.id, storageKey: assets.storageKey })
    .from(assets);
  const existingMap = new Map(existingAssets.map((a) => [a.storageKey, a.id]));

  const toInsert: Array<typeof assets.$inferInsert> = [];
  for (const [key, item] of Object.entries(manifestItems)) {
    const file = `/media/pictograms/${key}.webp`;
    if (!existingMap.has(file)) {
      toInsert.push({
        kind: "piktogram",
        storageKey: file,
        mime: "image/webp",
        bytes: 20000,
        keyword: key,
        alt: item.alt || key,
        source: "arasaac",
        license: "CC BY-NC-SA 4.0",
        attribution: "ARASAAC (https://arasaac.org), Pemerintah Aragon, Sergio Palao",
        verified: true,
      });
    }
  }

  if (toInsert.length > 0) {
    const insertedAssets = await db.insert(assets).values(toInsert).returning();
    for (const a of insertedAssets) {
      existingMap.set(a.storageKey, a.id);
    }
  }

  // Petakan aset gambar untuk materi demo (posisi 1-7)
  const demoPosMap: Record<number, string> = {
    1: "/media/pictograms/air.webp",
    2: "/media/pictograms/cuci-tangan.webp",
    3: "/media/pictograms/sabun.webp",
    4: "/media/pictograms/gosok-tangan.webp",
    5: "/media/pictograms/bilas.webp",
    6: "/media/pictograms/handuk.webp",
    7: "/media/pictograms/tangan-bersih.webp",
  };
  for (const [pos, file] of Object.entries(demoPosMap)) {
    const assetId = existingMap.get(file);
    if (assetId) {
      pictoAssetIdMap.set(Number(pos), assetId);
    }
  }

  // 5. Kartu Materi Demo
  const cardIdMap = new Map<number, string>();
  for (const c of demoLessonData.cards) {
    let card = await db
      .select()
      .from(lessonCards)
      .where(
        and(
          eq(lessonCards.lessonId, lesson.id),
          eq(lessonCards.position, c.position)
        )
      )
      .limit(1)
      .then((rows) => rows[0]);

    const imageAssetId = pictoAssetIdMap.get(c.position) ?? null;

    if (!card) {
      const inserted = await db
        .insert(lessonCards)
        .values({
          lessonId: lesson.id,
          position: c.position,
          text: c.text,
          keyTerms: c.key_terms,
          cardType: "instruction",
          imageSource: "pictogram",
          imageAssetId,
          imageAlt: c.image.alt,
          audioSource: "none",
        })
        .returning();
      card = inserted[0];
    } else if (!card.imageAssetId && imageAssetId) {
      await db
        .update(lessonCards)
        .set({ imageAssetId })
        .where(eq(lessonCards.id, card.id));
    }

    if (card) {
      // Buat dan hubungkan klip audio demo jika belum ada
      if (!card.audioAssetId) {
        const voiceKey = "A";
        const model = "gemini-tts";
        const textHash = clipHash(c.text, voiceKey, model);
        const words = c.text.trim().split(/\s+/).length;
        const durationMs = Math.min(Math.max(words * 450, 1500), 6000);
        const audioBuffer = generateSensoryFriendlyTone(durationMs);
        const storageKey = `clips/${lesson.id}/card-${card.id}-opt-${voiceKey}-${textHash.slice(0, 8)}.wav`;

        await storage.put(storageKey, audioBuffer, "audio/wav", "card-audio");

        let audioAsset = await db
          .select()
          .from(assets)
          .where(eq(assets.storageKey, storageKey))
          .limit(1)
          .then((rows) => rows[0]);

        if (!audioAsset) {
          const [insertedAsset] = await db
            .insert(assets)
            .values({
              kind: "audio",
              storageKey,
              mime: "audio/wav",
              bytes: audioBuffer.length,
              keyword: c.text.slice(0, 50),
              source: "system-tts",
              license: "PANDU Synthesized",
              attribution: "PANDU Acoustic Engine",
              verified: true,
            })
            .returning();
          audioAsset = insertedAsset;
        }

        if (audioAsset) {
          await db
            .update(lessonCards)
            .set({ audioAssetId: audioAsset.id, audioSource: "tts" })
            .where(eq(lessonCards.id, card.id));

          await db
            .insert(audioClips)
            .values({
              lessonId: lesson.id,
              targetType: "card",
              targetId: card.id,
              voiceKey,
              model,
              textHash,
              assetId: audioAsset.id,
              durationMs,
              status: "ready",
            })
            .onConflictDoNothing();
        }
      }

      cardIdMap.set(c.position, card.id);
    }
  }

  // 6. Soal Latihan Demo
  const questionIdMap = new Map<number, string>();
  for (const q of demoLessonData.questions) {
    let question = await db
      .select()
      .from(quizQuestions)
      .where(
        and(
          eq(quizQuestions.lessonId, lesson.id),
          eq(quizQuestions.position, q.position)
        )
      )
      .limit(1)
      .then((rows) => rows[0]);

    if (!question) {
      const linkedCardId = q.linked_card ? cardIdMap.get(q.linked_card) : null;
      const payload: Record<string, unknown> = {};
      if ("options" in q) payload.options = q.options;
      if ("steps" in q) payload.steps = q.steps;
      if ("answer" in q) payload.answer = q.answer;
      if ("sign_word" in q) payload.sign_word = q.sign_word;
      if ("prompt_image" in q) payload.prompt_image = q.prompt_image;

      const inserted = await db
        .insert(quizQuestions)
        .values({
          lessonId: lesson.id,
          position: q.position,
          type: q.type,
          prompt: q.prompt,
          payload,
          linkedCardId: linkedCardId ?? null,
        })
        .returning();
      question = inserted[0];
    }
    if (question) {
      questionIdMap.set(q.position, question.id);
    }
  }

  // 7. Publikasi Materi ke Kelas Demo
  let pub = await db
    .select()
    .from(publications)
    .where(
      and(
        eq(publications.lessonId, lesson.id),
        eq(publications.classroomId, classroom.id)
      )
    )
    .limit(1)
    .then((rows) => rows[0]);

  if (!pub) {
    const inserted = await db
      .insert(publications)
      .values({
        id: DEMO_PUBLICATION_ID,
        lessonId: lesson.id,
        classroomId: classroom.id,
        shareCode: "DEMO1234",
        visible: true,
      })
      .returning();
    pub = inserted[0];
  }

  if (!pub) {
    throw new Error("Gagal membuat publikasi demo");
  }

  // 8. Sesi Contoh (agar halaman Hasil tidak kosong saat demo)
  for (const sample of demoLessonData.sample_sessions) {
    const studentId = createdStudents.get(sample.student);
    if (!studentId) continue;

    const existingSession = await db
      .select()
      .from(sessions)
      .where(
        and(
          eq(sessions.studentId, studentId),
          eq(sessions.lessonId, lesson.id)
        )
      )
      .limit(1)
      .then((rows) => rows[0]);

    if (!existingSession) {
      const startedAt = new Date(Date.now() - 3600000);
      const finishedAt = new Date(Date.now() - 3000000);

      const insertedSession = await db
        .insert(sessions)
        .values({
          studentId,
          lessonId: lesson.id,
          publicationId: pub.id,
          startedAt,
          finishedAt,
          device: "ponsel",
          channelsOn: ["text", "audio", "image"],
          signSystem: "SIBI",
          speechRate: 1.0,
          signSpeed: 1.0,
        })
        .returning();

      const ses = insertedSession[0];
      if (ses) {
        // Tambahkan percobaan soal contoh
        for (let pos = 1; pos <= sample.total; pos++) {
          const qId = questionIdMap.get(pos);
          if (qId) {
            const isCorrect = pos <= sample.first_try;
            await db.insert(questionAttempts).values({
              sessionId: ses.id,
              questionId: qId,
              attemptNo: 1,
              isCorrect,
              hintUsed: sample.hints > 0 && pos === 2,
              msToAnswer: 4500,
              channelsOn: ["text", "audio", "image"],
            });
          }
        }
      }
    }
  }

  return {
    teacherId: teacher.id,
    classroomId: classroom.id,
    lessonId: lesson.id,
    publicationId: pub.id,
  };
}
