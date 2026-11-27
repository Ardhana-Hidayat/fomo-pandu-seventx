import { describe, it, expect } from "vitest";
import {
  normalize,
  rawTokens,
  stem,
  stemTokens,
  buildIndex,
  search,
  selectVocabulary,
  imageFit,
  pickDistractors,
  checkCard,
  quoteInSource,
  type ConceptRecord,
} from "./visual-retrieval";

const SAMPLE_CONCEPTS: ConceptRecord[] = [
  {
    id: "tumbuhan-akar",
    label: "Akar",
    labelNorm: "akar",
    synonyms: ["akar tumbuhan", "serabut akar"],
    labelEn: "root",
    domains: ["tumbuhan-makanan"],
    groupId: "bagian-tumbuhan",
    kind: "benda",
    popularity: 80,
    assetUrl: "/media/custom/akar-tumbuhan.webp",
    status: "active",
  },
  {
    id: "tumbuhan-daun",
    label: "Daun",
    labelNorm: "daun",
    synonyms: ["daun hijau", "dedaunan"],
    labelEn: "leaf",
    domains: ["tumbuhan-makanan"],
    groupId: "bagian-tumbuhan",
    kind: "benda",
    popularity: 90,
    assetUrl: "/media/custom/daun-hijau.webp",
    status: "active",
  },
  {
    id: "tumbuhan-bunga",
    label: "Bunga",
    labelNorm: "bunga",
    synonyms: ["kembang", "bunga mekar"],
    labelEn: "flower",
    domains: ["tumbuhan-makanan"],
    groupId: "bagian-tumbuhan",
    kind: "benda",
    popularity: 85,
    assetUrl: "/media/pictograms/bunga.webp",
    status: "active",
  },
  {
    id: "tumbuhan-mangga",
    label: "Mangga",
    labelNorm: "mangga",
    synonyms: ["buah mangga"],
    labelEn: "mango",
    domains: ["tumbuhan-makanan"],
    groupId: "buah",
    kind: "benda",
    popularity: 75,
    assetUrl: "/media/pictograms/mangga.webp",
    status: "active",
  },
  {
    id: "kebersihan-sabun",
    label: "Sabun",
    labelNorm: "sabun",
    synonyms: ["sabun mandi", "sabun cuci"],
    labelEn: "soap",
    domains: ["bina-diri", "tubuh-kesehatan"],
    groupId: "kebersihan",
    kind: "benda",
    popularity: 70,
    assetUrl: "/media/pictograms/sabun.webp",
    status: "active",
  },
  {
    id: "kebersihan-cuci-tangan",
    label: "Cuci Tangan",
    labelNorm: "cuci tangan",
    synonyms: ["mencuci tangan", "basuh tangan"],
    labelEn: "wash hands",
    domains: ["bina-diri", "tubuh-kesehatan"],
    groupId: "kebersihan",
    kind: "aksi",
    popularity: 85,
    assetUrl: "/media/pictograms/cuci-tangan.webp",
    status: "active",
  },
  {
    id: "hewan-ikan",
    label: "Ikan",
    labelNorm: "ikan",
    synonyms: ["ikan air"],
    labelEn: "fish",
    domains: ["hewan"],
    groupId: "hewan-air",
    kind: "hewan",
    popularity: 90,
    assetUrl: "/media/pictograms/ikan.webp",
    status: "active",
  },
  {
    id: "hewan-kucing",
    label: "Kucing",
    labelNorm: "kucing",
    synonyms: ["anak kucing"],
    labelEn: "cat",
    domains: ["hewan"],
    groupId: "hewan-darat",
    kind: "hewan",
    popularity: 95,
    assetUrl: "/media/pictograms/kucing.webp",
    status: "active",
  },
  {
    id: "hidden-concept",
    label: "Tersembunyi",
    labelNorm: "tersembunyi",
    synonyms: [],
    domains: ["bahasa"],
    kind: "sifat",
    assetUrl: "/media/pictograms/hidden.webp",
    status: "hidden",
  },
];

describe("visual-retrieval (Lampiran A)", () => {
  const index = buildIndex(SAMPLE_CONCEPTS);

  it("1. normalize lowercases, strips diacritics, and removes punctuation", () => {
    expect(normalize("  Cuci-Tangan,  Bersih! (1/2)  ")).toBe("cuci tangan bersih 1 2");
    expect(normalize("Kafé & Café")).toBe("kafe cafe");
  });

  it("2. rawTokens splits normalized string into clean tokens", () => {
    expect(rawTokens("Akar, Batang, dan Daun!")).toEqual(["akar", "batang", "dan", "daun"]);
    expect(rawTokens("   ")).toEqual([]);
  });

  it("3. stem handles Indonesian affixes without over-stemming protected roots", () => {
    expect(stem("mencuci")).toBe("cuci");
    expect(stem("tanaman")).toBe("tanam");
    expect(stem("ikan")).toBe("ikan");
    expect(stem("sabun")).toBe("sabun");
    expect(stem("tangan")).toBe("tangan");
  });

  it("4. stemTokens stems all tokens in a phrase", () => {
    expect(stemTokens("Membaca buku dan menanam bunga")).toEqual([
      "baca",
      "buku",
      "dan",
      "tanam",
      "bunga",
    ]);
  });

  it("5. buildIndex excludes hidden concepts from search maps", () => {
    expect(index.byLabelNorm.has("akar")).toBe(true);
    expect(index.byLabelNorm.has("tersembunyi")).toBe(false);
    expect(index.byId.has("hidden-concept")).toBe(true);
  });

  it("6. search ranks exact label match above synonyms and partial hits", () => {
    const hits = search("daun", index);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].concept.id).toBe("tumbuhan-daun");
    expect(hits[0].score).toBeGreaterThanOrEqual(100);
  });

  it("7. search matches inflected Indonesian queries via stemming (mencuci -> Cuci Tangan)", () => {
    const hits = search("mencuci tangan", index);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].concept.id).toBe("kebersihan-cuci-tangan");
  });

  it("8. search respects domain filter", () => {
    const hits = search("sabun", index, { domain: "hewan" });
    expect(hits).toHaveLength(0);

    const hitsRight = search("sabun", index, { domain: "bina-diri" });
    expect(hitsRight).toHaveLength(1);
  });

  it("9. selectVocabulary extracts grounded concepts from source text", () => {
    const vocab = selectVocabulary(
      "Tumbuhan memiliki akar di tanah dan daun hijau serta bunga yang indah.",
      index,
      { limit: 5 }
    );
    const ids = vocab.map((c) => c.id);
    expect(ids).toContain("tumbuhan-akar");
    expect(ids).toContain("tumbuhan-daun");
    expect(ids).toContain("tumbuhan-bunga");
    expect(ids).not.toContain("kebersihan-sabun");
  });

  it("10. imageFit passes when concept matches card text or keyTerms", () => {
    const daun = index.byId.get("tumbuhan-daun")!;
    const res = imageFit("Bagian ini berwarna hijau untuk fotosintesis.", daun, {
      keyTerms: ["daun"],
    });
    expect(res.fit).toBe(true);
    expect(res.score).toBeGreaterThanOrEqual(20);
  });

  it("11. imageFit rejects unrelated concept (no soap on plant card)", () => {
    const sabun = index.byId.get("kebersihan-sabun")!;
    const res = imageFit("Akar menyerap air dari dalam tanah.", sabun, {
      keyTerms: ["akar"],
    });
    expect(res.fit).toBe(false);
    expect(res.reason).toBe("no_lexical_grounding");
  });

  it("12. pickDistractors selects distinct concepts preferring same kind/domain", () => {
    const target = index.byId.get("tumbuhan-daun")!;
    const distractors = pickDistractors(target, SAMPLE_CONCEPTS, 2);
    expect(distractors).toHaveLength(2);
    expect(distractors.every((d) => d.id !== target.id)).toBe(true);
    expect(distractors.every((d) => d.domains.includes("tumbuhan-makanan"))).toBe(true);
  });

  it("13. quoteInSource verifies normalized quote presence in source text", () => {
    const src = "Akar menyerap air dan mineral dari dalam tanah.";
    expect(quoteInSource("Akar menyerap air!", src)).toBe(true);
    expect(quoteInSource("Sabun membersihkan kuman", src)).toBe(false);
  });

  it("14. checkCard passes when card text, quote, and conceptId are grounded", () => {
    const src = "Akar menyerap air dan mineral dari dalam tanah.";
    const res = checkCard(
      {
        text: "Akar menyerap air dari tanah.",
        keyTerms: ["akar"],
        quote: "Akar menyerap air",
        conceptId: "tumbuhan-akar",
      },
      index,
      src
    );
    expect(res.ok).toBe(true);
    expect(res.reasons).toEqual([]);
  });

  it("15. checkCard fails when quote is fabricated or concept does not fit", () => {
    const src = "Akar menyerap air dan mineral dari dalam tanah.";
    const res = checkCard(
      {
        text: "Akar menyerap air dari tanah.",
        keyTerms: ["akar"],
        quote: "Kalimat palsu tidak ada di sumber",
        conceptId: "kebersihan-sabun",
      },
      index,
      src
    );
    expect(res.ok).toBe(false);
    expect(res.reasons).toContain("quote_not_in_source");
    expect(res.reasons).toContain("no_lexical_grounding");
  });
});
