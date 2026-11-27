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

  describe("Regression: substring boundaries, cross-language collisions & primary concept alignment", () => {
    const REGRESSION_CONCEPTS: ConceptRecord[] = [
      ...SAMPLE_CONCEPTS,
      {
        id: "alam-cuaca-api",
        label: "Api",
        labelNorm: "api",
        synonyms: ["nyala api"],
        labelEn: "fire",
        domains: ["alam-cuaca"],
        groupId: "alam",
        kind: "benda",
        popularity: 80,
        assetUrl: "/media/custom/api.webp",
        status: "active",
      },
      {
        id: "alam-cuaca-air",
        label: "Air",
        labelNorm: "air",
        synonyms: ["air putih", "air minum", "bersih", "makanan dan minuman"],
        labelEn: "water",
        domains: ["alam-cuaca", "tumbuhan-makanan", "bina-diri"],
        groupId: "alam",
        kind: "benda",
        popularity: 95,
        assetUrl: "/media/pictograms/air.webp",
        status: "active",
      },
      {
        id: "alam-cuaca-udara",
        label: "Udara",
        labelNorm: "udara",
        synonyms: ["angin"],
        labelEn: "air",
        domains: ["alam-cuaca"],
        groupId: "alam",
        kind: "benda",
        popularity: 80,
        assetUrl: "/media/pictograms/udara.webp",
        status: "active",
      },
      {
        id: "bina-diri-handuk",
        label: "Handuk",
        labelNorm: "handuk",
        synonyms: ["lap"],
        labelEn: "towel",
        domains: ["bina-diri", "tubuh-kesehatan"],
        groupId: "kebersihan",
        kind: "benda",
        popularity: 70,
        assetUrl: "/media/pictograms/handuk.webp",
        status: "active",
      },
      {
        id: "noisy-the",
        label: "The",
        labelNorm: "the",
        synonyms: [],
        labelEn: "the",
        domains: ["tubuh-kesehatan"],
        groupId: "kebersihan",
        kind: "benda",
        popularity: 70,
        assetUrl: "/media/pictograms/the.webp",
        status: "active",
      },
      {
        id: "noisy-soap-num",
        label: "Soap 36910",
        labelNorm: "soap 36910",
        synonyms: [],
        labelEn: "sabun",
        domains: ["tubuh-kesehatan", "bina-diri"],
        groupId: "kebersihan",
        kind: "benda",
        popularity: 70,
        assetUrl: "/media/pictograms/soap-36910.webp",
        status: "active",
      },
    ];
    const regIndex = buildIndex(REGRESSION_CONCEPTS);

    it("16. imageFit rejects substring matches inside unrelated words (api/sapi, air/mengalir, ikan/memberikan, lap/telapak)", () => {
      const api = regIndex.byId.get("alam-cuaca-api")!;
      const air = regIndex.byId.get("alam-cuaca-air")!;
      const ikan = regIndex.byId.get("hewan-ikan")!;
      const handuk = regIndex.byId.get("bina-diri-handuk")!;

      expect(
        imageFit("Sapi makan rumput di padang.", api, { keyTerms: ["sapi"] }).fit
      ).toBe(false);
      expect(
        imageFit("Sungai mengalir jauh menuju laut.", air, {
          keyTerms: ["sungai"],
        }).fit
      ).toBe(false);
      expect(
        imageFit("Pertunjukan berakhir dengan gembira.", air, {
          keyTerms: ["berakhir"],
        }).fit
      ).toBe(false);
      expect(
        imageFit("Akar tumbuhan memberikan zat hara.", ikan, {
          keyTerms: ["akar", "tumbuhan"],
        }).fit
      ).toBe(false);
      expect(
        imageFit("Telapak kaki menginjak rumput.", handuk, {
          keyTerms: ["telapak", "kaki"],
        }).fit
      ).toBe(false);
    });

    it("17. imageFit rejects partial multi-word overlap, stopwords, and generic synonym collisions", () => {
      const cuciTangan = regIndex.byId.get("kebersihan-cuci-tangan")!;
      const air = regIndex.byId.get("alam-cuaca-air")!;
      const noisyThe = regIndex.byId.get("noisy-the")!;

      // "tangan" alone must not trigger "Cuci Tangan"
      expect(
        imageFit("Tangan kita memegang pensil di kelas.", cuciTangan, {
          keyTerms: ["tangan", "pensil"],
        }).fit
      ).toBe(false);

      // "makanan dan minuman" synonym on Air must not match "Daun membuat makanan untuk tumbuhan."
      expect(
        imageFit("Daun membuat makanan untuk tumbuhan.", air, {
          keyTerms: ["daun", "makanan"],
        }).fit
      ).toBe(false);

      // English stopword concept "The" must never fit
      expect(
        imageFit("The cat sleeps on the mat.", noisyThe).fit
      ).toBe(false);
    });

    it("18. imageFit requires primary concept / keyTerms alignment and blocks cross-language labelEn collision", () => {
      const akar = regIndex.byId.get("tumbuhan-akar")!;
      const air = regIndex.byId.get("alam-cuaca-air")!;
      const udara = regIndex.byId.get("alam-cuaca-udara")!;

      // On an Akar card ("Akar menyerap air dari dalam tanah.", keyTerms: ["akar"]), Akar fits and incidental Air does not
      expect(
        imageFit("Akar menyerap air dari dalam tanah.", akar, {
          keyTerms: ["akar"],
        }).fit
      ).toBe(true);
      expect(
        imageFit("Akar menyerap air dari dalam tanah.", air, {
          keyTerms: ["akar"],
        }).fit
      ).toBe(false);

      // When air IS in keyTerms, Air fits while Udara (labelEn: "air") does NOT
      expect(
        imageFit("Basahi kedua tangan dengan air bersih.", air, {
          keyTerms: ["tangan", "air"],
        }).fit
      ).toBe(true);
      expect(
        imageFit("Basahi kedua tangan dengan air bersih.", udara, {
          keyTerms: ["tangan", "air"],
        }).fit
      ).toBe(false);
    });

    it("19. search and selectVocabulary prioritize Indonesian labels over labelEn and ignore stopword/generic noise", () => {
      const hitsAir = search("air", regIndex);
      expect(hitsAir.length).toBeGreaterThan(0);
      expect(hitsAir[0]!.concept.id).toBe("alam-cuaca-air");

      const hitsSapi = search("sapi", regIndex);
      expect(hitsSapi.some((h) => h.concept.id === "alam-cuaca-api")).toBe(false);

      const plantVocab = selectVocabulary(
        "Akar menyerap zat hara dari dalam tanah dan daun membuat makanan untuk bunga.",
        regIndex,
        { limit: 10, domains: ["tumbuhan-makanan"] }
      );
      const plantIds = plantVocab.map((c) => c.id);
      expect(plantIds).toContain("tumbuhan-akar");
      expect(plantIds).toContain("tumbuhan-daun");
      expect(plantIds).toContain("tumbuhan-bunga");
      // "dan" + "makanan dan minuman" must NOT pull Air or Soap or The into plant vocabulary
      expect(plantIds).not.toContain("alam-cuaca-air");
      expect(plantIds).not.toContain("kebersihan-sabun");
      expect(plantIds).not.toContain("noisy-the");
      expect(plantIds).not.toContain("noisy-soap-num");
    });
  });
});
