import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { sanitizeImage } from "@/server/services/media/image";
import { storage } from "@/server/services/storage";
import { saveAsset } from "@/server/repos/assets";
import { updateCardMedia } from "@/server/repos/lessons";
import { getTeacherBySessionToken } from "@/server/services/auth/demo";
import { TEACHER_COOKIE_NAME } from "@/server/security/session";

const MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB
const MAX_AUDIO_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        { error: "Content-Type harus berupa multipart/form-data" },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const alt = ((formData.get("alt") as string) || "").trim();
    const cardId = (formData.get("cardId") as string) || undefined;
    const customKind = (formData.get("kind") as string) || undefined;

    if (!file || file.size === 0) {
      return NextResponse.json(
        { error: "Berkas tidak ditemukan atau kosong" },
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

    const mimeType = file.type;
    const isAudio =
      customKind === "audio" ||
      mimeType.startsWith("audio/") ||
      file.name.endsWith(".wav") ||
      file.name.endsWith(".webm") ||
      file.name.endsWith(".mp3") ||
      file.name.endsWith(".m4a");

    if (isAudio) {
      // 1. Validasi Ukuran Berkas Audio (Maksimal 10 MB)
      if (file.size > MAX_AUDIO_SIZE_BYTES) {
        return NextResponse.json(
          { error: "Ukuran audio melebihi batas maksimal 10 MB" },
          { status: 400 }
        );
      }

      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = Buffer.from(arrayBuffer);

      const ext = mimeType.includes("webm")
        ? "webm"
        : mimeType.includes("wav")
          ? "wav"
          : "m4a";
      const storageKey = `recording-${crypto.randomUUID()}.${ext}`;

      // Simpan ke storage bucket card-audio
      await storage.put(storageKey, audioBuffer, mimeType, "card-audio");

      const assetRes = await saveAsset({
        kind: "audio",
        storageKey,
        mime: mimeType || "audio/webm",
        bytes: audioBuffer.length,
        alt: alt || "Rekaman suara guru",
        source: "recording",
        license: "Hak cipta guru",
        attribution: "Rekaman guru PANDU",
        verified: true,
        ownerTeacherId: teacherId,
      });

      if (!assetRes.ok) {
        return NextResponse.json(
          { error: assetRes.error.message },
          { status: 500 }
        );
      }

      const asset = assetRes.data;

      // Hubungkan kartu jika cardId tersedia
      if (cardId) {
        await updateCardMedia(cardId, {
          audioAssetId: asset.id,
          audioSource: "recording",
        });
      }

      return NextResponse.json({
        success: true,
        asset: {
          id: asset.id,
          storageKey: asset.storageKey,
          url: storage.url(storageKey, "card-audio"),
          mime: asset.mime,
          bytes: asset.bytes,
          alt: asset.alt,
        },
      });
    }

    // 2. Validasi Gambar
    // Wajib ada teks alternatif untuk aksesibilitas siswa
    if (!alt) {
      return NextResponse.json(
        {
          error:
            "Teks alternatif (deskripsi gambar) wajib diisi untuk aksesibilitas siswa SLB",
        },
        { status: 400 }
      );
    }

    // Batas 2 MB untuk berkas gambar
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      return NextResponse.json(
        { error: "Ukuran gambar melebihi batas maksimal 2 MB" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const rawBuffer = Buffer.from(arrayBuffer);

    // Sanitasi dan format ulang gambar via sharp (buang EXIF, rasio 4:3 max 1200x900, WebP)
    const sanitizeResult = await sanitizeImage(rawBuffer, {
      maxWidth: 1200,
      maxHeight: 900,
      quality: 85,
    });

    if (!sanitizeResult.ok) {
      return NextResponse.json(
        { error: sanitizeResult.error.message },
        { status: 400 }
      );
    }

    const { buffer: processedBuffer } = sanitizeResult.data;
    const storageKey = `upload-${crypto.randomUUID()}.webp`;

    // Simpan ke storage bucket card-images
    await storage.put(storageKey, processedBuffer, "image/webp", "card-images");

    const assetRes = await saveAsset({
      kind: "gambar",
      storageKey,
      mime: "image/webp",
      bytes: processedBuffer.length,
      alt,
      source: "upload",
      license: "Hak cipta guru",
      attribution: "Unggahan guru",
      verified: true,
      ownerTeacherId: teacherId,
    });

    if (!assetRes.ok) {
      return NextResponse.json(
        { error: assetRes.error.message },
        { status: 500 }
      );
    }

    const asset = assetRes.data;

    // Hubungkan kartu jika cardId tersedia
    if (cardId) {
      await updateCardMedia(cardId, {
        imageAssetId: asset.id,
        imageAlt: alt,
        imageSource: "upload",
      });
    }

    return NextResponse.json({
      success: true,
      asset: {
        id: asset.id,
        storageKey: asset.storageKey,
        url: storage.url(storageKey, "card-images"),
        alt: asset.alt,
        mime: asset.mime,
        bytes: asset.bytes,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan saat mengunggah berkas",
      },
      { status: 500 }
    );
  }
}
