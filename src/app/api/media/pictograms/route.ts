import { NextResponse } from "next/server";
import { findOrFetchPictogram } from "@/server/services/media/arasaac";
import { storage } from "@/server/services/storage";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || searchParams.get("keyword") || "";
    const en = searchParams.get("en") || undefined;

    if (!query.trim()) {
      return NextResponse.json(
        { error: "Kata kunci pencarian tidak boleh kosong" },
        { status: 400 }
      );
    }

    // Cari di database atau fetch dari ARASAAC
    const picRes = await findOrFetchPictogram(query, en);
    if (!picRes.ok) {
      return NextResponse.json(
        { error: picRes.error.message },
        { status: 500 }
      );
    }

    const asset = picRes.data;
    const url = storage.url(asset.storageKey, "card-images");

    return NextResponse.json(
      {
        success: true,
        pictogram: {
          id: asset.id,
          storageKey: asset.storageKey,
          url,
          keyword: asset.keyword,
          alt: asset.alt,
          attribution: asset.attribution,
          license: asset.license,
        },
      },
      {
        headers: {
          "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gagal mencari piktogram",
      },
      { status: 500 }
    );
  }
}
