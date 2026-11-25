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

const DEMO_TEACHER_ID = "00000000-0000-4000-8000-000000000001";
const revokedHashes = new Set<string>();

export function hashToken(token: string): string {
  return createHmac("sha256", env.SESSION_SECRET).update(token).digest("hex");
}

export function generateToken(): string {
  return randomBytes(32).toString("hex");
}

export function getDemoTeacherToken(): string {
  return createHmac("sha256", env.SESSION_SECRET).update("guru-demo-v1").digest("hex");
}

export function signTeacherCookiePayload(
  token: string,
  teacherId: string,
  email?: string,
  displayName?: string
): string {
  const safeEmail = email ? encodeURIComponent(email) : "";
  const safeName = displayName ? encodeURIComponent(displayName) : "";
  const payload =
    safeEmail || safeName
      ? `${token}:${teacherId}:${safeEmail}:${safeName}`
      : `${token}:${teacherId}`;
  const sig = createHmac("sha256", env.SESSION_SECRET).update(payload).digest("hex");
  return `${payload}:${sig}`;
}

export function parseTeacherCookiePayload(
  rawCookie: string
): { token: string; teacherId: string; email?: string; displayName?: string } | null {
  if (!rawCookie) return null;
  let decoded = rawCookie;
  try {
    decoded = decodeURIComponent(rawCookie);
  } catch {}

  if (!decoded.includes(":")) {
    return { token: decoded, teacherId: "" };
  }
  const parts = decoded.split(":");
  if (parts.length === 3) {
    const [token, teacherId, sig] = parts;
    if (!token || !teacherId || !sig) return null;
    const expectedSig = createHmac("sha256", env.SESSION_SECRET)
      .update(`${token}:${teacherId}`)
      .digest("hex");
    if (sig !== expectedSig) return null;
    return { token, teacherId };
  }
  if (parts.length === 5) {
    const [token, teacherId, safeEmail, safeName, sig] = parts;
    if (!token || !teacherId || !sig) return null;
    const expectedSig = createHmac("sha256", env.SESSION_SECRET)
      .update(`${token}:${teacherId}:${safeEmail}:${safeName}`)
      .digest("hex");
    if (sig !== expectedSig) return null;
    let email: string | undefined;
    let displayName: string | undefined;
    try {
      if (safeEmail) email = decodeURIComponent(safeEmail);
    } catch {
      if (safeEmail) email = safeEmail;
    }
    try {
      if (safeName) displayName = decodeURIComponent(safeName);
    } catch {
      if (safeName) displayName = safeName;
    }
    return { token, teacherId, email, displayName };
  }
  return null;
}

export function isSessionRevoked(token: string): boolean {
  return revokedHashes.has(hashToken(token));
}

export function signStudentCookiePayload(
  token: string,
  studentId: string,
  classroomId: string,
  studentName?: string
): string {
  const safeName = studentName ? encodeURIComponent(studentName) : "";
  const payload = safeName
    ? `${token}:${studentId}:${classroomId}:${safeName}`
    : `${token}:${studentId}:${classroomId}`;
  const sig = createHmac("sha256", env.SESSION_SECRET).update(payload).digest("hex");
  return `${payload}:${sig}`;
}

export function parseStudentCookiePayload(
  rawCookie: string
): { token: string; studentId: string; classroomId: string; studentName?: string } | null {
  if (!rawCookie) return null;
  let decoded = rawCookie;
  try {
    decoded = decodeURIComponent(rawCookie);
  } catch {}

  if (!decoded.includes(":")) {
    return { token: decoded, studentId: "", classroomId: "" };
  }
  const parts = decoded.split(":");
  if (parts.length === 4) {
    const [token, studentId, classroomId, sig] = parts;
    if (!token || !studentId || !classroomId || !sig) return null;
    const expectedSig = createHmac("sha256", env.SESSION_SECRET)
      .update(`${token}:${studentId}:${classroomId}`)
      .digest("hex");
    if (sig !== expectedSig) return null;
    return { token, studentId, classroomId };
  }
  if (parts.length === 5) {
    const [token, studentId, classroomId, safeName, sig] = parts;
    if (!token || !studentId || !classroomId || !safeName || !sig) return null;
    const expectedSig = createHmac("sha256", env.SESSION_SECRET)
      .update(`${token}:${studentId}:${classroomId}:${safeName}`)
      .digest("hex");
    if (sig !== expectedSig) return null;
    let studentName = safeName;
    try {
      studentName = decodeURIComponent(safeName);
    } catch {}
    return { token, studentId, classroomId, studentName };
  }
  return null;
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
  if (revokedHashes.has(tokenHash)) {
    return null;
  }

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

  if (rows[0]) {
    return rows[0];
  }

  // Self-healing jika token adalah demo teacher token di kontainer serverless baru
  if (token === getDemoTeacherToken() && expectedRole !== "siswa") {
    const expiresAt = new Date(Date.now() + TEACHER_SESSION_TTL_MS);
    try {
      const inserted = await db
        .insert(appSessions)
        .values({
          id: "00000000-0000-4000-8000-000000000099",
          tokenHash,
          role: "guru",
          teacherId: DEMO_TEACHER_ID,
          expiresAt,
        })
        .onConflictDoNothing()
        .returning();
      if (inserted[0]) return inserted[0];
    } catch {}

    return {
      id: "00000000-0000-4000-8000-000000000099",
      tokenHash,
      role: "guru",
      teacherId: DEMO_TEACHER_ID,
      studentId: null,
      classroomId: null,
      expiresAt,
      createdAt: new Date(),
    };
  }

  return null;
}

export async function invalidateSession(token: string): Promise<void> {
  const tokenHash = hashToken(token);
  revokedHashes.add(tokenHash);
  await db.delete(appSessions).where(eq(appSessions.tokenHash, tokenHash));
}
