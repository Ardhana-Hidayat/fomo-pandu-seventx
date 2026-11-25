import { NextResponse } from "next/server";
import { listSigns, verifySignItem } from "@/server/services/signs";

export async function GET() {
  try {
    const items = await listSigns("SIBI");
    return NextResponse.json({ success: true, items });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal memuat pustaka isyarat" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const system = "SIBI";
    const key = body.key || "";
    const verifiedBy = body.verifiedBy || "Guru SLB";

    if (!key) {
      return NextResponse.json({ error: "Huruf isyarat wajib diisi" }, { status: 400 });
    }

    const updated = await verifySignItem(system, key, verifiedBy);
    if (!updated) {
      return NextResponse.json({ error: "Huruf isyarat tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ success: true, item: updated });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal memverifikasi isyarat" },
      { status: 500 }
    );
  }
}
