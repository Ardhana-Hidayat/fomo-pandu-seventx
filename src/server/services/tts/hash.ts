import { createHash } from "node:crypto";

/**
 * Normalisasi teks dan hitung hash SHA-256 untuk caching klip audio.
 * Teks sama dengan spasi/kapitalisasi tidak penting menghasilkan hash yang sama.
 * Suara atau model yang berbeda menghasilkan hash yang berbeda.
 */
export function normalizeTextForTts(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function clipHash(text: string, voiceKey: string, model: string): string {
  const normalized = normalizeTextForTts(text);
  const payload = `${normalized}|${voiceKey.trim()}|${model.trim()}`;
  return createHash("sha256").update(payload, "utf8").digest("hex");
}
