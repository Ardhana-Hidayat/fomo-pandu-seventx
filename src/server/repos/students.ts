import "server-only";
import { eq, and, sql } from "drizzle-orm";
import { db } from "../db/client";
import { students, classrooms, type Student } from "../db/schema";
import { ok, err, type Result, makeAppError } from "@/shared/lib/result";

export async function joinClassroom(
  classroomId: string,
  displayName: string,
  needsPreset?: string
): Promise<Result<Student>> {
  const cleanName = displayName.trim();
  if (!cleanName) {
    return err(makeAppError("INVALID_NAME", "Nama siswa tidak boleh kosong"));
  }

  try {
    // Cari siswa dengan nama yang sama di kelas tersebut (case-insensitive)
    const existing = await db
      .select()
      .from(students)
      .where(
        and(
          eq(students.classroomId, classroomId),
          sql`lower(${students.displayName}) = lower(${cleanName})`
        )
      )
      .limit(1);

    if (existing[0]) {
      return ok(existing[0]);
    }

    const inserted = await db
      .insert(students)
      .values({
        classroomId,
        displayName: cleanName,
        needsPreset: needsPreset ?? "campuran",
      })
      .returning();

    const created = inserted[0];
    if (!created) {
      return err(makeAppError("CREATE_FAILED", "Gagal mendaftarkan siswa"));
    }
    return ok(created);
  } catch (error) {
    return err(
      makeAppError("DB_ERROR", "Terjadi kesalahan pendaftaran siswa", error)
    );
  }
}

export async function listStudentsByClassroom(
  teacherId: string,
  classroomId: string
): Promise<Result<Student[]>> {
  try {
    // Verifikasi kepemilikan kelas oleh guru (mencegah IDOR)
    const ownedClass = await db
      .select({ id: classrooms.id })
      .from(classrooms)
      .where(
        and(
          eq(classrooms.id, classroomId),
          eq(classrooms.teacherId, teacherId)
        )
      )
      .limit(1);

    if (ownedClass.length === 0) {
      return err(
        makeAppError("FORBIDDEN", "Anda tidak memiliki akses ke kelas ini")
      );
    }

    const rows = await db
      .select()
      .from(students)
      .where(eq(students.classroomId, classroomId));

    return ok(rows);
  } catch (error) {
    return err(
      makeAppError("DB_ERROR", "Gagal mengambil daftar siswa", error)
    );
  }
}

export async function getStudentById(
  studentId: string
): Promise<Result<Student>> {
  try {
    const rows = await db
      .select()
      .from(students)
      .where(eq(students.id, studentId))
      .limit(1);

    const found = rows[0];
    if (!found) {
      return err(makeAppError("NOT_FOUND", "Siswa tidak ditemukan"));
    }
    return ok(found);
  } catch (error) {
    return err(
      makeAppError("DB_ERROR", "Gagal mengambil data siswa", error)
    );
  }
}

export async function setStudentPreset(
  teacherId: string,
  studentId: string,
  needsPreset: string,
  settingsOverride?: Record<string, unknown>
): Promise<Result<Student>> {
  try {
    // Verifikasi siswa berada di kelas milik guru
    const verified = await db
      .select({ id: students.id })
      .from(students)
      .innerJoin(classrooms, eq(students.classroomId, classrooms.id))
      .where(
        and(
          eq(students.id, studentId),
          eq(classrooms.teacherId, teacherId)
        )
      )
      .limit(1);

    if (verified.length === 0) {
      return err(
        makeAppError("FORBIDDEN", "Anda tidak berhak mengubah siswa ini")
      );
    }

    const updated = await db
      .update(students)
      .set({
        needsPreset,
        ...(settingsOverride !== undefined ? { settingsOverride } : {}),
      })
      .where(eq(students.id, studentId))
      .returning();

    const record = updated[0];
    if (!record) {
      return err(makeAppError("UPDATE_FAILED", "Gagal memperbarui preset siswa"));
    }
    return ok(record);
  } catch (error) {
    return err(
      makeAppError("DB_ERROR", "Gagal menyimpan preset siswa", error)
    );
  }
}

export async function mergeStudent(
  teacherId: string,
  sourceStudentId: string,
  targetStudentId: string
): Promise<Result<Student>> {
  try {
    // Verifikasi kedua siswa berada di kelas yang dimiliki guru
    const verified = await db
      .select({ id: students.id })
      .from(students)
      .innerJoin(classrooms, eq(students.classroomId, classrooms.id))
      .where(
        and(
          eq(students.id, sourceStudentId),
          eq(classrooms.teacherId, teacherId)
        )
      )
      .limit(1);

    if (verified.length === 0) {
      return err(
        makeAppError("FORBIDDEN", "Anda tidak berhak menggabungkan siswa ini")
      );
    }

    const updated = await db
      .update(students)
      .set({ mergedInto: targetStudentId })
      .where(eq(students.id, sourceStudentId))
      .returning();

    const record = updated[0];
    if (!record) {
      return err(makeAppError("MERGE_FAILED", "Gagal menggabungkan siswa"));
    }
    return ok(record);
  } catch (error) {
    return err(
      makeAppError("DB_ERROR", "Gagal menggabungkan data siswa", error)
    );
  }
}
