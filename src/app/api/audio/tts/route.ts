import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { generateAudioForText } from "@/server/services/media/tts";
import { getTeacherBySessionToken } from "@/server/services/auth/demo";
import { TEACHER_COOKIE_NAME } from "@/server/security/session";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const text = (body.text as string) || "";
    const cardId = (body.cardId as string) || undefined;
    const voice = (body.voice as string) || undefined;
    const speed = body.speed ? Number(body.speed) : 1.0;

    if (!text.trim()) {
      return NextResponse.json(
        { error: "Teks bacaan kartu tidak boleh kosong" },
        { status: 400 }
      );
    }

    // Ambil sesi guru jika ada
    const cookieStore = await cookies();
    const teacherToken = cookieStore.get(TEACHER_COOKIE_NAME)?.value;
    let teacherId: string | undefined;

    if (teacherToken) {
      const teacher = await getTeacherBySessionToken(teacherToken);
      if (teacher) {
        teacherId = teacher.id;
      }
    }

    const result = await generateAudioForText({
      text,
      cardId,
      voice,
      speed,
      teacherId,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error.message },
        { status: 500 }
      );
    }

    const { asset, url, durationMs, isFallback, linkedCardId } = result.data;

    return NextResponse.json({
      success: true,
      asset: {
        id: asset.id,
        storageKey: asset.storageKey,
        mime: asset.mime,
        bytes: asset.bytes,
      },
      url,
      durationMs,
      isFallback,
      linkedCardId,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan saat membuat audio kartu",
      },
      { status: 500 }
    );
  }
}
