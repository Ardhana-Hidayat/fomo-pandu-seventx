import "server-only";
import { randomBytes, createHmac, timingSafeEqual } from "node:crypto";
import { eq, and, gt } from "drizzle-orm";
import { db } from "../db/client";
import { appSessions, type AppSession } from "../db/schema";
import { env } from "../config/env";
import { DEMO_TEACHER_ID } from "../db/demo-lesson-data";

export const TEACHER_COOKIE_NAME = "ik_guru";
export const STUDENT_COOKIE_NAME = "ik_siswa";

export const TEACHER_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 hari
export const STUDENT_SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 1 hari

const TEACHER_COOKIE_PREFIX = "v1.";
const revokedHashes = new Set<string>();

export interface TeacherCookiePayload {
  token: string;
  teacherId: string;
  email?: string;
  displayName?: string;
  expiresAt?: number;
}

function verifyHmacHex(payload: string, sig: string): boolean {
  if (!sig || !/^[0-9a-f]{64}$/i.test(sig)) return false;
  const expected = createHmac("sha256", env.SESSION_SECRET).update(payload).digest("hex");
  const sigBuf = Buffer.from(sig, "hex");
  const expBuf = Buffer.from(expected, "hex");
  return sigBuf.length === expBuf.length && timingSafeEqual(sigBuf, expBuf);
}

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
  displayName?: string,
  expiresAtMs: number = Date.now() + TEACHER_SESSION_TTL_MS
): string {
  const data: TeacherCookiePayload = {
    token,
    teacherId,
    ...(email ? { email } : {}),
    ...(displayName ? { displayName } : {}),
    expiresAt: expiresAtMs,
  };
  const encoded = Buffer.from(JSON.stringify(data), "utf8").toString("base64url");
  const body = `${TEACHER_COOKIE_PREFIX}${encoded}`;
  const sig = createHmac("sha256", env.SESSION_SECRET).update(body).digest("hex");
  return `${body}.${sig}`;
}

export function parseTeacherCookiePayload(rawCookie: string): TeacherCookiePayload | null {
  if (!rawCookie) return null;
  let decoded = rawCookie.trim();
  try {
    decoded = decodeURIComponent(decoded);
  } catch {}

  if (!decoded) return null;

  if (!decoded.startsWith(TEACHER_COOKIE_PREFIX)) {
    if (decoded.includes(".") || decoded.includes(":")) {
      return null;
    }
    if (decoded === getDemoTeacherToken()) {
      return null;
    }
    return { token: decoded, teacherId: "" };
  }

  const lastDot = decoded.lastIndexOf(".");
  if (lastDot <= TEACHER_COOKIE_PREFIX.length) {
    return null;
  }

  const body = decoded.slice(0, lastDot);
  const sig = decoded.slice(lastDot + 1);
  if (!verifyHmacHex(body, sig)) {
    return null;
  }

  try {
    const jsonStr = Buffer.from(body.slice(TEACHER_COOKIE_PREFIX.length), "base64url").toString("utf8");
    const parsed = JSON.parse(jsonStr) as Partial<TeacherCookiePayload>;
    if (
      !parsed.token ||
      typeof parsed.token !== "string" ||
      !parsed.teacherId ||
      typeof parsed.teacherId !== "string" ||
      parsed.teacherId === DEMO_TEACHER_ID
    ) {
      return null;
    }
    if (parsed.token === getDemoTeacherToken()) {
      return null;
    }
    if (typeof parsed.expiresAt === "number" && parsed.expiresAt <= Date.now()) {
      return null;
    }
    return {
      token: parsed.token,
      teacherId: parsed.teacherId,
      email: typeof parsed.email === "string" ? parsed.email : undefined,
      displayName: typeof parsed.displayName === "string" ? parsed.displayName : undefined,
      expiresAt: typeof parsed.expiresAt === "number" ? parsed.expiresAt : undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Verifikasi cepat payload cookie guru v1 secara stateless (HMAC timingSafeEqual,
 * masa berlaku wajib aktif, panjang token >= 32, bukan guru demo, dan belum di-revoke).
 */
export function verifyTeacherCookieStateless(rawCookie: string): TeacherCookiePayload | null {
  const parsed = parseTeacherCookiePayload(rawCookie);
  if (!parsed || !parsed.teacherId || parsed.teacherId === DEMO_TEACHER_ID) {
    return null;
  }
  if (parsed.token.length < 32 || parsed.token === getDemoTeacherToken()) {
    return null;
  }
  if (typeof parsed.expiresAt !== "number" || !Number.isFinite(parsed.expiresAt) || parsed.expiresAt <= Date.now()) {
    return null;
  }
  if (revokedHashes.has(hashToken(parsed.token))) {
    return null;
  }
  return parsed;
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
  tokenOrCookie: string,
  expectedRole?: "guru" | "siswa"
): Promise<AppSession | null> {
  if (!tokenOrCookie) {
    return null;
  }

  let token = tokenOrCookie;
  let teacherPayload: TeacherCookiePayload | null = null;

  if (expectedRole === "guru" || tokenOrCookie.startsWith(TEACHER_COOKIE_PREFIX)) {
    teacherPayload = parseTeacherCookiePayload(tokenOrCookie);
    if (!teacherPayload) {
      return null;
    }
    token = teacherPayload.token;
  }

  if (!token || token.length < 32 || token === getDemoTeacherToken()) {
    return null;
  }

  const tokenHash = hashToken(token);
  if (revokedHashes.has(tokenHash)) {
    return null;
  }

  try {
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
  } catch (err) {
    console.error("validateSession DB lookup failed:", err instanceof Error ? err.message : err);
  }

  if (teacherPayload?.teacherId && (!expectedRole || expectedRole === "guru")) {
    return {
      id: `stateless-${tokenHash.slice(0, 16)}`,
      tokenHash,
      role: "guru",
      teacherId: teacherPayload.teacherId,
      studentId: null,
      classroomId: null,
      expiresAt: new Date(teacherPayload.expiresAt ?? Date.now() + TEACHER_SESSION_TTL_MS),
      createdAt: new Date(),
    };
  }

  return null;
}

export async function invalidateSession(tokenOrCookie: string): Promise<void> {
  const teacherParsed = parseTeacherCookiePayload(tokenOrCookie);
  const studentParsed = teacherParsed ? null : parseStudentCookiePayload(tokenOrCookie);
  const token = teacherParsed?.token ?? studentParsed?.token ?? tokenOrCookie;
  const tokenHash = hashToken(token);
  revokedHashes.add(tokenHash);
  await db.delete(appSessions).where(eq(appSessions.tokenHash, tokenHash));
}
