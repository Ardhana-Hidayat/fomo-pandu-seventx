import "server-only";
import sharp from "sharp";
import { ok, err, type Result, makeAppError } from "@/shared/lib/result";

export interface SanitizeImageOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

export interface SanitizedImage {
  buffer: Buffer;
  format: "webp";
  width: number;
  height: number;
  bytes: number;
}

export async function sanitizeImage(
  inputBuffer: Buffer | Uint8Array,
  options: SanitizeImageOptions = {}
): Promise<Result<SanitizedImage>> {
  const { maxWidth = 1200, maxHeight = 900, quality = 85 } = options;

  try {
    const buffer = Buffer.isBuffer(inputBuffer)
      ? inputBuffer
      : Buffer.from(inputBuffer);

    if (buffer.length === 0) {
      return err(
        makeAppError("VALIDATION_ERROR", "Berkas gambar kosong")
      );
    }

    const image = sharp(buffer);
    const metadata = await image.metadata();

    if (!metadata.format) {
      return err(
        makeAppError(
          "VALIDATION_ERROR",
          "Format berkas tidak dikenali sebagai gambar valid"
        )
      );
    }

    const supportedFormats = ["jpeg", "png", "webp", "gif", "avif", "tiff"];
    if (!supportedFormats.includes(metadata.format)) {
      return err(
        makeAppError(
          "VALIDATION_ERROR",
          `Format gambar '${metadata.format}' tidak didukung. Harap gunakan JPEG, PNG, atau WebP.`
        )
      );
    }

    // Auto-rotate sesuai orientasi EXIF, potong ke rasio 4:3 (1200x900), dan buang metadata EXIF
    const processedBuffer = await image
      .rotate()
      .resize(maxWidth, maxHeight, {
        fit: "cover",
        position: "center",
      })
      .webp({ quality, effort: 4 })
      .toBuffer();

    const outputMeta = await sharp(processedBuffer).metadata();

    return ok({
      buffer: processedBuffer,
      format: "webp",
      width: outputMeta.width ?? maxWidth,
      height: outputMeta.height ?? maxHeight,
      bytes: processedBuffer.length,
    });
  } catch (error) {
    return err(
      makeAppError(
        "PROCESSING_ERROR",
        "Gagal memproses dan membersihkan berkas gambar",
        error
      )
    );
  }
}
