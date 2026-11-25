"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentTeacher } from "@/features/auth";
import {
  createClassroom,
  regenerateJoinCode,
} from "@/server/repos/classrooms";
import {
  bulkAddStudents,
  setStudentPreset,
} from "@/server/repos/students";
import {
  setPublicationVisibility,
} from "@/server/repos/publications";
import type { Result } from "@/shared/lib/result";
import { err, makeAppError } from "@/shared/lib/result";

export async function createClassroomAction(
  formData: FormData
): Promise<void> {
  const teacherSession = await getCurrentTeacher();
  if (!teacherSession) {
    redirect("/guru/masuk");
  }

  const name = formData.get("name")?.toString().trim() ?? "";
  const level = formData.get("level")?.toString().trim() ?? "sdlb";
  const defaultSignSystem = "SIBI" as const;
  const rawRoster = formData.get("roster")?.toString() ?? "";

  const createdResult = await createClassroom(teacherSession.teacher.id, {
    name,
    level,
    defaultSignSystem,
  });

  if (!createdResult.ok) {
    throw new Error(createdResult.error.message);
  }

  const classroom = createdResult.data;

  // Proses daftar siswa awal bila ada
  const studentNames = rawRoster
    .split("\n")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  if (studentNames.length > 0) {
    await bulkAddStudents(teacherSession.teacher.id, classroom.id, studentNames);
  }

  revalidatePath("/guru");
  redirect(`/guru/kelas/${classroom.id}`);
}

export async function addStudentAction(
  classroomId: string,
  studentName: string,
  preset: string = "campuran"
): Promise<Result<{ id: string }>> {
  const teacherSession = await getCurrentTeacher();
  if (!teacherSession) {
    return err(makeAppError("UNAUTHORIZED", "Sesi guru tidak valid."));
  }

  const cleanName = studentName.trim();
  if (!cleanName) {
    return err(makeAppError("INVALID_NAME", "Nama siswa tidak boleh kosong."));
  }

  const result = await bulkAddStudents(
    teacherSession.teacher.id,
    classroomId,
    [cleanName]
  );

  if (!result.ok) {
    return result;
  }

  const student = result.data.added[0];
  if (student && preset !== "campuran") {
    await setStudentPreset(teacherSession.teacher.id, student.id, preset);
  }

  revalidatePath(`/guru/kelas/${classroomId}`);
  revalidatePath(`/guru/kelas/${classroomId}/siswa`);

  return student
    ? { ok: true, data: { id: student.id } }
    : err(makeAppError("ADD_FAILED", "Gagal menambahkan siswa."));
}

export async function togglePublicationAction(
  classroomId: string,
  publicationId: string,
  visible: boolean
): Promise<Result<{ id: string }>> {
  const teacherSession = await getCurrentTeacher();
  if (!teacherSession) {
    return err(makeAppError("UNAUTHORIZED", "Sesi guru tidak valid."));
  }

  const res = await setPublicationVisibility(
    teacherSession.teacher.id,
    publicationId,
    visible
  );

  if (!res.ok) {
    return res;
  }

  revalidatePath(`/guru/kelas/${classroomId}`);
  return { ok: true, data: { id: res.data.id } };
}

export async function regenerateJoinCodeAction(
  classroomId: string
): Promise<Result<{ joinCode: string }>> {
  const teacherSession = await getCurrentTeacher();
  if (!teacherSession) {
    return err(makeAppError("UNAUTHORIZED", "Sesi guru tidak valid."));
  }

  const res = await regenerateJoinCode(teacherSession.teacher.id, classroomId);
  if (!res.ok) {
    return res;
  }

  revalidatePath(`/guru/kelas/${classroomId}`);
  return { ok: true, data: { joinCode: res.data.joinCode } };
}
