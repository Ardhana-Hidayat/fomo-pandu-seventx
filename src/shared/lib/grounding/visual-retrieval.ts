export interface ConceptRecord {
  id: string;
  label: string;
  labelNorm: string;
  synonyms: string[];
  labelEn?: string | null;
  domains: string[];
  groupId?: string | null;
  kind?: string | null;
  popularity?: number;
  assetId?: string | null;
  assetUrl?: string | null;
  altAssetIds?: string[];
  altText?: string | null;
  status: "active" | "needs_review" | "hidden" | string;
  source?: string;
  sourceRef?: string | null;
}

export interface ConceptIndex {
  concepts: ConceptRecord[];
  byId: Map<string, ConceptRecord>;
  byLabelNorm: Map<string, ConceptRecord>;
  bySynonymNorm: Map<string, ConceptRecord[]>;
  invertedRaw: Map<string, Set<string>>;
  invertedStem: Map<string, Set<string>>;
}

export interface SearchOptions {
  domain?: string;
  preferDomains?: string[];
  group?: string;
  limit?: number;
  minScore?: number;
  requireImage?: boolean;
}

export interface SearchHit {
  concept: ConceptRecord;
  score: number;
  matchedOn: string[];
}

export interface ImageFitResult {
  fit: boolean;
  score: number;
  reason?: string;
}

export interface CardCheckInput {
  text: string;
  keyTerms?: string[];
  quote?: string;
  conceptId?: string | null;
}

export interface CardCheckResult {
  ok: boolean;
  reasons: string[];
  concept?: ConceptRecord;
}

const PROTECTED_ROOTS = new Set([
  "air",
  "api",
  "awan",
  "baca",
  "badan",
  "bagian",
  "baju",
  "batu",
  "bayi",
  "berat",
  "beras",
  "berita",
  "bersih",
  "besar",
  "biji",
  "biru",
  "buah",
  "bukan",
  "bulan",
  "bumi",
  "bunga",
  "burung",
  "cuci",
  "dahan",
  "danau",
  "dasi",
  "daun",
  "desa",
  "dinding",
  "dingin",
  "diri",
  "doa",
  "dua",
  "ekor",
  "empat",
  "enam",
  "gajah",
  "garam",
  "garpu",
  "gedung",
  "gelas",
  "gigi",
  "gula",
  "gunung",
  "guru",
  "halte",
  "handuk",
  "hari",
  "hati",
  "hewan",
  "hidung",
  "hidup",
  "hijau",
  "hitam",
  "hujan",
  "huruf",
  "hutan",
  "ibu",
  "ikan",
  "ilmu",
  "jalan",
  "jam",
  "jantung",
  "jari",
  "jauh",
  "jembatan",
  "jeruk",
  "kaki",
  "kamar",
  "kapal",
  "kata",
  "kawan",
  "kayu",
  "kebun",
  "kecil",
  "kelas",
  "keluarga",
  "kepala",
  "kereta",
  "kertas",
  "kiri",
  "koki",
  "kompor",
  "kopi",
  "kota",
  "kucing",
  "kue",
  "kuku",
  "kunci",
  "kuning",
  "kursi",
  "lampu",
  "langit",
  "laut",
  "lebah",
  "leher",
  "lemari",
  "lidah",
  "lima",
  "lingkungan",
  "lutut",
  "makan",
  "malam",
  "mangga",
  "mata",
  "matahari",
  "meja",
  "merah",
  "minum",
  "mobil",
  "mulut",
  "murid",
  "nasi",
  "nelayan",
  "obat",
  "ombak",
  "orang",
  "otak",
  "pagi",
  "panci",
  "pantai",
  "papan",
  "paruh",
  "pasar",
  "paus",
  "pecahan",
  "pedagang",
  "pelabuhan",
  "pelangi",
  "penggaris",
  "penghapus",
  "pensil",
  "perahu",
  "pergi",
  "perut",
  "pesawat",
  "peta",
  "petani",
  "piring",
  "pisang",
  "pohon",
  "polisi",
  "pulau",
  "putih",
  "rambut",
  "ranting",
  "roti",
  "rumah",
  "sabun",
  "sakit",
  "sapi",
  "satu",
  "sawah",
  "sayap",
  "sayur",
  "sekolah",
  "selimut",
  "sendok",
  "sepatu",
  "sepeda",
  "siang",
  "siku",
  "sirip",
  "siswa",
  "sofa",
  "sungai",
  "susu",
  "tali",
  "taman",
  "tanah",
  "tangan",
  "tas",
  "teh",
  "telinga",
  "telur",
  "teman",
  "terbang",
  "tiga",
  "tikus",
  "topi",
  "truk",
  "tumbuhan",
  "uang",
  "udara",
  "ular",
  "wajan",
  "warna",
  "wortel",
]);

const STEM_EXCEPTIONS: Record<string, string> = {
  belajar: "ajar",
  pelajar: "ajar",
  pelajaran: "ajar",
  mengajar: "ajar",
  pengajar: "ajar",
  penjumlahan: "jumlah",
  menjumlahkan: "jumlah",
  pengurangan: "kurang",
  mengurangi: "kurang",
  perkalian: "kali",
  mengalikan: "kali",
  pembagian: "bagi",
  membagi: "bagi",
  kebersihan: "bersih",
  membersihkan: "bersih",
  kesehatan: "sehat",
  menyehatkan: "sehat",
  keselamatan: "selamat",
  menyelamatkan: "selamat",
  lingkungan: "lingkung",
  perkotaan: "kota",
  pedesaan: "desa",
  kelautan: "laut",
  makanan: "makan",
  minuman: "minum",
  tanaman: "tanam",
  menanam: "tanam",
  pakaian: "pakai",
  memakai: "pakai",
  sayuran: "sayur",
  mainan: "main",
  bermain: "main",
  bacaan: "baca",
  membaca: "baca",
  tulisan: "tulis",
  menulis: "tulis",
  hitungan: "hitung",
  menghitung: "hitung",
  lukisan: "lukis",
  melukis: "lukis",
  masakan: "masak",
  memasak: "masak",
  kendaraan: "kendara",
  bangunan: "bangun",
  pekerjaan: "kerja",
  bekerja: "kerja",
  permainan: "main",
  aturan: "atur",
  mengatur: "atur",
  menggosok: "gosok",
  membilas: "bilas",
  mencuci: "cuci",
  mengeringkan: "kering",
  menyerap: "serap",
  menopang: "topang",
  menyapu: "sapu",
  menyiram: "siram",
  menyayangi: "sayang",
  memotong: "potong",
  memukul: "pukul",
  memegang: "pegang",
  membeli: "beli",
  pembeli: "beli",
  menjual: "jual",
  penjual: "jual",
  berdagang: "dagang",
  pedagang: "dagang",
  berenang: "renang",
  berjalan: "jalan",
  berlari: "lari",
  berdiri: "diri",
  melompat: "lompat",
  melihat: "lihat",
  mendengar: "dengar",
  merawat: "rawat",
  mewarnai: "warna",
};

/**
 * Normalize Indonesian/English text for deterministic matching:
 * lowercase, strip diacritics, replace punctuation with spaces, collapse spaces.
 */
const FUNCTION_STOPWORDS = new Set([
  // Indonesian grammatical / function words
  "yang", "dan", "di", "ke", "dari", "untuk", "pada", "dengan", "ini", "itu",
  "atau", "ada", "adalah", "akan", "bisa", "dapat", "kami", "kita", "mereka",
  "saya", "kamu", "dia", "dalam", "juga", "agar", "supaya", "oleh", "saat",
  "ketika", "tentang", "secara", "yaitu", "seperti", "antara", "karena",
  "lebih", "sangat", "sebagai", "setelah", "sebelum", "sudah", "belum",
  "hanya", "semua", "merupakan", "tersebut", "bukan", "tidak", "mana",
  "lalu", "kemudian", "serta", "hingga", "sampai", "pun", "lah", "kah",
  "nya", "para", "sang", "si", "tiap", "setiap", "seluruh", "lain",
  // English noise / function words that appear in legacy ARASAAC imports
  "the", "a", "an", "of", "in", "on", "at", "to", "for", "by", "with",
  "and", "or", "is", "are", "was", "were", "be", "been", "do", "does",
  "did", "not", "no", "yes", "up", "down", "it", "its", "this", "that",
  "one", "s", "put", "get", "set", "use", "now", "day",
]);

const GENERIC_CONCEPT_WORDS = new Set([
  "bagian", "benda", "alat", "materi", "contoh", "kegiatan", "sehari",
  "hari", "kehidupan", "umum", "cara", "hal", "bersih", "membuat",
  "memiliki", "menjadi", "menggunakan", "memakai", "dipakai", "digunakan",
  "terdapat", "berada", "ipa", "ips", "pkn", "matematika", "bahasa",
  "indonesia", "sdlb", "smplb", "smalb",
]);

function containsWholePhrase(haystackNorm: string, phraseNorm: string): boolean {
  if (!haystackNorm || !phraseNorm) return false;
  return ` ${haystackNorm} `.includes(` ${phraseNorm} `);
}

function isNoisyNumericLabel(labelNorm: string): boolean {
  return /\b\d{4,}\b/.test(labelNorm);
}

function getIndonesianSynonyms(concept: ConceptRecord): string[] {
  const labelNorm = concept.labelNorm || normalize(concept.label);
  const labelEnNorm = concept.labelEn ? normalize(concept.labelEn) : "";
  return (concept.synonyms ?? [])
    .map(normalize)
    .filter((syn) => {
      if (!syn) return false;
      // Ignore pure English synonyms duplicated from labelEn when Indonesian label differs
      if (labelEnNorm && syn === labelEnNorm && labelEnNorm !== labelNorm) {
        return false;
      }
      return true;
    });
}

function isMeaningfulToken(tok: string): boolean {
  return (
    tok.length >= 2 &&
    !FUNCTION_STOPWORDS.has(tok) &&
    !GENERIC_CONCEPT_WORDS.has(tok) &&
    !/^\d{3,}$/.test(tok)
  );
}

function meaningfulPhraseTokens(phraseNorm: string): string[] {
  return rawTokens(phraseNorm).filter(isMeaningfulToken);
}

function matchesPhraseOrAllStems(
  phraseNorm: string,
  targetNorm: string,
  targetStemSet: Set<string>
): boolean {
  if (!phraseNorm || !targetNorm) return false;
  if (containsWholePhrase(targetNorm, phraseNorm)) {
    return true;
  }
  const phraseTokens = meaningfulPhraseTokens(phraseNorm);
  if (phraseTokens.length === 0) return false;
  const phraseStems = Array.from(
    new Set(phraseTokens.map(stem).filter((s) => s.length >= 2 && !FUNCTION_STOPWORDS.has(s)))
  );
  if (phraseStems.length === 0) return false;
  return phraseStems.every((st) => targetStemSet.has(st));
}

export function normalize(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Tokenize normalized string into non-empty raw tokens.
 */
export function rawTokens(input: string): string[] {
  const norm = normalize(input);
  if (!norm) return [];
  return norm.split(" ").filter(Boolean);
}

/**
 * Lightweight, over-stemming-safe Indonesian stemmer for visual concept matching.
 */
export function stem(word: string): string {
  const w = normalize(word).replace(/\s+/g, "");
  if (!w) return "";
  if (w.length <= 3) return w;
  if (STEM_EXCEPTIONS[w]) return STEM_EXCEPTIONS[w];
  if (PROTECTED_ROOTS.has(w)) return w;

  let cur = w;

  // Strip enclitic particles and possessives
  for (const suffix of ["lah", "kah", "tah", "pun", "nya", "ku", "mu"]) {
    if (cur.endsWith(suffix) && cur.length - suffix.length >= 3) {
      cur = cur.slice(0, -suffix.length);
      break;
    }
  }

  if (STEM_EXCEPTIONS[cur]) return STEM_EXCEPTIONS[cur];
  if (PROTECTED_ROOTS.has(cur)) return cur;

  let strippedPrefix = false;

  // Handle ke-..-an circumfix
  if (cur.startsWith("ke") && cur.endsWith("an") && cur.length > 6) {
    const inner = cur.slice(2, -2);
    if (inner.length >= 3) {
      cur = inner;
      strippedPrefix = true;
    }
  }

  if (!strippedPrefix) {
    if (cur.startsWith("meny") && cur.length > 6) {
      cur = "s" + cur.slice(4);
      strippedPrefix = true;
    } else if (cur.startsWith("meng") && cur.length > 6) {
      cur = cur.slice(4);
      strippedPrefix = true;
    } else if (cur.startsWith("mem") && cur.length > 5) {
      cur = cur.slice(3);
      strippedPrefix = true;
    } else if (cur.startsWith("men") && cur.length > 5) {
      cur = cur.slice(3);
      strippedPrefix = true;
    } else if (cur.startsWith("me") && cur.length > 5) {
      cur = cur.slice(2);
      strippedPrefix = true;
    } else if (cur.startsWith("ber") && cur.length > 5) {
      cur = cur.slice(3);
      strippedPrefix = true;
    } else if (cur.startsWith("ter") && cur.length > 5) {
      cur = cur.slice(3);
      strippedPrefix = true;
    } else if (cur.startsWith("per") && cur.length > 5) {
      cur = cur.slice(3);
      strippedPrefix = true;
    } else if (cur.startsWith("peny") && cur.length > 6) {
      cur = "s" + cur.slice(4);
      strippedPrefix = true;
    } else if (cur.startsWith("peng") && cur.length > 6) {
      cur = cur.slice(4);
      strippedPrefix = true;
    } else if (cur.startsWith("pem") && cur.length > 5) {
      cur = cur.slice(3);
      strippedPrefix = true;
    } else if (cur.startsWith("pen") && cur.length > 5) {
      cur = cur.slice(3);
      strippedPrefix = true;
    } else if (cur.startsWith("di") && cur.length > 5) {
      cur = cur.slice(2);
      strippedPrefix = true;
    } else if (cur.startsWith("se") && cur.length > 5) {
      cur = cur.slice(2);
      strippedPrefix = true;
    }
  }

  if (PROTECTED_ROOTS.has(cur)) return cur;

  // Strip derivational suffixes -kan / -i only when prefix was stripped or word is long enough
  if (cur.endsWith("kan") && cur.length > 5) {
    cur = cur.slice(0, -3);
  } else if (strippedPrefix && cur.endsWith("i") && cur.length > 4) {
    cur = cur.slice(0, -1);
  } else if (strippedPrefix && cur.endsWith("an") && cur.length > 4) {
    cur = cur.slice(0, -2);
  }

  return cur.length >= 2 ? cur : w;
}

/**
 * Tokenize and stem a string into normalized root tokens.
 */
export function stemTokens(input: string): string[] {
  return rawTokens(input).map(stem).filter(Boolean);
}

function addToSetMap(map: Map<string, Set<string>>, key: string, id: string): void {
  if (!key) return;
  let set = map.get(key);
  if (!set) {
    set = new Set<string>();
    map.set(key, set);
  }
  set.add(id);
}

/**
 * Build an in-memory inverted index over ConceptRecord[] for fast deterministic retrieval.
 */
export function buildIndex(concepts: ConceptRecord[]): ConceptIndex {
  const byId = new Map<string, ConceptRecord>();
  const byLabelNorm = new Map<string, ConceptRecord>();
  const bySynonymNorm = new Map<string, ConceptRecord[]>();
  const invertedRaw = new Map<string, Set<string>>();
  const invertedStem = new Map<string, Set<string>>();

  for (const concept of concepts) {
    byId.set(concept.id, concept);
    if (concept.status === "hidden") continue;

    const labelNorm = concept.labelNorm || normalize(concept.label);
    if (labelNorm && !byLabelNorm.has(labelNorm)) {
      byLabelNorm.set(labelNorm, concept);
    }

    for (const syn of concept.synonyms ?? []) {
      const synNorm = normalize(syn);
      if (!synNorm) continue;
      const list = bySynonymNorm.get(synNorm) ?? [];
      list.push(concept);
      bySynonymNorm.set(synNorm, list);
    }

    const textFields = [
      concept.label,
      ...(concept.synonyms ?? []),
      concept.labelEn ?? "",
    ];
    for (const field of textFields) {
      for (const tok of rawTokens(field)) {
        addToSetMap(invertedRaw, tok, concept.id);
        addToSetMap(invertedStem, stem(tok), concept.id);
      }
    }
  }

  return {
    concepts,
    byId,
    byLabelNorm,
    bySynonymNorm,
    invertedRaw,
    invertedStem,
  };
}

/**
 * Search concepts in the index using exact, synonym, prefix, raw token, and stem matching.
 */
export function search(
  query: string,
  index: ConceptIndex,
  options: SearchOptions = {}
): SearchHit[] {
  const qNorm = normalize(query);
  if (!qNorm) return [];

  const qRaw = rawTokens(query);
  const qMeaningfulRaw = qRaw.filter((t) => !FUNCTION_STOPWORDS.has(t));
  const qEffectiveRaw = qMeaningfulRaw.length > 0 ? qMeaningfulRaw : qRaw;
  const qStem = qEffectiveRaw.map(stem).filter(Boolean);
  const limit = options.limit ?? 20;
  const minScore = options.minScore ?? 10;
  const requireImage = options.requireImage ?? false;

  const candidateIds = new Set<string>();
  const exactLabel = index.byLabelNorm.get(qNorm);
  if (exactLabel) candidateIds.add(exactLabel.id);

  for (const c of index.bySynonymNorm.get(qNorm) ?? []) {
    candidateIds.add(c.id);
  }

  for (const tok of qEffectiveRaw) {
    for (const id of index.invertedRaw.get(tok) ?? []) {
      candidateIds.add(id);
    }
  }
  for (const st of qStem) {
    for (const id of index.invertedStem.get(st) ?? []) {
      candidateIds.add(id);
    }
  }

  // Prefix/whole-phrase scan for short or partial queries (never match query containing a shorter unrelated label)
  if (candidateIds.size < 10 && qNorm.length >= 2) {
    for (const c of index.concepts) {
      if (c.status === "hidden") continue;
      const cLabel = c.labelNorm || normalize(c.label);
      if (
        cLabel.startsWith(qNorm) ||
        containsWholePhrase(cLabel, qNorm) ||
        rawTokens(cLabel).some((t) => qNorm.length >= 3 && t.startsWith(qNorm))
      ) {
        candidateIds.add(c.id);
        continue;
      }
      if (
        getIndonesianSynonyms(c).some(
          (s) => s.startsWith(qNorm) || containsWholePhrase(s, qNorm)
        )
      ) {
        candidateIds.add(c.id);
      }
    }
  }

  const hits: SearchHit[] = [];

  for (const id of candidateIds) {
    const concept = index.byId.get(id);
    if (!concept || concept.status === "hidden") continue;
    if (requireImage && !concept.assetUrl && !concept.assetId) continue;
    if (options.domain && !concept.domains.includes(options.domain)) continue;
    if (options.group && concept.groupId !== options.group) continue;

    let score = 0;
    const matchedOn: string[] = [];

    const labelNorm = concept.labelNorm || normalize(concept.label);
    const synNorms = getIndonesianSynonyms(concept);
    const labelEnNorm = concept.labelEn ? normalize(concept.labelEn) : "";
    const labelRawToks = rawTokens(labelNorm).filter((t) => !/^\d{4,}$/.test(t));
    const meaningfulLabelToks = labelRawToks.filter(isMeaningfulToken);

    // Reject concepts whose entire label is pure stopwords/noise unless exact query matches
    if (meaningfulLabelToks.length === 0 && labelNorm !== qNorm) continue;

    const exactIdMatch = labelNorm === qNorm;
    const exactSynMatch = !exactIdMatch && synNorms.includes(qNorm);

    if (exactIdMatch) {
      score += 120;
      matchedOn.push("exact_label");
    } else if (exactSynMatch) {
      score += 85;
      matchedOn.push("exact_synonym");
    } else if (labelEnNorm && labelEnNorm === qNorm) {
      // Keep English exact match well below Indonesian label/synonym matches
      score += 45;
      matchedOn.push("exact_en");
    }

    if (labelNorm.startsWith(qNorm) && labelNorm !== qNorm && qNorm.length >= 2) {
      score += 45;
      matchedOn.push("prefix_label");
    } else if (
      synNorms.some((s) => s.startsWith(qNorm) && s !== qNorm && qNorm.length >= 2)
    ) {
      score += 30;
      matchedOn.push("prefix_synonym");
    }

    const idLabelRawSet = new Set(labelRawToks.filter((t) => !FUNCTION_STOPWORDS.has(t)));
    const idLabelStemSet = new Set(
      Array.from(idLabelRawSet).map(stem).filter(Boolean)
    );

    const idSynRawSet = new Set(
      synNorms.flatMap(rawTokens).filter(isMeaningfulToken)
    );
    const idSynStemSet = new Set(
      Array.from(idSynRawSet).map(stem).filter(Boolean)
    );

    const labelRawMatches = qEffectiveRaw.filter((t) => idLabelRawSet.has(t)).length;
    const synRawMatches = qEffectiveRaw.filter((t) => idSynRawSet.has(t)).length;
    if (labelRawMatches > 0) {
      score += Math.round((labelRawMatches / qEffectiveRaw.length) * 50);
      matchedOn.push("raw_tokens");
    } else if (synRawMatches > 0) {
      score += Math.round((synRawMatches / qEffectiveRaw.length) * 28);
      matchedOn.push("syn_tokens");
    }

    const labelStemMatches = qStem.filter((t) => idLabelStemSet.has(t)).length;
    const synStemMatches = qStem.filter((t) => idSynStemSet.has(t)).length;
    if (labelStemMatches > 0) {
      score += Math.round((labelStemMatches / qStem.length) * 35);
      matchedOn.push("stem_tokens");
    } else if (synStemMatches > 0) {
      score += Math.round((synStemMatches / qStem.length) * 18);
      matchedOn.push("syn_stem_tokens");
    }

    // Only allow English token overlap when there was zero Indonesian lexical match
    if (
      score === 0 &&
      labelEnNorm &&
      labelRawMatches === 0 &&
      synRawMatches === 0 &&
      labelStemMatches === 0 &&
      synStemMatches === 0
    ) {
      const enRawSet = new Set(rawTokens(labelEnNorm).filter((t) => !FUNCTION_STOPWORDS.has(t)));
      const enRawMatches = qEffectiveRaw.filter((t) => enRawSet.has(t)).length;
      if (enRawMatches > 0) {
        score += Math.round((enRawMatches / qEffectiveRaw.length) * 25);
        matchedOn.push("en_tokens");
      }
    }

    if (
      qNorm.length >= 3 &&
      (containsWholePhrase(labelNorm, qNorm) ||
        labelRawToks.some((t) => t.startsWith(qNorm)) ||
        synNorms.some((s) => containsWholePhrase(s, qNorm)))
    ) {
      score += 12;
      matchedOn.push("phrase_match");
    }

    if (score <= 0) continue;

    // Penalize noisy numeric-suffix ARASAAC duplicates (e.g. "Soap 36910")
    if (isNoisyNumericLabel(labelNorm)) {
      score -= 20;
    }

    if (
      options.preferDomains &&
      options.preferDomains.some((d) => concept.domains.includes(d))
    ) {
      score += 12;
      matchedOn.push("domain_boost");
    }

    score += Math.min(5, (concept.popularity ?? 0) * 0.05);

    if (score >= minScore) {
      hits.push({ concept, score, matchedOn });
    }
  }

  hits.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.concept.label.localeCompare(b.concept.label, "id");
  });

  return hits.slice(0, limit);
}

/**
 * Select top-N grounded visual vocabulary concepts from a source text or topic.
 */
export function selectVocabulary(
  text: string,
  index: ConceptIndex,
  options: { limit?: number; domains?: string[] } = {}
): ConceptRecord[] {
  const limit = options.limit ?? 24;
  const tokens = rawTokens(text);
  if (tokens.length === 0) return [];

  const scores = new Map<string, { concept: ConceptRecord; score: number }>();
  const seenStemHits = new Set<string>();

  const bump = (concept: ConceptRecord, delta: number) => {
    if (concept.status !== "active") return;
    if (!concept.assetUrl && !concept.assetId) return;
    const labelNorm = concept.labelNorm || normalize(concept.label);
    const meaningfulLabel = meaningfulPhraseTokens(labelNorm);
    if (meaningfulLabel.length === 0) return;

    const prev = scores.get(concept.id);
    const domainBonus =
      options.domains && options.domains.some((d) => concept.domains.includes(d))
        ? 15
        : 0;
    const numericPenalty = isNoisyNumericLabel(labelNorm) ? -30 : 0;
    if (prev) {
      prev.score += delta;
    } else {
      scores.set(concept.id, {
        concept,
        score: delta + domainBonus + numericPenalty,
      });
    }
  };

  // N-gram scan (3-gram, 2-gram, 1-gram) for exact Indonesian label/synonym matches
  for (let i = 0; i < tokens.length; i++) {
    for (const n of [3, 2, 1]) {
      if (i + n > tokens.length) continue;
      const slice = tokens.slice(i, i + n);
      if (n === 1 && !isMeaningfulToken(slice[0]!)) continue;
      if (slice.every((t) => FUNCTION_STOPWORDS.has(t))) continue;

      const phrase = slice.join(" ");
      const exact = index.byLabelNorm.get(phrase);
      if (exact) bump(exact, 50 * n);
      for (const synConcept of index.bySynonymNorm.get(phrase) ?? []) {
        const synEn = synConcept.labelEn ? normalize(synConcept.labelEn) : "";
        const synLabel = synConcept.labelNorm || normalize(synConcept.label);
        if (synEn && phrase === synEn && synEn !== synLabel) continue;
        bump(synConcept, 28 * n);
      }
    }
  }

  const textMeaningfulStems = new Set(
    tokens.filter(isMeaningfulToken).map(stem).filter(Boolean)
  );

  // Stemmed single-token fallback (Indonesian label/synonyms only, requiring all stems of multi-word phrases)
  for (const tok of tokens) {
    if (!isMeaningfulToken(tok)) continue;
    const st = stem(tok);
    if (!st || FUNCTION_STOPWORDS.has(st) || GENERIC_CONCEPT_WORDS.has(st)) continue;
    for (const id of index.invertedStem.get(st) ?? []) {
      const dedupKey = `${id}:${st}`;
      if (seenStemHits.has(dedupKey)) continue;
      const c = index.byId.get(id);
      if (!c) continue;

      const labelNorm = c.labelNorm || normalize(c.label);
      const labelStems = Array.from(
        new Set(meaningfulPhraseTokens(labelNorm).map(stem).filter(Boolean))
      );
      if (
        labelStems.length > 0 &&
        labelStems.includes(st) &&
        labelStems.every((ls) => textMeaningfulStems.has(ls))
      ) {
        seenStemHits.add(dedupKey);
        bump(c, 18);
        continue;
      }

      const matchedSyn = getIndonesianSynonyms(c).some((syn) => {
        const synStems = Array.from(
          new Set(meaningfulPhraseTokens(syn).map(stem).filter(Boolean))
        );
        return (
          synStems.length > 0 &&
          synStems.includes(st) &&
          synStems.every((ss) => textMeaningfulStems.has(ss))
        );
      });
      if (matchedSyn) {
        seenStemHits.add(dedupKey);
        bump(c, 8);
      }
    }
  }

  return Array.from(scores.values())
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.concept);
}

/**
 * Check whether a visual concept accurately fits a lesson card's text and keyTerms.
 */
export function imageFit(
  cardText: string,
  concept: ConceptRecord,
  options: { keyTerms?: string[] } = {}
): ImageFitResult {
  if (concept.status === "hidden") {
    return { fit: false, score: 0, reason: "concept_hidden" };
  }

  const cardNorm = normalize(cardText);
  const keyTermNorms = (options.keyTerms ?? []).map(normalize).filter(Boolean);
  const combinedText = [cardText, ...keyTermNorms].join(" ");
  const textNorm = normalize(combinedText);
  if (!textNorm) {
    return { fit: false, score: 0, reason: "empty_text" };
  }

  const labelNorm = concept.labelNorm || normalize(concept.label);
  const meaningfulLabelTokens = meaningfulPhraseTokens(labelNorm);
  if (meaningfulLabelTokens.length === 0) {
    return { fit: false, score: 0, reason: "no_lexical_grounding" };
  }

  const cardTokens = rawTokens(cardText);
  const cardMeaningfulTokens = cardTokens.filter(isMeaningfulToken);
  const cardStemSet = new Set(cardMeaningfulTokens.map(stem).filter(Boolean));
  const primarySubjectNorm = cardMeaningfulTokens.slice(0, 2).join(" ");
  const primarySubjectStems = new Set(
    cardMeaningfulTokens.slice(0, 2).map(stem).filter(Boolean)
  );

  const keyTermTokens = keyTermNorms.flatMap(rawTokens).filter(isMeaningfulToken);
  const keyTermStemSet = new Set(keyTermTokens.map(stem).filter(Boolean));
  const hasKeyTerms = keyTermTokens.length > 0 || keyTermNorms.length > 0;

  const combinedStemSet = new Set([...cardStemSet, ...keyTermStemSet]);

  const synNorms = getIndonesianSynonyms(concept).filter((syn) => {
    const mTokens = meaningfulPhraseTokens(syn);
    return mTokens.length > 0;
  });

  // 1. Check whole-phrase or all-stems match for the concept's Indonesian label
  const labelMatchesKeyTerms =
    keyTermNorms.some(
      (kt) => kt === labelNorm || containsWholePhrase(kt, labelNorm)
    ) ||
    (hasKeyTerms &&
      matchesPhraseOrAllStems(labelNorm, keyTermNorms.join(" "), keyTermStemSet));

  const labelMatchesCard = matchesPhraseOrAllStems(labelNorm, cardNorm, cardStemSet);
  const labelMatchesPrimarySubject =
    containsWholePhrase(primarySubjectNorm, labelNorm) ||
    (meaningfulLabelTokens.length === 1 &&
      primarySubjectStems.has(stem(meaningfulLabelTokens[0]!)));

  // 2. Check whole-phrase or all-stems match for meaningful Indonesian synonyms
  const synMatchesKeyTerms = synNorms.some(
    (s) =>
      keyTermNorms.some((kt) => kt === s || containsWholePhrase(kt, s)) ||
      (hasKeyTerms &&
        matchesPhraseOrAllStems(s, keyTermNorms.join(" "), keyTermStemSet))
  );
  const synMatchesCard = synNorms.some((s) =>
    matchesPhraseOrAllStems(s, cardNorm, cardStemSet)
  );

  // 3. Enforce primary concept / keyTerms alignment when keyTerms are provided
  if (hasKeyTerms) {
    const alignedWithKeyTermsOrSubject =
      labelMatchesKeyTerms || synMatchesKeyTerms || labelMatchesPrimarySubject;
    if (!alignedWithKeyTermsOrSubject) {
      return { fit: false, score: 0, reason: "no_lexical_grounding" };
    }
  }

  let score = 0;
  if (labelMatchesKeyTerms) {
    score += 100;
  } else if (labelMatchesCard) {
    score += 85;
  } else if (synMatchesKeyTerms) {
    score += 75;
  } else if (synMatchesCard) {
    score += 55;
  }

  // Token overlap bonus on meaningful Indonesian label stems (never raw ungrounded stopwords/labelEn)
  const labelStems = Array.from(
    new Set(meaningfulLabelTokens.map(stem).filter((s) => s.length >= 2))
  );
  const matchedLabelStems = labelStems.filter((st) => combinedStemSet.has(st)).length;
  if (
    score > 0 ||
    (labelStems.length === 1 && matchedLabelStems === 1) ||
    (labelStems.length >= 2 && matchedLabelStems === labelStems.length)
  ) {
    score += matchedLabelStems * 20;
    if (labelMatchesPrimarySubject) {
      score += 20;
    }
  }

  if (isNoisyNumericLabel(labelNorm)) {
    score -= 25;
  }

  if (score < 20) {
    return { fit: false, score: Math.max(0, score), reason: "no_lexical_grounding" };
  }

  return { fit: true, score };
}

/**
 * Pick visually distinct distractor concepts for a quiz question.
 */
export function pickDistractors(
  target: ConceptRecord,
  candidates: ConceptRecord[],
  count = 2
): ConceptRecord[] {
  const targetLabel = target.labelNorm || normalize(target.label);
  const targetSyns = new Set((target.synonyms ?? []).map(normalize));
  const targetDomains = new Set(target.domains);

  const scored: Array<{ concept: ConceptRecord; score: number }> = [];
  const seenLabels = new Set<string>([targetLabel]);

  for (const c of candidates) {
    if (c.id === target.id) continue;
    if (c.status !== "active") continue;
    if (!c.assetUrl && !c.assetId) continue;

    const cLabel = c.labelNorm || normalize(c.label);
    if (!cLabel || seenLabels.has(cLabel)) continue;
    if (targetSyns.has(cLabel)) continue;

    let score = 0;
    if (target.kind && c.kind && target.kind === c.kind) score += 30;
    if (target.groupId && c.groupId && target.groupId === c.groupId) score += 20;
    if (c.domains.some((d) => targetDomains.has(d))) score += 15;

    scored.push({ concept: c, score });
  }

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.concept.label.localeCompare(b.concept.label, "id");
  });

  const picked: ConceptRecord[] = [];
  for (const entry of scored) {
    const cLabel = entry.concept.labelNorm || normalize(entry.concept.label);
    if (seenLabels.has(cLabel)) continue;
    seenLabels.add(cLabel);
    picked.push(entry.concept);
    if (picked.length >= count) break;
  }

  return picked;
}

/**
 * Verify that an AI-provided quote appears verbatim (up to normalization) in sourceText.
 */
export function quoteInSource(quote: string, sourceText: string): boolean {
  const q = normalize(quote);
  const s = normalize(sourceText);
  if (!q || !s) return false;
  return s.includes(q);
}

/**
 * Validate a lesson card against the concept index and optional source text.
 */
export function checkCard(
  card: CardCheckInput,
  index: ConceptIndex,
  sourceText?: string
): CardCheckResult {
  const reasons: string[] = [];

  if (!normalize(card.text)) {
    reasons.push("empty_card_text");
  }

  if (sourceText !== undefined && card.quote !== undefined) {
    if (!quoteInSource(card.quote, sourceText)) {
      reasons.push("quote_not_in_source");
    }
  }

  let concept: ConceptRecord | undefined;
  if (card.conceptId) {
    concept = index.byId.get(card.conceptId);
    if (!concept) {
      reasons.push("unknown_concept_id");
    } else if (concept.status !== "active") {
      reasons.push("concept_not_active");
    } else {
      const fit = imageFit(card.text, concept, { keyTerms: card.keyTerms });
      if (!fit.fit) {
        reasons.push(fit.reason ?? "image_fit_failed");
      }
    }
  }

  return {
    ok: reasons.length === 0,
    reasons,
    concept,
  };
}
