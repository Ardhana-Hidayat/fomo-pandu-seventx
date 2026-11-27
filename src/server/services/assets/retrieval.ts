import "server-only";
import { getCatalog } from "./catalog";
import { ID_EN_TRANSLATIONS } from "./taxonomy";
import type {
  AssetRecord,
  AssetSearchResult,
  SearchAssetsOptions,
} from "./types";

const STOPWORDS = new Set([
  // Indonesian
  "yang", "dan", "di", "ke", "dari", "untuk", "dengan", "pada", "adalah",
  "ini", "itu", "atau", "sebagai", "dalam", "akan", "oleh", "juga", "saya",
  "kami", "kita", "mereka", "ada", "tidak", "bisa", "dapat", "agar", "tentang",
  // English
  "the", "a", "an", "of", "in", "on", "to", "for", "with", "and", "or",
  "is", "are", "was", "were", "be", "this", "that", "it", "as", "by",
]);

/**
 * Curated educational topic expansions (Indonesian & English) for SDLB curriculum.
 */
const TOPIC_SYNONYMS: Record<string, string[]> = {
  "bagian tumbuhan": ["akar", "batang", "daun", "bunga", "buah", "pohon", "tumbuhan"],
  tumbuhan: ["akar", "batang", "daun", "bunga", "buah", "pohon", "tanaman", "rumput"],
  pencernaan: ["sistem pencernaan", "lambung", "usus", "perut", "kerongkongan", "makan"],
  "sistem pencernaan": ["pencernaan", "lambung", "usus", "perut", "makanan"],
  pernapasan: ["paru-paru", "bernapas", "oksigen", "hidung", "udara"],
  "peredaran darah": ["jantung", "darah", "organ jantung"],
  hewan: ["kucing", "anjing", "burung", "sapi", "kambing", "kelinci", "bebek", "kuda", "gajah", "monyet", "kupu-kupu", "ikan", "ayam", "binatang"],
  transportasi: ["mobil", "sepeda", "motor", "bus", "kereta", "pesawat", "kapal", "truk", "kendaraan", "lampu lalu lintas"],
  penjumlahan: ["tambah", "plus", "jumlah", "operasi hitung", "matematika"],
  pengurangan: ["kurang", "minus", "selisih", "operasi hitung", "matematika"],
  perkalian: ["kali", "kelipatan", "operasi hitung", "matematika"],
  pembagian: ["bagi", "sama rata", "operasi hitung", "matematika"],
  pecahan: ["setengah", "seperempat", "1/2", "1/4", "bagian", "matematika"],
  geometri: ["lingkaran", "segitiga", "kotak", "persegi panjang", "kubus", "bangun datar"],
  profesi: ["guru", "dokter", "polisi", "tentara", "petani", "koki", "pemadam kebakaran", "pekerjaan"],
  "kerja bakti": ["gotong royong", "membantu", "bersama"],
  "bekerja bakti": ["gotong royong", "membantu", "bersama"],
  "gotong royong": ["kerja bakti", "membantu", "bersama"],
  "lingkungan masyarakat": ["gotong royong", "musyawarah", "membantu", "taman", "masjid"],
  "kegiatan sosial": ["gotong royong", "musyawarah", "membantu", "bermain", "teman", "antre", "upacara bendera"],
  pancasila: ["gotong royong", "musyawarah", "upacara bendera", "berdoa", "bendera", "membantu"],
  "kebersihan diri": ["cuci tangan", "sikat gigi", "mandi", "sabun", "sampo", "handuk", "sisir", "pasta gigi"],
  kebersihan: ["cuci tangan", "sikat gigi", "mandi", "sabun", "sapu", "sampah", "handuk"],
  cuaca: ["cuaca cerah", "cuaca berawan", "hujan", "petir", "badai", "awan", "matahari", "angin", "pelangi", "siklus air"],
  lingkungan: ["pohon", "gunung", "sungai", "laut", "pantai", "taman", "siklus air", "sampah", "tanah"],
  keselamatan: ["lampu lalu lintas", "zebra cross", "pemadam kebakaran", "polisi", "tikungan", "cuaca badai petir"],
  emosi: ["senang", "sedih", "marah", "tenang", "takut", "bingung", "malu", "terkejut", "cemas"],
  apel: ["apple", "buah"],
  nasi: ["rice", "makanan", "eat"],
  sayur: ["vegetables", "wortel", "makanan"],
  meja: ["table", "desk", "meja belajar", "meja makan"],
  kursi: ["chair", "tempat duduk"],
  lampu: ["lamp", "light", "lampu listrik", "bohlam"],
  kasur: ["bed", "tempat tidur"],
  lautan: ["laut", "ombak", "pulau", "terumbu karang", "kapal selam", "mercusuar", "pelabuhan", "nelayan", "paus", "lumba-lumba", "kepiting", "kerang", "pantai"],
  kelautan: ["laut", "ombak", "pulau", "terumbu karang", "kapal selam", "mercusuar", "pelabuhan", "nelayan", "paus", "lumba-lumba", "kepiting", "kerang", "pantai"],
  perkotaan: ["gedung bertingkat", "lampu jalan", "taman", "halte", "stasiun", "jembatan", "kantor pos", "apotek", "rumah sakit"],
  desa: ["sawah", "rumah desa", "kincir angin", "traktor", "petani", "sungai"],
  pedesaan: ["sawah", "rumah desa", "kincir angin", "traktor", "petani", "sungai"],
  alam: ["hutan", "sungai", "danau", "air terjun", "gunung", "batu", "kayu", "tanah", "api", "pantai", "laut", "pohon"],
  "bagian hewan": ["sayap", "paruh", "sirip", "ekor", "cakar", "tanduk", "belalai", "insang", "sisik"],
  "anggota tubuh": ["mata", "telinga", "hidung", "mulut", "gigi", "tangan", "kaki", "lutut", "siku", "bahu", "jari", "leher", "lidah", "otak", "kepala", "rambut", "perut"],
  pedagang: ["pedagang", "penjual", "pasar", "toko", "kasir", "uang rupiah"],
  usia: ["bayi", "anak", "dewasa", "lansia", "kakek", "nenek"],
  pakaian: ["seragam", "jas hujan", "topi", "sepatu", "jaket", "celana", "baju", "kaos", "kaos kaki"],
  kendaraan: ["ambulans", "helikopter", "kereta", "pesawat", "kapal", "truk", "motor", "mobil", "sepeda", "bus", "traktor"],
  hotel: ["hotel", "resepsionis", "kunci kamar", "koper", "lift", "kamar tidur", "tempat tidur", "bantal", "selimut"],
  perabot: ["meja", "kursi", "lemari", "sofa", "tempat tidur", "bantal", "selimut"],
  dapur: ["kompor", "panci", "wajan", "piring", "gelas", "sendok", "garpu", "kulkas", "kitchen"],
  perkakas: ["palu", "obeng", "cangkul", "gunting"],
  "lalu lintas": ["lampu lalu lintas", "zebra cross", "rambu berhenti", "trotoar", "simpang jalan", "tikungan"],
  makanan: ["nasi", "roti", "telur", "daging", "ayam goreng", "sayur bayam", "wortel", "kue", "buah", "sayur"],
  minuman: ["susu", "teh", "air", "jus", "minum"],
  "tata surya": ["planet", "tata surya", "matahari", "bulan", "bintang"],
  elektronik: ["laptop", "komputer", "televisi", "kipas angin", "kulkas", "mesin cuci", "setrika", "lampu", "baterai", "kamera", "printer", "mikrofon", "ponsel"],
  teknologi: ["laptop", "komputer", "televisi", "kamera", "printer", "mikrofon", "ponsel", "baterai"],
  permainan: ["bola sepak", "layang-layang", "ayunan", "perosotan", "puzzle", "balok susun", "catur", "lompat tali", "bermain"],
  olahraga: ["bola sepak", "lompat tali", "lari", "berenang", "melompat", "bola", "catur"],
  pkn: ["lambang garuda", "garuda pancasila", "bendera", "upacara bendera", "gotong royong", "musyawarah", "peta indonesia"],
  ips: ["peta indonesia", "pedagang", "pasar", "kantor pos", "pelabuhan", "stasiun", "sawah", "uang rupiah"],
  ipa: ["akar", "batang", "daun", "biji", "ranting", "tata surya", "termometer", "kaca pembesar", "magnet", "siklus air", "jantung", "paru-paru", "otak", "sistem pencernaan"],
  matematika: ["penjumlahan", "pengurangan", "perkalian", "pembagian", "pecahan", "lingkaran", "segitiga", "persegi panjang", "kubus", "timbangan", "penggaris", "jam", "uang rupiah"],
};

export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s\/-]/gu, " ")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function stemToken(token: string): string {
  let t = token.toLowerCase().trim();
  if (t.length <= 3) return t;

  // Indonesian suffixes
  if (t.endsWith("nya") && t.length > 5) t = t.slice(0, -3);
  else if (t.endsWith("kan") && t.length > 5) t = t.slice(0, -3);
  else if (t.endsWith("lah") && t.length > 5) t = t.slice(0, -3);
  else if (t.endsWith("an") && t.length > 5) t = t.slice(0, -2);

  // Indonesian prefixes
  const idPrefixes = ["meng", "meny", "mem", "men", "ber", "per", "ter", "pen", "pem", "me", "pe", "ke", "di", "se"];
  for (const p of idPrefixes) {
    if (t.startsWith(p) && t.length - p.length >= 3) {
      t = t.slice(p.length);
      break;
    }
  }

  // English light stemming
  if (t.endsWith("ing") && t.length > 5) t = t.slice(0, -3);
  else if (t.endsWith("ies") && t.length > 4) t = t.slice(0, -3) + "y";
  else if (t.endsWith("ied") && t.length > 4) t = t.slice(0, -3) + "y";
  else if (t.endsWith("ed") && t.length > 4) t = t.slice(0, -2);
  else if (t.endsWith("es") && t.length > 4) t = t.slice(0, -2);
  else if (t.endsWith("s") && !t.endsWith("ss") && t.length > 4) t = t.slice(0, -1);

  return t;
}

export function tokenize(text: string, removeStopwords = true): string[] {
  const norm = normalizeText(text);
  if (!norm) return [];
  return norm
    .split(" ")
    .filter((tok) => tok.length > 0 && (!removeStopwords || !STOPWORDS.has(tok)));
}

interface ExpandedQuery {
  rawPhrase: string;
  tokens: string[];
  stems: Set<string>;
  synonyms: Set<string>;
  synonymStems: Set<string>;
}

function containsWholePhrase(haystackNorm: string, phraseNorm: string): boolean {
  if (!haystackNorm || !phraseNorm) return false;
  return ` ${haystackNorm} `.includes(` ${phraseNorm} `);
}

function expandQuery(query: string): ExpandedQuery {
  const rawPhrase = normalizeText(query);
  const tokens = tokenize(query, true);
  const stems = new Set(tokens.map(stemToken));
  const synonyms = new Set<string>();

  // Phrase-level topic expansion (exact & whole-phrase contained multi-word phrases)
  if (TOPIC_SYNONYMS[rawPhrase]) {
    for (const s of TOPIC_SYNONYMS[rawPhrase]) {
      synonyms.add(normalizeText(s));
    }
  }
  for (const [phraseKey, syns] of Object.entries(TOPIC_SYNONYMS)) {
    if (phraseKey.includes(" ") && containsWholePhrase(rawPhrase, phraseKey)) {
      for (const s of syns) synonyms.add(normalizeText(s));
    }
  }
  if (ID_EN_TRANSLATIONS[rawPhrase]) {
    for (const s of ID_EN_TRANSLATIONS[rawPhrase]) {
      synonyms.add(normalizeText(s));
    }
  }

  // Token-level expansion
  for (const tok of tokens) {
    const stem = stemToken(tok);
    for (const key of [tok, stem]) {
      const topicHits = TOPIC_SYNONYMS[key];
      if (topicHits) {
        for (const s of topicHits) synonyms.add(normalizeText(s));
      }
      const transHits = ID_EN_TRANSLATIONS[key];
      if (transHits) {
        for (const s of transHits) synonyms.add(normalizeText(s));
      }
    }
  }

  const synonymStems = new Set<string>();
  for (const syn of synonyms) {
    for (const st of tokenize(syn, true)) {
      synonymStems.add(stemToken(st));
    }
  }

  return { rawPhrase, tokens, stems, synonyms, synonymStems };
}

function scoreAsset(asset: AssetRecord, q: ExpandedQuery): AssetSearchResult | null {
  if (!q.rawPhrase) return null;

  let score = 0;
  const matchedOn = new Set<string>();

  const displayNorm = normalizeText(asset.display_name);
  const canonicalNorm = normalizeText(asset.canonical_key);
  const idNorm = normalizeText(asset.asset_id.replace(/^(picto|custom):/, ""));
  const displayTokens = tokenize(displayNorm, false);

  // 1. Exact or whole-word phrase match on display name / canonical key / id (no arbitrary mid-word substrings!)
  if (displayNorm === q.rawPhrase || canonicalNorm === q.rawPhrase || idNorm === q.rawPhrase) {
    score += 55;
    matchedOn.add("exact_name");
  } else if (
    q.rawPhrase.length >= 2 &&
    (containsWholePhrase(displayNorm, q.rawPhrase) ||
      containsWholePhrase(canonicalNorm, q.rawPhrase) ||
      displayTokens.some((t) => q.rawPhrase.length >= 4 && t.startsWith(q.rawPhrase)))
  ) {
    score += 26;
    matchedOn.add("phrase_name");
  }

  // 2. Keywords match (Indonesian prioritized over English to avoid cross-language collisions)
  const kwIdNorms = asset.keywords_id.map(normalizeText).filter(Boolean);
  const kwEnNorms = asset.keywords_en.map(normalizeText).filter(Boolean);
  const kwIdSet = new Set(kwIdNorms);
  const kwEnSet = new Set(kwEnNorms);

  const kwIdStems = new Set<string>();
  for (const kw of kwIdNorms) {
    for (const t of tokenize(kw, true)) {
      kwIdStems.add(stemToken(t));
    }
  }
  const kwEnStems = new Set<string>();
  for (const kw of kwEnNorms) {
    for (const t of tokenize(kw, true)) {
      kwEnStems.add(stemToken(t));
    }
  }

  if (kwIdSet.has(q.rawPhrase)) {
    score += 38;
    matchedOn.add("exact_keyword_id");
  } else if (kwEnSet.has(q.rawPhrase)) {
    score += 24;
    matchedOn.add("exact_keyword_en");
  }

  let directTokenHits = 0;
  for (const tok of q.tokens) {
    const stem = stemToken(tok);
    if (kwIdSet.has(tok)) {
      score += 20;
      directTokenHits += 1;
      matchedOn.add(`kw:${tok}`);
    } else if (kwIdStems.has(stem)) {
      score += 14;
      directTokenHits += 1;
      matchedOn.add(`stem:${stem}`);
    } else if (kwEnSet.has(tok)) {
      score += 12;
      directTokenHits += 1;
      matchedOn.add(`kw_en:${tok}`);
    } else if (kwEnStems.has(stem)) {
      score += 8;
      directTokenHits += 1;
      matchedOn.add(`stem_en:${stem}`);
    }
  }

  // 3. Synonym & Topic expansion match
  let synHits = 0;
  for (const syn of q.synonyms) {
    if (
      displayNorm === syn ||
      canonicalNorm === syn ||
      kwIdSet.has(syn) ||
      kwEnSet.has(syn)
    ) {
      score += 16;
      synHits += 1;
      matchedOn.add(`syn:${syn}`);
    }
  }
  if (synHits === 0) {
    for (const synStem of q.synonymStems) {
      if (kwIdStems.has(synStem) || kwEnStems.has(synStem)) {
        score += 9;
        synHits += 1;
        matchedOn.add(`syn_stem:${synStem}`);
      }
    }
  }

  // 4. Category match (whole phrase or category token overlap, never arbitrary substrings)
  for (const cat of asset.categories) {
    const catNorm = normalizeText(cat);
    if (catNorm === q.rawPhrase || containsWholePhrase(q.rawPhrase, catNorm)) {
      score += 18;
      matchedOn.add(`category:${cat}`);
    } else {
      const catTokens = tokenize(catNorm, true).map(stemToken);
      if (catTokens.some((ct) => q.stems.has(ct) || q.synonymStems.has(ct))) {
        score += 10;
        matchedOn.add(`category_tok:${cat}`);
      }
    }
  }

  // 5. Concepts & description token overlap
  const conceptAndDesc = normalizeText([...asset.concepts, asset.description].join(" "));
  const descStems = new Set(tokenize(conceptAndDesc, true).map(stemToken));
  for (const st of q.stems) {
    if (descStems.has(st)) {
      score += 6;
      matchedOn.add(`desc:${st}`);
    }
  }

  // 6. Fuzzy prefix fallback when nothing else matched strongly (prefix of display token only)
  if (score === 0 && q.rawPhrase.length >= 4) {
    const nameTokens = tokenize(displayNorm, false);
    for (const nt of nameTokens) {
      for (const qt of q.tokens) {
        if (qt.length >= 4 && nt.startsWith(qt)) {
          score += 8;
          matchedOn.add(`prefix:${nt}`);
        }
      }
    }
  }

  if (score <= 0) return null;

  // Prefer multi-token coverage
  if (q.tokens.length > 1 && directTokenHits >= q.tokens.length) {
    score += 10;
  }

  // Boost custom illustrations slightly when matched, and penalize numeric-suffix ARASAAC duplicates
  if (asset.visual_type === "illustration") {
    score += 5;
  }
  if (/-\d{4,6}$/.test(asset.asset_id.replace(/^picto:/, ""))) {
    score -= 6;
  }

  if (score <= 0) return null;

  return {
    asset,
    score: Math.round(score * 100) / 100,
    matched_on: [...matchedOn],
  };
}

export function searchAssets(
  query: string,
  options: SearchAssetsOptions = {}
): AssetSearchResult[] {
  const {
    limit = 10,
    categories,
    visualType,
    minScore = 1,
    onlyAvailable = true,
    deduplicateConcepts = true,
  } = options;

  const expanded = expandQuery(query);
  if (!expanded.rawPhrase) return [];

  const catalog = getCatalog();
  const categoryFilter = categories && categories.length > 0 ? new Set(categories) : null;

  const scored: AssetSearchResult[] = [];
  for (const asset of catalog) {
    if (onlyAvailable && !asset.available) continue;
    if (visualType && asset.visual_type !== visualType) continue;
    if (categoryFilter && !asset.categories.some((c) => categoryFilter.has(c))) continue;

    const hit = scoreAsset(asset, expanded);
    if (hit && hit.score >= minScore) {
      scored.push(hit);
    }
  }

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.asset.asset_id.localeCompare(b.asset.asset_id);
  });

  if (!deduplicateConcepts) {
    return scored.slice(0, limit);
  }

  const seenCanonical = new Set<string>();
  const deduped: AssetSearchResult[] = [];
  for (const item of scored) {
    if (seenCanonical.has(item.asset.canonical_key)) continue;
    seenCanonical.add(item.asset.canonical_key);
    deduped.push(item);
    if (deduped.length >= limit) break;
  }

  return deduped;
}
