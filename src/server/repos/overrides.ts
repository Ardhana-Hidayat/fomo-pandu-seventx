import "server-only";
import { eq, and } from "drizzle-orm";
import { db } from "../db/client";
import {
  studentOverrides,
  students,
  classrooms,
  publications,
  type StudentOverride,
  type ChannelSettings,
} from "../db/schema";
import { ok, err, type Result, makeAppError } from "@/shared/lib/result";

export const DEFAULT_CHANNELS: ChannelSettings = {
  text: true,
  audio: true,
  image: true,
  sign: true,
};

export const PRESET_CHANNELS: Record<string, ChannelSettings> = {
  tunanetra: { text: true, audio: true, image: false, sign: false },
  netra: { text: true, audio: true, image: true, sign: false },
  low_vision: { text: true, audio: true, image: true, sign: false },
  "low vision": { text: true, audio: true, image: true, sign: false },
  tunarungu: { text: true, audio: false, image: true, sign: true },
  rungu: { text: true, audio: false, image: true, sign: true },
  tunawicara: { text: true, audio: true, image: true, sign: false },
  wicara: { text: true, audio: true, image: true, sign: false },
  intelektual: { text: true, audio: true, image: true, sign: true },
  hambatan_intelektual: { text: true, audio: true, image: true, sign: true },
  autisme: { text: true, audio: true, image: true, sign: true },
  campuran: { text: true, audio: true, image: true, sign: true },
};

export function getPresetChannels(preset?: string | null): ChannelSettings {
  if (!preset) return { ...DEFAULT_CHANNELS };
  const key = preset.toLowerCase().trim();
  return PRESET_CHANNELS[key] ? { ...PRESET_CHANNELS[key] } : { ...DEFAULT_CHANNELS };
}

function sanitizeChannels(raw: Partial<ChannelSettings> | Record<string, unknown>): ChannelSettings {
  return {
    text: typeof raw.text === "boolean" ? raw.text : true,
    audio: typeof raw.audio === "boolean" ? raw.audio : true,
    image: typeof raw.image === "boolean" ? raw.image : true,
    sign: typeof raw.sign === "boolean" ? raw.sign : true,
  };
}

export async function getStudentOverrides(
  publicationId: string,
  studentId: string
): Promise<Result<StudentOverride | null>> {
  try {
    const rows = await db
      .select()
      .from(studentOverrides)
      .where(
        and(
          eq(studentOverrides.publicationId, publicationId),
          eq(studentOverrides.studentId, studentId)
        )
      )
      .limit(1);

    return ok(rows[0] ?? null);
  } catch (error) {
    return err(
      makeAppError("DB_ERROR", "Gagal memuat preferensi saluran siswa", error)
    );
  }
}

export async function setStudentOverrides(
  publicationId: string,
  studentId: string,
  channels: Partial<ChannelSettings> | Record<string, boolean>,
  teacherId?: string
): Promise<Result<StudentOverride>> {
  try {
    // Verifikasi kepemilikan guru jika teacherId diberikan (mencegah IDOR)
    if (teacherId) {
      const pub = await db
        .select({
          publicationId: publications.id,
          classroomId: publications.classroomId,
          teacherId: classrooms.teacherId,
        })
        .from(publications)
        .innerJoin(classrooms, eq(publications.classroomId, classrooms.id))
        .where(
          and(
            eq(publications.id, publicationId),
            eq(classrooms.teacherId, teacherId)
          )
        )
        .limit(1);

      if (pub.length === 0) {
        return err(
          makeAppError(
            "FORBIDDEN",
            "Anda tidak memiliki izin mengubah saluran untuk materi terbit ini"
          )
        );
      }
    }

    const cleanChannels = sanitizeChannels(channels);

    // Cek apakah sudah ada override sebelumnya
    const existing = await db
      .select()
      .from(studentOverrides)
      .where(
        and(
          eq(studentOverrides.publicationId, publicationId),
          eq(studentOverrides.studentId, studentId)
        )
      )
      .limit(1);

    if (existing[0]) {
      const updated = await db
        .update(studentOverrides)
        .set({
          channels: cleanChannels,
        })
        .where(eq(studentOverrides.id, existing[0].id))
        .returning();

      return ok(updated[0]);
    }

    const inserted = await db
      .insert(studentOverrides)
      .values({
        publicationId,
        studentId,
        channels: cleanChannels,
      })
      .returning();

    return ok(inserted[0]);
  } catch (error) {
    return err(
      makeAppError("DB_ERROR", "Gagal menyimpan preferensi saluran siswa", error)
    );
  }
}

export async function deleteStudentOverride(
  publicationId: string,
  studentId: string,
  teacherId?: string
): Promise<Result<boolean>> {
  try {
    if (teacherId) {
      const pub = await db
        .select({
          teacherId: classrooms.teacherId,
        })
        .from(publications)
        .innerJoin(classrooms, eq(publications.classroomId, classrooms.id))
        .where(
          and(
            eq(publications.id, publicationId),
            eq(classrooms.teacherId, teacherId)
          )
        )
        .limit(1);

      if (pub.length === 0) {
        return err(
          makeAppError(
            "FORBIDDEN",
            "Anda tidak memiliki izin menghapus preferensi materi ini"
          )
        );
      }
    }

    await db
      .delete(studentOverrides)
      .where(
        and(
          eq(studentOverrides.publicationId, publicationId),
          eq(studentOverrides.studentId, studentId)
        )
      );

    return ok(true);
  } catch (error) {
    return err(
      makeAppError("DB_ERROR", "Gagal menghapus preferensi saluran siswa", error)
    );
  }
}

export async function listOverridesByPublication(
  teacherId: string,
  publicationId: string
): Promise<Result<StudentOverride[]>> {
  try {
    const pub = await db
      .select({
        teacherId: classrooms.teacherId,
      })
      .from(publications)
      .innerJoin(classrooms, eq(publications.classroomId, classrooms.id))
      .where(
        and(
          eq(publications.id, publicationId),
          eq(classrooms.teacherId, teacherId)
        )
      )
      .limit(1);

    if (pub.length === 0) {
      return err(
        makeAppError(
          "FORBIDDEN",
          "Anda tidak memiliki akses ke preferensi materi terbit ini"
        )
      );
    }

    const rows = await db
      .select()
      .from(studentOverrides)
      .where(eq(studentOverrides.publicationId, publicationId));

    return ok(rows);
  } catch (error) {
    return err(
      makeAppError(
        "DB_ERROR",
        "Gagal memuat daftar preferensi saluran siswa",
        error
      )
    );
  }
}

export async function getEffectiveChannels(
  classroomId: string,
  studentId: string,
  publicationId?: string
): Promise<Result<ChannelSettings>> {
  try {
    // 1. Cek override khusus materi terbit untuk siswa ini
    if (publicationId) {
      const overrideRows = await db
        .select()
        .from(studentOverrides)
        .where(
          and(
            eq(studentOverrides.publicationId, publicationId),
            eq(studentOverrides.studentId, studentId)
          )
        )
        .limit(1);

      if (overrideRows[0]?.channels) {
        return ok(sanitizeChannels(overrideRows[0].channels));
      }
    }

    // 2. Cek profil siswa (settings_override atau preset kebutuhan)
    const studentRows = await db
      .select({
        needsPreset: students.needsPreset,
        settingsOverride: students.settingsOverride,
      })
      .from(students)
      .where(eq(students.id, studentId))
      .limit(1);

    const student = studentRows[0];
    if (student) {
      // Jika siswa memiliki custom channel override di profil
      const customChannels = (student.settingsOverride as Record<string, unknown> | null)?.channels;
      if (customChannels && typeof customChannels === "object") {
        return ok(sanitizeChannels(customChannels as Record<string, unknown>));
      }

      // Jika ada preset kebutuhan siswa
      if (student.needsPreset) {
        const presetChannels = getPresetChannels(student.needsPreset);
        return ok(presetChannels);
      }
    }

    // 3. Cek pengaturan default saluran di kelas
    const classroomRows = await db
      .select({
        defaultChannels: classrooms.defaultChannels,
      })
      .from(classrooms)
      .where(eq(classrooms.id, classroomId))
      .limit(1);

    const classroom = classroomRows[0];
    if (classroom?.defaultChannels) {
      return ok(sanitizeChannels(classroom.defaultChannels));
    }

    // 4. Default sistem empat saluran
    return ok({ ...DEFAULT_CHANNELS });
  } catch (error) {
    return err(
      makeAppError("DB_ERROR", "Gagal menghitung saluran efektif", error)
    );
  }
}
