import "server-only";
import { eq, and, isNull } from "drizzle-orm";
import { db } from "../db/client";
import {
  classrooms,
  type Classroom,
  type ChannelSettings,
} from "../db/schema";
import { ok, err, type Result, makeAppError } from "@/shared/lib/result";

export interface CreateClassroomInput {
  name: string;
  level?: string;
  defaultSignSystem?: "SIBI" | "BISINDO";
  defaultChannels?: ChannelSettings;
  rosterOnly?: boolean;
}

function generateJoinCode(): string {
  // 6 digit angka
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function createClassroom(
  teacherId: string,
  input: CreateClassroomInput
): Promise<Result<Classroom>> {
  if (!input.name || input.name.trim().length === 0) {
    return err(makeAppError("INVALID_NAME", "Nama kelas tidak boleh kosong"));
  }

  // Coba dapatkan kode unik yang belum aktif
  let code = generateJoinCode();
  let attempts = 0;
  while (attempts < 5) {
    const existing = await db
      .select({ id: classrooms.id })
      .from(classrooms)
      .where(and(eq(classrooms.joinCode, code), isNull(classrooms.archivedAt)))
      .limit(1);

    if (existing.length === 0) break;
    code = generateJoinCode();
    attempts++;
  }

  try {
    const inserted = await db
      .insert(classrooms)
      .values({
        teacherId,
        name: input.name.trim(),
        level: input.level ?? "sdlb",
        joinCode: code,
        rosterOnly: input.rosterOnly ?? false,
        defaultSignSystem: input.defaultSignSystem ?? "SIBI",
        defaultChannels: input.defaultChannels ?? {
          text: true,
          audio: true,
          image: true,
          sign: true,
        },
      })
      .returning();

    const created = inserted[0];
    if (!created) {
      return err(makeAppError("CREATE_FAILED", "Gagal menyimpan ruang kelas"));
    }
    return ok(created);
  } catch (error) {
    return err(
      makeAppError("DB_ERROR", "Terjadi kesalahan basis data", error)
    );
  }
}

export async function listClassroomsByTeacher(
  teacherId: string
): Promise<Result<Classroom[]>> {
  try {
    const rows = await db
      .select()
      .from(classrooms)
      .where(
        and(eq(classrooms.teacherId, teacherId), isNull(classrooms.archivedAt))
      );
    return ok(rows);
  } catch (error) {
    return err(
      makeAppError("DB_ERROR", "Gagal memuat daftar kelas", error)
    );
  }
}

export async function getClassroomById(
  teacherId: string,
  classroomId: string
): Promise<Result<Classroom>> {
  try {
    const rows = await db
      .select()
      .from(classrooms)
      .where(
        and(
          eq(classrooms.id, classroomId),
          eq(classrooms.teacherId, teacherId),
          isNull(classrooms.archivedAt)
        )
      )
      .limit(1);

    const found = rows[0];
    if (!found) {
      return err(makeAppError("NOT_FOUND", "Kelas tidak ditemukan"));
    }
    return ok(found);
  } catch (error) {
    return err(
      makeAppError("DB_ERROR", "Gagal mengambil data kelas", error)
    );
  }
}

export async function getClassroomByJoinCode(
  joinCode: string
): Promise<Result<Classroom>> {
  try {
    const rows = await db
      .select()
      .from(classrooms)
      .where(
        and(
          eq(classrooms.joinCode, joinCode.trim()),
          isNull(classrooms.archivedAt)
        )
      )
      .limit(1);

    const found = rows[0];
    if (!found) {
      return err(
        makeAppError("INVALID_CODE", "Kode kelas salah atau kelas tidak aktif")
      );
    }
    return ok(found);
  } catch (error) {
    return err(
      makeAppError("DB_ERROR", "Gagal memverifikasi kode kelas", error)
    );
  }
}

export async function regenerateJoinCode(
  teacherId: string,
  classroomId: string
): Promise<Result<Classroom>> {
  const existing = await getClassroomById(teacherId, classroomId);
  if (!existing.ok) {
    return existing;
  }

  let newCode = generateJoinCode();
  let attempts = 0;
  while (attempts < 5) {
    const conflict = await db
      .select({ id: classrooms.id })
      .from(classrooms)
      .where(
        and(eq(classrooms.joinCode, newCode), isNull(classrooms.archivedAt))
      )
      .limit(1);

    if (conflict.length === 0) break;
    newCode = generateJoinCode();
    attempts++;
  }

  try {
    const updated = await db
      .update(classrooms)
      .set({ joinCode: newCode })
      .where(
        and(
          eq(classrooms.id, classroomId),
          eq(classrooms.teacherId, teacherId)
        )
      )
      .returning();

    const record = updated[0];
    if (!record) {
      return err(makeAppError("UPDATE_FAILED", "Gagal memperbarui kode kelas"));
    }
    return ok(record);
  } catch (error) {
    return err(
      makeAppError("DB_ERROR", "Gagal mengganti kode kelas", error)
    );
  }
}

export async function archiveClassroom(
  teacherId: string,
  classroomId: string
): Promise<Result<Classroom>> {
  try {
    const updated = await db
      .update(classrooms)
      .set({ archivedAt: new Date() })
      .where(
        and(
          eq(classrooms.id, classroomId),
          eq(classrooms.teacherId, teacherId)
        )
      )
      .returning();

    const record = updated[0];
    if (!record) {
      return err(makeAppError("NOT_FOUND", "Kelas tidak ditemukan untuk diarsipkan"));
    }
    return ok(record);
  } catch (error) {
    return err(
      makeAppError("DB_ERROR", "Gagal mengarsipkan kelas", error)
    );
  }
}
