import fs from "node:fs";
import path from "node:path";
import {
  imageFit,
  normalize,
  search,
} from "../../src/shared/lib/grounding/visual-retrieval";
import { getConceptIndex } from "../../src/server/services/catalog";
import { ingestSource } from "../../src/server/services/ai/ingest";
import { sanitizeAndValidateLesson } from "../../src/server/services/ai/validator";
import {
  ID_STOP_WORDS,
  splitSourceIntoSentences,
} from "../../src/server/services/ai/planner";
import type { GeneratedLesson, LessonKind } from "../../src/server/services/ai/types";

interface GoldenInput {
  id: string;
  subject: string;
  topic: string;
  text: string;
  lessonKind: LessonKind;
  isHygiene: boolean;
  expectMissingTerms: boolean;
}

const HYGIENE_ASSET_PATTERNS = [
  /keran/i,
  /sabun/i,
  /handuk/i,
  /cuci[-_]?tangan/i,
  /\bair\b/i,
  /arasaac-34846/i,
  /arasaac-8975/i,
  /arasaac-2593/i,
];

function extractPrimaryTerm(sentence: string): string {
  const words = sentence
    .split(/\s+/)
    .map((w) => w.replace(/[^a-zA-Z0-9-]/g, "").toLowerCase())
    .filter((w) => w.length >= 3 && !ID_STOP_WORDS.has(w));
  return words[0] || "materi";
}

function main(): void {
  const goldenPath = path.join(process.cwd(), "data", "golden-inputs.json");
  const inputs = JSON.parse(
    fs.readFileSync(goldenPath, "utf8")
  ) as GoldenInput[];

  if (inputs.length < 30) {
    console.error(`FAIL: Expected >= 30 golden inputs, got ${inputs.length}`);
    process.exit(1);
  }

  const index = getConceptIndex();
  let totalCards = 0;
  let totalAttachedImages = 0;
  let imageFitFailures = 0;
  let hygieneViolations = 0;
  const assetCounts = new Map<string, number>();
  const distinctAssets = new Set<string>();
  const missingChecks: Record<string, { missingCount: number; warnings: number; gaps: number }> = {};

  console.log(`\nRunning C1 Golden Verification on ${inputs.length} inputs...\n`);

  for (const item of inputs) {
    const ingest = ingestSource({
      sourceType: "teks",
      topic: item.topic,
      text: item.text,
      subject: item.subject,
      conceptIndex: index,
    });

    const sentences = splitSourceIntoSentences(ingest.selectedText || item.text, 6);

    // Simulate AI choosing a concept from the closed vocabulary (or null if none fits)
    const stubLesson: GeneratedLesson = {
      title: item.topic,
      lesson_kind: item.lessonKind,
      cards: sentences.map((sentence) => {
        const term = extractPrimaryTerm(sentence);
        const vocabMatch = ingest.vocabulary.find((v) => {
          const vNorm = normalize(v.label);
          return (
            vNorm === term ||
            vNorm.split(" ").includes(term) ||
            (v.synonyms ?? []).some((s) => normalize(s) === term)
          );
        });

        // Fallback search within closed vocabulary if exact label match not found
        const fallbackHit = !vocabMatch
          ? search(term, index, {
              limit: 3,
              minScore: 45,
              requireImage: true,
              preferDomains: ingest.domains,
            }).find((h) => imageFit(sentence, h.concept, { keyTerms: [term] }).fit)
          : undefined;

        const chosen = vocabMatch ?? fallbackHit?.concept ?? null;
        return {
          text: sentence,
          key_terms: [term],
          concept: chosen ? chosen.id : null,
          quote: sentence.replace(/\.$/, ""),
          image: { keyword_id: term, keyword_en: term, alt: "" },
        };
      }),
      questions: [],
    };

    const validated = sanitizeAndValidateLesson(stubLesson, {
      questionCount: 3,
      optionCount: 3,
      exerciseType: "both",
      sourceText: item.text,
      subject: item.subject,
      lessonId: item.id,
      preferDomains: ingest.domains,
      conceptIndex: index,
      skipRecordVisualGap: true,
      rebuildQuiz: true,
    });

    let itemImages = 0;
    let itemMissing = 0;

    for (const card of validated.lesson.cards) {
      totalCards += 1;
      const assetId = card.visual?.asset_id;
      if (assetId) {
        totalAttachedImages += 1;
        itemImages += 1;
        distinctAssets.add(assetId);
        assetCounts.set(assetId, (assetCounts.get(assetId) ?? 0) + 1);

        // 1. Assert imageFit = cocok on 100% of attached images
        const concept =
          (card.concept ? index.byId.get(card.concept) : undefined) ??
          index.concepts.find((c) => c.assetId === assetId || c.id === assetId);
        if (!concept || !imageFit(card.text, concept, { keyTerms: card.key_terms }).fit) {
          imageFitFailures += 1;
          console.error(
            `FAIL [${item.id}] imageFit failed for "${card.text}" -> ${assetId}`
          );
        }

        // 2. Assert 0 hygiene images on non-hygiene inputs
        if (!item.isHygiene) {
          const label = concept?.label ?? "";
          if (
            HYGIENE_ASSET_PATTERNS.some(
              (re) => re.test(assetId) || re.test(label)
            )
          ) {
            hygieneViolations += 1;
            console.error(
              `FAIL [${item.id}] hygiene image "${assetId}" (${label}) leaked on non-hygiene topic "${item.topic}"`
            );
          }
        }
      } else {
        itemMissing += 1;
      }
    }

    if (item.id === "g09" || item.id === "g12") {
      missingChecks[item.id] = {
        missingCount: itemMissing,
        warnings: validated.warnings.length,
        gaps: validated.visualGaps.length,
      };
    }

    console.log(
      `  ${item.id.padEnd(4)} | ${item.subject.padEnd(24)} | cards=${validated.lesson.cards.length} img=${itemImages} missing=${itemMissing} quiz=${validated.lesson.questions.length}`
    );
  }

  let maxAssetShare = 0;
  let maxAssetId = "";
  for (const [assetId, count] of assetCounts.entries()) {
    const share = totalCards > 0 ? count / totalCards : 0;
    if (share > maxAssetShare) {
      maxAssetShare = share;
      maxAssetId = assetId;
    }
  }

  console.log("\n--- C1 Verification Metrics ---");
  console.log(`Total inputs:          ${inputs.length}`);
  console.log(`Total cards:           ${totalCards}`);
  console.log(`Attached images:       ${totalAttachedImages}`);
  console.log(`imageFit failures:     ${imageFitFailures}`);
  console.log(`Hygiene leaks:         ${hygieneViolations}`);
  console.log(`Distinct assets used:  ${distinctAssets.size} (min 40)`);
  console.log(
    `Max single asset:      ${(maxAssetShare * 100).toFixed(2)}% (${maxAssetId}, max 25%)`
  );
  console.log(`g09 missing check:     ${JSON.stringify(missingChecks["g09"])}`);
  console.log(`g12 missing check:     ${JSON.stringify(missingChecks["g12"])}`);

  const failures: string[] = [];
  if (imageFitFailures > 0) failures.push(`imageFitFailures=${imageFitFailures}`);
  if (hygieneViolations > 0) failures.push(`hygieneViolations=${hygieneViolations}`);
  if (maxAssetShare > 0.25) {
    failures.push(`maxAssetShare=${(maxAssetShare * 100).toFixed(2)}% > 25%`);
  }
  if (distinctAssets.size < 40) {
    failures.push(`distinctAssets=${distinctAssets.size} < 40`);
  }
  for (const gid of ["g09", "g12"]) {
    const chk = missingChecks[gid];
    if (!chk || chk.missingCount === 0 || chk.warnings === 0 || chk.gaps === 0) {
      failures.push(`${gid} did not record missing terms + warnings + visual_gaps`);
    }
  }

  if (failures.length > 0) {
    console.error("\nC1 VERIFICATION FAILED:", failures.join("; "));
    process.exit(1);
  }

  console.log("\nC1 VERIFICATION PASSED: All thresholds met.\n");
}

main();
