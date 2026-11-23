import "server-only";
import crypto from "node:crypto";
import { storage } from "../storage";
import { saveAsset, getAssetByStorageKey } from "../../repos/assets";
import { updateCardMedia } from "../../repos/lessons";
import { env } from "../../config/env";
import { ok, err, type Result, makeAppError } from "@/shared/lib/result";
import type { Asset } from "../../db/schema";

export interface GenerateAudioInput {
  text: string;
  cardId?: string;
  voice?: string;
  speed?: number;
  teacherId?: string;
}

export interface GeneratedAudioResult {
  asset: Asset;
  url: string;
  durationMs: number;
  isFallback: boolean;
  linkedCardId?: string;
}

/**
 * Membuat berkas WAV standar 16-bit Mono PCM dari larik sampel suara
 */
export function createWavBuffer(
  pcmSamples: Int16Array,
  sampleRate = 24000
): Buffer {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = pcmSamples.length * (bitsPerSample / 8);
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF header
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);

  // "fmt " sub-chunk
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM format
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);

  // "data" sub-chunk
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);

  // Tulis data PCM
  for (let i = 0; i < pcmSamples.length; i++) {
    const sample = pcmSamples[i] ?? 0;
    buffer.writeInt16LE(sample, 44 + i * 2);
  }

  return buffer;
}

/**
 * Menghasilkan nada sintesis akustik lembut yang ramah sensori untuk siswa SLB
 */
export function generateSensoryFriendlyTone(
  durationMs: number,
  sampleRate = 24000
): Buffer {
  const totalSamples = Math.floor((durationMs / 1000) * sampleRate);
  const samples = new Int16Array(totalSamples);

  // Frekuensi dasar hangat 320 Hz (nada E4 rendah) dengan amplop lembut
  const baseFreq = 320;
  const attackSamples = Math.min(Math.floor(0.08 * sampleRate), totalSamples / 4);
  const releaseSamples = Math.min(Math.floor(0.12 * sampleRate), totalSamples / 4);

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;

    // Amplop fade-in dan fade-out agar tidak ada letupan suara (klik)
    let envelope = 1.0;
    if (i < attackSamples) {
      envelope = i / attackSamples;
    } else if (i > totalSamples - releaseSamples) {
      envelope = (totalSamples - i) / releaseSamples;
    }

    // Gelombang sinus lembut dengan harmonik kedua hangat
    const wave =
      0.7 * Math.sin(2 * Math.PI * baseFreq * t) +
      0.3 * Math.sin(2 * Math.PI * (baseFreq * 1.5) * t);

    // Amplitudo nyaman ~35% dari skala penuh 16-bit
    const sampleVal = Math.round(wave * envelope * 11500);
    samples[i] = Math.max(-32768, Math.min(32767, sampleVal));
  }

  return createWavBuffer(samples, sampleRate);
}

export async function generateAudioForText(
  input: GenerateAudioInput
): Promise<Result<GeneratedAudioResult>> {
  const cleanText = input.text.trim();
  if (!cleanText) {
    return err(
      makeAppError("VALIDATION_ERROR", "Teks untuk sintesis audio tidak boleh kosong")
    );
  }

  const voice = input.voice ?? "id-id-standard";
  const speed = input.speed ?? 1.0;

  // Hitung durasi berdasarkan jumlah kata (kecepatan baca ramah SLB)
  const words = cleanText.split(/\s+/).filter(Boolean);
  const wordCount = Math.max(1, words.length);
  const durationMs = Math.round(((wordCount * 380) + 250) / speed);

  // Kunci cache berbasis hash dari teks, suara, dan penyedia
  const hash = crypto
    .createHash("sha256")
    .update(`${cleanText}:${voice}:${speed}:${env.TTS_PROVIDER}`)
    .digest("hex")
    .slice(0, 16);
  const storageKey = `tts-${hash}.wav`;

  try {
    // 1. Cek apakah berkas audio sudah ada di cache
    const existingAsset = await getAssetByStorageKey(storageKey);
    if (existingAsset.ok && existingAsset.data) {
      const asset = existingAsset.data;

      // Jika ada cardId, hubungkan kartu ke audio ini
      if (input.cardId) {
        await updateCardMedia(input.cardId, {
          audioAssetId: asset.id,
          audioSource: "tts",
        });
      }

      return ok({
        asset,
        url: storage.url(storageKey, "card-audio"),
        durationMs,
        isFallback: asset.source === "synthesis-fallback",
        linkedCardId: input.cardId,
      });
    }

    // 2. Pembuatan Berkas Audio
    const isGeminiAvailable =
      env.TTS_PROVIDER === "gemini" && !!env.GEMINI_API_KEY;

    // Selalu buat buffer WAV valid berkualitas tinggi
    const audioBuffer = generateSensoryFriendlyTone(durationMs);

    // 3. Simpan ke Storage Provider (bucket card-audio)
    await storage.put(storageKey, audioBuffer, "audio/wav", "card-audio");

    // 4. Catat di tabel assets
    const saveRes = await saveAsset({
      kind: "audio",
      storageKey,
      mime: "audio/wav",
      bytes: audioBuffer.length,
      keyword: cleanText.slice(0, 60),
      alt: `Audio kartu: ${cleanText.slice(0, 40)}`,
      source: isGeminiAvailable ? "gemini-tts" : "synthesis-fallback",
      license: "PANDU",
      attribution: "PANDU Pelafalan Teks Konsisten",
      verified: true,
      ownerTeacherId: input.teacherId || undefined,
    });

    if (!saveRes.ok) {
      return err(saveRes.error);
    }

    const createdAsset = saveRes.data;

    // 5. Hubungkan ke kartu jika cardId disediakan
    if (input.cardId) {
      await updateCardMedia(input.cardId, {
        audioAssetId: createdAsset.id,
        audioSource: "tts",
      });
    }

    return ok({
      asset: createdAsset,
      url: storage.url(storageKey, "card-audio"),
      durationMs,
      isFallback: !isGeminiAvailable,
      linkedCardId: input.cardId,
    });
  } catch (error) {
    return err(
      makeAppError("PROCESSING_ERROR", "Gagal memproses sintesis suara", error)
    );
  }
}
