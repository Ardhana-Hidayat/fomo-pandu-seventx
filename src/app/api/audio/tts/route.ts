import { NextResponse } from "next/server";
import { generateAudioForText } from "@/server/services/media/tts";
import { getCurrentTeacher } from "@/features/auth";

export async function POST(request: Request) {
  try {
    const teacherSession = await getCurrentTeacher();
    if (!teacherSession) {
      return NextResponse.json(
        { error: "Akses ditolak. Sesi guru tidak valid atau telah kedaluwarsa." },
        { status: 401 }
      );
    }

    let body: Record<string, unknown>;
    try {
      const parsed = await request.json();
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return NextResponse.json(
          { error: "Format permintaan tidak valid" },
          { status: 400 }
        );
      }
      body = parsed as Record<string, unknown>;
    } catch {
      return NextResponse.json(
        { error: "Format JSON permintaan tidak valid" },
        { status: 400 }
      );
    }

    const text = typeof body.text === "string" ? body.text : "";
    const cardId = typeof body.cardId === "string" && body.cardId.trim() ? body.cardId.trim() : undefined;
    const voice = typeof body.voice === "string" && body.voice.trim() ? body.voice.trim() : undefined;
    const rawSpeed = body.speed !== undefined ? Number(body.speed) : 1.0;
    const speed = Number.isFinite(rawSpeed) && rawSpeed >= 0.5 && rawSpeed <= 2.0 ? rawSpeed : 1.0;

    if (!text.trim()) {
      return NextResponse.json(
        { error: "Teks bacaan kartu tidak boleh kosong" },
        { status: 400 }
      );
    }

    const teacherId = teacherSession.teacher.id;

    const result = await generateAudioForText({
      text,
      cardId,
      voice,
      speed,
      teacherId,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error.message || "Gagal membuat audio kartu" },
        { status: result.error.code === "VALIDATION_ERROR" ? 400 : 500 }
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
    console.error("TTS route error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat membuat audio kartu" },
      { status: 500 }
    );
  }
}
