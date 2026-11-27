// @vitest-environment node
import { describe, it, expect, beforeAll, vi } from "vitest";
import sharp from "sharp";
import { migrate } from "drizzle-orm/pglite/migrator";
import { db } from "@/server/db/client";
import { saveAsset, listVisualAssets } from "@/server/repos/assets";
import { signInDemoTeacher } from "@/server/services/auth/demo";
import { GET as getPictograms } from "../pictograms/route";
import { POST as postUpload } from "../upload/route";

const { mockGetCurrentTeacher } = vi.hoisted(() => ({
  mockGetCurrentTeacher: vi.fn(),
}));

vi.mock("@/features/auth", () => ({
  getCurrentTeacher: mockGetCurrentTeacher,
}));

describe("Media Visual Library, Strict Lookup & Upload Routes", () => {
  let teacherId: string;

  beforeAll(async () => {
    await migrate(db as unknown as Parameters<typeof migrate>[0], {
      migrationsFolder: "./drizzle",
    });
    const auth = await signInDemoTeacher();
    teacherId = auth.teacher.id;
    mockGetCurrentTeacher.mockResolvedValue({ teacher: auth.teacher });
  });

  it("listVisualAssets returns DB visual assets and filters by search", async () => {
    await saveAsset({
      kind: "gambar",
      storageKey: "upload-kapal-nelayan-test.webp",
      mime: "image/webp",
      bytes: 1200,
      keyword: "kapal nelayan | perahu kayu",
      alt: "Kapal Nelayan",
      source: "upload",
      ownerTeacherId: teacherId,
    });

    const found = await listVisualAssets({ search: "kapal nelayan", limit: 20 });
    expect(found.ok).toBe(true);
    if (found.ok) {
      expect(found.data.some((a) => a.storageKey === "upload-kapal-nelayan-test.webp")).toBe(true);
    }

    const unmatched = await listVisualAssets({ search: "xyzzy-tidak-ada-123", limit: 20 });
    expect(unmatched.ok).toBe(true);
    if (unmatched.ok) {
      expect(unmatched.data).toEqual([]);
    }
  });

  it("GET /api/media/pictograms?mode=library returns catalog + uploads with categories and pagination", async () => {
    const res = await getPictograms(
      new Request("http://localhost/api/media/pictograms?mode=library&limit=20&offset=0")
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.items.length).toBe(20);
    expect(json.total).toBeGreaterThan(1000);
    expect(json.hasMore).toBe(true);
    expect(json.categories).toContain("Semua");
    expect(json.categories).toContain("Unggahan Guru");
    expect(json.categories).toContain("IPA");
    expect(json.categories).toContain("Matematika");
  });

  it("GET /api/media/pictograms?mode=library filters by Unggahan Guru and search query", async () => {
    const res = await getPictograms(
      new Request(
        "http://localhost/api/media/pictograms?mode=library&category=Unggahan%20Guru&q=kapal%20nelayan"
      )
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(
      json.items.some((i: { display_name: string }) =>
        i.display_name.toLowerCase().includes("kapal nelayan")
      )
    ).toBe(true);
  });

  it("GET /api/media/pictograms?q=...&strict=1 returns null for unmatched query (no soap/placeholder fallback)", async () => {
    const unmatchedRes = await getPictograms(
      new Request("http://localhost/api/media/pictograms?q=xyzzytidakada999&strict=1")
    );
    expect(unmatchedRes.status).toBe(200);
    const unmatchedJson = await unmatchedRes.json();
    expect(unmatchedJson.success).toBe(true);
    expect(unmatchedJson.pictogram).toBeNull();

    const matchedRes = await getPictograms(
      new Request("http://localhost/api/media/pictograms?q=penjumlahan&strict=1")
    );
    expect(matchedRes.status).toBe(200);
    const matchedJson = await matchedRes.json();
    expect(matchedJson.success).toBe(true);
    expect(matchedJson.pictogram).not.toBeNull();
    expect(matchedJson.pictogram.url).toBe("/media/custom/penjumlahan.webp");
  });

  it("POST /api/media/upload supports name field, saves keyword, and makes image searchable in library", async () => {
    const pngBuffer = await sharp({
      create: {
        width: 200,
        height: 150,
        channels: 3,
        background: { r: 20, g: 140, b: 220 },
      },
    })
      .png()
      .toBuffer();

    const file = new File([new Uint8Array(pngBuffer)], "meja-makan.png", {
      type: "image/png",
    });
    const formData = new FormData();
    formData.append("file", file);
    formData.append("name", "Meja Makan Kayu");

    const uploadRes = await postUpload(
      new Request("http://localhost/api/media/upload", {
        method: "POST",
        body: formData,
      })
    );
    expect(uploadRes.status).toBe(200);
    const uploadJson = await uploadRes.json();
    expect(uploadJson.success).toBe(true);
    expect(uploadJson.asset.id).toBeTruthy();
    expect(uploadJson.asset.keyword).toContain("meja makan kayu");
    expect(uploadJson.url).toBe(uploadJson.asset.url);

    const searchRes = await getPictograms(
      new Request(
        "http://localhost/api/media/pictograms?mode=library&q=meja%20makan%20kayu"
      )
    );
    const searchJson = await searchRes.json();
    expect(searchJson.items.some((i: { id: string }) => i.id === uploadJson.asset.id)).toBe(true);
  });
});
