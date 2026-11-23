import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { StorageProvider } from "./index";
import { localStorageProvider } from "./local";

export class SupabaseStorageProvider implements StorageProvider {
  private getClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      return null;
    }

    try {
      return createClient(supabaseUrl, serviceKey);
    } catch {
      return null;
    }
  }

  async put(
    key: string,
    bytes: Uint8Array | Buffer,
    mime: string,
    bucket = "card-images"
  ): Promise<{ key: string; url: string }> {
    const client = this.getClient();
    if (!client) {
      // Fallback ke penyimpanan lokal bila Supabase belum dikonfigurasi
      return localStorageProvider.put(key, bytes, mime, bucket);
    }

    const { error } = await client.storage
      .from(bucket)
      .upload(key, bytes, { contentType: mime, upsert: true });

    if (error) {
      throw new Error(`Gagal mengunggah ke Supabase Storage: ${error.message}`);
    }

    return {
      key,
      url: this.url(key, bucket),
    };
  }

  async upload(
    key: string,
    bytes: Uint8Array | Buffer,
    mime: string,
    bucket = "card-images"
  ): Promise<{ key: string; url: string }> {
    return this.put(key, bytes, mime, bucket);
  }

  async get(key: string, bucket = "card-images"): Promise<Uint8Array | null> {
    const client = this.getClient();
    if (!client) {
      return localStorageProvider.get(key, bucket);
    }

    const { data, error } = await client.storage.from(bucket).download(key);
    if (error || !data) {
      return null;
    }
    const arrayBuffer = await data.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  }

  url(key: string, bucket = "card-images"): string {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) {
      return localStorageProvider.url(key, bucket);
    }
    return `${supabaseUrl}/storage/v1/object/public/${bucket}/${key}`;
  }

  getUrl(key: string, bucket = "card-images"): string {
    return this.url(key, bucket);
  }

  async delete(key: string, bucket = "card-images"): Promise<void> {
    const client = this.getClient();
    if (!client) {
      return localStorageProvider.delete(key, bucket);
    }
    await client.storage.from(bucket).remove([key]);
  }
}

export const supabaseStorageProvider = new SupabaseStorageProvider();
