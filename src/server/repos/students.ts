import "server-only";
import { eq, and, sql, inArray } from "drizzle-orm";
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
  if (sourceStudentId === targetStudentId) {
    return err(
      makeAppError("INVALID_MERGE", "Siswa sumber dan tujuan tidak boleh sama")
    );
  }

  try {
    // Verifikasi kedua siswa berada di kelas yang dimiliki guru (mencegah IDOR lintas guru)
    const verified = await db
      .select({ id: students.id })
      .from(students)
      .innerJoin(classrooms, eq(students.classroomId, classrooms.id))
      .where(
        and(
          inArray(students.id, [sourceStudentId, targetStudentId]),
          eq(classrooms.teacherId, teacherId)
        )
      );

    if (verified.length < 2) {
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

export async function bulkAddStudents(
  teacherId: string,
  classroomId: string,
  namesInput: string | string[],
  defaultPreset?: string
): Promise<Result<{ added: Student[]; existing: Student[] }>> {
  try {
    // 1. Verifikasi kepemilikan kelas oleh guru
    const owned = await db
      .select({ id: classrooms.id })
      .from(classrooms)
      .where(
        and(eq(classrooms.id, classroomId), eq(classrooms.teacherId, teacherId))
      )
      .limit(1);

    if (owned.length === 0) {
      return err(
        makeAppError("FORBIDDEN", "Anda tidak memiliki akses ke kelas ini")
      );
    }

    // 2. Pisahkan nama per baris / koma
    const rawList = Array.isArray(namesInput)
      ? namesInput
      : namesInput.split(/\r?\n|,/);

    const cleanNames: string[] = [];
    const seenLower = new Set<string>();

    for (const raw of rawList) {
      const trimmed = raw.trim();
      if (!trimmed) continue;
      const lower = trimmed.toLowerCase();
      if (!seenLower.has(lower)) {
        seenLower.add(lower);
        cleanNames.push(trimmed);
      }
    }

    if (cleanNames.length === 0) {
      return ok({ added: [], existing: [] });
    }

    // 3. Ambil siswa yang sudah ada dalam satu query lalu sisipkan sisanya secara batch
    const existingRows = await db
      .select()
      .from(students)
      .where(eq(students.classroomId, classroomId));

    const existingByLower = new Map<string, Student>();
    for (const row of existingRows) {
      existingByLower.set(row.displayName.trim().toLowerCase(), row);
    }

    const existing: Student[] = [];
    const toInsert: Array<{
      classroomId: string;
      displayName: string;
      needsPreset: string;
    }> = [];

    for (const name of cleanNames) {
      const found = existingByLower.get(name.toLowerCase());
      if (found) {
        existing.push(found);
      } else {
        toInsert.push({
          classroomId,
          displayName: name,
          needsPreset: defaultPreset ?? "campuran",
        });
      }
    }

    const added =
      toInsert.length > 0
        ? await db.insert(students).values(toInsert).returning()
        : [];

    return ok({ added, existing });
  } catch (error) {
    return err(
      makeAppError("DB_ERROR", "Gagal menambahkan daftar siswa", error)
    );
  }
}

export async function getRosterByJoinCode(
  joinCode: string
): Promise<Result<Array<{ id: string; displayName: string }>>> {
  try {
    const classRow = await db
      .select({ id: classrooms.id })
      .from(classrooms)
      .where(
        and(
          eq(classrooms.joinCode, joinCode.trim()),
          sql`${classrooms.archivedAt} IS NULL`
        )
      )
      .limit(1)
      .then((rows) => rows[0]);

    if (!classRow) {
      return err(
        makeAppError("INVALID_CODE", "Kode kelas salah atau kelas tidak aktif")
      );
    }

    const rows = await db
      .select({
        id: students.id,
        displayName: students.displayName,
      })
      .from(students)
      .where(
        and(
          eq(students.classroomId, classRow.id),
          sql`${students.mergedInto} IS NULL`
        )
      )
      .orderBy(sql`lower(${students.displayName}) ASC`);

    return ok(rows);
  } catch (error) {
    return err(
      makeAppError("DB_ERROR", "Gagal memuat daftar nama siswa", error)
    );
  }
}
