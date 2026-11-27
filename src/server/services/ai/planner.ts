import "server-only";
import {
  normalize,
  search,
  type ConceptRecord,
} from "@/shared/lib/grounding/visual-retrieval";
import { searchAssets } from "../assets/retrieval";
import { getConceptIndex } from "../catalog";
import { ingestSource } from "./ingest";
import type { PDFExtractionResult } from "./pdf";
import type { GenerateLessonOptions } from "./types";

export interface CandidateAsset {
  asset_id: string;
  display_name: string;
  description: string;
  visual_type: "pictogram" | "illustration";
  file_path: string;
}

export interface LessonPlan {
  subject: string;
  topic: string;
  normalizedText: string;
  selectedText: string;
  hasSourceText: boolean;
  isScannedOrEmpty: boolean;
  errorMessage?: string;
  sentences: string[];
  concepts: string[];
  vocabulary: ConceptRecord[];
  vocabularyLines: string[];
  domains: string[];
  recommendedCardCount: number;
  requestedCardCount: number;
  candidateAssets: CandidateAsset[];
  warnings: string[];
}

export const ID_STOP_WORDS = new Set([
  "yang", "dan", "di", "ke", "dari", "untuk", "pada", "dengan", "ini", "itu",
  "atau", "ada", "adalah", "akan", "bisa", "dapat", "kami", "kita", "mereka",
  "saya", "kamu", "dia", "dalam", "juga", "agar", "supaya", "oleh", "saat",
  "ketika", "tentang", "cara", "belajar", "mengenal", "hari", "setiap",
  "bersama", "teliti", "gembira", "jelas", "sekitar", "penting", "contoh",
  "materi", "bagian", "hal", "secara", "yaitu", "seperti", "antara", "karena",
  "lebih", "sangat", "memiliki", "perhatikan", "menyebutkan", "memahami",
  "mengingat", "kembali", "berlatih", "menunjukkan", "mempraktikkan",
  "sebagai", "setelah", "sebelum", "sudah", "belum", "hanya", "semua",
  "banyak", "sedikit", "merupakan", "tersebut", "bukan", "tidak", "mana",
  "kedua", "ketiga", "pertama", "berikut", "membuat", "menjaga", "melakukan",
  "memberi", "mempunyai", "menjadi", "menggunakan", "memakai", "sebutkan",
  "ceritakan", "amati", "mengamati", "tetap", "masih", "sambil", "sampai",
  "menuju",
]);

const HYGIENE_CONTEXT_RE =
  /\b(kebersihan|cuci\s+tangan|mencuci\s+tangan|mandi|sabun|sikat\s+gigi|menyikat\s+gigi|pasta\s+gigi|gosok\s+tangan|keran|handuk|toilet|wc|sampo)\b/i;

const HYGIENE_CONCEPT_ID_RE =
  /(?:sabun|soap|cuci[-_ ]?tangan|gosok[-_ ]?tangan|handuk|sikat[-_ ]?gigi|pasta[-_ ]?gigi|keran|flush[-_ ]?the[-_ ]?toilet|bilas|sampo)/i;

export function isHygieneContext(topic: string, text: string): boolean {
  return HYGIENE_CONTEXT_RE.test(`${topic} ${text}`);
}

export function isHygieneConcept(concept: ConceptRecord): boolean {
  if (concept.groupId === "kebersihan") return true;
  return (
    HYGIENE_CONCEPT_ID_RE.test(concept.id) ||
    HYGIENE_CONCEPT_ID_RE.test(concept.labelNorm || normalize(concept.label))
  );
}

export function isNoisyConcept(concept: ConceptRecord): boolean {
  const labelNorm = concept.labelNorm || normalize(concept.label);
  return /\b\d{4,}\b/.test(labelNorm);
}

const PDF_NOISE_LINE_PATTERNS = [
  /^(?:halaman|hal\.?|page|pg\.?)\s*\d+(?:\s*(?:dari|of|\/)\s*\d+)?$/i,
  /^\d+\s*(?:\/\s*\d+)?$/,
  /^[-_=*•·\s]{2,}$/,
  /^-\s*\d+\s*-$/,
  /^https?:\/\/\S+$/i,
  /^(?:daftar\s+isi|kata\s+pengantar|lampiran|daftar\s+pustaka)$/i,
  /^bab\s+(?:[ivxlcdm]+|\d+)$/i,
];

export function isNoisyPdfLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length < 3) return true;
  if (!/[a-zA-Z0-9]/.test(trimmed)) return true;
  return PDF_NOISE_LINE_PATTERNS.some((pat) => pat.test(trimmed));
}

function splitLongSentence(sentence: string): string[] {
  if (sentence.length <= 115) return [sentence];
  const clauseParts = sentence
    .split(/[;,]+\s*/)
    .map((p) => p.trim())
    .filter((p) => p.length > 5);

  const chunks: string[] = [];
  for (const part of clauseParts) {
    if (part.length <= 115) {
      chunks.push(part);
    } else {
      const words = part.split(/\s+/);
      for (let i = 0; i < words.length; i += 12) {
        const slice = words.slice(i, i + 12).join(" ").trim();
        if (slice.length > 5) chunks.push(slice);
      }
    }
  }
  return chunks;
}

export function normalizeSourceText(rawText: string): string {
  return rawText
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter((l) => !isNoisyPdfLine(l))
    .join("\n")
    .trim();
}

export function splitSourceIntoSentences(
  rawText: string,
  maxSentences = 30
): string[] {
  const normalized = normalizeSourceText(rawText);
  if (!normalized) return [];

  const joined = normalized.replace(/\n+/g, " ");
  const rawSegments = joined
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 6 && /[a-zA-Z0-9]/.test(s));

  const expanded: string[] = [];
  for (const seg of rawSegments) {
    for (const part of splitLongSentence(seg)) {
      const wordCount = part.split(/\s+/).filter(Boolean).length;
      if (wordCount >= 2 && part.length >= 6) {
        expanded.push(part);
      }
    }
  }

  const seen = new Set<string>();
  const unique: string[] = [];
  for (const item of expanded) {
    const key = item.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      const formatted = item.charAt(0).toUpperCase() + item.slice(1);
      unique.push(formatted.endsWith(".") ? formatted : `${formatted}.`);
    }
    if (unique.length >= maxSentences) break;
  }

  return unique;
}

export function inferSubject(topic: string, text: string): string {
  const combined = `${topic} ${text}`.toLowerCase();
  if (/(tambah|kurang|kali|bagi|hitung|angka|pecahan|bangun|matematika|segitiga|lingkaran)/.test(combined)) {
    return "Matematika";
  }
  if (/(tumbuhan|akar|batang|daun|hewan|pencernaan|pernapasan|cuaca|matahari|energi|ipa|air|bumi)/.test(combined)) {
    return "IPA";
  }
  if (/(pasar|keluarga|tetangga|profesi|peta|lingkungan|desa|kota|ips|gotong royong|pancasila)/.test(combined)) {
    return "IPS";
  }
  if (/(cuci tangan|sikat gigi|mandi|makanan bergizi|sehat|olahraga|tidur|kebersihan)/.test(combined)) {
    return "Kesehatan dan Kebersihan";
  }
  return "Bahasa Indonesia";
}

export function extractConcepts(
  topic: string,
  sentences: string[],
  maxConcepts = 12
): string[] {
  const freq = new Map<string, number>();
  const addTokens = (str: string, weight: number) => {
    const words = str
      .toLowerCase()
      .split(/\s+/)
      .map((w) => w.replace(/[^a-zA-Z0-9-]/g, ""))
      .filter((w) => w.length >= 3 && !ID_STOP_WORDS.has(w));
    for (const w of words) {
      freq.set(w, (freq.get(w) ?? 0) + weight);
    }
  };

  if (topic.trim()) {
    addTokens(topic, 3);
  }
  for (const s of sentences) {
    addTokens(s, 1);
  }

  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxConcepts)
    .map(([word]) => word);
}

export function retrieveCandidateAssets(
  topic: string,
  concepts: string[],
  maxTotal = 24
): CandidateAsset[] {
  const seen = new Set<string>();
  const candidates: CandidateAsset[] = [];
  const allowHygiene = isHygieneContext(topic, concepts.join(" "));

  const addHits = (query: string, limit: number, minScore: number) => {
    if (!query.trim()) return;
    const hits = searchAssets(query, {
      limit,
      minScore,
      onlyAvailable: true,
      deduplicateConcepts: true,
    });
    for (const hit of hits) {
      if (seen.has(hit.asset.asset_id)) continue;
      if (!allowHygiene && HYGIENE_CONCEPT_ID_RE.test(hit.asset.asset_id)) {
        continue;
      }
      seen.add(hit.asset.asset_id);
      candidates.push({
        asset_id: hit.asset.asset_id,
        display_name: hit.asset.display_name,
        description: hit.asset.description,
        visual_type: hit.asset.visual_type,
        file_path: hit.asset.file_path,
      });
      if (candidates.length >= maxTotal) break;
    }
  };

  if (topic.trim()) {
    addHits(topic, 8, 12);
  }

  for (const concept of concepts.slice(0, 10)) {
    if (candidates.length >= maxTotal) break;
    addHits(concept, 4, 14);
  }

  return candidates.slice(0, maxTotal);
}

export function planLessonContent(
  options: GenerateLessonOptions,
  pdfResult?: PDFExtractionResult
): LessonPlan {
  const warnings: string[] = [];
  const requestedCardCount = Math.min(15, Math.max(1, options.cardCount ?? 6));

  const ingest = ingestSource({
    sourceType: options.sourceType,
    topic: options.topic,
    text: options.text,
    subject: options.subject,
    pdfResult,
  });
  warnings.push(...ingest.warnings);

  if (!pdfResult && options.sourceType === "pdf" && !options.text?.trim()) {
    warnings.push(
      "Teks PDF tidak dapat diekstrak secara penuh; materi disusun dari topik yang diberikan."
    );
  }

  const normalizedText = ingest.cleanedText || normalizeSourceText(options.text || "");
  const selectedText = ingest.selectedText || normalizedText;
  const sentences = splitSourceIntoSentences(selectedText, 30);
  const topic = (options.topic || "").trim();
  const subject =
    options.subject && options.subject !== "Otomatis"
      ? options.subject
      : inferSubject(topic, normalizedText);
  const concepts = extractConcepts(topic, sentences, 12);
  const allowHygiene = isHygieneContext(topic, selectedText || normalizedText);

  const filterVocabulary = (items: ConceptRecord[]): ConceptRecord[] =>
    items.filter(
      (c) =>
        c.status === "active" &&
        Boolean(c.assetUrl || c.assetId) &&
        !isNoisyConcept(c) &&
        (allowHygiene || !isHygieneConcept(c))
    );

  const vocabulary = filterVocabulary(ingest.vocabulary);

  // If ingest vocabulary is sparse (e.g. topic-only prompt), supplement from verified Indonesian ConceptIndex
  if (vocabulary.length < 4 && (topic || concepts.length > 0)) {
    const index = getConceptIndex();
    const seenIds = new Set(vocabulary.map((v) => v.id));
    const queries = [topic, ...concepts.slice(0, 8)].filter(Boolean);
    for (const q of queries) {
      if (vocabulary.length >= 24) break;
      const hits = search(q, index, {
        limit: 6,
        minScore: 40,
        requireImage: true,
        preferDomains: ingest.domains,
      });
      for (const hit of hits) {
        if (seenIds.has(hit.concept.id)) continue;
        if (isNoisyConcept(hit.concept)) continue;
        if (!allowHygiene && isHygieneConcept(hit.concept)) continue;
        if (
          (hit.matchedOn.includes("exact_en") || hit.matchedOn.includes("en_tokens")) &&
          !hit.matchedOn.includes("exact_label") &&
          !hit.matchedOn.includes("exact_synonym") &&
          !hit.matchedOn.includes("raw_tokens")
        ) {
          continue;
        }
        seenIds.add(hit.concept.id);
        vocabulary.push(hit.concept);
        if (vocabulary.length >= 24) break;
      }
    }
  }

  let recommendedCardCount = requestedCardCount;
  if (normalizedText.length >= 10 && sentences.length > 0) {
    const supportedCount = Math.max(sentences.length, Math.min(concepts.length, sentences.length + 1));
    if (supportedCount < requestedCardCount && sentences.length < 4 && requestedCardCount >= 5) {
      recommendedCardCount = Math.max(2, supportedCount);
      warnings.push(
        `Materi sumber hanya memuat ${supportedCount} konsep utama, lebih sedikit dari ${requestedCardCount} kartu yang diminta. Sebagian kartu diringkas agar tidak berulang.`
      );
    }
  }

  const vocabularyLines = vocabulary.map(
    (c) => `${c.id}|${c.label}|${c.groupId ?? "umum"}`
  );

  const candidateAssets =
    vocabulary.length > 0
      ? vocabulary.slice(0, 24).map((c) => ({
          asset_id: c.id,
          display_name: c.label,
          description: c.synonyms.slice(0, 3).join(", ") || c.label,
          visual_type: "pictogram" as const,
          file_path: c.assetUrl || "",
        }))
      : retrieveCandidateAssets(topic, concepts, 24);

  return {
    subject,
    topic: topic || "Materi Pembelajaran",
    normalizedText,
    selectedText,
    hasSourceText: ingest.hasSourceText,
    isScannedOrEmpty: ingest.isScannedOrEmpty,
    errorMessage: ingest.errorMessage,
    sentences,
    concepts,
    vocabulary,
    vocabularyLines,
    domains: ingest.domains,
    recommendedCardCount,
    requestedCardCount,
    candidateAssets,
    warnings: Array.from(new Set(warnings)),
  };
}
