import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { teachers } from "@/server/db/schema";
import {
  TEACHER_COOKIE_NAME,
  TEACHER_SESSION_TTL_MS,
  createTeacherSession,
  signTeacherCookiePayload,
} from "@/server/security/session";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as { accessToken?: unknown } | null;
    const accessToken = typeof body?.accessToken === "string" ? body.accessToken.trim() : "";

    if (!accessToken) {
      return NextResponse.json(
        { error: "Token akses Google tidak ditemukan." },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: "Konfigurasi Supabase di server belum lengkap." },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data, error } = await supabase.auth.getUser(accessToken);
    if (error || !data.user || !data.user.email) {
      return NextResponse.json(
        { error: "Token Google tidak valid atau sudah kedaluwarsa." },
        { status: 401 }
      );
    }

    const email = data.user.email.trim().toLowerCase();
    const metadata = data.user.user_metadata as Record<string, unknown> | undefined;
    const rawName =
      (typeof metadata?.full_name === "string" && metadata.full_name) ||
      (typeof metadata?.name === "string" && metadata.name) ||
      email.split("@")[0] ||
      "Guru";
    const displayName = rawName.trim() || "Guru";

    const existing = await db
      .select()
      .from(teachers)
      .where(eq(teachers.email, email))
      .limit(1)
      .then((rows) => rows[0]);

    let teacher = existing;
    if (existing) {
      const updated = await db
        .update(teachers)
        .set({
          displayName,
          authProvider: "google",
        })
        .where(eq(teachers.id, existing.id))
        .returning();
      teacher = updated[0] ?? existing;
    } else {
      const inserted = await db
        .insert(teachers)
        .values({
          email,
          displayName,
          authProvider: "google",
        })
        .returning();
      teacher = inserted[0];
    }

    if (!teacher) {
      return NextResponse.json(
        { error: "Gagal menyimpan data guru." },
        { status: 500 }
      );
    }

    const { token } = await createTeacherSession(teacher.id);
    const signedCookie = signTeacherCookiePayload(
      token,
      teacher.id,
      teacher.email ?? email,
      teacher.displayName
    );

    const response = NextResponse.json({
      ok: true,
      teacher: {
        id: teacher.id,
        email: teacher.email,
        displayName: teacher.displayName,
      },
    });

    response.cookies.set(TEACHER_COOKIE_NAME, signedCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: Math.floor(TEACHER_SESSION_TTL_MS / 1000),
    });

    return response;
  } catch (err) {
    console.error("Google session error:", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat membuat sesi guru." },
      { status: 500 }
    );
  }
}
