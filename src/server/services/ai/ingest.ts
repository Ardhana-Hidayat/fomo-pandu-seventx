import "server-only";
import {
  normalize,
  rawTokens,
  selectVocabulary,
  stem,
  type ConceptIndex,
  type ConceptRecord,
} from "@/shared/lib/grounding/visual-retrieval";
import { getConceptIndex } from "../catalog";
import type { PDFExtractionResult } from "./pdf";

export const SOURCE_TOKEN_BUDGET = 3000;
export const CHARS_PER_TOKEN = 3.5;
export const SOURCE_CHAR_BUDGET = Math.floor(
  SOURCE_TOKEN_BUDGET * CHARS_PER_TOKEN
); // 10,500 chars
export const MAX_VOCABULARY_ITEMS = 120;

export const SUBJECT_TO_DOMAINS: Record<string, string[]> = {
  "Bahasa Indonesia": ["bahasa", "sekolah"],
  Matematika: ["matematika", "sekolah"],
  IPA: ["alam-cuaca", "tubuh-kesehatan", "hewan", "tumbuhan-makanan"],
  IPS: ["rumah-tempat", "keluarga-sosial", "keterampilan-hidup"],
  "Pendidikan Pancasila": ["keluarga-sosial", "sekolah"],
  "Seni dan Budaya": ["seni-olahraga"],
  "Pendidikan Jasmani": ["seni-olahraga", "tubuh-kesehatan"],
  "Kesehatan dan Kebersihan": ["tubuh-kesehatan", "bina-diri"],
  "Bina Diri": ["bina-diri", "keterampilan-hidup"],
};

const PAGE_NUMBER_RE =
  /^(?:halaman|hal\.?|page|pg\.?)\s*\d+(?:\s*(?:dari|of|\/)\s*\d+)?$/i;
const STANDALONE_NUMBER_RE = /^(?:-\s*)?\d+(?:\s*\/\s*\d+)?(?:\s*-)?$/;
const SEPARATOR_LINE_RE = /^[-_=*•·\s]{2,}$/;
const URL_ONLY_RE = /^https?:\/\/\S+$/i;
const COPYRIGHT_RE =
  /(?:©|\bcopyright\b|\bhak\s+cipta\b|\ball\s+rights\s+reserved\b|\bisbn\b\s*[:\d-]+)/i;
const BOILERPLATE_SECTION_RE =
  /^(?:daftar\s+isi|kata\s+pengantar|lampiran|daftar\s+pustaka)$/i;

export interface IngestSourceOptions {
  sourceType: "topik" | "teks" | "pdf" | "foto";
  topic?: string;
  text?: string;
  subject?: string;
  pdfResult?: PDFExtractionResult;
  conceptIndex?: ConceptIndex;
  maxVocabulary?: number;
}

export interface IngestSourceResult {
  cleanedText: string;
  selectedText: string;
  hasSourceText: boolean;
  isScannedOrEmpty: boolean;
  errorMessage?: string;
  vocabulary: ConceptRecord[];
  vocabularyLines: string[];
  domains: string[];
  warnings: string[];
}

/**
 * Clean extracted PDF or manual text:
 * - Fix hyphenated line breaks across newlines
 * - Remove page numbers, copyright lines, URLs, and repeated headers/footers
 * - Preserve headings and list structure
 */
export function cleanSourceText(rawText: string): string {
  if (!rawText) return "";

  // Fix hyphenated line-breaks (e.g. "pem-\nbelajaran" -> "pembelajaran")
  const dehyphenated = rawText
    .replace(/\r\n/g, "\n")
    .replace(/([a-zA-Z])-\n([a-zA-Z])/g, "$1$2");

  const rawLines = dehyphenated.split("\n");

  // Detect repeated short header/footer lines appearing >= 3 times
  const lineFreq = new Map<string, number>();
  for (const rawLine of rawLines) {
    const trimmed = rawLine.replace(/\s+/g, " ").trim();
    if (trimmed.length >= 4 && trimmed.length <= 80) {
      const key = trimmed.toLowerCase();
      lineFreq.set(key, (lineFreq.get(key) ?? 0) + 1);
    }
  }

  const repeatedBoilerplate = new Set<string>();
  for (const [key, count] of lineFreq.entries()) {
    if (count >= 3 && !/^[-*•\d]/.test(key)) {
      repeatedBoilerplate.add(key);
    }
  }

  const cleanedLines: string[] = [];
  for (const rawLine of rawLines) {
    const line = rawLine.replace(/[ \t]+/g, " ").trim();
    if (!line) {
      if (cleanedLines.length > 0 && cleanedLines[cleanedLines.length - 1] !== "") {
        cleanedLines.push("");
      }
      continue;
    }

    if (
      PAGE_NUMBER_RE.test(line) ||
      STANDALONE_NUMBER_RE.test(line) ||
      SEPARATOR_LINE_RE.test(line) ||
      URL_ONLY_RE.test(line) ||
      COPYRIGHT_RE.test(line) ||
      BOILERPLATE_SECTION_RE.test(line)
    ) {
      continue;
    }

    if (repeatedBoilerplate.has(line.toLowerCase())) {
      continue;
    }

    cleanedLines.push(line);
  }

  return cleanedLines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function isHeadingLine(para: string): boolean {
  const trimmed = para.trim();
  if (!trimmed || trimmed.length > 90) return false;
  if (/^(?:#{1,4}\s+|bab\s+\d+|bagian\s+\d+|\d+\.\s+[A-Z])/i.test(trimmed)) {
    return true;
  }
  const words = trimmed.split(/\s+/);
  return words.length <= 7 && !/[.!?]$/.test(trimmed);
}

/**
 * Score paragraphs by catalog concept hits, headings, and position,
 * then select the highest-scoring paragraphs within SOURCE_CHAR_BUDGET
 * while preserving their original document order.
 */
export function selectRelevantParagraphs(
  cleanedText: string,
  index: ConceptIndex,
  charBudget = SOURCE_CHAR_BUDGET
): string {
  const trimmed = cleanedText.trim();
  if (!trimmed) return "";
  if (trimmed.length <= charBudget) return trimmed;

  const paragraphs = trimmed
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (paragraphs.length <= 1) {
    // Single large block: split by line or sentence boundary within budget
    const lines = trimmed.split("\n").filter(Boolean);
    if (lines.length > 1) {
      const kept: string[] = [];
      let total = 0;
      for (const line of lines) {
        if (total + line.length + 1 > charBudget) break;
        kept.push(line);
        total += line.length + 1;
      }
      return kept.join("\n");
    }
    return trimmed.slice(0, charBudget);
  }

  const scored = paragraphs.map((para, idx) => {
    const tokens = rawTokens(para);
    let conceptHits = 0;
    const seenStems = new Set<string>();

    for (const tok of tokens) {
      const st = stem(tok);
      if (seenStems.has(st)) continue;
      if (index.invertedRaw.has(tok) || index.invertedStem.has(st)) {
        seenStems.add(st);
        conceptHits += 1;
      }
    }

    const headingBonus = isHeadingLine(para) ? 4 : 0;
    const listBonus = /^[-*•\d]+[.)]?\s+/m.test(para) ? 2 : 0;
    const positionBonus = Math.max(0, 3 - (idx / paragraphs.length) * 3);
    const score = conceptHits * 2 + headingBonus + listBonus + positionBonus;

    return { idx, para, score };
  });

  const byScore = [...scored].sort((a, b) => b.score - a.score);
  const chosenIndices = new Set<number>();
  let usedChars = 0;

  for (const item of byScore) {
    const cost = item.para.length + 2;
    if (usedChars + cost <= charBudget || chosenIndices.size === 0) {
      chosenIndices.add(item.idx);
      usedChars += cost;
    }
    if (usedChars >= charBudget) break;
  }

  return scored
    .filter((item) => chosenIndices.has(item.idx))
    .map((item) => item.para)
    .join("\n\n");
}

/**
 * Resolve catalog domains from explicit subject or inferred topic/text.
 */
export function resolveDomainsForSubject(
  subject?: string,
  topicAndText = ""
): string[] {
  if (subject && subject !== "Otomatis" && SUBJECT_TO_DOMAINS[subject]) {
    return SUBJECT_TO_DOMAINS[subject]!;
  }

  const lower = normalize(topicAndText);
  const domains: string[] = [];
  if (/\b(tambah|kurang|kali|bagi|hitung|angka|pecahan|bangun|segitiga|lingkaran)\b/.test(lower)) {
    domains.push("matematika");
  }
  if (/\b(tumbuhan|akar|batang|daun|hewan|kucing|ikan|burung|cuaca|hujan|matahari|bumi)\b/.test(lower)) {
    domains.push("alam-cuaca", "hewan", "tumbuhan-makanan");
  }
  if (/\b(pasar|keluarga|tetangga|profesi|peta|desa|kota|gotong royong|pancasila)\b/.test(lower)) {
    domains.push("rumah-tempat", "keluarga-sosial");
  }
  if (/\b(cuci tangan|sikat gigi|mandi|sabun|sehat|dokter|sakit|olahraga|tidur)\b/.test(lower)) {
    domains.push("tubuh-kesehatan", "bina-diri");
  }
  if (/\b(buku|pensil|kelas|sekolah|huruf|kata|baca|tulis)\b/.test(lower)) {
    domains.push("sekolah", "bahasa");
  }

  return Array.from(new Set(domains));
}

/**
 * Format ConceptRecord[] into compact `id|label|group` lines for closed-vocabulary prompting.
 */
export function formatVocabularyLines(concepts: ConceptRecord[]): string[] {
  return concepts.map(
    (c) => `${c.id}|${c.label}|${c.groupId ?? "umum"}`
  );
}

/**
 * Full B3.A-C ingest pipeline: clean text, detect scanned/empty PDF,
 * score & select paragraphs within SOURCE_TOKEN_BUDGET, and select closed vocabulary.
 */
export function ingestSource(options: IngestSourceOptions): IngestSourceResult {
  const index = options.conceptIndex ?? getConceptIndex();
  const warnings: string[] = [];

  const rawText = options.pdfResult?.text ?? options.text ?? "";
  const cleanedText = cleanSourceText(rawText);

  if (options.sourceType === "pdf") {
    if (options.pdfResult && options.pdfResult.totalPages > 10) {
      warnings.push(
        `Dokumen PDF memiliki ${options.pdfResult.totalPages} halaman. Hanya 10 halaman pertama yang diproses.`
      );
    }
    const isScanned = Boolean(options.pdfResult?.isScanned) || cleanedText.length < 20;
    if (isScanned) {
      return {
        cleanedText,
        selectedText: "",
        hasSourceText: false,
        isScannedOrEmpty: true,
        errorMessage:
          "PDF terlihat seperti hasil pindai atau tidak memiliki teks yang dapat dibaca. Unggah PDF berbasis teks atau tempelkan teks materi secara manual.",
        vocabulary: [],
        vocabularyLines: [],
        domains: [],
        warnings: [
          ...warnings,
          "PDF terlihat seperti hasil pindai atau memiliki sedikit teks.",
        ],
      };
    }
  }

  const hasSourceText = cleanedText.length >= 20;
  const selectedText = hasSourceText
    ? selectRelevantParagraphs(cleanedText, index, SOURCE_CHAR_BUDGET)
    : "";

  const vocabQuery = [options.topic ?? "", selectedText || cleanedText]
    .filter(Boolean)
    .join(" ");
  const domains = resolveDomainsForSubject(options.subject, vocabQuery);
  const vocabulary = selectVocabulary(vocabQuery, index, {
    limit: options.maxVocabulary ?? MAX_VOCABULARY_ITEMS,
    domains: domains.length > 0 ? domains : undefined,
  });

  return {
    cleanedText,
    selectedText,
    hasSourceText,
    isScannedOrEmpty: false,
    vocabulary,
    vocabularyLines: formatVocabularyLines(vocabulary),
    domains,
    warnings,
  };
}
