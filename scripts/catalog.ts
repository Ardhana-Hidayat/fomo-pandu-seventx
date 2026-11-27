import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { and, desc, isNull, ne } from "drizzle-orm";
import { getCatalog } from "../src/server/services/assets/catalog";
import type { AssetCategory, AssetRecord } from "../src/server/services/assets/types";
import {
  normalize,
  type ConceptRecord,
} from "../src/shared/lib/grounding/visual-retrieval";
import {
  getCatalogDir,
  getSeedsFilePath,
  loadCatalogFromDisk,
  type DomainCatalogFile,
} from "../src/server/services/catalog/loader";

export interface DomainSpec {
  id: string;
  name: string;
  minConcepts: number;
  description: string;
}

export interface SeedEntry {
  id: string;
  label: string;
  labelNorm: string;
  synonyms: string[];
  labelEn?: string;
  domains: string[];
  groupId: string;
  kind: string;
}

export interface DomainsAndSeedsFile {
  version: string;
  domains: DomainSpec[];
  denylist: string[];
  seeds: SeedEntry[];
}

interface ExtendedConceptRecord extends ConceptRecord {
  altUrls?: string[];
}

const MAX_FILE_BYTES = 300 * 1024; // 300 KB
const MIN_ACTIVE_CONCEPTS = 1000;

const CATEGORY_TO_DOMAINS: Record<AssetCategory, string[]> = {
  "Bahasa Indonesia": ["bahasa", "sekolah"],
  Matematika: ["matematika", "sekolah"],
  IPA: ["alam-cuaca", "tubuh-kesehatan"],
  IPS: ["rumah-tempat", "keluarga-sosial"],
  "Pendidikan Pancasila": ["keluarga-sosial", "sekolah"],
  "Seni dan Budaya": ["seni-olahraga"],
  "Pendidikan Jasmani": ["seni-olahraga", "tubuh-kesehatan"],
  "Kesehatan dan Kebersihan": ["tubuh-kesehatan", "bina-diri"],
  "Kehidupan Sehari-hari": ["bina-diri", "keterampilan-hidup"],
  Lingkungan: ["alam-cuaca", "rumah-tempat"],
  Hewan: ["hewan"],
  Tumbuhan: ["tumbuhan-makanan"],
  Transportasi: ["transportasi-keselamatan"],
  Profesi: ["keterampilan-hidup", "keluarga-sosial"],
  "Makanan dan Minuman": ["tumbuhan-makanan"],
  "Benda di Rumah": ["rumah-tempat", "bina-diri"],
  "Benda di Sekolah": ["sekolah", "bahasa"],
  "Kegiatan Sosial": ["keluarga-sosial"],
  "Emosi dan Perilaku": ["keluarga-sosial", "bina-diri"],
  "Keselamatan Diri": ["transportasi-keselamatan", "bina-diri"],
};

const DOMAIN_KEYWORD_RULES: Array<{ domain: string; patterns: RegExp[] }> = [
  {
    domain: "tumbuhan-makanan",
    patterns: [
      /\b(buah|sayur|nasi|roti|susu|teh|air|jus|kue|telur|daging|ayam|ikan|apel|pisang|mangga|jeruk|wortel|bayam|tomat|kentang|jagung|beras|kopi|gula|garam|makan|minum|sarapan|masak|pohon|bunga|daun|akar|batang|biji|ranting|tanam|kebun|sawah|food|eat|fruit|vegetable|apple|banana|orange|bread|milk|water|rice|egg|meat|chicken|cake|cookie|juice|tea|coffee|sugar|salt|soup|salad|pizza|cheese|honey|tree|plant|flower|leaf|seed|grass|cook|breakfast|lunch|dinner)\b/i,
    ],
  },
  {
    domain: "hewan",
    patterns: [
      /\b(hewan|binatang|kucing|anjing|burung|ikan|sapi|kambing|ayam|bebek|gajah|harimau|singa|jerapah|monyet|kelinci|kura|penyu|lebah|kupu|semut|nyamuk|ular|katak|buaya|paus|lumba|kepiting|kerang|udang|sayap|paruh|sirip|ekor|cakar|tanduk|belalai|insang|sisik|animal|cat|dog|bird|fish|cow|pig|sheep|goat|horse|duck|lion|tiger|bear|elephant|monkey|rabbit|snake|frog|turtle|butterfly|bee|ant|spider|whale|dolphin|shark|crab|snail|owl|eagle|penguin|giraffe|zebra|zoo|pet)\b/i,
    ],
  },
  {
    domain: "rumah-tempat",
    patterns: [
      /\b(rumah|kamar|ruang|dapur|toilet|kamar mandi|hotel|pasar|toko|apotek|rumah sakit|kantor|bank|masjid|gereja|pura|vihara|taman|kota|desa|gedung|jembatan|stasiun|bandara|pelabuhan|halte|meja|kursi|lemari|sofa|kasur|tempat tidur|pintu|jendela|atap|lantai|dinding|lampu)\b/i,
    ],
  },
  {
    domain: "bahasa",
    patterns: [
      /\b(huruf|kata|kalimat|cerita|baca|membaca|tulis|menulis|buku|komik|koran|majalah|surat|puisi|kamus|bicara|mendengar|tanya|jawab|nama|judul|bahasa|dongeng|teks|ucap|dengar|isyarat|sibi|bisindo)\b/i,
    ],
  },
  {
    domain: "tubuh-kesehatan",
    patterns: [
      /\b(mata|telinga|hidung|mulut|gigi|lidah|rambut|kepala|leher|bahu|tangan|jari|siku|lutut|kaki|perut|jantung|paru|otak|darah|kulit|tulang|sakit|sehat|dokter|perawat|obat|suntik|termometer|demam|batuk|pilek|luka|perban|sabun|sikat gigi|pasta gigi|cuci tangan)\b/i,
    ],
  },
  {
    domain: "keluarga-sosial",
    patterns: [
      /\b(ibu|ayah|bapak|anak|bayi|kakak|adik|kakek|nenek|keluarga|teman|sahabat|tetangga|guru|murid|siswa|senang|sedih|marah|takut|malu|kaget|bingung|senyum|tertawa|menangis|tolong|bantu|terima kasih|maaf|salam|gotong royong|musyawarah|upacara|pancasila|bendera)\b/i,
    ],
  },
  {
    domain: "bina-diri",
    patterns: [
      /\b(mandi|sabun|handuk|sikat|sisir|sampo|cuci|bilas|gosok|kering|tidur|bangun|berpakaian|baju|celana|sepatu|kaos kaki|topi|jaket|seragam|jas hujan|kancing|resleting|makan|minum|piring|gelas|sendok|garpu|bantal|selimut|lap|sapu)\b/i,
    ],
  },
  {
    domain: "alam-cuaca",
    patterns: [
      /\b(matahari|bulan|bintang|langit|awan|hujan|petir|badai|angin|cerah|berawan|mendung|pelangi|gunung|bukit|lembah|hutan|sungai|danau|laut|ombak|pantai|pulau|terumbu karang|air terjun|batu|tanah|pasir|api|asap|salju|es|bumi|planet|alam)\b/i,
    ],
  },
  {
    domain: "matematika",
    patterns: [
      /\b(angka|bilangan|satu|dua|tiga|empat|lima|enam|tujuh|delapan|sembilan|sepuluh|nol|tambah|penjumlahan|kurang|pengurangan|kali|perkalian|bagi|pembagian|pecahan|setengah|seperempat|lingkaran|persegi|segitiga|kubus|bola|garis|ukur|penggaris|timbangan|berat|panjang|jam|waktu|uang|rupiah|hitung)\b/i,
    ],
  },
  {
    domain: "sekolah",
    patterns: [
      /\b(sekolah|kelas|belajar|mengajar|guru|murid|siswa|buku|pensil|pena|pulpen|penghapus|penggaris|tas|papan tulis|kapur|spidol|meja belajar|kursi|ujian|nilai|pr|seragam|upacara|perpustakaan|kantin|laboratorium|komputer|laptop)\b/i,
    ],
  },
  {
    domain: "transportasi-keselamatan",
    patterns: [
      /\b(mobil|motor|sepeda|bus|truk|kereta|pesawat|helikopter|kapal|perahu|kapal selam|ambulans|pemadam|jalan|trotoar|zebra cross|lampu lalu lintas|rambu|helm|sabuk pengaman|halte|stasiun|bandara|pelabuhan|simpang|berhenti|hati hati|darurat|bahaya|selamat)\b/i,
    ],
  },
  {
    domain: "seni-olahraga",
    patterns: [
      /\b(gambar|melukis|lukis|warna|cat|kuas|musik|lagu|nyanyi|tari|menari|gitar|piano|drum|bola|sepak bola|basket|renang|lari|lompat|sepeda|senam|olahraga|main|bermain|layang|ayunan|perosotan|puzzle|catur|balok|boneka)\b/i,
    ],
  },
  {
    domain: "keterampilan-hidup",
    patterns: [
      /\b(kompor|panci|wajan|pisau|gunting|palu|obeng|cangkul|mesin cuci|setrika|kulkas|kipas angin|televisi|kamera|printer|mikrofon|baterai|telepon|kunci|koper|uang|belanja|kasir|pedagang|nelayan|petani|tukang|montir|pilot|penjahit|koki|polisi|resepsionis|jahit|masak|potong|bersih)\b/i,
    ],
  },
];

function computeFileSha256(filePath: string): string {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function loadSeedsFile(): DomainsAndSeedsFile {
  const p = getSeedsFilePath();
  if (!fs.existsSync(p)) {
    throw new Error(`Missing seeds file: ${p}`);
  }
  return JSON.parse(fs.readFileSync(p, "utf8")) as DomainsAndSeedsFile;
}

function inferDomains(asset: AssetRecord, seedMap: Map<string, SeedEntry>): string[] {
  const domains = new Set<string>();

  for (const cat of asset.categories) {
    for (const d of CATEGORY_TO_DOMAINS[cat] ?? []) {
      domains.add(d);
    }
  }

  const textBlob = [
    asset.display_name,
    ...asset.keywords_id,
    ...asset.concepts,
  ].join(" ");

  for (const rule of DOMAIN_KEYWORD_RULES) {
    if (rule.patterns.some((re) => re.test(textBlob))) {
      domains.add(rule.domain);
    }
  }

  // Also check seed entry match
  const normName = normalize(asset.display_name);
  const seedHit = seedMap.get(normName);
  if (seedHit) {
    for (const d of seedHit.domains) domains.add(d);
  }

  if (domains.size === 0) {
    domains.add("bina-diri");
  }

  return Array.from(domains);
}

function inferKind(asset: AssetRecord, domains: string[]): string {
  if (domains.includes("hewan")) return "hewan";
  if (domains.includes("tumbuhan-makanan")) return "tumbuhan_makanan";
  if (domains.includes("matematika")) return "matematika";
  if (asset.categories.includes("Profesi")) return "orang";
  if (asset.categories.includes("Emosi dan Perilaku")) return "sifat";
  return "benda";
}

function pickUniqueLabel(
  asset: AssetRecord,
  usedLabelNorms: Set<string>,
  denylistSet: Set<string>
): { label: string; labelNorm: string } | null {
  const candidates: string[] = [];

  // Prefer Indonesian keywords first for pictograms, display_name first for custom
  if (asset.asset_id.startsWith("custom:")) {
    candidates.push(asset.display_name);
    candidates.push(...asset.keywords_id);
  } else {
    for (const kw of asset.keywords_id) {
      if (kw && !asset.keywords_en.includes(kw)) {
        candidates.push(kw);
      }
    }
    candidates.push(asset.display_name);
    candidates.push(...asset.keywords_id);
    // Fallback to slug with ID if needed to keep distinct visual concepts >= 1,000
    const rawSlug = asset.asset_id.replace(/^(picto|custom):/, "");
    candidates.push(rawSlug.replace(/-/g, " "));
  }

  for (const cand of candidates) {
    const clean = cand.trim();
    const norm = normalize(clean);
    if (!norm || norm.length < 1) continue;
    if (denylistSet.has(norm)) continue;
    if (!usedLabelNorms.has(norm)) {
      const formatted = clean
        .split(/\s+/)
        .map((w) => (w.length > 0 ? w[0].toUpperCase() + w.slice(1) : w))
        .join(" ");
      return { label: formatted, labelNorm: norm };
    }
  }

  return null;
}

function buildCatalogFiles(): void {
  const seedsFile = loadSeedsFile();
  const denylistSet = new Set(seedsFile.denylist.map(normalize).filter(Boolean));
  const seedMap = new Map<string, SeedEntry>();
  for (const s of seedsFile.seeds) {
    seedMap.set(s.labelNorm || normalize(s.label), s);
  }

  const rawAssets = getCatalog(true).filter((a) => a.available);
  // Sort custom assets first, then pictograms without numeric suffixes, then with numeric suffixes
  rawAssets.sort((a, b) => {
    const aCustom = a.asset_id.startsWith("custom:") ? 0 : 1;
    const bCustom = b.asset_id.startsWith("custom:") ? 0 : 1;
    if (aCustom !== bCustom) return aCustom - bCustom;
    const aHasNum = /-\d+$/.test(a.asset_id) ? 1 : 0;
    const bHasNum = /-\d+$/.test(b.asset_id) ? 1 : 0;
    if (aHasNum !== bHasNum) return aHasNum - bHasNum;
    return a.asset_id.localeCompare(b.asset_id);
  });

  const shaToPrimary = new Map<string, ExtendedConceptRecord>();
  const usedLabelNorms = new Set<string>();
  const usedSynonymNorms = new Set<string>();
  const concepts: ExtendedConceptRecord[] = [];
  const usedConceptIds = new Set<string>();

  for (const asset of rawAssets) {
    const diskPath = path.join(process.cwd(), "public", asset.file_path.replace(/^\/+/, ""));
    const sha = computeFileSha256(diskPath);

    // Merge exact binary SHA-256 duplicates onto the primary concept
    const existingBySha = shaToPrimary.get(sha);
    if (existingBySha) {
      existingBySha.altUrls = existingBySha.altUrls ?? [];
      if (!existingBySha.altUrls.includes(asset.file_path)) {
        existingBySha.altUrls.push(asset.file_path);
      }
      continue;
    }

    const picked = pickUniqueLabel(asset, usedLabelNorms, denylistSet);
    if (!picked) {
      // Attach as altUrl to an existing concept if possible
      const fallbackNorm = normalize(asset.display_name);
      const primary = concepts.find((c) => c.labelNorm === fallbackNorm);
      if (primary) {
        primary.altUrls = primary.altUrls ?? [];
        primary.altUrls.push(asset.file_path);
      }
      continue;
    }

    usedLabelNorms.add(picked.labelNorm);

    const domains = inferDomains(asset, seedMap);
    const baseId = `${domains[0]}-${picked.labelNorm.replace(/\s+/g, "-")}`;
    let id = baseId;
    let suffix = 2;
    while (usedConceptIds.has(id)) {
      id = `${baseId}-${suffix++}`;
    }
    usedConceptIds.add(id);

    const concept: ExtendedConceptRecord = {
      id,
      label: picked.label,
      labelNorm: picked.labelNorm,
      synonyms: [],
      labelEn: asset.keywords_en[0] ?? null,
      domains,
      groupId: asset.categories[0]
        ? normalize(asset.categories[0]).replace(/\s+/g, "-")
        : "umum",
      kind: inferKind(asset, domains),
      popularity: asset.asset_id.startsWith("custom:") ? 85 : 70,
      assetId: null,
      assetUrl: asset.file_path,
      altAssetIds: [],
      altUrls: [],
      altText: asset.description || picked.label,
      status: "active",
      source: asset.asset_id.startsWith("custom:") ? "legacy" : "arasaac",
      sourceRef: asset.arasaac_id ? String(asset.arasaac_id) : asset.asset_id,
    };

    shaToPrimary.set(sha, concept);
    concepts.push(concept);
  }

  // Second pass: assign non-colliding synonyms
  const rawAssetByPath = new Map(rawAssets.map((a) => [a.file_path, a]));
  for (const concept of concepts) {
    const asset = concept.assetUrl ? rawAssetByPath.get(concept.assetUrl) : undefined;
    if (!asset) continue;

    const candidateSyns = [
      ...asset.keywords_id,
      ...asset.concepts,
      ...(seedMap.get(concept.labelNorm)?.synonyms ?? []),
    ];

    const syns: string[] = [];
    for (const rawSyn of candidateSyns) {
      const synNorm = normalize(rawSyn);
      if (!synNorm || synNorm === concept.labelNorm) continue;
      if (denylistSet.has(synNorm)) continue;
      if (usedLabelNorms.has(synNorm) || usedSynonymNorms.has(synNorm)) continue;
      usedSynonymNorms.add(synNorm);
      syns.push(rawSyn.trim());
      if (syns.length >= 6) break;
    }
    concept.synonyms = syns;
  }

  // Third pass: add unmapped seeds from domains-and-seeds.json as needs_review
  for (const seed of seedsFile.seeds) {
    const norm = seed.labelNorm || normalize(seed.label);
    if (!norm || usedLabelNorms.has(norm) || denylistSet.has(norm)) continue;
    usedLabelNorms.add(norm);
    const primary = seed.domains[0] ?? "bina-diri";
    const baseId = `${primary}-${norm.replace(/\s+/g, "-")}`;
    let id = baseId;
    let suffix = 2;
    while (usedConceptIds.has(id)) {
      id = `${baseId}-${suffix++}`;
    }
    usedConceptIds.add(id);

    concepts.push({
      id,
      label: seed.label,
      labelNorm: norm,
      synonyms: (seed.synonyms ?? []).filter((s) => {
        const sn = normalize(s);
        return sn && !usedLabelNorms.has(sn) && !usedSynonymNorms.has(sn) && !denylistSet.has(sn);
      }),
      labelEn: seed.labelEn ?? null,
      domains: seed.domains,
      groupId: seed.groupId || primary,
      kind: seed.kind || "konsep",
      popularity: 40,
      assetId: null,
      assetUrl: null,
      altAssetIds: [],
      altUrls: [],
      altText: seed.label,
      status: "needs_review",
      source: "legacy",
      sourceRef: seed.id,
    });
  }

  // Group by primary domain and write data/catalog/<domain>.json
  const catalogDir = getCatalogDir();
  if (!fs.existsSync(catalogDir)) {
    fs.mkdirSync(catalogDir, { recursive: true });
  }
  for (const existing of fs.readdirSync(catalogDir)) {
    if (existing.endsWith(".json")) {
      fs.unlinkSync(path.join(catalogDir, existing));
    }
  }

  const byDomain = new Map<string, ExtendedConceptRecord[]>();
  for (const d of seedsFile.domains) {
    byDomain.set(d.id, []);
  }
  for (const c of concepts) {
    const primaryDomain = c.domains[0] ?? "bina-diri";
    const list = byDomain.get(primaryDomain) ?? [];
    list.push(c);
    byDomain.set(primaryDomain, list);
  }

  for (const [domain, list] of byDomain.entries()) {
    list.sort((a, b) => a.label.localeCompare(b.label, "id"));
    const payload: DomainCatalogFile = {
      domain,
      version: seedsFile.version,
      count: list.length,
      concepts: list,
    };
    const outPath = path.join(catalogDir, `${domain}.json`);
    fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), "utf8");
  }

  const activeCount = concepts.filter((c) => c.status === "active").length;
  const reviewCount = concepts.filter((c) => c.status === "needs_review").length;
  console.log(
    `Built ${activeCount} active concepts and ${reviewCount} needs_review concepts across ${byDomain.size} domain files in data/catalog/.`
  );
}

function verifyCatalogFiles(): { ok: boolean; summary: Record<string, unknown> } {
  const seedsFile = loadSeedsFile();
  const denylistSet = new Set(seedsFile.denylist.map(normalize).filter(Boolean));
  const catalogDir = getCatalogDir();
  const errors: string[] = [];

  if (!fs.existsSync(catalogDir)) {
    errors.push("data/catalog directory does not exist");
  }

  const fileSizes: Record<string, number> = {};
  if (fs.existsSync(catalogDir)) {
    for (const file of fs.readdirSync(catalogDir).filter((f) => f.endsWith(".json"))) {
      const fullPath = path.join(catalogDir, file);
      const size = fs.statSync(fullPath).size;
      fileSizes[file] = size;
      if (size >= MAX_FILE_BYTES) {
        errors.push(`File ${file} exceeds 300 KB (${size} bytes)`);
      }
    }
  }

  const concepts = loadCatalogFromDisk(catalogDir) as ExtendedConceptRecord[];
  const active = concepts.filter((c) => c.status === "active");

  if (active.length < MIN_ACTIVE_CONCEPTS) {
    errors.push(`Active concepts ${active.length} < ${MIN_ACTIVE_CONCEPTS}`);
  }

  const seenLabels = new Map<string, string>();
  const seenNonHiddenLabels = new Map<string, string>();
  const seenSyns = new Map<string, string>();
  const mappedDiskPaths = new Set<string>();
  const domainActiveCounts = new Map<string, number>(seedsFile.domains.map((d) => [d.id, 0]));
  const domainTotalCounts = new Map<string, number>(seedsFile.domains.map((d) => [d.id, 0]));

  if (seedsFile.seeds.length < 1180) {
    errors.push(`Seeds count ${seedsFile.seeds.length} < 1180`);
  }

  for (const c of concepts) {
    if (c.status === "hidden") {
      if (c.assetUrl) {
        const diskPath = path.join(process.cwd(), "public", c.assetUrl.replace(/^\/+/, ""));
        if (fs.existsSync(diskPath)) mappedDiskPaths.add(c.assetUrl);
      }
      for (const alt of c.altUrls ?? []) {
        const diskPath = path.join(process.cwd(), "public", alt.replace(/^\/+/, ""));
        if (fs.existsSync(diskPath)) mappedDiskPaths.add(alt);
      }
      continue;
    }
    for (const d of c.domains) {
      domainTotalCounts.set(d, (domainTotalCounts.get(d) ?? 0) + 1);
    }
    const nonHiddenNorm = c.labelNorm || normalize(c.label);
    if (nonHiddenNorm) {
      if (seenNonHiddenLabels.has(nonHiddenNorm)) {
        errors.push(
          `Duplicate non-hidden labelNorm "${nonHiddenNorm}": ${seenNonHiddenLabels.get(nonHiddenNorm)} vs ${c.id} (${c.status})`
        );
      } else {
        seenNonHiddenLabels.set(nonHiddenNorm, `${c.id} (${c.status})`);
      }
    }
  }

  for (const c of active) {
    const labelNorm = c.labelNorm || normalize(c.label);
    if (!labelNorm) {
      errors.push(`Concept ${c.id} has empty labelNorm`);
    } else if (/ \d{4,6}$/.test(c.label)) {
      errors.push(`Active concept ${c.id} has numeric suffix in label "${c.label}"`);
    } else if (seenLabels.has(labelNorm)) {
      errors.push(`Duplicate active labelNorm "${labelNorm}": ${seenLabels.get(labelNorm)} vs ${c.id}`);
    } else {
      seenLabels.set(labelNorm, c.id);
    }

    if (denylistSet.has(labelNorm)) {
      errors.push(`Denylist hit in labelNorm "${labelNorm}" (${c.id})`);
    }

    for (const syn of c.synonyms ?? []) {
      const synNorm = normalize(syn);
      if (!synNorm) continue;
      if (denylistSet.has(synNorm)) {
        errors.push(`Denylist hit in synonym "${synNorm}" (${c.id})`);
      }
      if (seenSyns.has(synNorm)) {
        errors.push(`Duplicate active synonym "${synNorm}": ${seenSyns.get(synNorm)} vs ${c.id}`);
      } else {
        seenSyns.set(synNorm, c.id);
      }
    }

    if (!c.assetUrl) {
      errors.push(`Active concept ${c.id} missing assetUrl`);
    } else {
      const diskPath = path.join(process.cwd(), "public", c.assetUrl.replace(/^\/+/, ""));
      if (!fs.existsSync(diskPath)) {
        errors.push(`Missing disk file for ${c.id}: ${c.assetUrl}`);
      } else {
        mappedDiskPaths.add(c.assetUrl);
      }
    }

    for (const alt of c.altUrls ?? []) {
      const diskPath = path.join(process.cwd(), "public", alt.replace(/^\/+/, ""));
      if (fs.existsSync(diskPath)) {
        mappedDiskPaths.add(alt);
      }
    }

    for (const d of c.domains) {
      domainActiveCounts.set(d, (domainActiveCounts.get(d) ?? 0) + 1);
    }
  }

  // Check synonym vs active labelNorm collisions
  for (const [synNorm, cid] of seenSyns.entries()) {
    if (seenLabels.has(synNorm)) {
      errors.push(`Synonym "${synNorm}" on ${cid} collides with active labelNorm on ${seenLabels.get(synNorm)}`);
    }
  }

  // Check all 1,175 disk assets are mapped
  const diskAssets: string[] = [];
  for (const sub of ["pictograms", "custom"]) {
    const dir = path.join(process.cwd(), "public", "media", sub);
    if (fs.existsSync(dir)) {
      for (const f of fs.readdirSync(dir)) {
        if (f.endsWith(".webp")) {
          diskAssets.push(`/media/${sub}/${f}`);
        }
      }
    }
  }
  const unmappedDisk = diskAssets.filter((p) => !mappedDiskPaths.has(p));
  if (unmappedDisk.length > 0) {
    errors.push(`${unmappedDisk.length} disk .webp files not mapped (e.g. ${unmappedDisk.slice(0, 5).join(", ")})`);
  }

  // Check domain minimums
  const domainReport: Record<string, { active: number; total: number; min: number; ok: boolean }> = {};
  for (const d of seedsFile.domains) {
    const activeCount = domainActiveCounts.get(d.id) ?? 0;
    const totalCount = domainTotalCounts.get(d.id) ?? 0;
    const ok = totalCount >= d.minConcepts;
    domainReport[d.id] = { active: activeCount, total: totalCount, min: d.minConcepts, ok };
    if (!ok) {
      errors.push(`Domain "${d.id}" has ${totalCount} concepts < minimum ${d.minConcepts}`);
    }
  }

  return {
    ok: errors.length === 0,
    summary: {
      seedsCount: seedsFile.seeds.length,
      totalConcepts: concepts.length,
      activeConcepts: active.length,
      needsReviewConcepts: concepts.filter((c) => c.status === "needs_review").length,
      diskAssets: diskAssets.length,
      mappedDiskAssets: mappedDiskPaths.size,
      maxFileBytes: Math.max(0, ...Object.values(fileSizes)),
      domainReport,
      errors,
    },
  };
}

async function showGaps(): Promise<void> {
  const { db } = await import("../src/server/db/client");
  const { visualGaps } = await import("../src/server/db/schema");
  const rows = await db.select().from(visualGaps).orderBy(desc(visualGaps.count)).limit(50);
  console.log(`Visual gaps (${rows.length} rows):`);
  for (const r of rows) {
    console.log(`  - ${r.term} (count=${r.count}, subject=${r.subject ?? "-"}, status=${r.status})`);
  }
}

async function syncToDb(): Promise<void> {
  const { db } = await import("../src/server/db/client");
  const { catalogVersion, visualConcepts } = await import("../src/server/db/schema");
  const catalogDir = getCatalogDir();
  const concepts = loadCatalogFromDisk(catalogDir);

  const hashObj = crypto.createHash("sha256");
  for (const f of fs.readdirSync(catalogDir).filter((x) => x.endsWith(".json")).sort()) {
    hashObj.update(fs.readFileSync(path.join(catalogDir, f)));
  }
  const catalogHash = hashObj.digest("hex");

  const now = new Date();
  await db.transaction(async (tx) => {
    // Temporarily hide non-upload rows before upserting so merged/removed IDs and
    // swapped label_norm values never violate visual_concepts_active_label_norm_idx.
    await tx
      .update(visualConcepts)
      .set({ status: "hidden", updatedAt: now })
      .where(and(ne(visualConcepts.source, "upload"), isNull(visualConcepts.uploadedBy)));

    for (const c of concepts) {
      await tx
        .insert(visualConcepts)
        .values({
          id: c.id,
          label: c.label,
          labelNorm: c.labelNorm || normalize(c.label),
          synonyms: c.synonyms ?? [],
          labelEn: c.labelEn ?? null,
          domains: c.domains ?? [],
          groupId: c.groupId ?? null,
          kind: c.kind ?? null,
          popularity: c.popularity ?? 0,
          assetId: null,
          altAssetIds: [],
          altText: c.altText ?? null,
          status: c.status || "active",
          source: c.source || "arasaac",
          sourceRef: c.sourceRef ?? null,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: visualConcepts.id,
          set: {
            label: c.label,
            labelNorm: c.labelNorm || normalize(c.label),
            synonyms: c.synonyms ?? [],
            labelEn: c.labelEn ?? null,
            domains: c.domains ?? [],
            groupId: c.groupId ?? null,
            kind: c.kind ?? null,
            popularity: c.popularity ?? 0,
            altText: c.altText ?? null,
            status: c.status || "active",
            source: c.source || "arasaac",
            sourceRef: c.sourceRef ?? null,
            updatedAt: now,
          },
        });
    }

    await tx
      .insert(catalogVersion)
      .values({
        id: "main",
        hash: catalogHash,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: catalogVersion.id,
        set: {
          hash: catalogHash,
          updatedAt: now,
        },
      });
  });

  console.log(`Synced ${concepts.length} concepts to DB (version hash=${catalogHash.slice(0, 12)}).`);
}

async function main(): Promise<void> {
  const cmd = process.argv[2] ?? "verify";

  if (cmd === "build") {
    buildCatalogFiles();
    return;
  }

  if (cmd === "verify") {
    const res = verifyCatalogFiles();
    console.log(JSON.stringify(res.summary, null, 2));
    if (!res.ok) {
      process.exit(1);
    }
    return;
  }

  if (cmd === "report") {
    const res = verifyCatalogFiles();
    console.log("=== Catalog Report ===");
    console.log(JSON.stringify(res.summary, null, 2));
    return;
  }

  if (cmd === "gaps") {
    await showGaps();
    return;
  }

  if (cmd === "sync") {
    await syncToDb();
    return;
  }

  console.error(`Unknown command: ${cmd}. Use: build | verify | report | gaps | sync`);
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
