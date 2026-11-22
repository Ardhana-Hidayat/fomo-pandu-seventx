import { describe, it, expect, beforeAll } from "vitest";
import { migrate } from "drizzle-orm/pglite/migrator";
import { db } from "@/server/db/client";
import { createClassroom } from "@/server/repos/classrooms";
import { joinClassroom } from "@/server/repos/students";
import { createLesson } from "@/server/repos/lessons";
import { publishLesson } from "@/server/repos/publications";
import { startSession } from "@/server/repos/sessions";
import { recordAttempt } from "@/server/repos/attempts";
import {
  getPresetChannels,
  getEffectiveChannels,
  setStudentOverrides,
  getStudentOverrides,
  deleteStudentOverride,
  listOverridesByPublication,
  DEFAULT_CHANNELS,
  PRESET_CHANNELS,
} from "@/server/repos/overrides";
import {
  evaluateStudentLessonRecommendations,
  getRecommendationsByStudent,
  getRecommendationsByClassroom,
  updateRecommendationStatus,
  getCardMasteryMap,
  getClassroomCardDifficulties,
} from "@/server/repos/recommendations";
import { cardEvents, teachers } from "@/server/db/schema";

describe("Recommendations Engine & Student Overrides (S3-01, S3-05)", () => {
  let teacherAId: string;
  let teacherBId: string;

  beforeAll(async () => {
    // Jalankan migrasi PGlite
    await migrate(db as unknown as Parameters<typeof migrate>[0], {
      migrationsFolder: "./drizzle",
    });

    // Buat guru A dan guru B untuk pengujian isolasi (IDOR)
    const teacherA = await db
      .insert(teachers)
      .values({
        displayName: "Guru Inklusif A",
        email: "guru.a@inkludidik.test",
        authProvider: "demo",
      })
      .returning();
    teacherAId = teacherA[0].id;

    const teacherB = await db
      .insert(teachers)
      .values({
        displayName: "Guru Inklusif B",
        email: "guru.b@inkludidik.test",
        authProvider: "demo",
      })
      .returning();
    teacherBId = teacherB[0].id;
  });

  describe("Student Overrides & Effective Channels (S3-01, TC-12)", () => {
    it("getPresetChannels mengembalikan konfigurasi saluran yang tepat sesuai preset", () => {
      expect(getPresetChannels("tunanetra")).toEqual(PRESET_CHANNELS.tunanetra);
      expect(getPresetChannels("tunarungu").audio).toBe(false);
      expect(getPresetChannels("tunarungu").sign).toBe(true);
      expect(getPresetChannels("low_vision").sign).toBe(false);
      expect(getPresetChannels("campuran")).toEqual(DEFAULT_CHANNELS);
      expect(getPresetChannels("tidak_dikenal")).toEqual(DEFAULT_CHANNELS);
      expect(getPresetChannels(null)).toEqual(DEFAULT_CHANNELS);
    });

    it("getEffectiveChannels menggunakan preset siswa jika belum ada override", async () => {
      const classRes = await createClassroom(teacherAId, {
        name: "Kelas Preset Test",
      });
      expect(classRes.ok).toBe(true);
      if (!classRes.ok) return;

      const studentRes = await joinClassroom(
        classRes.data.id,
        "Budi Tunarungu",
        "tunarungu"
      );
      expect(studentRes.ok).toBe(true);
      if (!studentRes.ok) return;

      const eff = await getEffectiveChannels(classRes.data.id, studentRes.data.id);
      expect(eff.ok).toBe(true);
      if (!eff.ok) return;

      expect(eff.data.audio).toBe(false);
      expect(eff.data.sign).toBe(true);
      expect(eff.data.text).toBe(true);
      expect(eff.data.image).toBe(true);
    });

    it("setStudentOverrides menyimpan override per materi dan mengabaikan default kelas/preset", async () => {
      const classRes = await createClassroom(teacherAId, {
        name: "Kelas Override Test",
      });
      if (!classRes.ok) return;

      const studentRes = await joinClassroom(
        classRes.data.id,
        "Siti Netra",
        "tunanetra"
      );
      if (!studentRes.ok) return;

      const lessonRes = await createLesson(teacherAId, {
        title: "Materi Override",
        topic: "Panca Indera",
        level: "sdlb",
        cards: [{ text: "Mata untuk melihat", position: 1 }],
      });
      if (!lessonRes.ok) return;

      const pubRes = await publishLesson(teacherAId, lessonRes.data.id, [
        classRes.data.id,
      ]);
      expect(pubRes.ok).toBe(true);
      if (!pubRes.ok) return;
      const publicationId = pubRes.data[0].id;

      // Siswa tunanetra secara default gambarnya mati
      const initialEff = await getEffectiveChannels(
        classRes.data.id,
        studentRes.data.id,
        publicationId
      );
      expect(initialEff.ok).toBe(true);
      if (initialEff.ok) {
        expect(initialEff.data.image).toBe(false);
      }

      // Guru A menyetel override: nyalakan gambar khusus materi ini
      const overrideRes = await setStudentOverrides(
        publicationId,
        studentRes.data.id,
        { text: true, audio: true, image: true, sign: false },
        teacherAId
      );
      expect(overrideRes.ok).toBe(true);
      if (!overrideRes.ok) return;
      expect(overrideRes.data.channels.image).toBe(true);

      // Cek efektifitas saluran setelah override
      const updatedEff = await getEffectiveChannels(
        classRes.data.id,
        studentRes.data.id,
        publicationId
      );
      expect(updatedEff.ok).toBe(true);
      if (updatedEff.ok) {
        expect(updatedEff.data.image).toBe(true);
      }

      // Cek getStudentOverrides langsung
      const getRes = await getStudentOverrides(publicationId, studentRes.data.id);
      expect(getRes.ok).toBe(true);
      if (getRes.ok) {
        expect(getRes.data).not.toBeNull();
        expect(getRes.data?.channels.image).toBe(true);
      }

      // Guru A dapat membuat daftar override materi
      const listRes = await listOverridesByPublication(teacherAId, publicationId);
      expect(listRes.ok).toBe(true);
      if (listRes.ok) {
        expect(listRes.data.length).toBe(1);
      }

      // Guru B TIDAK memiliki hak akses melihat atau mengubah override materi guru A (IDOR)
      const idorSet = await setStudentOverrides(
        publicationId,
        studentRes.data.id,
        { text: false, audio: false, image: false, sign: false },
        teacherBId
      );
      expect(idorSet.ok).toBe(false);
      if (!idorSet.ok) {
        expect(idorSet.error.code).toBe("FORBIDDEN");
      }

      const idorList = await listOverridesByPublication(teacherBId, publicationId);
      expect(idorList.ok).toBe(false);

      // Hapus override mengembalikan ke saluran preset
      const delRes = await deleteStudentOverride(
        publicationId,
        studentRes.data.id,
        teacherAId
      );
      expect(delRes.ok).toBe(true);

      const revertedEff = await getEffectiveChannels(
        classRes.data.id,
        studentRes.data.id,
        publicationId
      );
      expect(revertedEff.ok).toBe(true);
      if (revertedEff.ok) {
        expect(revertedEff.data.image).toBe(false); // kembali ke preset tunanetra
      }
    });
  });

  describe("Recommendations Engine (S3-05, Aturan R1-R7)", () => {
    it("Aturan R1: memicu rekomendasi pengulangan konsep saat salah >= 2 kali pada kartu K", async () => {
      const classRes = await createClassroom(teacherAId, {
        name: "Kelas R1 Test",
      });
      if (!classRes.ok) return;

      const studentRes = await joinClassroom(classRes.data.id, "Andi R1");
      if (!studentRes.ok) return;
      const studentId = studentRes.data.id;

      const lessonRes = await createLesson(teacherAId, {
        title: "Mengenal Buah",
        topic: "Buah",
        level: "sdlb",
        cards: [
          { text: "Apel merah manis", position: 1 },
          { text: "Pisang kuning lonjong", position: 2 },
        ],
        questions: [
          {
            position: 1,
            type: "pilih_kata",
            prompt: "Buah apa yang merah manis?",
            payload: {
              options: [
                { id: "o1", text: "Apel", correct: true },
                { id: "o2", text: "Pisang", correct: false },
              ],
            },
            explanation: "Apel merah",
          },
          {
            position: 2,
            type: "pilih_kata",
            prompt: "Buah apa yang berwarna kuning?",
            payload: {
              options: [
                { id: "o3", text: "Pisang", correct: true },
                { id: "o4", text: "Apel", correct: false },
              ],
            },
            explanation: "Pisang kuning",
          },
        ],
      });
      expect(lessonRes.ok).toBe(true);
      if (!lessonRes.ok) return;
      const lesson = lessonRes.data;
      const q1Id = lesson.questions[0].id;
      const q2Id = lesson.questions[1].id;

      // Buat sesi belajar
      const sessionRes = await startSession(studentId, {
        lessonId: lesson.id,
        device: "ponsel",
      });
      if (!sessionRes.ok) return;
      const sessionId = sessionRes.data.id;

      // Andi salah 2 kali pada pertanyaan q1 (tertaut ke kartu 1)
      await recordAttempt(studentId, sessionId, {
        questionId: q1Id,
        attemptNo: 1,
        isCorrect: false,
        msToAnswer: 2500,
      });
      await recordAttempt(studentId, sessionId, {
        questionId: q1Id,
        attemptNo: 2,
        isCorrect: false,
        msToAnswer: 3000,
      });
      // Dan mengerjakan q2 benar agar total minimal 2 soal tercapai (§9)
      await recordAttempt(studentId, sessionId, {
        questionId: q2Id,
        attemptNo: 1,
        isCorrect: true,
        msToAnswer: 2000,
      });

      const recsRes = await evaluateStudentLessonRecommendations(
        studentId,
        lesson.id
      );
      expect(recsRes.ok).toBe(true);
      if (!recsRes.ok) return;

      const r1 = recsRes.data.find((r) => r.ruleId === "R1");
      expect(r1).toBeDefined();
      expect(r1?.priority).toBe("tinggi");
      expect(r1?.message).toContain("Apel merah manis");
      expect(r1?.status).toBe("baru");
    });

    it("Aturan R2: memicu rekomendasi penyederhanaan opsi jika petunjuk dipakai >= 50% dan >= 3 soal", async () => {
      const classRes = await createClassroom(teacherAId, {
        name: "Kelas R2 Test",
      });
      if (!classRes.ok) return;

      const studentRes = await joinClassroom(classRes.data.id, "Beni R2");
      if (!studentRes.ok) return;
      const studentId = studentRes.data.id;

      const lessonRes = await createLesson(teacherAId, {
        title: "Latihan Hewan",
        topic: "Hewan",
        level: "sdlb",
        cards: [
          { text: "Kucing", position: 1 },
          { text: "Ayam", position: 2 },
          { text: "Bebek", position: 3 },
          { text: "Kambing", position: 4 },
        ],
        questions: [
          {
            position: 1,
            type: "pilih_kata",
            prompt: "Soal 1",
            payload: { options: [] },
          },
          {
            position: 2,
            type: "pilih_kata",
            prompt: "Soal 2",
            payload: { options: [] },
          },
          {
            position: 3,
            type: "pilih_kata",
            prompt: "Soal 3",
            payload: { options: [] },
          },
          {
            position: 4,
            type: "pilih_kata",
            prompt: "Soal 4",
            payload: { options: [] },
          },
        ],
      });
      if (!lessonRes.ok) return;
      const lesson = lessonRes.data;

      const sessionRes = await startSession(studentId, {
        lessonId: lesson.id,
      });
      if (!sessionRes.ok) return;
      const sessionId = sessionRes.data.id;

      // Beni menggunakan petunjuk di 3 dari 4 soal
      for (let i = 0; i < 3; i++) {
        await recordAttempt(studentId, sessionId, {
          questionId: lesson.questions[i].id,
          attemptNo: 1,
          isCorrect: true,
          hintUsed: true,
          msToAnswer: 3500,
        });
      }
      await recordAttempt(studentId, sessionId, {
        questionId: lesson.questions[3].id,
        attemptNo: 1,
        isCorrect: true,
        hintUsed: false,
        msToAnswer: 3000,
      });

      const recsRes = await evaluateStudentLessonRecommendations(
        studentId,
        lesson.id
      );
      expect(recsRes.ok).toBe(true);
      if (!recsRes.ok) return;

      const r2 = recsRes.data.find((r) => r.ruleId === "R2");
      expect(r2).toBeDefined();
      expect(r2?.priority).toBe("tinggi");
      expect(r2?.message).toContain("petunjuk");
    });

    it("Aturan R3: pola menebak terdeteksi saat menjawab sangat cepat (< 1500ms) beruntun", async () => {
      const classRes = await createClassroom(teacherAId, {
        name: "Kelas R3 Test",
      });
      if (!classRes.ok) return;

      const studentRes = await joinClassroom(classRes.data.id, "Caca R3");
      if (!studentRes.ok) return;
      const studentId = studentRes.data.id;

      const lessonRes = await createLesson(teacherAId, {
        title: "Tebak Cepat",
        topic: "Kendaraan",
        level: "sdlb",
        cards: [
          { text: "Mobil", position: 1 },
          { text: "Kereta", position: 2 },
          { text: "Pesawat", position: 3 },
        ],
        questions: [
          {
            position: 1,
            type: "pilih_kata",
            prompt: "K1",
            payload: { options: [] },
          },
          {
            position: 2,
            type: "pilih_kata",
            prompt: "K2",
            payload: { options: [] },
          },
          {
            position: 3,
            type: "pilih_kata",
            prompt: "K3",
            payload: { options: [] },
          },
        ],
      });
      if (!lessonRes.ok) return;
      const lesson = lessonRes.data;

      const sessionRes = await startSession(studentId, {
        lessonId: lesson.id,
      });
      if (!sessionRes.ok) return;
      const sessionId = sessionRes.data.id;

      // Caca menjawab 3 kali beruntun dalam waktu < 1500ms
      for (let i = 0; i < 3; i++) {
        await recordAttempt(studentId, sessionId, {
          questionId: lesson.questions[i].id,
          attemptNo: 1,
          isCorrect: i === 0, // sebagian salah
          msToAnswer: 800,
        });
      }

      const recsRes = await evaluateStudentLessonRecommendations(
        studentId,
        lesson.id
      );
      expect(recsRes.ok).toBe(true);
      if (!recsRes.ok) return;

      const r3 = recsRes.data.find((r) => r.ruleId === "R3");
      expect(r3).toBeDefined();
      expect(r3?.priority).toBe("tinggi");
      expect(r3?.message).toContain("Jawaban terlalu cepat");
    });

    it("Aturan R4: memicu saran saat siswa mengulang kartu >= 3 kali lalu berhasil menjawab benar", async () => {
      const classRes = await createClassroom(teacherAId, {
        name: "Kelas R4 Test",
      });
      if (!classRes.ok) return;

      const studentRes = await joinClassroom(classRes.data.id, "Dodi R4");
      if (!studentRes.ok) return;
      const studentId = studentRes.data.id;

      const lessonRes = await createLesson(teacherAId, {
        title: "Latihan Bentuk",
        topic: "Bentuk",
        level: "sdlb",
        cards: [
          { text: "Lingkaran bundar", position: 1 },
          { text: "Persegi kotak", position: 2 },
        ],
        questions: [
          {
            position: 1,
            type: "pilih_kata",
            prompt: "Bentuk bundar?",
            payload: { options: [] },
          },
          {
            position: 2,
            type: "pilih_kata",
            prompt: "Bentuk kotak?",
            payload: { options: [] },
          },
        ],
      });
      if (!lessonRes.ok) return;
      const lesson = lessonRes.data;
      const card1 = lesson.cards[0];

      const sessionRes = await startSession(studentId, {
        lessonId: lesson.id,
      });
      if (!sessionRes.ok) return;
      const sessionId = sessionRes.data.id;

      // Dodi mengulang kartu 1 sebanyak 3 kali
      for (let i = 0; i < 3; i++) {
        await db.insert(cardEvents).values({
          sessionId,
          cardId: card1.id,
          kind: "ulang",
          atMs: 1000 + i * 2000,
        });
      }

      // Dodi menjawab soal kartu 1 dengan benar
      await recordAttempt(studentId, sessionId, {
        questionId: lesson.questions[0].id,
        attemptNo: 1,
        isCorrect: true,
        msToAnswer: 4000,
      });
      // Dan mengerjakan soal kedua
      await recordAttempt(studentId, sessionId, {
        questionId: lesson.questions[1].id,
        attemptNo: 1,
        isCorrect: true,
        msToAnswer: 3500,
      });

      const recsRes = await evaluateStudentLessonRecommendations(
        studentId,
        lesson.id
      );
      expect(recsRes.ok).toBe(true);
      if (!recsRes.ok) return;

      const r4 = recsRes.data.find((r) => r.ruleId === "R4");
      expect(r4).toBeDefined();
      expect(r4?.priority).toBe("sedang");
      expect(r4?.message).toContain("Lingkaran bundar");
    });

    it("Aturan R7: materi sulit terdeteksi saat first_try < 40% pada materi dengan >= 5 soal", async () => {
      const classRes = await createClassroom(teacherAId, {
        name: "Kelas R7 Test",
      });
      if (!classRes.ok) return;

      const studentRes = await joinClassroom(classRes.data.id, "Eka R7");
      if (!studentRes.ok) return;
      const studentId = studentRes.data.id;

      const lessonRes = await createLesson(teacherAId, {
        title: "Materi Sulit Panjang",
        topic: "Sains",
        level: "sdlb",
        cards: [
          { text: "K1", position: 1 },
          { text: "K2", position: 2 },
          { text: "K3", position: 3 },
          { text: "K4", position: 4 },
          { text: "K5", position: 5 },
        ],
        questions: [
          { position: 1, type: "pilih_kata", prompt: "S1", payload: { options: [] } },
          { position: 2, type: "pilih_kata", prompt: "S2", payload: { options: [] } },
          { position: 3, type: "pilih_kata", prompt: "S3", payload: { options: [] } },
          { position: 4, type: "pilih_kata", prompt: "S4", payload: { options: [] } },
          { position: 5, type: "pilih_kata", prompt: "S5", payload: { options: [] } },
        ],
      });
      if (!lessonRes.ok) return;
      const lesson = lessonRes.data;

      const sessionRes = await startSession(studentId, {
        lessonId: lesson.id,
      });
      if (!sessionRes.ok) return;
      const sessionId = sessionRes.data.id;

      // Eka hanya benar 1 dari 5 soal di percobaan pertama (20% < 40%)
      await recordAttempt(studentId, sessionId, {
        questionId: lesson.questions[0].id,
        attemptNo: 1,
        isCorrect: true,
        msToAnswer: 3000,
      });
      for (let i = 1; i < 5; i++) {
        await recordAttempt(studentId, sessionId, {
          questionId: lesson.questions[i].id,
          attemptNo: 1,
          isCorrect: false,
          msToAnswer: 3000,
        });
      }

      const recsRes = await evaluateStudentLessonRecommendations(
        studentId,
        lesson.id
      );
      expect(recsRes.ok).toBe(true);
      if (!recsRes.ok) return;

      const r7 = recsRes.data.find((r) => r.ruleId === "R7");
      expect(r7).toBeDefined();
      expect(r7?.priority).toBe("tinggi");
      expect(r7?.message).toContain("terlalu sulit");
    });

    it("Siklus hidup saran: tindakan 'dilakukan' dan 'diabaikan' mencegah saran baru menduplikasi", async () => {
      const classRes = await createClassroom(teacherAId, {
        name: "Kelas Siklus Saran",
      });
      if (!classRes.ok) return;

      const studentRes = await joinClassroom(classRes.data.id, "Fani Siklus");
      if (!studentRes.ok) return;
      const studentId = studentRes.data.id;

      const lessonRes = await createLesson(teacherAId, {
        title: "Materi Siklus",
        topic: "Warna",
        level: "sdlb",
        cards: [
          { text: "Merah Menyala", position: 1 },
          { text: "Biru Langit", position: 2 },
        ],
        questions: [
          { position: 1, type: "pilih_kata", prompt: "Warna merah?", payload: { options: [] } },
          { position: 2, type: "pilih_kata", prompt: "Warna biru?", payload: { options: [] } },
        ],
      });
      if (!lessonRes.ok) return;
      const lesson = lessonRes.data;

      const sessionRes = await startSession(studentId, {
        lessonId: lesson.id,
      });
      if (!sessionRes.ok) return;
      const sessionId = sessionRes.data.id;

      // Salah 2 kali pada kartu 1 (memicu R1)
      await recordAttempt(studentId, sessionId, {
        questionId: lesson.questions[0].id,
        attemptNo: 1,
        isCorrect: false,
      });
      await recordAttempt(studentId, sessionId, {
        questionId: lesson.questions[0].id,
        attemptNo: 2,
        isCorrect: false,
      });
      await recordAttempt(studentId, sessionId, {
        questionId: lesson.questions[1].id,
        attemptNo: 1,
        isCorrect: true,
      });

      // Evaluasi awal
      const firstEval = await evaluateStudentLessonRecommendations(
        studentId,
        lesson.id
      );
      expect(firstEval.ok).toBe(true);
      if (!firstEval.ok) return;
      const r1 = firstEval.data.find((r) => r.ruleId === "R1");
      expect(r1).toBeDefined();
      expect(r1?.status).toBe("baru");

      // Guru A menandai saran ini sebagai 'dilakukan'
      const updateRes = await updateRecommendationStatus(
        teacherAId,
        r1!.id,
        "dilakukan"
      );
      expect(updateRes.ok).toBe(true);
      if (!updateRes.ok) return;
      expect(updateRes.data.status).toBe("dilakukan");

      // Guru B TIDAK boleh mengubah status saran milik guru A (IDOR)
      const idorUpdate = await updateRecommendationStatus(
        teacherBId,
        r1!.id,
        "diabaikan"
      );
      expect(idorUpdate.ok).toBe(false);

      // Evaluasi ulang: status 'dilakukan' harus tetap dipertahankan dan TIDAK diubah kembali ke 'baru'
      const secondEval = await evaluateStudentLessonRecommendations(
        studentId,
        lesson.id
      );
      expect(secondEval.ok).toBe(true);
      if (!secondEval.ok) return;
      const r1After = secondEval.data.find((r) => r.ruleId === "R1");
      expect(r1After?.status).toBe("dilakukan");

      // Verifikasi query rekomendasi kelas dan siswa
      const classRecs = await getRecommendationsByClassroom(
        teacherAId,
        classRes.data.id
      );
      expect(classRecs.ok).toBe(true);
      if (classRecs.ok) {
        expect(classRecs.data.some((r) => r.id === r1!.id)).toBe(true);
      }

      const studentRecs = await getRecommendationsByStudent(
        teacherAId,
        studentId
      );
      expect(studentRecs.ok).toBe(true);
      if (studentRecs.ok) {
        expect(studentRecs.data.length).toBeGreaterThan(0);
      }
    });

    it("Peta penguasaan kartu (Card Mastery Map) mengembalikan dikuasai, perlu_diulang, atau belum_dinilai", async () => {
      const classRes = await createClassroom(teacherAId, {
        name: "Kelas Peta Penguasaan",
      });
      if (!classRes.ok) return;

      const studentRes = await joinClassroom(classRes.data.id, "Gita Peta");
      if (!studentRes.ok) return;
      const studentId = studentRes.data.id;

      const lessonRes = await createLesson(teacherAId, {
        title: "Peta Materi",
        topic: "Geometri",
        level: "sdlb",
        cards: [
          { text: "Kartu 1 (Akan Dikuasai)", position: 1 },
          { text: "Kartu 2 (Perlu Diulang)", position: 2 },
          { text: "Kartu 3 (Belum Dinilai)", position: 3 },
        ],
        questions: [
          { position: 1, type: "pilih_kata", prompt: "Soal K1", payload: { options: [] } },
          { position: 2, type: "pilih_kata", prompt: "Soal K2", payload: { options: [] } },
        ],
      });
      if (!lessonRes.ok) return;
      const lesson = lessonRes.data;

      const sessionRes = await startSession(studentId, {
        lessonId: lesson.id,
      });
      if (!sessionRes.ok) return;
      const sessionId = sessionRes.data.id;

      // Soal 1 (Kartu 1): benar di percobaan pertama
      await recordAttempt(studentId, sessionId, {
        questionId: lesson.questions[0].id,
        attemptNo: 1,
        isCorrect: true,
      });

      // Soal 2 (Kartu 2): salah di percobaan pertama
      await recordAttempt(studentId, sessionId, {
        questionId: lesson.questions[1].id,
        attemptNo: 1,
        isCorrect: false,
      });

      const masteryRes = await getCardMasteryMap(
        teacherAId,
        lesson.id,
        studentId
      );
      expect(masteryRes.ok).toBe(true);
      if (!masteryRes.ok) return;

      expect(masteryRes.data.length).toBe(3);
      expect(masteryRes.data[0].status).toBe("dikuasai");
      expect(masteryRes.data[1].status).toBe("perlu_diulang");
      expect(masteryRes.data[2].status).toBe("belum_dinilai");

      // Cek kesulitan kartu di tingkat kelas
      const diffRes = await getClassroomCardDifficulties(
        teacherAId,
        classRes.data.id,
        lesson.id
      );
      expect(diffRes.ok).toBe(true);
      if (!diffRes.ok) return;
      expect(diffRes.data.length).toBe(3);
      expect(diffRes.data[0].firstTryRate).toBe(1);
      expect(diffRes.data[1].firstTryRate).toBe(0);
    });
  });
});
