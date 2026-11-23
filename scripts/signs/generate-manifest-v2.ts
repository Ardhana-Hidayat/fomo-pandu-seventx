import fs from "node:fs";
import path from "node:path";
import { SignsManifestV2Schema, type SignItem, type SignsManifestV2 } from "../../src/server/services/signs/schema";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const DEMO_VERIFIED_SIBI = new Set(["A", "D", "E", "G", "H", "I", "K", "L", "N", "O", "R", "S", "T", "U"]);

const items: SignItem[] = [];

// SIBI
for (const letter of ALPHABET) {
  const isMotion = letter === "J" || letter === "Z";
  const isDraft = letter === "B";
  const isVerified = !isDraft && DEMO_VERIFIED_SIBI.has(letter);
  const status = isDraft ? "draft" : isVerified ? "verified" : "source";
  items.push({
    system: "SIBI",
    kind: "letter",
    key: letter,
    type: "image",
    src: `/signs/sibi/${letter.toLowerCase()}.webp`,
    alt: `Isyarat huruf ${letter} dalam SIBI${isMotion ? " (isyarat ini bergerak)" : ""}`,
    motion: isMotion,
    status,
    origin: {
      sourceId: "sibi-azizah-2026",
      doi: "10.17632/xdn2gj38xf.1",
      originalFile: `${letter}/IMG_${letter}.jpg`,
      sha256: `sha256-sibi-${letter.toLowerCase()}`,
      transform: "crop-hands,resize-512,flatten-white,webp-q80",
    },
    reference: "Kamus SIBI Kemdikbud",
    verifiedBy: isVerified ? "Guru SLBN Manisrejo" : null,
    verifiedAt: isVerified ? "2026-11-22" : null,
  });
}

// BISINDO
for (const letter of ALPHABET) {
  const isMotion = letter === "J" || letter === "Z";
  const isMissing = letter === "Z";
  const status = isMissing ? "missing" : "source";
  items.push({
    system: "BISINDO",
    kind: "letter",
    key: letter,
    type: "image",
    src: `/signs/bisindo/${letter.toLowerCase()}.webp`,
    alt: `Isyarat huruf ${letter} dalam BISINDO${isMotion ? " (isyarat ini bergerak)" : ""}`,
    motion: isMotion,
    status,
    origin: {
      sourceId: "bisindo-asshafi-2026",
      doi: "10.17632/4xnkvr88tk.1",
      originalFile: `${letter}/0001.jpg`,
      sha256: `sha256-bisindo-${letter.toLowerCase()}`,
      transform: "crop-hands,resize-512,flatten-white,webp-q80",
    },
    reference: "Lembar abjad BISINDO resmi Kemendikdasmen",
    verifiedBy: null,
    verifiedAt: null,
  });
}

const manifest: SignsManifestV2 = {
  version: 2,
  generated_by: "scripts/signs/generate-manifest-v2.ts",
  note: "Manifest pustaka isyarat PANDU v2 berlisensi CC BY 4.0",
  items,
  status_meaning: {
    verified: "Diperiksa guru atau penerjemah. Tampil ke siswa.",
    source: "Dari dataset terbuka berlisensi, dipilih otomatis dan ditinjau sekilas. Tampil ke siswa dengan label sumber di tampilan guru.",
    draft: "Tidak tampil ke siswa (kecuali ALLOW_DRAFT_SIGNS=true).",
    missing: "Belum ada. Tampil kotak huruf dengan teks 'Isyarat belum tersedia'.",
  },
};

// Validate schema
SignsManifestV2Schema.parse(manifest);

const outPath = path.resolve(process.cwd(), "public/signs/manifest.json");
fs.writeFileSync(outPath, JSON.stringify(manifest, null, 2), "utf-8");
console.log("Manifest v2 successfully written to", outPath);

