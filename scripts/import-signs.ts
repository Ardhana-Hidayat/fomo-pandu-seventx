import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

interface SignItem {
  system: "SIBI" | "BISINDO";
  kind: "letter" | "word";
  key: string;
  type: "image" | "video" | "svg";
  src: string;
  alt: string;
  source: string;
  license: string;
  reference: string;
  status: "verified" | "draft" | "missing";
  verifiedBy: string | null;
  verifiedAt: string | null;
}

interface SignsManifest {
  version: number;
  items: SignItem[];
}

export async function importSignsFromCsv(
  csvPath: string,
  imagesDir: string
): Promise<{ importedCount: number; errors: string[] }> {
  const errors: string[] = [];
  let importedCount = 0;

  if (!fs.existsSync(csvPath)) {
    return { importedCount: 0, errors: [`Berkas CSV tidak ditemukan: ${csvPath}`] };
  }

  const csvContent = await fs.promises.readFile(csvPath, "utf8");
  const lines = csvContent
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));

  if (lines.length <= 1) {
    return { importedCount: 0, errors: ["Berkas CSV kosong atau hanya berisi tajuk"] };
  }

  const header = lines[0]!.split(",").map((h) => h.trim().toLowerCase());
  const letterIdx = header.indexOf("letter");
  const systemIdx = header.indexOf("system");
  const fileIdx = header.indexOf("file");
  const sourceIdx = header.indexOf("source");
  const licenseIdx = header.indexOf("license");

  if (letterIdx === -1 || systemIdx === -1 || fileIdx === -1) {
    return {
      importedCount: 0,
      errors: ["Header CSV harus memuat minimal: letter, system, file"],
    };
  }

  const manifestPath = path.resolve(process.cwd(), "public/signs/manifest.json");
  let manifest: SignsManifest = { version: 1, items: [] };

  if (fs.existsSync(manifestPath)) {
    try {
      manifest = JSON.parse(await fs.promises.readFile(manifestPath, "utf8"));
    } catch {
      manifest = { version: 1, items: [] };
    }
  }

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i]!.split(",").map((c) => c.trim());
    if (cols.length < 3) continue;

    const letter = cols[letterIdx]?.toUpperCase() || "";
    const system = (cols[systemIdx]?.toUpperCase() === "BISINDO" ? "BISINDO" : "SIBI") as "SIBI" | "BISINDO";
    const filename = cols[fileIdx] || "";
    const source = (sourceIdx !== -1 ? cols[sourceIdx] : "") || "Rekaman tim bersama guru SLB";
    const license = (licenseIdx !== -1 ? cols[licenseIdx] : "") || "Hak cipta tim, boleh dipakai untuk InkluDidik";

    if (!letter || !filename) continue;

    const sourceFilePath = path.isAbsolute(filename)
      ? filename
      : path.join(imagesDir, filename);

    if (!fs.existsSync(sourceFilePath)) {
      errors.push(`Berkas gambar tidak ditemukan: ${sourceFilePath}`);
      continue;
    }

    const targetSubdir = system.toLowerCase();
    const targetDir = path.resolve(process.cwd(), `public/signs/${targetSubdir}`);
    await fs.promises.mkdir(targetDir, { recursive: true });

    const targetFileName = `${letter.toLowerCase()}.webp`;
    const targetFilePath = path.join(targetDir, targetFileName);

    try {
      // Ubah ukuran ke 512x512 WebP menggunakan sharp
      await sharp(sourceFilePath)
        .rotate()
        .resize(512, 512, {
          fit: "contain",
          background: { r: 255, g: 255, b: 255, alpha: 1 },
        })
        .webp({ quality: 85 })
        .toFile(targetFilePath);

      // Tambahkan atau perbarui item draft di manifest
      const existingIdx = manifest.items.findIndex(
        (it) => it.system === system && it.key === letter
      );

      const signItem: SignItem = {
        system,
        kind: "letter",
        key: letter,
        type: "image",
        src: `/signs/${targetSubdir}/${targetFileName}`,
        alt: `Isyarat huruf ${letter} dalam ${system}`,
        source,
        license,
        reference:
          system === "SIBI"
            ? "Kamus SIBI Kemdikbud"
            : "Lembar abjad BISINDO resmi Kemendikdasmen",
        status: "draft", // Wajib berstatus draft sampai diverifikasi guru
        verifiedBy: null,
        verifiedAt: null,
      };

      if (existingIdx !== -1) {
        manifest.items[existingIdx] = signItem;
      } else {
        manifest.items.push(signItem);
      }

      importedCount++;
    } catch (err) {
      errors.push(`Gagal memproses ${letter} (${filename}): ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // Tulis kembali manifest
  await fs.promises.mkdir(path.dirname(manifestPath), { recursive: true });
  await fs.promises.writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf8");

  return { importedCount, errors };
}

// Eksekusi jika dipanggil langsung dari CLI
if (process.argv[1]?.includes("import-signs")) {
  const csvArg = process.argv[2] || "data/signs-input.csv";
  const dirArg = process.argv[3] || "data/signs-raw";

  importSignsFromCsv(csvArg, dirArg).then(({ importedCount, errors }) => {
    console.log(`Berhasil mengimpor ${importedCount} aset isyarat.`);
    if (errors.length > 0) {
      console.warn("Peringatan:", errors);
    }
  });
}
