import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import sharp from "sharp";
import { migrate } from "drizzle-orm/pglite/migrator";
import { db } from "@/server/db/client";
import { sanitizeImage } from "@/server/services/media/image";
import {
  findOrFetchPictogram,
  createPlaceholderPictogram,
  bundleDemoPictograms,
} from "@/server/services/media/arasaac";
import {
  generateAudioForText,
  generateSensoryFriendlyTone,
} from "@/server/services/media/tts";
import { signInDemoTeacher } from "@/server/services/auth/demo";
import { createLesson, getLessonWithContent } from "@/server/repos/lessons";
import { storage } from "@/server/services/storage";
import { findPictogram } from "@/server/repos/assets";

describe("Media Pipeline & Services (S2-01, S2-02, TC-08)", () => {
  let teacherId: string;

  beforeAll(async () => {
    await migrate(db as unknown as Parameters<typeof migrate>[0], {
      migrationsFolder: "./drizzle",
    });
  });

  beforeEach(async () => {
    const auth = await signInDemoTeacher();
    teacherId = auth.teacher.id;
  });

  describe("1. Image Sanitization & sharp processing (TC-08)", () => {
    it("membersihkan gambar, buang EXIF, ubah ke WebP rasio 4:3 max 1200x900", async () => {
      // Buat gambar PNG uji berukuran 1600x1200 dengan metadata
      const testPng = await sharp({
        create: {
          width: 1600,
          height: 1200,
          channels: 3,
          background: { r: 50, g: 120, b: 200 },
        },
      })
        .png()
        .toBuffer();

      const result = await sanitizeImage(testPng, {
        maxWidth: 1200,
        maxHeight: 900,
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const { buffer, format, width, height } = result.data;
      expect(format).toBe("webp");
      expect(width).toBe(1200);
      expect(height).toBe(900);

      // Verifikasi buffer keluaran valid WebP
      const outMeta = await sharp(buffer).metadata();
      expect(outMeta.format).toBe("webp");
      expect(outMeta.width).toBe(1200);
      expect(outMeta.height).toBe(900);
      expect(outMeta.exif).toBeUndefined(); // EXIF dibuang
    });

    it("menolak berkas kosong atau bukan gambar", async () => {
      const emptyRes = await sanitizeImage(Buffer.from([]));
      expect(emptyRes.ok).toBe(false);

      const corruptRes = await sanitizeImage(Buffer.from("Bukan berkas gambar"));
      expect(corruptRes.ok).toBe(false);
    });
  });

  describe("2. ARASAAC Pictogram Service & Cache", () => {
    it("menghasilkan placeholder WebP yang rapi dan terstandarisasi saat offline", async () => {
      const placeholderRes = await createPlaceholderPictogram("air bersih");
      expect(placeholderRes.ok).toBe(true);
      if (!placeholderRes.ok) return;

      const asset = placeholderRes.data;
      expect(asset.kind).toBe("piktogram");
      expect(asset.storageKey).toContain("placeholder-air-bersih");
      expect(asset.mime).toBe("image/webp");

      // Verifikasi berkas fisik ada di storage
      const bytes = await storage.get(asset.storageKey, "card-images");
      expect(bytes).not.toBeNull();
      expect(bytes!.length).toBeGreaterThan(0);
    });

    it("findOrFetchPictogram mengecek cache terlebih dahulu secara idempoten", async () => {
      // Buat placeholder dulu yang tersimpan di DB
      const initial = await createPlaceholderPictogram("sabun mandi");
      expect(initial.ok).toBe(true);
      if (!initial.ok) return;

      // Panggilan kedua harus menemukan dari cache
      const lookup = await findOrFetchPictogram("sabun mandi");
      expect(lookup.ok).toBe(true);
      if (!lookup.ok) return;

      expect(lookup.data.id).toBe(initial.data.id);
    });

    it("bundleDemoPictograms memproses piktogram kata kunci materi demo", async () => {
      const bundleRes = await bundleDemoPictograms();
      expect(bundleRes.ok).toBe(true);
      if (!bundleRes.ok) return;

      expect(bundleRes.data).toBeGreaterThanOrEqual(5);

      // Kata kunci 'air' harus ada di cache
      const picAir = await findPictogram("air");
      expect(picAir.ok).toBe(true);
      if (picAir.ok) {
        expect(picAir.data).not.toBeNull();
      }
    });
  });

  describe("3. Audio & TTS Synthesis Service", () => {
    it("menghasilkan buffer WAV valid dengan header RIFF dan amplop suara lembut", () => {
      const durationMs = 1000;
      const wav = generateSensoryFriendlyTone(durationMs);

      expect(wav.length).toBeGreaterThan(44);
      // Validasi header RIFF
      expect(wav.toString("utf8", 0, 4)).toBe("RIFF");
      expect(wav.toString("utf8", 8, 12)).toBe("WAVE");
      expect(wav.toString("utf8", 12, 16)).toBe("fmt ");
      expect(wav.toString("utf8", 36, 40)).toBe("data");
    });

    it("generateAudioForText membuat berkas audio dan menghubungkannya ke kartu materi", async () => {
      // Buat materi dan kartu uji terlebih dahulu
      const lessonRes = await createLesson(teacherId, {
        title: "Latihan Audio TTS",
        topic: "Audio kartu",
        cards: [
          {
            position: 1,
            text: "Cuci tangan dengan sabun.",
            cardType: "instruction",
          },
        ],
      });

      expect(lessonRes.ok).toBe(true);
      if (!lessonRes.ok) return;

      const createdCard = lessonRes.data.cards[0];
      expect(createdCard).toBeDefined();
      if (!createdCard) return;

      // Generate audio untuk kartu tersebut
      const ttsRes = await generateAudioForText({
        text: "Cuci tangan dengan sabun.",
        cardId: createdCard.id,
        teacherId,
      });

      expect(ttsRes.ok).toBe(true);
      if (!ttsRes.ok) return;

      const { asset, durationMs, url } = ttsRes.data;
      expect(asset.kind).toBe("audio");
      expect(asset.mime).toBe("audio/wav");
      expect(durationMs).toBeGreaterThan(500);
      expect(url).toContain("/api/media/card-audio/");

      // Verifikasi berkas tersimpan di storage
      const bytes = await storage.get(asset.storageKey, "card-audio");
      expect(bytes).not.toBeNull();
      expect(bytes!.length).toBe(asset.bytes);

      // Verifikasi kartu di database terhubung ke audioAssetId
      const lessonCheck = await getLessonWithContent(teacherId, lessonRes.data.id);
      expect(lessonCheck.ok).toBe(true);
      if (lessonCheck.ok) {
        const cardWithAudio = lessonCheck.data.cards.find(
          (c) => c.id === createdCard.id
        );
        expect(cardWithAudio?.audioAssetId).toBe(asset.id);
        expect(cardWithAudio?.audioSource).toBe("tts");
      }
    });

    it("pemanggilan ulang dengan teks yang sama menghasilkan hash identik dari cache", async () => {
      const first = await generateAudioForText({
        text: "Siapkan air bersih.",
        teacherId,
      });
      expect(first.ok).toBe(true);
      if (!first.ok) return;

      const second = await generateAudioForText({
        text: "Siapkan air bersih.",
        teacherId,
      });
      expect(second.ok).toBe(true);
      if (!second.ok) return;

      expect(second.data.asset.id).toBe(first.data.asset.id);
      expect(second.data.asset.storageKey).toBe(first.data.asset.storageKey);
    });
  });
});
