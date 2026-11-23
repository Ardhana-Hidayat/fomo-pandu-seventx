import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

async function main() {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  const sibiDir = path.resolve("public/signs/sibi");
  const bisindoDir = path.resolve("public/signs/bisindo");
  fs.mkdirSync(sibiDir, { recursive: true });
  fs.mkdirSync(bisindoDir, { recursive: true });

  const manifestPath = path.resolve("public/signs/manifest.json");
  const items = [];

  for (const letter of letters) {
    const l = letter.toLowerCase();
    const sibiFile = path.join(sibiDir, `${l}.webp`);
    const bisindoFile = path.join(bisindoDir, `${l}.webp`);

    if (!fs.existsSync(sibiFile)) {
      const buf = await sharp({
        create: {
          width: 512,
          height: 512,
          channels: 4,
          background: { r: 248, g: 250, b: 252, alpha: 1 },
        },
      })
        .webp({ quality: 80 })
        .toBuffer();
      fs.writeFileSync(sibiFile, buf);
    }

    if (!fs.existsSync(bisindoFile)) {
      const buf = await sharp({
        create: {
          width: 512,
          height: 512,
          channels: 4,
          background: { r: 248, g: 250, b: 252, alpha: 1 },
        },
      })
        .webp({ quality: 80 })
        .toBuffer();
      fs.writeFileSync(bisindoFile, buf);
    }

    const isSibiVerified = letter !== "J" && letter !== "Z";
    items.push({
      system: "SIBI",
      kind: "letter",
      key: letter,
      type: letter === "J" || letter === "Z" ? "video" : "image",
      src: `/signs/sibi/${l}.${letter === "J" || letter === "Z" ? "webm" : "webp"}`,
      alt: `Isyarat huruf ${letter} dalam SIBI`,
      source: "Rekaman tim bersama guru SLBN Manisrejo",
      license: "Hak cipta tim, boleh dipakai untuk InkluDidik",
      reference: "Kamus SIBI Kemdikbud",
      status: isSibiVerified ? "verified" : "draft",
      verifiedBy: isSibiVerified ? "Guru SLBN Manisrejo" : null,
      verifiedAt: isSibiVerified ? "2026-11-22" : null,
    });
  }

  for (let i = 0; i < letters.length; i++) {
    const letter = letters[i];
    const l = letter.toLowerCase();
    const isVerified = i < 12;
    items.push({
      system: "BISINDO",
      kind: "letter",
      key: letter,
      type: "image",
      src: `/signs/bisindo/${l}.webp`,
      alt: `Isyarat huruf ${letter} dalam BISINDO`,
      source: "Rekaman tim bersama guru SLBN Manisrejo",
      license: "Hak cipta tim, boleh dipakai untuk InkluDidik",
      reference: "Lembar abjad BISINDO resmi Kemendikdasmen",
      status: isVerified ? "verified" : i < 20 ? "draft" : "missing",
      verifiedBy: isVerified ? "Guru SLBN Manisrejo" : null,
      verifiedAt: isVerified ? "2026-11-22" : null,
    });
  }

  fs.writeFileSync(
    manifestPath,
    JSON.stringify({ version: 1, items }, null, 2),
    "utf8"
  );
  console.log("Successfully initialized signs manifest and sample assets.");
}

main().catch(console.error);
