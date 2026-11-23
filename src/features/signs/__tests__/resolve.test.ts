import { describe, expect, it } from "vitest";
import { resolveSign } from "@/server/services/signs/resolve";
import type { SignItem } from "@/server/services/signs/schema";

const mockManifest: SignItem[] = [
  {
    system: "SIBI",
    kind: "letter",
    key: "A",
    type: "image",
    src: "/signs/sibi/a.webp",
    alt: "Isyarat huruf A dalam SIBI",
    motion: false,
    status: "source",
    origin: {
      sourceId: "sibi-azizah-2026",
      doi: "10.17632/xdn2gj38xf.1",
      originalFile: "A/01.jpg",
      sha256: "hash-a",
      transform: "crop",
    },
    reference: "Kamus SIBI Kemdikbud",
    verifiedBy: null,
    verifiedAt: null,
  },
  {
    system: "SIBI",
    kind: "letter",
    key: "J",
    type: "image",
    src: "/signs/sibi/j.webp",
    alt: "Isyarat huruf J dalam SIBI (isyarat ini bergerak)",
    motion: true,
    status: "verified",
    origin: {
      sourceId: "sibi-azizah-2026",
      doi: "10.17632/xdn2gj38xf.1",
      originalFile: "J/01.jpg",
      sha256: "hash-j",
      transform: "crop",
    },
    reference: "Kamus SIBI Kemdikbud",
    verifiedBy: "Guru SLB",
    verifiedAt: "2026-11-20",
  },
  {
    system: "BISINDO",
    kind: "letter",
    key: "A",
    type: "image",
    src: "/signs/bisindo/a.webp",
    alt: "Isyarat huruf A dalam BISINDO",
    motion: false,
    status: "draft",
    verifiedBy: null,
    verifiedAt: null,
  },
];

describe("resolveSign", () => {
  it("status source tampil untuk siswa dan badge di pratinjau guru", () => {
    const student = resolveSign("SIBI", "A", { manifestItems: mockManifest });
    expect(student.available).toBe(true);
    expect(student.src).toBe("/signs/sibi/a.webp");
    expect(student.badge).toBeNull();

    const teacher = resolveSign("SIBI", "A", {
      manifestItems: mockManifest,
      isTeacherPreview: true,
    });
    expect(teacher.badge).toBe("Sumber terbuka, belum diperiksa");
  });

  it("status verified tampil dengan badge Diperiksa", () => {
    const res = resolveSign("SIBI", "J", {
      manifestItems: mockManifest,
      isTeacherPreview: true,
    });
    expect(res.available).toBe(true);
    expect(res.motion).toBe(true);
    expect(res.badge).toBe("Diperiksa");
  });

  it("status draft tidak tampil untuk siswa kecuali allowDraft=true", () => {
    const student = resolveSign("BISINDO", "A", { manifestItems: mockManifest });
    expect(student.available).toBe(false);
    expect(student.src).toBeNull();

    const allowed = resolveSign("BISINDO", "A", {
      manifestItems: mockManifest,
      allowDraft: true,
    });
    expect(allowed.available).toBe(true);
  });

  it("huruf tidak ada berstatus missing dan menampilkan kotak huruf", () => {
    const res = resolveSign("SIBI", "Z", { manifestItems: mockManifest });
    expect(res.status).toBe("missing");
    expect(res.available).toBe(false);
  });

  it("override DB mengesampingkan isi manifest", () => {
    const res = resolveSign("SIBI", "A", {
      manifestItems: mockManifest,
      dbOverrides: [
        {
          system: "SIBI",
          key: "A",
          status: "verified",
          verifiedBy: "Guru Manisrejo",
          verifiedAt: "2026-11-23",
        },
      ],
      isTeacherPreview: true,
    });
    expect(res.status).toBe("verified");
    expect(res.badge).toBe("Diperiksa");
    expect(res.verifiedBy).toBe("Guru Manisrejo");
  });
});
