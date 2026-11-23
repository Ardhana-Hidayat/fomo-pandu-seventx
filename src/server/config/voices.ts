/**
 * Katalog Suara dan Kecepatan Resmi PANDU (Pack 2 Berkas 04 §4 & Berkas 06).
 * Antarmuka hanya menampilkan label netral (Suara A, B, C, D) tanpa menyebut nama teknis/gender.
 */

export interface VoiceOption {
  key: string;
  label: string;
  providerVoice: string;
  description: string;
}

export interface SpeedOption {
  key: "pelan" | "normal" | "cepat";
  label: string;
  value: number; // Dipakai langsung sebagai audio.playbackRate (0.8 .. 1.15)
}

export const SYSTEM_VOICES: readonly VoiceOption[] = [
  { key: "A", label: "Suara A", providerVoice: "Kore", description: "Jelas dan ramah, artikulasi standar untuk materi awal" },
  { key: "B", label: "Suara B", providerVoice: "Puck", description: "Nada hangat dan stabil, tempo teratur" },
  { key: "C", label: "Suara C", providerVoice: "Charon", description: "Resonan dan tenang, artikulasi lambat berbobot" },
  { key: "D", label: "Suara D", providerVoice: "Aoede", description: "Ringan dan melodis, mudah diikuti siswa pemula" },
] as const;

export const SPEED_OPTIONS: readonly SpeedOption[] = [
  { key: "pelan", label: "Pelan", value: 0.8 },
  { key: "normal", label: "Normal", value: 1.0 },
  { key: "cepat", label: "Cepat", value: 1.15 },
] as const;

export const DEFAULT_VOICE_KEY = "A";
export const DEFAULT_SPEED_KEY = "normal";
export const DEFAULT_SPEED_VALUE = 1.0;
