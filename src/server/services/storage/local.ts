import "server-only";
import fs from "node:fs";
import path from "node:path";
import type { StorageProvider } from "./index";

const STORAGE_ROOT = path.resolve(process.cwd(), ".data/storage");

export class LocalStorageProvider implements StorageProvider {
  private getBucketPath(bucket: string): string {
    const safeBucket = bucket.replace(/[^a-zA-Z0-9_-]/g, "");
    return path.join(STORAGE_ROOT, safeBucket);
  }

  private getFilePath(key: string, bucket = "card-images"): string {
    const bucketDir = this.getBucketPath(bucket);
    if (!fs.existsSync(bucketDir)) {
      fs.mkdirSync(bucketDir, { recursive: true });
    }
    const safeKey = path.basename(key);
    return path.join(bucketDir, safeKey);
  }

  async put(
    key: string,
    bytes: Uint8Array | Buffer,
    mime: string,
    bucket = "card-images"
  ): Promise<{ key: string; url: string }> {
    const filePath = this.getFilePath(key, bucket);
    await fs.promises.writeFile(filePath, Buffer.from(bytes));
    return {
      key,
      url: this.url(key, bucket),
    };
  }

  // Alias for put
  async upload(
    key: string,
    bytes: Uint8Array | Buffer,
    mime: string,
    bucket = "card-images"
  ): Promise<{ key: string; url: string }> {
    return this.put(key, bytes, mime, bucket);
  }

  async get(key: string, bucket = "card-images"): Promise<Uint8Array | null> {
    const filePath = this.getFilePath(key, bucket);
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const buf = await fs.promises.readFile(filePath);
    return new Uint8Array(buf);
  }

  url(key: string, bucket = "card-images"): string {
    const safeKey = path.basename(key);
    return `/api/media/${bucket}/${safeKey}`;
  }

  // Alias for url
  getUrl(key: string, bucket = "card-images"): string {
    return this.url(key, bucket);
  }

  async delete(key: string, bucket = "card-images"): Promise<void> {
    const filePath = this.getFilePath(key, bucket);
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
    }
  }
}

export const localStorageProvider = new LocalStorageProvider();
