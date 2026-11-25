import { NextRequest, NextResponse } from "next/server";
import { TEACHER_COOKIE_NAME, invalidateSession } from "@/server/security/session";
import { getRequestOrigin } from "@/server/security/google-oauth";

export async function POST(request: NextRequest) {
  const origin = getRequestOrigin(request);
  const teacherToken = request.cookies.get(TEACHER_COOKIE_NAME)?.value;

  if (teacherToken) {
    try {
      await invalidateSession(teacherToken);
    } catch {}
  }

  const response = NextResponse.redirect(new URL("/guru/masuk", origin), 303);
  response.cookies.set(TEACHER_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return response;
}
