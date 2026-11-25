import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { teachers } from "@/server/db/schema";
import {
  OAUTH_STATE_COOKIE_NAME,
  getGoogleOAuthConfig,
  getRequestOrigin,
} from "@/server/security/google-oauth";
import {
  TEACHER_COOKIE_NAME,
  TEACHER_SESSION_TTL_MS,
  createTeacherSession,
  generateToken,
  signTeacherCookiePayload,
} from "@/server/security/session";

interface GoogleTokenResponse {
  access_token?: string;
}

interface GoogleUserInfo {
  email?: string;
  email_verified?: boolean;
  name?: string;
}

function redirectWithError(origin: string, code: string) {
  const response = NextResponse.redirect(new URL(`/guru/masuk?error=${code}`, origin));
  response.cookies.set(OAUTH_STATE_COOKIE_NAME, "", {
    httpOnly: true,
    secure: origin.startsWith("https://"),
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}

export async function GET(request: NextRequest) {
  const origin = getRequestOrigin(request);
  const url = new URL(request.url);
  const oauthError = url.searchParams.get("error");
  const code = url.searchParams.get("code")?.trim();
  const state = url.searchParams.get("state")?.trim();
  const storedState = request.cookies.get(OAUTH_STATE_COOKIE_NAME)?.value?.trim();

  if (oauthError) {
    return redirectWithError(origin, "google_cancelled");
  }

  if (!code || !state || !storedState || state !== storedState) {
    return redirectWithError(origin, "google_invalid_state");
  }

  const config = getGoogleOAuthConfig();
  if (!config) {
    return redirectWithError(origin, "google_not_configured");
  }

  try {
    const redirectUri = `${origin}/api/auth/google/callback`;
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      console.error("Google OAuth token exchange failed with status:", tokenRes.status);
      return redirectWithError(origin, "google_token_failed");
    }

    const tokenData = (await tokenRes.json()) as GoogleTokenResponse;
    if (!tokenData.access_token) {
      console.error("Google OAuth token response missing access_token");
      return redirectWithError(origin, "google_token_failed");
    }

    const userRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    if (!userRes.ok) {
      console.error("Google OAuth userinfo failed with status:", userRes.status);
      return redirectWithError(origin, "google_userinfo_failed");
    }

    const userInfo = (await userRes.json()) as GoogleUserInfo;
    if (!userInfo.email || userInfo.email_verified === false) {
      return redirectWithError(origin, "google_email_unverified");
    }

    const email = userInfo.email.trim().toLowerCase();
    const displayName =
      (typeof userInfo.name === "string" && userInfo.name.trim()) ||
      email.split("@")[0] ||
      "Guru";

    const upserted = await db
      .insert(teachers)
      .values({
        email,
        displayName,
        authProvider: "google",
      })
      .onConflictDoUpdate({
        target: teachers.email,
        set: {
          displayName,
          authProvider: "google",
        },
      })
      .returning();

    const teacher =
      upserted[0] ??
      (await db
        .select()
        .from(teachers)
        .where(eq(teachers.email, email))
        .limit(1)
        .then((rows) => rows[0]));

    if (!teacher) {
      console.error("Google OAuth teacher upsert returned no row");
      return redirectWithError(origin, "google_session_failed");
    }

    let sessionToken: string;
    try {
      const created = await createTeacherSession(teacher.id);
      sessionToken = created.token;
    } catch (sessionErr) {
      console.error(
        "Gagal menyimpan app_sessions guru, fallback ke cookie stateless:",
        sessionErr instanceof Error ? sessionErr.message : sessionErr
      );
      sessionToken = generateToken();
    }

    const signedCookie = signTeacherCookiePayload(
      sessionToken,
      teacher.id,
      teacher.email ?? email,
      teacher.displayName
    );
    const isSecure = origin.startsWith("https://");

    const response = NextResponse.redirect(new URL("/guru", origin));
    response.cookies.set(OAUTH_STATE_COOKIE_NAME, "", {
      httpOnly: true,
      secure: isSecure,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
    response.cookies.set(TEACHER_COOKIE_NAME, signedCookie, {
      httpOnly: true,
      secure: isSecure,
      sameSite: "lax",
      path: "/",
      maxAge: Math.floor(TEACHER_SESSION_TTL_MS / 1000),
    });

    return response;
  } catch (err) {
    console.error("Google OAuth callback error:", err);
    return redirectWithError(origin, "google_session_failed");
  }
}

