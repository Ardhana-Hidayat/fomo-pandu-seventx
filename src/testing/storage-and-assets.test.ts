import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { migrate } from "drizzle-orm/pglite/migrator";
import { db } from "@/server/db/client";
import { storage, localStorageProvider } from "@/server/services/storage";
import {
  saveAsset,
  findPictogram,
  findAssetByKeyword,
  cachePictogram,
  getAssetById,
  getAssetByStorageKey,
  listAssetsByKind,
  listTeacherUploads,
  deleteAsset,
} from "@/server/repos/assets";
import { signInDemoTeacher } from "@/server/services/auth/demo";

describe("Gelombang 2: Storage Provider & Asset Repo (S2-01, S2-02)", () => {
  beforeAll(async () => {
    await migrate(db as unknown as Parameters<typeof migrate>[0], {
      migrationsFolder: "./drizzle",
    });
  });

  afterAll(async () => {
    // Bersihkan file uji
    const testDir = path.resolve(process.cwd(), ".data/storage");
    if (fs.existsSync(testDir)) {
      // Biarkan direktori, hanya bersihkan berkas dengan prefix uji
    }
  });

  describe("StorageProvider (Local File Storage)", () => {
    it("dapat menyimpan, membaca, dan menghapus berkas di storage", async () => {
      const testKey = "test-image.txt";
      const content = Buffer.from("Halo PanduIn Media Storage!");

      // 1. Put/upload berkas
      const putRes = await storage.put(testKey, content, "text/plain", "card-images");
      expect(putRes.key).toBe(testKey);
      expect(putRes.url).toBe(`/api/media/card-images/${testKey}`);

      // getUrl alias
      expect(storage.getUrl(testKey, "card-images")).toBe(putRes.url);

      // 2. Baca kembali berkas
      const readBytes = await storage.get(testKey, "card-images");
      expect(readBytes).not.toBeNull();
      if (readBytes) {
        const text = Buffer.from(readBytes).toString("utf-8");
        expect(text).toBe("Halo PanduIn Media Storage!");
      }

      // 3. Hapus berkas
      await storage.delete(testKey, "card-images");
      const readAfterDelete = await storage.get(testKey, "card-images");
      expect(readAfterDelete).toBeNull();
    });

    it("mendukung alias upload() dan bucket audio", async () => {
      const audioKey = "test-audio.mp3";
      const audioContent = Buffer.from("audio-bytes-mock");

      const upRes = await localStorageProvider.upload(
        audioKey,
        audioContent,
        "audio/mpeg",
        "card-audio"
      );
      expect(upRes.url).toBe(`/api/media/card-audio/${audioKey}`);

      const fetched = await localStorageProvider.get(audioKey, "card-audio");
      expect(fetched).not.toBeNull();

      await localStorageProvider.delete(audioKey, "card-audio");
      expect(await localStorageProvider.get(audioKey, "card-audio")).toBeNull();
    });
  });

  describe("AssetRepo (Database Caching & Queries)", () => {
    it("menyimpan aset baru dan mencarinya berdasarkan ID dan storageKey", async () => {
      const auth = await signInDemoTeacher();
      const teacherId = auth.teacher.id;

      const saveRes = await saveAsset({
        kind: "gambar",
        storageKey: "upload-abc-123.webp",
        mime: "image/webp",
        bytes: 10240,
        keyword: "kucing",
        alt: "Foto kucing belang",
        ownerTeacherId: teacherId,
      });

      expect(saveRes.ok).toBe(true);
      if (!saveRes.ok) return;
      const asset = saveRes.data;
      expect(asset.kind).toBe("gambar");
      expect(asset.storageKey).toBe("upload-abc-123.webp");

      // Cari berdasarkan ID
      const byId = await getAssetById(asset.id);
      expect(byId.ok).toBe(true);
      if (byId.ok) {
        expect(byId.data.alt).toBe("Foto kucing belang");
      }

      // Cari berdasarkan storageKey
      const byKey = await getAssetByStorageKey("upload-abc-123.webp");
      expect(byKey.ok).toBe(true);
      if (byKey.ok && byKey.data) {
        expect(byKey.data.id).toBe(asset.id);
      }
    });

    it("cache ARASAAC piktogram dan mencari berdasarkan kata kunci (ID dan EN)", async () => {
      const cacheRes = await cachePictogram({
        keywordId: "sabun",
        keywordEn: "soap",
        storageKey: "arasaac-sabun.webp",
        bytes: 5400,
        alt: "Piktogram sabun mandi",
      });

      expect(cacheRes.ok).toBe(true);
      if (!cacheRes.ok) return;

      // Cari piktogram via findPictogram
      const foundPic = await findPictogram("sabun");
      expect(foundPic.ok).toBe(true);
      if (foundPic.ok && foundPic.data) {
        expect(foundPic.data.storageKey).toBe("arasaac-sabun.webp");
        expect(foundPic.data.verified).toBe(true);
      }

      // Cari via findAssetByKeyword (case insensitive, partial)
      const foundKeyword = await findAssetByKeyword("soap", "piktogram");
      expect(foundKeyword.ok).toBe(true);
      if (foundKeyword.ok && foundKeyword.data) {
        expect(foundKeyword.data.storageKey).toBe("arasaac-sabun.webp");
      }

      // Caching ulang kata kunci yang sama harus mengembalikan entri yang ada (idempoten)
      const cachedAgain = await cachePictogram({
        keywordId: "sabun",
        storageKey: "arasaac-sabun-new.webp",
        bytes: 9999,
      });
      expect(cachedAgain.ok).toBe(true);
      if (cachedAgain.ok) {
        expect(cachedAgain.data.id).toBe(cacheRes.data.id);
      }
    });

    it("daftar unggahan guru dan penghapusan dengan cek otorisasi", async () => {
      const auth = await signInDemoTeacher();
      const teacherId = auth.teacher.id;
      const fakeTeacherB = "00000000-0000-0000-0000-000000000055";

      // Buat file fisik di storage agar teruji penghapusan fisiknya
      const dummyFile = "teacher-foto-sekolah.webp";
      await storage.put(dummyFile, Buffer.from("foto"), "image/webp", "card-images");

      const saved = await saveAsset({
        kind: "gambar",
        storageKey: dummyFile,
        mime: "image/webp",
        bytes: 4,
        ownerTeacherId: teacherId,
        alt: "Foto gedung sekolah",
      });
      expect(saved.ok).toBe(true);
      if (!saved.ok) return;

      // Guru A melihat daftarnya
      const uploads = await listTeacherUploads(teacherId);
      expect(uploads.ok).toBe(true);
      if (uploads.ok) {
        expect(uploads.data.some((a) => a.id === saved.data.id)).toBe(true);
      }

      // TC-01: Guru B tidak dapat menghapus berkas Guru A (IDOR check)
      const deleteFail = await deleteAsset(fakeTeacherB, saved.data.id);
      expect(deleteFail.ok).toBe(false);
      if (!deleteFail.ok) {
        expect(deleteFail.error.code).toBe("FORBIDDEN");
      }

      // Guru A menghapus berkas miliknya
      const deleteSuccess = await deleteAsset(teacherId, saved.data.id);
      expect(deleteSuccess.ok).toBe(true);

      // Verifikasi terhapus dari DB dan storage
      const checkDb = await getAssetById(saved.data.id);
      expect(checkDb.ok).toBe(false);
      const checkStorage = await storage.get(dummyFile, "card-images");
      expect(checkStorage).toBeNull();
    });

    it("listAssetsByKind mengembalikan daftar aset sesuai jenisnya", async () => {
      const listPic = await listAssetsByKind("piktogram", 10);
      expect(listPic.ok).toBe(true);
      if (listPic.ok) {
        expect(listPic.data.length).toBeGreaterThanOrEqual(1);
        expect(listPic.data.every((a) => a.kind === "piktogram")).toBe(true);
      }
    });
  });
});
