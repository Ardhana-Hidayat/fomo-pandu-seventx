import "server-only";
import { randomBytes, createHmac } from "node:crypto";
import { eq, and, gt } from "drizzle-orm";
import { db } from "../db/client";
import { appSessions, type AppSession } from "../db/schema";
import { env } from "../config/env";

export const TEACHER_COOKIE_NAME = "ik_guru";
export const STUDENT_COOKIE_NAME = "ik_siswa";

export const TEACHER_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 hari
export const STUDENT_SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 1 hari

export function hashToken(token: string): string {
  return createHmac("sha256", env.SESSION_SECRET).update(token).digest("hex");
}

export function generateToken(): string {
  return randomBytes(32).toString("hex");
}

export async function createTeacherSession(
  teacherId: string
): Promise<{ token: string; session: AppSession }> {
  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + TEACHER_SESSION_TTL_MS);

  const inserted = await db
    .insert(appSessions)
    .values({
      tokenHash,
      role: "guru",
      teacherId,
      expiresAt,
    })
    .returning();

  const session = inserted[0];
  if (!session) {
    throw new Error("Gagal membuat sesi guru");
  }

  return { token, session };
}

export async function createStudentSession(
  studentId: string,
  classroomId: string
): Promise<{ token: string; session: AppSession }> {
  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + STUDENT_SESSION_TTL_MS);

  const inserted = await db
    .insert(appSessions)
    .values({
      tokenHash,
      role: "siswa",
      studentId,
      classroomId,
      expiresAt,
    })
    .returning();

  const session = inserted[0];
  if (!session) {
    throw new Error("Gagal membuat sesi siswa");
  }

  return { token, session };
}

export async function validateSession(
  token: string,
  expectedRole?: "guru" | "siswa"
): Promise<AppSession | null> {
  if (!token || token.length < 32) {
    return null;
  }

  const tokenHash = hashToken(token);
  const now = new Date();

  const conditions = [
    eq(appSessions.tokenHash, tokenHash),
    gt(appSessions.expiresAt, now),
  ];

  if (expectedRole) {
    conditions.push(eq(appSessions.role, expectedRole));
  }

  const rows = await db
    .select()
    .from(appSessions)
    .where(and(...conditions))
    .limit(1);

  return rows[0] ?? null;
}

export async function invalidateSession(token: string): Promise<void> {
  const tokenHash = hashToken(token);
  await db.delete(appSessions).where(eq(appSessions.tokenHash, tokenHash));
}
