import "server-only";
import { extractText } from "unpdf";

export interface PDFExtractionResult {
  text: string;
  totalPages: number;
  isScanned: boolean;
  preview: string;
}

export async function extractTextFromPDF(
  buffer: Buffer | Uint8Array,
  maxPages: number = 10
): Promise<PDFExtractionResult> {
  const uint8 = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);

  try {
    const result = await extractText(uint8, { mergePages: false });
    const pages = Array.isArray(result.text) ? result.text : [result.text];
    const totalPages = result.totalPages || pages.length;

    // Ambil maksimal maxPages halaman
    const selectedPages = pages.slice(0, maxPages);
    const combinedText = selectedPages.join("\n\n").trim();

    // Deteksi dokumen hasil pindai (kurang dari 200 karakter per halaman rata-rata)
    const avgCharsPerPage =
      selectedPages.length > 0 ? combinedText.length / selectedPages.length : 0;
    const isScanned = avgCharsPerPage < 200;

    // Pratinjau 300 karakter pertama agar guru bisa memverifikasi
    const preview = combinedText.slice(0, 300);

    return {
      text: combinedText,
      totalPages,
      isScanned,
      preview,
    };
  } catch (error) {
    throw new Error(
      "Gagal mengekstrak teks dari PDF. Berkas mungkin terenkripsi atau rusak: " +
        (error instanceof Error ? error.message : String(error))
    );
  }
}
