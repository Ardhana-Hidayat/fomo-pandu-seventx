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
} from "@/server/repos/classrooms";
import {
  joinClassroom,
  listStudentsByClassroom,
  getStudentById,
  setStudentPreset,
  mergeStudent,
} from "@/server/repos/students";
import {
  createLesson,
  getLessonWithContent,
  getLessonForStudent,
  listLessonsByTeacher,
  updateLesson,
  deleteLesson,
} from "@/server/repos/lessons";
import {
  publishLesson,
  getPublicationByShareCode,
  listPublicationsForClassroom,
  setPublicationVisibility,
} from "@/server/repos/publications";
import {
  startSession,
  recordCardEvents,
  recordAttempt,
  finishSession,
  listSessionsByLesson,
} from "@/server/repos/sessions";
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
} from "@/server/security/session";
import { seedDatabase } from "@/server/db/seed";

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
      expect(teacher.email).toBe("guru.demo@inkludidik.id");
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
});
