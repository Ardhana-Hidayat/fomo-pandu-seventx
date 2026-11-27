// @vitest-environment node
import { describe, it, expect, beforeAll, vi } from "vitest";
import sharp from "sharp";
import { eq, sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/pglite/migrator";
import { db } from "@/server/db/client";
import { assets, visualConcepts } from "@/server/db/schema";
import { signInDemoTeacher } from "@/server/services/auth/demo";
import { storage } from "@/server/services/storage";
import { POST as postUpload } from "../upload/route";

const { mockGetCurrentTeacher } = vi.hoisted(() => ({
  mockGetCurrentTeacher: vi.fn(),
}));

vi.mock("@/features/auth", () => ({
  getCurrentTeacher: mockGetCurrentTeacher,
}));

async function makeTestPng(r: number, g: number, b: number, width = 300, height = 200) {
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r, g, b },
    },
  })
    .png()
    .toBuffer();
}

function makeUploadRequest(file: File, name: string, alt?: string) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("name", name);
  if (alt !== undefined) {
    formData.append("alt", alt);
  }
  return new Request("http://localhost/api/media/upload", {
    method: "POST",
    body: formData,
  });
}

describe("POST /api/media/upload Transactional Named Upload (C4)", () => {
  beforeAll(async () => {
    await migrate(db as unknown as Parameters<typeof migrate>[0], {
      migrationsFolder: "./drizzle",
    });

    // Ensure visual_concepts & assets.sha256 exist even if migration file hasn't been generated yet
    await db.execute(sql`ALTER TABLE assets ADD COLUMN IF NOT EXISTS sha256 text`);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS visual_concepts (
        id text PRIMARY KEY,
        label text NOT NULL,
        label_norm text NOT NULL,
        synonyms text[] NOT NULL DEFAULT '{}',
        label_en text,
        domains text[] NOT NULL DEFAULT '{}',
        group_id text,
        kind text,
        popularity real NOT NULL DEFAULT 0,
        asset_id uuid REFERENCES assets(id) ON DELETE SET NULL,
        alt_asset_ids uuid[] NOT NULL DEFAULT '{}',
        alt_text text,
        status text NOT NULL DEFAULT 'active',
        source text NOT NULL DEFAULT 'arasaac',
        source_ref text,
        uploaded_by uuid REFERENCES teachers(id) ON DELETE SET NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await db.execute(sql`
      CREATE UNIQUE INDEX IF NOT EXISTS visual_concepts_active_label_norm_idx
      ON visual_concepts (label_norm)
      WHERE status <> 'hidden'
    `);

    const auth = await signInDemoTeacher();
    mockGetCurrentTeacher.mockResolvedValue({ teacher: auth.teacher });
  });

  it("1. uploads a new named image as 400x400 WebP <= 40KB and creates asset + visual_concept", async () => {
    const png = await makeTestPng(30, 120, 210);
    const file = new File([new Uint8Array(png)], "anggrek.png", { type: "image/png" });

    const res = await postUpload(makeUploadRequest(file, "Anggrek Bulan", "Bunga anggrek putih"));
    expect(res.status).toBe(200);
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.duplicate).toBe(false);
    expect(json.asset.id).toBeTruthy();
    expect(json.asset.bytes).toBeLessThanOrEqual(40 * 1024);
    expect(json.asset.storageKey).toMatch(/^catalog\/[a-f0-9]+\.webp$/);
    expect(json.concept.labelNorm).toBe("anggrek bulan");
    expect(json.concept.source).toBe("upload");
    expect(json.concept.groupId).toBe("lainnya");

    const stored = await storage.get(json.asset.storageKey, "card-images");
    expect(stored).not.toBeNull();
    const meta = await sharp(Buffer.from(stored!)).metadata();
    expect(meta.format).toBe("webp");
    expect(meta.width).toBe(400);
    expect(meta.height).toBe(400);
  });

  it("2. rejects duplicate name (case/space-insensitive) without storing a duplicate file", async () => {
    const png = await makeTestPng(200, 50, 50);
    const file = new File([new Uint8Array(png)], "duplikat.png", { type: "image/png" });

    const beforeAssets = await db.select().from(assets);
    const res = await postUpload(makeUploadRequest(file, "  ANGGREK   bulan  "));
    expect(res.status).toBe(200);
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.duplicate).toBe(true);
    expect(json.reason).toBe("name_exists");
    expect(json.message).toContain("sudah ada di aset");

    const afterAssets = await db.select().from(assets);
    expect(afterAssets.length).toBe(beforeAssets.length);
  });

  it("3. reuses existing asset and adds new name as synonym when SHA-256 matches", async () => {
    const png = await makeTestPng(30, 120, 210); // Same pixels -> same processed WebP SHA-256 as case 1
    const file = new File([new Uint8Array(png)], "anggrek-copy.png", { type: "image/png" });

    const beforeAssets = await db.select().from(assets);
    const res = await postUpload(makeUploadRequest(file, "Bunga Anggrek Putih"));
    expect(res.status).toBe(200);
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.duplicate).toBe(true);
    expect(json.reason).toBe("content_exists");
    expect(json.concept.synonyms).toContain("Bunga Anggrek Putih");

    const afterAssets = await db.select().from(assets);
    expect(afterAssets.length).toBe(beforeAssets.length);
  });

  it("4. rejects non-image magic bytes, oversize > 2MB, empty name, and punctuation-only name", async () => {
    // Non-image disguised with image/png MIME
    const fakeFile = new File([new TextEncoder().encode("not-an-image-at-all")], "fake.png", {
      type: "image/png",
    });
    const nonImgRes = await postUpload(makeUploadRequest(fakeFile, "Gambar Palsu"));
    expect(nonImgRes.status).toBe(400);

    // Oversize > 2MB
    const bigBuf = Buffer.alloc(2 * 1024 * 1024 + 10, 0xff);
    bigBuf[0] = 0x89;
    bigBuf[1] = 0x50;
    bigBuf[2] = 0x4e;
    bigBuf[3] = 0x47;
    const bigFile = new File([new Uint8Array(bigBuf)], "besar.png", { type: "image/png" });
    const bigRes = await postUpload(makeUploadRequest(bigFile, "Gambar Besar"));
    expect(bigRes.status).toBe(400);

    // Empty name
    const validPng = await makeTestPng(10, 10, 10);
    const validFile = new File([new Uint8Array(validPng)], "ok.png", { type: "image/png" });
    const emptyRes = await postUpload(makeUploadRequest(validFile, "   "));
    expect(emptyRes.status).toBe(400);

    // Punctuation-only name
    const punctRes = await postUpload(makeUploadRequest(validFile, "!!! --- ???"));
    expect(punctRes.status).toBe(400);
  });

  it("5. handles concurrent same-name uploads safely resulting in only 1 concept", async () => {
    const png1 = await makeTestPng(90, 180, 40);
    const png2 = await makeTestPng(95, 185, 45);
    const file1 = new File([new Uint8Array(png1)], "merpati1.png", { type: "image/png" });
    const file2 = new File([new Uint8Array(png2)], "merpati2.png", { type: "image/png" });

    const [res1, res2] = await Promise.all([
      postUpload(makeUploadRequest(file1, "Burung Merpati")),
      postUpload(makeUploadRequest(file2, "burung   merpati")),
    ]);

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);

    const rows = await db
      .select()
      .from(visualConcepts)
      .where(eq(visualConcepts.labelNorm, "burung merpati"));

    expect(rows.length).toBe(1);
  });

  it("6. strips EXIF metadata from uploaded JPEG images", async () => {
    const jpegWithExif = await sharp({
      create: {
        width: 240,
        height: 240,
        channels: 3,
        background: { r: 220, g: 160, b: 60 },
      },
    })
      .jpeg()
      .withMetadata({
        exif: {
          IFD0: {
            ImageDescription: "SECRET_CAMERA_EXIF_TAG",
          },
        },
      })
      .toBuffer();

    const file = new File([new Uint8Array(jpegWithExif)], "exif-test.jpg", {
      type: "image/jpeg",
    });

    const res = await postUpload(makeUploadRequest(file, "Jeruk Manis"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);

    const stored = await storage.get(json.asset.storageKey, "card-images");
    expect(stored).not.toBeNull();
    const storedBuf = Buffer.from(stored!);
    const meta = await sharp(storedBuf).metadata();
    expect(meta.exif).toBeUndefined();
    expect(storedBuf.toString("utf8")).not.toContain("SECRET_CAMERA_EXIF_TAG");
  });
});
