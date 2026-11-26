import "server-only";
import { extractTextFromPDF, type PDFExtractionResult } from "./pdf";
import { planLessonContent } from "./planner";
import { generateWithGemini } from "./gemini";
import type { GenerateLessonOptions, GenerateLessonResult } from "./types";

export * from "./types";
export * from "./prompts";
export * from "./pdf";
export * from "./planner";
export * from "./validator";
export * from "./fallback";
export * from "./gemini";

export async function generateLessonContent(
  options: GenerateLessonOptions
): Promise<GenerateLessonResult> {
  let pdfResult: PDFExtractionResult | undefined;
  let extractedText: string | undefined;
  let isScannedNotice = false;

  // Jika sumber berupa PDF
  if (
    options.sourceType === "pdf" &&
    options.fileBuffer &&
    (options.mimeType === "application/pdf" || options.mimeType === "pdf")
  ) {
    try {
      pdfResult = await extractTextFromPDF(options.fileBuffer);
      extractedText = pdfResult.text;
      isScannedNotice = pdfResult.isScanned;
    } catch (err) {
      console.warn("Ekstraksi PDF gagal:", err instanceof Error ? err.message : err);
    }
  }

  const plan = planLessonContent(options, pdfResult);
  return generateWithGemini(options, extractedText, isScannedNotice, plan);
}
