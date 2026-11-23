/**
 * PANDU — Script Sinkronisasi dan Upload Aset ke Supabase Storage
 * Mengunggah seluruh piktogram ARASAAC, isyarat SIBI/BISINDO, audio klip, dan manifest ke Supabase Storage.
 */

import "../load-env";
import fs from "node:fs";
import path from "node:path";

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://vmailnuloaoonmqeguok.supabase.co";

const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "";

if (!SERVICE_KEY) {
  console.error("❌ SUPABASE_SERVICE_ROLE_KEY atau NEXT_PUBLIC_SUPABASE_ANON_KEY wajib diatur di .env.local atau environment variable.");
  process.exit(1);
}

const BUCKETS = ["card-images", "card-audio", "signs", "module-assets"];

const MIME_MAP: Record<string, string> = {
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".json": "application/json",
  ".wav": "audio/wav",
  ".mp3": "audio/mpeg",
  ".webm": "video/webm",
};

interface UploadTask {
  bucket: string;
  storagePath: string;
  localPath: string;
}

async function ensureBucket(bucket: string): Promise<void> {
  const checkRes = await fetch(`${SUPABASE_URL}/storage/v1/bucket/${bucket}`, {
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
    },
  });

  if (checkRes.ok) {
    return;
  }

  // Buat bucket bila belum ada
  const createRes = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
    method: "POST",
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id: bucket,
      name: bucket,
      public: true,
    }),
  });

  if (!createRes.ok) {
    const txt = await createRes.text();
    console.warn(`Peringatan buat bucket ${bucket}:`, txt);
  } else {
    console.log(`Bucket '${bucket}' berhasil dibuat.`);
  }
}

async function uploadFile(task: UploadTask): Promise<{ ok: boolean; size: number; error?: string }> {
  try {
    const ext = path.extname(task.localPath).toLowerCase();
    const contentType = MIME_MAP[ext] || "application/octet-stream";
    const fileBuffer = fs.readFileSync(task.localPath);

    const safePath = task.storagePath.replace(/\\/g, "/");
    const uploadUrl = `${SUPABASE_URL}/storage/v1/object/${task.bucket}/${safePath}`;

    const res = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": contentType,
        "x-upsert": "true",
      },
      body: fileBuffer,
    });

    if (!res.ok) {
      const errText = await res.text();
      return { ok: false, size: 0, error: `${res.status}: ${errText}` };
    }

    return { ok: true, size: fileBuffer.length };
  } catch (err) {
    return {
      ok: false,
      size: 0,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function processQueue(tasks: UploadTask[], concurrency = 6) {
  let completed = 0;
  let totalBytes = 0;
  let failed = 0;

  console.log(`Memulai upload ${tasks.length} berkas aset ke Supabase Storage (konkurensi: ${concurrency})...`);

  for (let i = 0; i < tasks.length; i += concurrency) {
    const slice = tasks.slice(i, i + concurrency);
    const results = await Promise.all(slice.map((t) => uploadFile(t)));

    for (let j = 0; j < results.length; j++) {
      const r = results[j]!;
      const t = slice[j]!;
      if (r.ok) {
        completed++;
        totalBytes += r.size;
      } else {
        failed++;
        console.error(`[GAGAL] ${t.bucket}/${t.storagePath}: ${r.error}`);
      }
    }

    const pct = Math.round(((i + slice.length) / tasks.length) * 100);
    process.stdout.write(`\rProgres: ${completed}/${tasks.length} berhasil (${pct}%) - Total: ${(totalBytes / 1024 / 1024).toFixed(2)} MB`);
  }

  console.log(`\n\nUpload Selesai!`);
  console.log(`- Berhasil: ${completed} berkas`);
  console.log(`- Gagal: ${failed} berkas`);
  console.log(`- Total Ukuran: ${(totalBytes / 1024 / 1024).toFixed(2)} MB`);
}

async function main() {
  console.log("=== PANDU Supabase Asset Uploader ===");
  console.log(`Target: ${SUPABASE_URL}\n`);

  // 1. Verifikasi dan buat seluruh bucket yang dibutuhkan
  for (const b of BUCKETS) {
    await ensureBucket(b);
  }

  const tasks: UploadTask[] = [];

  // 2. Kumpulkan Piktogram ARASAAC (public/media/pictograms/)
  const pictoDir = path.resolve(process.cwd(), "public/media/pictograms");
  if (fs.existsSync(pictoDir)) {
    const files = fs.readdirSync(pictoDir);
    for (const f of files) {
      const full = path.join(pictoDir, f);
      if (fs.statSync(full).isFile()) {
        tasks.push({
          bucket: "card-images",
          storagePath: f,
          localPath: full,
        });
      }
    }
  }

  // 3. Kumpulkan Isyarat SIBI dan BISINDO (public/signs/)
  const signsDir = path.resolve(process.cwd(), "public/signs");
  if (fs.existsSync(signsDir)) {
    function walkSigns(dir: string, rel: string) {
      const entries = fs.readdirSync(dir);
      for (const entry of entries) {
        const full = path.join(dir, entry);
        const subRel = rel ? `${rel}/${entry}` : entry;
        if (fs.statSync(full).isDirectory()) {
          walkSigns(full, subRel);
        } else if (fs.statSync(full).isFile()) {
          tasks.push({
            bucket: "signs",
            storagePath: subRel,
            localPath: full,
          });
        }
      }
    }
    walkSigns(signsDir, "");
  }

  // 4. Kumpulkan Berkas Audio Lokal (.data/storage/card-audio/)
  const audioDir = path.resolve(process.cwd(), ".data/storage/card-audio");
  if (fs.existsSync(audioDir)) {
    const files = fs.readdirSync(audioDir);
    for (const f of files) {
      const full = path.join(audioDir, f);
      if (fs.statSync(full).isFile() && f.endsWith(".wav")) {
        tasks.push({
          bucket: "card-audio",
          storagePath: f,
          localPath: full,
        });
      }
    }
  }

  // 5. Kumpulkan Berkas Gambar Lokal Lainnya (.data/storage/card-images/)
  const extraImagesDir = path.resolve(process.cwd(), ".data/storage/card-images");
  if (fs.existsSync(extraImagesDir)) {
    const files = fs.readdirSync(extraImagesDir);
    for (const f of files) {
      const full = path.join(extraImagesDir, f);
      if (fs.statSync(full).isFile()) {
        tasks.push({
          bucket: "card-images",
          storagePath: f,
          localPath: full,
        });
      }
    }
  }

  console.log(`Ditemukan ${tasks.length} berkas yang siap diunggah.`);
  await processQueue(tasks, 8);
}

main().catch((err) => {
  console.error("Terjadi galat fatal:", err);
  process.exit(1);
});
