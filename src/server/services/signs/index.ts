import "server-only";
import fs from "node:fs";
import path from "node:path";
import { env } from "@/server/config/env";
import type { SignItem, SignsManifest, SignSystem } from "./types";

const MANIFEST_PATH = path.resolve(process.cwd(), "public/signs/manifest.json");

let cachedManifest: SignsManifest | null = null;
let lastLoadedTime = 0;
const CACHE_TTL_MS = 10000; // 10 detik

export async function loadSignsManifest(): Promise<SignsManifest> {
  const now = Date.now();
  if (cachedManifest && now - lastLoadedTime < CACHE_TTL_MS) {
    return cachedManifest;
  }

  try {
    if (!fs.existsSync(MANIFEST_PATH)) {
      // Jika berkas belum ada, buat manifest awal dari contoh
      const initialManifest: SignsManifest = {
        version: 1,
        items: generateDefaultSignItems(),
      };
      await fs.promises.mkdir(path.dirname(MANIFEST_PATH), { recursive: true });
      await fs.promises.writeFile(
        MANIFEST_PATH,
        JSON.stringify(initialManifest, null, 2),
        "utf8"
      );
      cachedManifest = initialManifest;
      lastLoadedTime = now;
      return initialManifest;
    }

    const content = await fs.promises.readFile(MANIFEST_PATH, "utf8");
    cachedManifest = JSON.parse(content) as SignsManifest;
    lastLoadedTime = now;
    return cachedManifest;
  } catch (error) {
    console.warn("Gagal memuat manifest isyarat, memakai data default:", error);
    return {
      version: 1,
      items: generateDefaultSignItems(),
    };
  }
}

export function generateDefaultSignItems(): SignItem[] {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  const items: SignItem[] = [];

  // SIBI
  for (const letter of letters) {
    const isVerified = letter !== "J" && letter !== "Z"; // J dan Z bergerak
    items.push({
      system: "SIBI",
      kind: "letter",
      key: letter,
      type: letter === "J" || letter === "Z" ? "video" : "image",
      src: `/signs/sibi/${letter.toLowerCase()}.${letter === "J" || letter === "Z" ? "webm" : "webp"}`,
      alt: `Isyarat huruf ${letter} dalam SIBI`,
      source: "Rekaman tim bersama guru SLBN Manisrejo",
      license: "Hak cipta tim, boleh dipakai untuk InkluDidik",
      reference: "Kamus SIBI Kemdikbud",
      status: isVerified ? "verified" : "draft",
      verifiedBy: isVerified ? "Guru SLBN Manisrejo" : null,
      verifiedAt: isVerified ? "2026-11-22" : null,
    });
  }

  // BISINDO
  for (let i = 0; i < letters.length; i++) {
    const letter = letters[i]!;
    const isVerified = i < 12; // 12 dari 26 terverifikasi sesuai deskripsi berkas 08
    items.push({
      system: "BISINDO",
      kind: "letter",
      key: letter,
      type: "image",
      src: `/signs/bisindo/${letter.toLowerCase()}.webp`,
      alt: `Isyarat huruf ${letter} dalam BISINDO`,
      source: "Rekaman tim bersama guru SLBN Manisrejo",
      license: "Hak cipta tim, boleh dipakai untuk InkluDidik",
      reference: "Lembar abjad BISINDO resmi Kemendikdasmen",
      status: isVerified ? "verified" : i < 20 ? "draft" : "missing",
      verifiedBy: isVerified ? "Guru SLBN Manisrejo" : null,
      verifiedAt: isVerified ? "2026-11-22" : null,
    });
  }

  return items;
}

export interface ResolveSignOptions {
  allowDraft?: boolean;
}

/**
 * Penyelesai isyarat sesuai aturan Berkas 08:
 * 1. Ada item verified -> pakai
 * 2. Item draft dan (allowDraft atau ALLOW_DRAFT_SIGNS) -> pakai
 * 3. Selain itu -> null (komponen menampilkan kotak huruf "Isyarat belum tersedia")
 */
export async function resolveSign(
  system: string,
  key: string,
  options: ResolveSignOptions = {}
): Promise<SignItem | null> {
  const normSystem = (system.toUpperCase() === "BISINDO" ? "BISINDO" : "SIBI") as SignSystem;
  const normKey = key.trim().toUpperCase();

  const manifest = await loadSignsManifest();
  const match = manifest.items.find(
    (item) => item.system === normSystem && item.key === normKey
  );

  if (!match) {
    return null;
  }

  // Aturan 1: Item verified selalu dipakai
  if (match.status === "verified") {
    return match;
  }

  // Aturan 2: Item draft hanya dipakai jika ALLOW_DRAFT_SIGNS=true atau allowDraft eksplisit
  const canUseDraft = options.allowDraft ?? env.ALLOW_DRAFT_SIGNS;
  if (match.status === "draft" && canUseDraft) {
    return match;
  }

  // Aturan 3: Selain itu kembalikan null
  return null;
}

export async function listSigns(system: string): Promise<SignItem[]> {
  const normSystem = (system.toUpperCase() === "BISINDO" ? "BISINDO" : "SIBI") as SignSystem;
  const manifest = await loadSignsManifest();
  return manifest.items.filter((item) => item.system === normSystem);
}

export async function verifySignItem(
  system: string,
  key: string,
  verifiedBy: string
): Promise<SignItem | null> {
  const normSystem = (system.toUpperCase() === "BISINDO" ? "BISINDO" : "SIBI") as SignSystem;
  const normKey = key.trim().toUpperCase();

  const manifest = await loadSignsManifest();
  const item = manifest.items.find(
    (i) => i.system === normSystem && i.key === normKey
  );

  if (!item) {
    return null;
  }

  item.status = "verified";
  item.verifiedBy = verifiedBy.trim();
  item.verifiedAt = new Date().toISOString().split("T")[0] || null;

  // Tulis pembaruan ke berkas
  try {
    await fs.promises.writeFile(
      MANIFEST_PATH,
      JSON.stringify(manifest, null, 2),
      "utf8"
    );
    cachedManifest = manifest;
  } catch (error) {
    console.error("Gagal menyimpan pembaruan verifikasi isyarat:", error);
  }

  return item;
}
