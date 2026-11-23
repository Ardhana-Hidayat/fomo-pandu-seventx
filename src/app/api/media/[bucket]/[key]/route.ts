import { NextResponse } from "next/server";
import { storage } from "@/server/services/storage";

const MIME_TYPES: Record<string, string> = {
  webp: "image/webp",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  svg: "image/svg+xml",
  wav: "audio/wav",
  mp3: "audio/mpeg",
  webm: "audio/webm",
  m4a: "audio/mp4",
  pdf: "application/pdf",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ bucket: string; key: string }> }
) {
  try {
    const { bucket, key } = await params;
    const safeKey = key.replace(/[^a-zA-Z0-9_.-]/g, "");

    const bytes = await storage.get(safeKey, bucket);
    if (!bytes) {
      return new NextResponse("Berkas media tidak ditemukan", { status: 404 });
    }

    const ext = safeKey.split(".").pop()?.toLowerCase() || "";
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    return new Response(Buffer.from(bytes), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    return new NextResponse(
      error instanceof Error ? error.message : "Gagal memuat media",
      { status: 500 }
    );
  }
}
