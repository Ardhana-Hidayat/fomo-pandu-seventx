import { NextResponse } from "next/server";
import { env } from "@/server/config/env";

export async function GET() {
  const base = {
    status: "ok",
    app: "PanduIn",
    timestamp: new Date().toISOString(),
  };

  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(base);
  }

  return NextResponse.json({
    ...base,
    drivers: {
      data: env.DATA_DRIVER,
      storage: env.STORAGE_DRIVER,
      auth: env.AUTH_MODE,
      tts: env.TTS_PROVIDER,
    },
  });
}
