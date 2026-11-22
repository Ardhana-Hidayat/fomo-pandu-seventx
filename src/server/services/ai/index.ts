import "server-only";
import { extractTextFromPDF } from "./pdf";
import { generateWithGemini } from "./gemini";
import type { GenerateLessonOptions, GenerateLessonResult } from "./types";

export * from "./types";
export * from "./prompts";
export * from "./pdf";
export * from "./fallback";
export * from "./gemini";

export async function generateLessonContent(
  options: GenerateLessonOptions
): Promise<GenerateLessonResult> {
  let extractedText: string | undefined;
  let isScannedNotice = false;

  // Jika sumber berupa PDF
  if (
    options.sourceType === "pdf" &&
    options.fileBuffer &&
    (options.mimeType === "application/pdf" || options.mimeType === "pdf")
  ) {
    try {
      const pdfResult = await extractTextFromPDF(options.fileBuffer);
      extractedText = pdfResult.text;
      isScannedNotice = pdfResult.isScanned;
    } catch (err) {
      console.warn("Ekstraksi PDF gagal:", err);
    }
  }

  return generateWithGemini(options, extractedText, isScannedNotice);
}
