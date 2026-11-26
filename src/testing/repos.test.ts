import { describe, it, expect, beforeAll } from "vitest";
import { migrate } from "drizzle-orm/pglite/migrator";
import { db } from "@/server/db/client";
import {
  createClassroom,
  listClassroomsByTeacher,
  getClassroomById,
  getClassroomByJoinCode,
  regenerateJoinCode,
  archiveClassroom,
  isEasyPattern,
  generateJoinCode,
} from "@/server/repos/classrooms";
import {
  joinClassroom,
  listStudentsByClassroom,
  getStudentById,
  setStudentPreset,
  mergeStudent,
  bulkAddStudents,
  getRosterByJoinCode,
} from "@/server/repos/students";
import {
  createLesson,
  getLessonWithContent,
  getLessonForStudent,
  listLessonsByTeacher,
  updateLesson,
  deleteLesson,
  saveCard,
  saveQuizQuestion,
} from "@/server/repos/lessons";
import {
  publishLesson,
  getPublicationByShareCode,
  listPublicationsForClassroom,
  listPublishedLessonsByJoinCode,
  setPublicationVisibility,
} from "@/server/repos/publications";
import {
  startSession,
  recordCardEvents,
  recordAttempt,
  finishSession,
  listSessionsByLesson,
  joinStudentSession,
} from "@/server/repos/sessions";
import {
  recordAttempt as recordAttemptDirect,
  recordBatchAttempts,
  listAttemptsBySession,
} from "@/server/repos/attempts";
import {
  resultsByLesson,
  resultsByClassroom,
} from "@/server/repos/insights";
import {
  signInDemoTeacher,
  getTeacherBySessionToken,
  signOutTeacher,
} from "@/server/services/auth/demo";
import {
  createTeacherSession,
  createStudentSession,
  validateSession,
  hashToken,
  generateToken,
  signTeacherCookiePayload,
  verifyTeacherCookieStateless,
} from "@/server/security/session";
import { teachers } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { seedDatabase } from "@/server/db/seed";
import { parseEnv } from "@/server/config/env";

describe("Database Repositories & Data Layer (S0-03, S0-04, S0-07)", () => {
  beforeAll(async () => {
    // Jalankan migrasi pada database pengujian
    await migrate(db as unknown as Parameters<typeof migrate>[0], {
      migrationsFolder: "./drizzle",
    });
  });

  describe("Auth Demo & Session Security (S0-04, TC-01 dasar)", () => {
    it("masuk sebagai guru demo membuat guru dan sesi nyata", async () => {
      const { teacher, token } = await signInDemoTeacher();
      expect(teacher).toBeDefined();
      expect(teacher.email).toBe("guru.demo@pandu.id");
      expect(teacher.displayName).toBe("Guru Demo");
      expect(token).toBeDefined();
      expect(token.length).toBeGreaterThanOrEqual(32);

      // Verifikasi sesi dari token
      const verified = await getTeacherBySessionToken(token);
      expect(verified).toBeDefined();
      expect(verified?.id).toBe(teacher.id);

      // Verifikasi token disimpan dalam bentuk hash, bukan token mentah
      const tokenHash = hashToken(token);
      expect(tokenHash).not.toBe(token);

      // Validasi sesi
      const session = await validateSession(token, "guru");
      expect(session).toBeDefined();
      expect(session?.teacherId).toBe(teacher.id);

      // Keluar (sign out) membatalkan sesi
      await signOutTeacher(token);
      const afterSignOut = await validateSession(token, "guru");
      expect(afterSignOut).toBeNull();
    });

    it("sesi siswa dibuat dengan TTL yang benar dan validasi peran", async () => {
      const teacherRes = await signInDemoTeacher();
      const classRes = await createClassroom(teacherRes.teacher.id, {
        name: "Kelas Uji Sesi",
      });
      expect(classRes.ok).toBe(true);
      if (!classRes.ok) return;

      const studentRes = await joinClassroom(classRes.data.id, "Siswa Sesi");
      expect(studentRes.ok).toBe(true);
      if (!studentRes.ok) return;

      const byId = await getStudentById(studentRes.data.id);
      expect(byId.ok).toBe(true);

      const tSession = await createTeacherSession(teacherRes.teacher.id);
      expect(tSession.token).toBeDefined();

      const { token, session } = await createStudentSession(
        studentRes.data.id,
        classRes.data.id
      );
      expect(token).toBeDefined();
      expect(session.role).toBe("siswa");

      // Validasi sesi siswa dengan peran yang cocok
      const validStudent = await validateSession(token, "siswa");
      expect(validStudent).toBeDefined();
      expect(validStudent?.studentId).toBe(studentRes.data.id);

      // Validasi peran guru pada token siswa harus gagal
      const invalidTeacher = await validateSession(token, "guru");
      expect(invalidTeacher).toBeNull();
    });
  });

  describe("Classrooms Repository (S0-03)", () => {
    it("membuat, mendaftar, memperbarui kode, dan mengarsipkan kelas", async () => {
      const auth = await signInDemoTeacher();
      const teacherId = auth.teacher.id;

      // 1. Buat kelas
      const createRes = await createClassroom(teacherId, {
        name: "Kelas Bahasa Isyarat",
        level: "sdlb",
        defaultSignSystem: "SIBI",
      });
      expect(createRes.ok).toBe(true);
      if (!createRes.ok) return;
      const classroom = createRes.data;
      expect(classroom.name).toBe("Kelas Bahasa Isyarat");
      expect(classroom.joinCode).toHaveLength(6);

      // 2. Daftar kelas guru
      const listRes = await listClassroomsByTeacher(teacherId);
      expect(listRes.ok).toBe(true);
      if (!listRes.ok) return;
      expect(listRes.data.some((c) => c.id === classroom.id)).toBe(true);

      // 3. Ambil berdasarkan ID
      const getRes = await getClassroomById(teacherId, classroom.id);
      expect(getRes.ok).toBe(true);
      if (!getRes.ok) return;
      expect(getRes.data.id).toBe(classroom.id);

      // 4. Cari berdasarkan joinCode (siswa masuk)
      const codeRes = await getClassroomByJoinCode(classroom.joinCode);
      expect(codeRes.ok).toBe(true);
      if (!codeRes.ok) return;
      expect(codeRes.data.id).toBe(classroom.id);

      // 5. Ganti kode (regenerateJoinCode)
      const regenRes = await regenerateJoinCode(teacherId, classroom.id);
      expect(regenRes.ok).toBe(true);
      if (!regenRes.ok) return;
      expect(regenRes.data.joinCode).toHaveLength(6);

      // 6. Arsipkan kelas
      const archiveRes = await archiveClassroom(teacherId, classroom.id);
      expect(archiveRes.ok).toBe(true);

      // Kelas yang diarsipkan tidak muncul di list aktif
      const listAfterArchive = await listClassroomsByTeacher(teacherId);
      if (listAfterArchive.ok) {
        expect(listAfterArchive.data.some((c) => c.id === classroom.id)).toBe(
          false
        );
      }
    });
  });

  describe("Students Repository & Isolasi Akses (S0-03, TC-01)", () => {
    it("mendaftar siswa (idempoten case-insensitive) dan menegakkan otorisasi guru", async () => {
      const authA = await signInDemoTeacher();
      const teacherA = authA.teacher.id;

      const classRes = await createClassroom(teacherA, {
        name: "Kelas Siswa Uji",
      });
      expect(classRes.ok).toBe(true);
      if (!classRes.ok) return;
      const classId = classRes.data.id;

      // Siswa bergabung
      const join1 = await joinClassroom(classId, "Ahmad Dani", "tunarungu");
      expect(join1.ok).toBe(true);
      if (!join1.ok) return;

      // Siswa dengan nama sama (beda huruf besar/kecil) tidak membuat duplikat
      const join2 = await joinClassroom(classId, "ahmad dani");
      expect(join2.ok).toBe(true);
      if (!join2.ok) return;
      expect(join2.data.id).toBe(join1.data.id);

      // Guru A melihat siswa miliknya
      const listA = await listStudentsByClassroom(teacherA, classId);
      expect(listA.ok).toBe(true);
      if (listA.ok) {
        expect(listA.data.length).toBeGreaterThanOrEqual(1);
      }

      // TC-01: Guru B tidak boleh membaca daftar siswa Guru A (IDOR check)
      const fakeTeacherB = "00000000-0000-0000-0000-000000000099";
      const listB = await listStudentsByClassroom(fakeTeacherB, classId);
      expect(listB.ok).toBe(false);
      if (!listB.ok) {
        expect(listB.error.code).toBe("FORBIDDEN");
      }
    });

    it("mengatur preset dan menggabungkan siswa dengan verifikasi otorisasi", async () => {
      const auth = await signInDemoTeacher();
      const teacherId = auth.teacher.id;

      const classRes = await createClassroom(teacherId, {
        name: "Kelas Preset Uji",
      });
      if (!classRes.ok) return;

      const s1 = await joinClassroom(classRes.data.id, "Siswa Preset");
      const s2 = await joinClassroom(classRes.data.id, "Siswa Dobel");
      if (!s1.ok || !s2.ok) return;

      // Set preset
      const presetRes = await setStudentPreset(
        teacherId,
        s1.data.id,
        "low_vision",
        { highContrast: true }
      );
      expect(presetRes.ok).toBe(true);
      if (presetRes.ok) {
        expect(presetRes.data.needsPreset).toBe("low_vision");
      }

      // Merge siswa
      const mergeRes = await mergeStudent(teacherId, s2.data.id, s1.data.id);
      expect(mergeRes.ok).toBe(true);
      if (mergeRes.ok) {
        expect(mergeRes.data.mergedInto).toBe(s1.data.id);
      }
    });
  });

  describe("Lessons & Publications Repository (S0-03, TC-01, TC-02)", () => {
    it("membuat materi dengan kartu dan kuis, lalu membatasi akses antar guru", async () => {
      const auth = await signInDemoTeacher();
      const teacherA = auth.teacher.id;
      const fakeTeacherB = "00000000-0000-0000-0000-000000000088";

      // 1. Guru A membuat materi
      const lessonRes = await createLesson(teacherA, {
        title: "Pelajaran Huruf Vokal",
        topic: "Bahasa Indonesia",
        level: "sdlb",
        status: "draft",
        cards: [
          {
            position: 1,
            text: "Huruf A untuk Apel.",
            keyTerms: ["apel"],
            cardType: "vocabulary",
          },
        ],
        questions: [
          {
            position: 1,
            type: "match",
            prompt: "Mana huruf A?",
            payload: {
              options: [
                { id: "1", text: "A", correct: true },
                { id: "2", text: "B", correct: false },
              ],
            },
          },
        ],
      });

      expect(lessonRes.ok).toBe(true);
      if (!lessonRes.ok) return;
      const lesson = lessonRes.data;
      expect(lesson.title).toBe("Pelajaran Huruf Vokal");
      expect(lesson.cards).toHaveLength(1);
      expect(lesson.questions).toHaveLength(1);

      // Guru A bisa membaca materinya
      const getA = await getLessonWithContent(teacherA, lesson.id);
      expect(getA.ok).toBe(true);

      const allA = await listLessonsByTeacher(teacherA);
      expect(allA.ok).toBe(true);
      if (allA.ok) {
        expect(allA.data.some((l) => l.id === lesson.id)).toBe(true);
      }

      // TC-01: Guru B tidak dapat membuka materi Guru A (IDOR check)
      const getB = await getLessonWithContent(fakeTeacherB, lesson.id);
      expect(getB.ok).toBe(false);
      if (!getB.ok) {
        expect(getB.error.code).toBe("NOT_FOUND");
      }

      // TC-01: Guru B tidak dapat mengubah atau menghapus materi Guru A
      const updateB = await updateLesson(fakeTeacherB, lesson.id, {
        title: "Dibajak Guru B",
      });
      expect(updateB.ok).toBe(false);

      const deleteB = await deleteLesson(fakeTeacherB, lesson.id);
      expect(deleteB.ok).toBe(false);

      // 2. Publikasi materi
      const classRes = await createClassroom(teacherA, {
        name: "Kelas Penerbitan",
      });
      if (!classRes.ok) return;

      const pubRes = await publishLesson(teacherA, lesson.id, [
        classRes.data.id,
      ]);
      expect(pubRes.ok).toBe(true);
      if (!pubRes.ok) return;
      expect(pubRes.data).toHaveLength(1);
      const shareCode = pubRes.data[0]?.shareCode;
      expect(shareCode).toBeDefined();

      if (pubRes.ok && pubRes.data[0]) {
        const forClass = await listPublicationsForClassroom(classRes.data.id);
        expect(forClass.ok).toBe(true);

        const student = await joinClassroom(classRes.data.id, "Siswa Penerbitan");
        if (student.ok) {
          const forStudent = await getLessonForStudent(student.data.id, lesson.id);
          expect(forStudent.ok).toBe(true);
        }
      }

      // Cari publikasi lewat shareCode
      if (shareCode) {
        const byCode = await getPublicationByShareCode(shareCode);
        expect(byCode.ok).toBe(true);
        if (byCode.ok) {
          expect(byCode.data.lesson.id).toBe(lesson.id);
        }
      }

      // Ubah visibilitas publikasi
      const pubId = pubRes.data[0]?.id;
      if (pubId) {
        const toggle = await setPublicationVisibility(teacherA, pubId, false);
        expect(toggle.ok).toBe(true);
        if (toggle.ok) {
          expect(toggle.data.visible).toBe(false);
        }
      }
    });
  });

  describe("Sessions & Question Attempts Repository (S0-03)", () => {
    it("merekam peristiwa kartu dan percobaan latihan secara idempoten", async () => {
      const auth = await signInDemoTeacher();
      const teacherId = auth.teacher.id;

      const classRes = await createClassroom(teacherId, {
        name: "Kelas Sesi Uji",
      });
      if (!classRes.ok) return;

      const studentRes = await joinClassroom(classRes.data.id, "Bintang");
      if (!studentRes.ok) return;
      const studentId = studentRes.data.id;

      const lessonRes = await createLesson(teacherId, {
        title: "Materi Sesi Uji",
        topic: "Uji",
        status: "published",
        cards: [{ position: 1, text: "Kartu 1" }],
        questions: [
          {
            position: 1,
            type: "match",
            prompt: "Pilih?",
            payload: { options: [{ id: "1", text: "Ya", correct: true }] },
          },
        ],
      });
      if (!lessonRes.ok) return;
      const lesson = lessonRes.data;
      const cardId = lesson.cards[0]?.id;
      const questionId = lesson.questions[0]?.id;
      if (!cardId || !questionId) return;

      // 1. Mulai sesi
      const sessionRes = await startSession(studentId, {
        lessonId: lesson.id,
        device: "ponsel",
      });
      expect(sessionRes.ok).toBe(true);
      if (!sessionRes.ok) return;
      const sessionId = sessionRes.data.id;

      // 2. Catat peristiwa kartu (idempoten dengan eventId)
      const eventId = "11111111-1111-1111-1111-111111111111";
      const eventsRes1 = await recordCardEvents(studentId, sessionId, [
        { eventId, cardId, kind: "view", atMs: 1200, dwellMs: 3000 },
      ]);
      expect(eventsRes1.ok).toBe(true);

      // Pengiriman ulang dengan eventId yang sama tidak menduplikasi data
      const eventsRes2 = await recordCardEvents(studentId, sessionId, [
        { eventId, cardId, kind: "view", atMs: 1200, dwellMs: 3000 },
      ]);
      expect(eventsRes2.ok).toBe(true);

      // 3. Catat percobaan soal (idempoten dengan attemptEventId)
      const attemptEventId = "22222222-2222-2222-2222-222222222222";
      const attempt1 = await recordAttempt(studentId, sessionId, {
        eventId: attemptEventId,
        questionId,
        attemptNo: 1,
        isCorrect: true,
        msToAnswer: 2500,
      });
      expect(attempt1.ok).toBe(true);

      const attempt2 = await recordAttempt(studentId, sessionId, {
        eventId: attemptEventId,
        questionId,
        attemptNo: 1,
        isCorrect: true,
        msToAnswer: 2500,
      });
      expect(attempt2.ok).toBe(true);
      if (attempt1.ok && attempt2.ok) {
        expect(attempt1.data.id).toBe(attempt2.data.id);
      }

      // 4. Selesaikan sesi
      const finishRes = await finishSession(studentId, sessionId);
      expect(finishRes.ok).toBe(true);
      if (finishRes.ok) {
        expect(finishRes.data.finishedAt).toBeDefined();
      }

      // 5. Rekap hasil materi oleh guru
      const resultsRes = await listSessionsByLesson(teacherId, lesson.id);
      expect(resultsRes.ok).toBe(true);
      if (resultsRes.ok) {
        expect(resultsRes.data.length).toBeGreaterThanOrEqual(1);
        const item = resultsRes.data.find((s) => s.id === sessionId);
        expect(item).toBeDefined();
        expect(item?.studentName).toBe("Bintang");
        expect(item?.correctAttempts).toBe(1);
      }
    });
  });

  describe("Gelombang 1: Core Flow Repositories (S1-01, S1-02, S1-05, S1-06, S1-07, S1-09)", () => {
    it("S1-01 & S1-02: Join code mencegah pola mudah, bulk add siswa memisahkan baris & idempoten", async () => {
      // 1. Verifikasi pencegahan pola mudah pada join code
      expect(isEasyPattern("000000")).toBe(true);
      expect(isEasyPattern("111111")).toBe(true);
      expect(isEasyPattern("123456")).toBe(true);
      expect(isEasyPattern("654321")).toBe(true);
      expect(isEasyPattern("121212")).toBe(true);
      expect(isEasyPattern("123123")).toBe(true);

      const generated = generateJoinCode();
      expect(generated).toHaveLength(6);
      expect(isEasyPattern(generated)).toBe(false);

      // 2. Bulk add siswa
      const auth = await signInDemoTeacher();
      const teacherId = auth.teacher.id;
      const classRes = await createClassroom(teacherId, {
        name: "Kelas Bulk Siswa",
      });
      expect(classRes.ok).toBe(true);
      if (!classRes.ok) return;
      const classId = classRes.data.id;

      const rawInput = "Budi\nSiti Nur\n  budi  \nAndi, Rina\n\n";
      const bulkRes = await bulkAddStudents(teacherId, classId, rawInput, "tunarungu");
      expect(bulkRes.ok).toBe(true);
      if (!bulkRes.ok) return;

      // "Budi" dan "  budi  " digabung/didupduplikasi
      expect(bulkRes.data.added.length).toBe(4); // Budi, Siti Nur, Andi, Rina
      expect(bulkRes.data.added.some((s) => s.displayName === "Budi")).toBe(true);

      // Jalankan bulk add lagi dengan nama sama -> semua masuk existing
      const bulkAgain = await bulkAddStudents(teacherId, classId, "budi\nRINA");
      expect(bulkAgain.ok).toBe(true);
      if (bulkAgain.ok) {
        expect(bulkAgain.data.added.length).toBe(0);
        expect(bulkAgain.data.existing.length).toBe(2);
      }

      // Ambil daftar nama untuk siswa (roster publik)
      const rosterRes = await getRosterByJoinCode(classRes.data.joinCode);
      expect(rosterRes.ok).toBe(true);
      if (rosterRes.ok) {
        expect(rosterRes.data.length).toBe(4);
        expect(rosterRes.data[0]).toHaveProperty("id");
        expect(rosterRes.data[0]).toHaveProperty("displayName");
        // Tidak membocorkan needsPreset
        expect(rosterRes.data[0]).not.toHaveProperty("needsPreset");
      }
    });

    it("S1-05 & S1-06: Siswa masuk anonim dengan kode 6-digit & membaca materi terbit", async () => {
      const auth = await signInDemoTeacher();
      const teacherId = auth.teacher.id;

      const classRes = await createClassroom(teacherId, {
        name: "Kelas Masuk Anonim",
      });
      if (!classRes.ok) return;
      const joinCode = classRes.data.joinCode;

      const lessonRes = await createLesson(teacherId, {
        title: "Pelajaran Kebersihan",
        topic: "Kesehatan",
        status: "published",
        cards: [{ position: 1, text: "Gigi bersih" }],
        questions: [{ position: 1, type: "match", prompt: "Sikat?", payload: {} }],
      });
      if (!lessonRes.ok) return;

      // Terbitkan ke kelas
      await publishLesson(teacherId, lessonRes.data.id, [classRes.data.id]);

      // 1. Siswa masuk via 6-digit code dan nickname
      const entryRes = await joinStudentSession(joinCode, "Bimo", "low_vision");
      expect(entryRes.ok).toBe(true);
      if (!entryRes.ok) return;
      expect(entryRes.data.student.displayName).toBe("Bimo");
      expect(entryRes.data.classroom.id).toBe(classRes.data.id);
      expect(entryRes.data.token).toHaveLength(64);

      // 2. Cari materi terbit berdasarkan kode kelas
      const publishedList = await listPublishedLessonsByJoinCode(joinCode);
      expect(publishedList.ok).toBe(true);
      if (publishedList.ok) {
        expect(publishedList.data.length).toBeGreaterThanOrEqual(1);
        expect(publishedList.data[0]?.lesson.id).toBe(lessonRes.data.id);
      }
    });

    it("S1-07: Attempts repository mencatat percobaan dan kelompok percobaan secara idempoten", async () => {
      const auth = await signInDemoTeacher();
      const teacherId = auth.teacher.id;

      const classRes = await createClassroom(teacherId, { name: "Kelas Attempts" });
      if (!classRes.ok) return;

      const studentRes = await joinClassroom(classRes.data.id, "Doni");
      if (!studentRes.ok) return;

      const lessonRes = await createLesson(teacherId, {
        title: "Latihan Attempts",
        topic: "Latihan",
        questions: [{ position: 1, type: "match", prompt: "Soal 1", payload: {} }],
      });
      if (!lessonRes.ok) return;
      const qId = lessonRes.data.questions[0]?.id;
      if (!qId) return;

      const sessionRes = await startSession(studentRes.data.id, {
        lessonId: lessonRes.data.id,
      });
      if (!sessionRes.ok) return;
      const sId = sessionRes.data.id;

      // Catat percobaan via attempts.ts
      const attemptRes = await recordAttemptDirect(studentRes.data.id, sId, {
        questionId: qId,
        isCorrect: true,
        msToAnswer: 3000,
      });
      expect(attemptRes.ok).toBe(true);

      const batchRes = await recordBatchAttempts(studentRes.data.id, sId, [
        { questionId: qId, attemptNo: 2, isCorrect: true, msToAnswer: 2000 },
      ]);
      expect(batchRes.ok).toBe(true);

      const listRes = await listAttemptsBySession(studentRes.data.id, sId);
      expect(listRes.ok).toBe(true);
      if (listRes.ok) {
        expect(listRes.data.length).toBe(2);
      }
    });

    it("S1-09: Rekap hasil materi dan kelas menghitung skor, percobaan, dan durasi", async () => {
      const auth = await signInDemoTeacher();
      const teacherId = auth.teacher.id;

      const classRes = await createClassroom(teacherId, { name: "Kelas Rekap Hasil" });
      if (!classRes.ok) return;
      const classId = classRes.data.id;

      const s1 = await joinClassroom(classId, "Citra");
      const s2 = await joinClassroom(classId, "Dewi");
      if (!s1.ok || !s2.ok) return;

      const lessonRes = await createLesson(teacherId, {
        title: "Materi Rekap Hasil",
        topic: "Evaluasi",
        status: "published",
        cards: [{ position: 1, text: "Kartu Rekap" }],
        questions: [
          { position: 1, type: "match", prompt: "Soal 1", payload: {} },
          { position: 2, type: "order", prompt: "Soal 2", payload: {} },
        ],
      });
      if (!lessonRes.ok) return;
      const lesson = lessonRes.data;
      const q1 = lesson.questions[0]?.id;
      const q2 = lesson.questions[1]?.id;
      if (!q1 || !q2) return;

      await publishLesson(teacherId, lesson.id, [classId]);

      // Sesi Citra (selesai, 2/2 benar)
      const sesCitra = await startSession(s1.data.id, { lessonId: lesson.id });
      if (sesCitra.ok) {
        await recordAttempt(s1.data.id, sesCitra.data.id, {
          questionId: q1,
          attemptNo: 1,
          isCorrect: true,
        });
        await recordAttempt(s1.data.id, sesCitra.data.id, {
          questionId: q2,
          attemptNo: 1,
          isCorrect: true,
        });
        await finishSession(s1.data.id, sesCitra.data.id);
      }

      // Sesi Dewi (selesai, 1/2 benar)
      const sesDewi = await startSession(s2.data.id, { lessonId: lesson.id });
      if (sesDewi.ok) {
        await recordAttempt(s2.data.id, sesDewi.data.id, {
          questionId: q1,
          attemptNo: 1,
          isCorrect: true,
        });
        await recordAttempt(s2.data.id, sesDewi.data.id, {
          questionId: q2,
          attemptNo: 1,
          isCorrect: false,
        });
        await finishSession(s2.data.id, sesDewi.data.id);
      }

      // 1. Rekap hasil materi (/guru/materi/[id]/hasil)
      const lessonRecap = await resultsByLesson(teacherId, lesson.id);
      expect(lessonRecap.ok).toBe(true);
      if (lessonRecap.ok) {
        expect(lessonRecap.data.totalFinished).toBe(2);
        expect(lessonRecap.data.results.length).toBe(2);
        const citraResult = lessonRecap.data.results.find((r) => r.studentName === "Citra");
        expect(citraResult?.scoreText).toBe("2 / 2");
        expect(citraResult?.scorePercentage).toBe(100);
      }

      // Guru B tidak boleh membaca rekap materi Guru A (IDOR check)
      const fakeTeacherB = "00000000-0000-0000-0000-000000000077";
      const badRecap = await resultsByLesson(fakeTeacherB, lesson.id);
      expect(badRecap.ok).toBe(false);

      // 2. Rekap hasil kelas (/guru/kelas/[id]/hasil)
      const classRecap = await resultsByClassroom(teacherId, classId);
      expect(classRecap.ok).toBe(true);
      if (classRecap.ok) {
        expect(classRecap.data.totalStudents).toBe(2);
        expect(classRecap.data.activeStudents).toBe(2);
        expect(classRecap.data.publishedLessonsCount).toBe(1);
        expect(classRecap.data.recentResults.length).toBeGreaterThanOrEqual(2);
      }
    });
  });

  describe("Database Seed (S0-07)", () => {
    it("seedDatabase idempoten dan membuat data demo lengkap", async () => {
      const result1 = await seedDatabase();
      expect(result1.teacherId).toBeDefined();
      expect(result1.classroomId).toBeDefined();
      expect(result1.lessonId).toBeDefined();
      expect(result1.publicationId).toBeDefined();

      // Jalankan kedua kali tanpa galat duplikat
      const result2 = await seedDatabase();
      expect(result2.teacherId).toBe(result1.teacherId);
      expect(result2.classroomId).toBe(result1.classroomId);
      expect(result2.lessonId).toBe(result1.lessonId);
    });
  });

  describe("Google Teacher Lesson Persistence & Card/Question Saves", () => {
    it("materi guru Google baru tetap tersimpan dan terbaca setelah sesi dibaca ulang", async () => {
      const email = "guru.google.baru@sekolah.id";
      const upserted = await db
        .insert(teachers)
        .values({
          email,
          displayName: "Guru Google Baru",
          authProvider: "google",
        })
        .onConflictDoUpdate({
          target: teachers.email,
          set: { displayName: "Guru Google Baru", authProvider: "google" },
        })
        .returning();

      const teacher = upserted[0]!;
      const token = generateToken();
      const signedCookie = signTeacherCookiePayload(
        token,
        teacher.id,
        teacher.email ?? email,
        teacher.displayName
      );

      // Simulasi pembacaan ulang cookie saat browser refresh
      const stateless = verifyTeacherCookieStateless(signedCookie);
      expect(stateless).not.toBeNull();
      expect(stateless?.teacherId).toBe(teacher.id);

      const lessonRes = await createLesson(stateless!.teacherId, {
        title: "Mengenal Buah-Buahan",
        topic: "Buah segar",
        level: "sdlb",
        generatedBy: "manual",
        cards: [{ position: 1, text: "Ini buah apel merah.", keyTerms: ["apel"] }],
        questions: [
          {
            position: 1,
            type: "choice_word",
            prompt: "Mana yang buah apel?",
            payload: {
              options: [
                { id: "opt-1", text: "Apel", correct: true },
                { id: "opt-2", text: "Batu", correct: false },
              ],
            },
          },
        ],
      });
      expect(lessonRes.ok).toBe(true);
      if (!lessonRes.ok) return;

      // Simulasi refresh halaman /guru/materi dan /guru/materi/[id]/edit
      const dbTeacher = await db
        .select()
        .from(teachers)
        .where(eq(teachers.email, email))
        .limit(1)
        .then((rows) => rows[0]);
      expect(dbTeacher?.id).toBe(teacher.id);

      const listRes = await listLessonsByTeacher(dbTeacher!.id);
      expect(listRes.ok).toBe(true);
      if (listRes.ok) {
        expect(listRes.data.some((l) => l.id === lessonRes.data.id)).toBe(true);
      }

      const detailRes = await getLessonWithContent(dbTeacher!.id, lessonRes.data.id);
      expect(detailRes.ok).toBe(true);
      if (detailRes.ok) {
        expect(detailRes.data.title).toBe("Mengenal Buah-Buahan");
        expect(detailRes.data.cards.length).toBe(1);
        expect(detailRes.data.questions.length).toBe(1);
      }

      // Simpan perubahan kartu & soal dan verifikasi kepemilikan guru lain ditolak
      const cardId = lessonRes.data.cards[0]!.id;
      const savedCard = await saveCard(dbTeacher!.id, lessonRes.data.id, {
        id: cardId,
        position: 1,
        text: "Apel berwarna merah cerah.",
        keyTerms: ["apel", "merah"],
      });
      expect(savedCard.ok).toBe(true);

      const questionId = lessonRes.data.questions[0]!.id;
      const savedQuestion = await saveQuizQuestion(dbTeacher!.id, lessonRes.data.id, {
        id: questionId,
        position: 1,
        type: "choice_word",
        prompt: "Buah apa yang berwarna merah?",
        payload: {
          options: [
            { id: "opt-1", text: "Apel", correct: true },
            { id: "opt-2", text: "Batu", correct: false },
          ],
        },
      });
      expect(savedQuestion.ok).toBe(true);

      const otherTeacherId = "00000000-0000-0000-0000-000000000088";
      const forbiddenCard = await saveCard(otherTeacherId, lessonRes.data.id, {
        id: cardId,
        position: 1,
        text: "Disusupi",
      });
      expect(forbiddenCard.ok).toBe(false);
    });

    it("guru Google baru membuat draf, menerbitkan (Bagikan), dan membaca ulang setelah refresh", async () => {
      const email = "guru.google.publish@sekolah.id";
      const [teacher] = await db
        .insert(teachers)
        .values({
          email,
          displayName: "Guru Google Publish",
          authProvider: "google",
        })
        .onConflictDoUpdate({
          target: teachers.email,
          set: { displayName: "Guru Google Publish", authProvider: "google" },
        })
        .returning();

      expect(teacher).toBeDefined();

      // 1. Buat materi draf baru (sebelum guru memiliki wadah/kelas apapun)
      const created = await createLesson(teacher!.id, {
        title: "Mengenal Hewan Jinak",
        topic: "Hewan di sekitar rumah",
        level: "sdlb",
        sourceType: "pdf",
        status: "draft",
        generatedBy: "ai",
        cards: [
          { position: 1, text: "Kucing suka makan ikan.", keyTerms: ["kucing", "ikan"] },
          { position: 2, text: "Kelinci suka makan wortel.", keyTerms: ["kelinci", "wortel"] },
        ],
        questions: [
          {
            position: 1,
            type: "choice_word",
            prompt: "Hewan apa yang suka wortel?",
            payload: {
              options: [
                { id: "opt-1", text: "Kelinci", correct: true },
                { id: "opt-2", text: "Batu", correct: false },
              ],
            },
          },
        ],
      });
      expect(created.ok).toBe(true);
      if (!created.ok) return;

      // 2. Pastikan draf dapat langsung dibaca ulang sebelum terbit
      const draftFetch = await getLessonWithContent(teacher!.id, created.data.id);
      expect(draftFetch.ok).toBe(true);
      if (!draftFetch.ok) return;
      expect(draftFetch.data.status).toBe("draft");
      expect(draftFetch.data.cards).toHaveLength(2);
      expect(draftFetch.data.questions).toHaveLength(1);

      // 3. Simulasi klik Bagikan pertama kali: buat wadah default jika belum ada + publishLesson
      const classesBefore = await listClassroomsByTeacher(teacher!.id);
      expect(classesBefore.ok).toBe(true);
      let targetClassroomId = classesBefore.ok ? classesBefore.data[0]?.id : undefined;
      if (!targetClassroomId) {
        const defaultContainer = await createClassroom(teacher!.id, {
          name: "Pustaka PanduIn",
          level: "sdlb",
        });
        expect(defaultContainer.ok).toBe(true);
        if (!defaultContainer.ok) return;
        targetClassroomId = defaultContainer.data.id;
      }

      const pubRes = await publishLesson(teacher!.id, created.data.id, [targetClassroomId]);
      expect(pubRes.ok).toBe(true);
      if (!pubRes.ok) return;
      const shareCode = pubRes.data[0]?.shareCode;
      expect(shareCode).toBeTruthy();

      // 4. Simulasi refresh halaman: re-fetch materi & publikasi harus tetap ada
      const afterRefresh = await getLessonWithContent(teacher!.id, created.data.id);
      expect(afterRefresh.ok).toBe(true);
      if (afterRefresh.ok) {
        expect(afterRefresh.data.status).toBe("published");
        expect(afterRefresh.data.publications?.some((p) => p.shareCode === shareCode)).toBe(true);
      }

      const listAfterRefresh = await listLessonsByTeacher(teacher!.id);
      expect(listAfterRefresh.ok).toBe(true);
      if (listAfterRefresh.ok) {
        expect(listAfterRefresh.data.some((l) => l.id === created.data.id)).toBe(true);
      }

      if (shareCode) {
        const resolvedByCode = await getPublicationByShareCode(shareCode);
        expect(resolvedByCode.ok).toBe(true);
        if (resolvedByCode.ok) {
          expect(resolvedByCode.data.lesson.id).toBe(created.data.id);
        }
      }

      // 5. Guru lain tidak boleh menerbitkan atau mengambil materi milik guru ini
      const otherTeacherId = "00000000-0000-0000-0000-000000000088";
      const forbiddenPublish = await publishLesson(otherTeacherId, created.data.id, [
        targetClassroomId,
      ]);
      expect(forbiddenPublish.ok).toBe(false);
      if (!forbiddenPublish.ok) {
        expect(forbiddenPublish.error.code).toBe("NOT_FOUND");
      }
    });
  });

  describe("Environment Config (DATA_DRIVER auto-detection)", () => {
    it("otomatis memilih postgres saat DATA_DRIVER kosong dan DATABASE_URL tersedia", () => {
      const withDbUrl = parseEnv({
        DATABASE_URL: "https://user:pass@ep-example.aws.neon.tech/neondb",
      });
      expect(withDbUrl.DATA_DRIVER).toBe("postgres");

      const withEmptyDriver = parseEnv({
        DATA_DRIVER: "",
        DATABASE_URL: "https://user:pass@ep-example.aws.neon.tech/neondb",
      });
      expect(withEmptyDriver.DATA_DRIVER).toBe("postgres");

      const explicitLocal = parseEnv({
        DATA_DRIVER: "local",
        DATABASE_URL: "https://user:pass@ep-example.aws.neon.tech/neondb",
      });
      expect(explicitLocal.DATA_DRIVER).toBe("local");

      const withoutDbUrl = parseEnv({});
      expect(withoutDbUrl.DATA_DRIVER).toBe("local");
    });

    it("mendukung POSTGRES_URL, POSTGRES_PRISMA_URL, SUPABASE_DB_URL dan memaksa postgres di Vercel meski DATA_DRIVER=local", () => {
      const withPostgresUrl = parseEnv({
        POSTGRES_URL: "postgres://user:pass@ep-example.aws.neon.tech/neondb",
      });
      expect(withPostgresUrl.DATABASE_URL).toBe(
        "postgres://user:pass@ep-example.aws.neon.tech/neondb"
      );
      expect(withPostgresUrl.DATA_DRIVER).toBe("postgres");

      const withPrismaUrl = parseEnv({
        DATABASE_URL: "",
        POSTGRES_PRISMA_URL: "postgres://user:pass@ep-prisma.aws.neon.tech/neondb",
      });
      expect(withPrismaUrl.DATABASE_URL).toBe(
        "postgres://user:pass@ep-prisma.aws.neon.tech/neondb"
      );
      expect(withPrismaUrl.DATA_DRIVER).toBe("postgres");

      const withSupabaseUrl = parseEnv({
        SUPABASE_DB_URL: "postgres://postgres:pass@db.example.supabase.co:5432/postgres",
      });
      expect(withSupabaseUrl.DATABASE_URL).toBe(
        "postgres://postgres:pass@db.example.supabase.co:5432/postgres"
      );
      expect(withSupabaseUrl.DATA_DRIVER).toBe("postgres");

      const vercelWithStaleLocal = parseEnv({
        VERCEL: "1",
        DATA_DRIVER: "local",
        POSTGRES_URL: "postgres://user:pass@ep-example.aws.neon.tech/neondb",
      });
      expect(vercelWithStaleLocal.DATA_DRIVER).toBe("postgres");
      expect(vercelWithStaleLocal.DATABASE_URL).toBe(
        "postgres://user:pass@ep-example.aws.neon.tech/neondb"
      );
    });
  });
});
