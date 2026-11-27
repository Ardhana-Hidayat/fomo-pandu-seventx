/**
 * PanduIn — Sinkronisasi Aset Kustom (public/media/custom/*.webp) ke Supabase Storage.
 * Mengunggah seluruh ilustrasi kustom ke bucket `card-images` secara sekuensial dengan HTTP keep-alive & retry.
 */

import "./load-env";
import fs from "node:fs";
import https from "node:https";
import path from "node:path";

const BUCKET = "card-images";

const httpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 1,
  timeout: 25000,
});

function cleanEnvVal(v: string | undefined): string {
  return (v || "").trim().replace(/^["']|["']$/g, "");
}

function getSupabaseConfig(): { url: string; serviceKey: string } {
  const url = cleanEnvVal(
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  ).replace(/\/+$/, "");
  const serviceKey = cleanEnvVal(process.env.SUPABASE_SERVICE_ROLE_KEY);

  if (!url || !serviceKey) {
    console.error(
      "Error: NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY harus tersedia di .env.local."
    );
    process.exit(1);
  }

  return { url, serviceKey };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function httpsRequest(
  fullUrl: string,
  options: {
    method: "GET" | "POST";
    headers: Record<string, string>;
    body?: Buffer | string;
    timeoutMs?: number;
  }
): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(fullUrl);
    const req = https.request(
      {
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        port: parsed.port || 443,
        path: `${parsed.pathname}${parsed.search}`,
        method: options.method,
        headers: options.headers,
        agent: httpsAgent,
        timeout: options.timeoutMs ?? 25000,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => {
          resolve({
            status: res.statusCode ?? 0,
            body: Buffer.concat(chunks).toString("utf8"),
          });
        });
      }
    );

    req.on("timeout", () => {
      req.destroy(new Error(`Request timeout after ${options.timeoutMs ?? 25000}ms`));
    });
    req.on("error", reject);

    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

async function requestWithRetry(
  fullUrl: string,
  options: {
    method: "GET" | "POST";
    headers: Record<string, string>;
    body?: Buffer | string;
    timeoutMs?: number;
  },
  attempts = 6
): Promise<{ status: number; body: string }> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await httpsRequest(fullUrl, options);
      if (res.status >= 500 && i < attempts - 1) {
        await sleep(1000 * (i + 1));
        continue;
      }
      return res;
    } catch (err) {
      lastErr = err;
      if (i < attempts - 1) {
        await sleep(1000 * (i + 1));
      }
    }
  }
  throw lastErr;
}

async function ensureBucket(url: string, serviceKey: string): Promise<void> {
  const checkRes = await requestWithRetry(`${url}/storage/v1/bucket/${BUCKET}`, {
    method: "GET",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    },
  });

  if (checkRes.status >= 200 && checkRes.status < 300) {
    return;
  }

  const createRes = await requestWithRetry(`${url}/storage/v1/bucket`, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id: BUCKET,
      name: BUCKET,
      public: true,
    }),
  });

  if (createRes.status < 200 || createRes.status >= 300) {
    throw new Error(
      `Gagal membuat bucket '${BUCKET}': HTTP ${createRes.status} ${createRes.body}`
    );
  }
  console.log(`Bucket '${BUCKET}' berhasil dibuat.`);
}

function formatError(err: unknown): string {
  if (err && typeof err === "object" && "errors" in err && Array.isArray((err as { errors: unknown[] }).errors)) {
    return (err as { errors: unknown[] }).errors.map(formatError).join("; ");
  }
  if (err instanceof Error) {
    const base = err.message || err.name || "Unknown error";
    const cause = "cause" in err && err.cause ? ` (cause: ${formatError(err.cause)})` : "";
    return `${base}${cause}`;
  }
  return String(err);
}

function isValidWebpBuffer(buf: Buffer): boolean {
  return (
    buf.length >= 12 &&
    buf.toString("ascii", 0, 4) === "RIFF" &&
    buf.toString("ascii", 8, 12) === "WEBP"
  );
}

async function uploadWebpFile(
  url: string,
  serviceKey: string,
  filePath: string,
  filename: string
): Promise<{ ok: boolean; bytes: number; error?: string }> {
  try {
    const buffer = fs.readFileSync(filePath);
    if (!isValidWebpBuffer(buffer)) {
      return { ok: false, bytes: 0, error: "Berkas bukan WebP yang valid atau kosong" };
    }
    const endpoint = `${url}/storage/v1/object/${BUCKET}/${encodeURIComponent(filename)}`;

    const res = await requestWithRetry(endpoint, {
      method: "POST",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "image/webp",
        "Content-Length": String(buffer.length),
        "x-upsert": "true",
      },
      body: buffer,
    });

    if (res.status < 200 || res.status >= 300) {
      return { ok: false, bytes: 0, error: `HTTP ${res.status}: ${res.body}` };
    }

    return { ok: true, bytes: buffer.length };
  } catch (err) {
    return {
      ok: false,
      bytes: 0,
      error: formatError(err),
    };
  }
}

async function main() {
  const { url, serviceKey } = getSupabaseConfig();
  const customDir = path.join(process.cwd(), "public", "media", "custom");

  if (!fs.existsSync(customDir)) {
    console.error(`Direktori tidak ditemukan: ${customDir}`);
    process.exit(1);
  }

  const files = fs
    .readdirSync(customDir)
    .filter((f) => f.endsWith(".webp"))
    .sort();

  if (files.length === 0) {
    console.error("Tidak ada berkas .webp di public/media/custom/");
    process.exit(1);
  }

  console.log("=== Sinkronisasi Aset Kustom ke Supabase Storage ===");
  console.log(`Bucket: ${BUCKET}`);
  console.log(`Total berkas lokal: ${files.length}`);

  await ensureBucket(url, serviceKey);

  let uploaded = 0;
  let failed = 0;
  let totalBytes = 0;

  for (let idx = 0; idx < files.length; idx++) {
    const filename = files[idx]!;
    const res = await uploadWebpFile(
      url,
      serviceKey,
      path.join(customDir, filename),
      filename
    );
    if (res.ok) {
      uploaded += 1;
      totalBytes += res.bytes;
    } else {
      failed += 1;
      console.error(`[GAGAL] ${filename}: ${res.error}`);
    }
    if ((idx + 1) % 25 === 0 || idx + 1 === files.length) {
      console.log(`Progres: ${idx + 1}/${files.length} (berhasil: ${uploaded}, gagal: ${failed})`);
    }
    await sleep(150);
  }

  httpsAgent.destroy();

  console.log(`Hasil upload ke bucket '${BUCKET}':`);
  console.log(`- Berhasil: ${uploaded}/${files.length}`);
  console.log(`- Gagal:    ${failed}`);
  console.log(`- Ukuran:   ${(totalBytes / 1024).toFixed(1)} KB`);

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  httpsAgent.destroy();
  console.error(formatError(err));
  process.exit(1);
});
