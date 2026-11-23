import { NextResponse } from "next/server";
import { resolveSign } from "@/server/services/signs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ system: string; key: string }> }
) {
  try {
    const { system, key } = await params;
    const { searchParams } = new URL(request.url);
    const allowDraft = searchParams.get("allowDraft") === "true";

    const resolved = await resolveSign(system, key, { allowDraft });

    return NextResponse.json({
      success: true,
      item: resolved,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal menyelesaikan isyarat" },
      { status: 500 }
    );
  }
}
