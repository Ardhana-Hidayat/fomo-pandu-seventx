import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import {
  resolveSign,
  listSigns,
  verifySignItem,
  loadSignsManifest,
} from "@/server/services/signs";
import { importSignsFromCsv } from "../../scripts/import-signs";

describe("Sign Resolver & Quick Instructions (S3-02, S3-03, TC-10)", () => {
  describe("1. Sign Resolver & Manifest Loading (TC-10)", () => {
    it("memuat manifest isyarat dan memverifikasi daftar 26 huruf per sistem", async () => {
      const manifest = await loadSignsManifest();
      expect([1, 2]).toContain(manifest.version);
      expect(manifest.items.length).toBeGreaterThanOrEqual(52); // 26 SIBI + 26 BISINDO

      const sibiSigns = await listSigns("SIBI");
      expect(sibiSigns.length).toBe(26);

      const bisindoSigns = await listSigns("BISINDO");
      expect(bisindoSigns.length).toBe(26);
    });

    it("mengembalikan aset terverifikasi untuk huruf verified (SIBI A)", async () => {
      const signA = await resolveSign("SIBI", "A");
      expect(signA).not.toBeNull();
      if (!signA) return;

      expect(signA.status).toBe("verified");
      expect(signA.key).toBe("A");
      expect(signA.system).toBe("SIBI");
      expect(signA.src).toContain("/signs/sibi/a.webp");
    });

    it("mengembalikan null untuk item draft bila allowDraft false", async () => {
      // Huruf B dalam SIBI berstatus draft
      const signDraft = await resolveSign("SIBI", "B", { allowDraft: false });
      expect(signDraft).toBeNull();
    });

    it("mengembalikan aset draft dengan status draft jika allowDraft true", async () => {
      const signDraft = await resolveSign("SIBI", "B", { allowDraft: true });
      expect(signDraft).not.toBeNull();
      if (!signDraft) return;

      expect(signDraft.status).toBe("draft");
      expect(signDraft.key).toBe("B");
    });

    it("mengembalikan null untuk huruf berstatus missing", async () => {
      // Huruf Z dalam BISINDO berstatus missing
      const signZ = await resolveSign("BISINDO", "Z", { allowDraft: true });
      expect(signZ).toBeNull();
    });

    it("dapat memperbarui status isyarat menjadi verified oleh guru", async () => {
      const updated = await verifySignItem("SIBI", "J", "Ibu Dewi SLB");
      expect(updated).not.toBeNull();
      if (!updated) return;

      expect(updated.status).toBe("verified");
      expect(updated.verifiedBy).toBe("Ibu Dewi SLB");

      // Sekarang harus bisa di-resolve tanpa allowDraft
      const resolved = await resolveSign("SIBI", "J", { allowDraft: false });
      expect(resolved).not.toBeNull();
      expect(resolved?.status).toBe("verified");

      // Kembalikan ke draft agar tes idempoten
      const manifestPath = path.resolve(process.cwd(), "public/signs/manifest.json");
      const content = await fs.promises.readFile(manifestPath, "utf8");
      const manifest = JSON.parse(content);
      const item = manifest.items.find((i: { system: string; key: string }) => i.system === "SIBI" && i.key === "J");
      if (item) {
        item.status = "draft";
        item.verifiedBy = null;
        item.verifiedAt = null;
        await fs.promises.writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
      }
    });
  });

  describe("2. Sign Import Script (scripts/import-signs.ts)", () => {
    it("mengimpor gambar dari CSV, mengonversi ke 512x512 WebP, dan mencatat status draft", async () => {
      const testDir = path.resolve(process.cwd(), ".data/test-signs-raw");
      await fs.promises.mkdir(testDir, { recursive: true });

      // Buat gambar sumber uji
      const testImgPath = path.join(testDir, "sign-b-raw.png");
      await sharp({
        create: {
          width: 800,
          height: 800,
          channels: 3,
          background: { r: 100, g: 150, b: 200 },
        },
      })
        .png()
        .toFile(testImgPath);

      // Buat CSV uji
      const csvPath = path.join(testDir, "test-import.csv");
      const csvContent = `letter,system,file,source,license\nB,SIBI,sign-b-raw.png,Koleksi Guru SLB,Hak Cipta Tim`;
      await fs.promises.writeFile(csvPath, csvContent, "utf8");

      const result = await importSignsFromCsv(csvPath, testDir);
      expect(result.errors.length).toBe(0);
      expect(result.importedCount).toBe(1);

      // Verifikasi berkas WebP 512x512 dihasilkan
      const targetPath = path.resolve(process.cwd(), "public/signs/sibi/b.webp");
      expect(fs.existsSync(targetPath)).toBe(true);

      const meta = await sharp(targetPath).metadata();
      expect(meta.format).toBe("webp");
      expect(meta.width).toBe(512);
      expect(meta.height).toBe(512);

      // Bersihkan direktori uji
      await fs.promises.rm(testDir, { recursive: true, force: true });
    });
  });
});
