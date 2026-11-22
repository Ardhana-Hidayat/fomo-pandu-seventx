import { NextResponse } from "next/server";
import { env } from "@/server/config/env";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    app: "InkluDidik",
    timestamp: new Date().toISOString(),
    drivers: {
      data: env.DATA_DRIVER,
      storage: env.STORAGE_DRIVER,
      auth: env.AUTH_MODE,
      tts: env.TTS_PROVIDER,
    },
  });
}
