import "server-only";
import path from "node:path";
import type { StorageProvider } from "./index";
import { localStorageProvider } from "./local";

export class SupabaseStorageProvider implements StorageProvider {
  private getCredentials() {
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.SUPABASE_URL ||
      "https://vmailnuloaoonmqeguok.supabase.co";
    const serviceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !serviceKey) {
      return null;
    }

    return { supabaseUrl, serviceKey };
  }

  async put(
    key: string,
    bytes: Uint8Array | Buffer,
    mime: string,
    bucket = "card-images"
  ): Promise<{ key: string; url: string }> {
    const creds = this.getCredentials();
    if (!creds || process.env.NODE_ENV === "test" || creds.serviceKey.includes("dummy")) {
      return localStorageProvider.put(key, bytes, mime, bucket);
    }

    const cleanKey = path.basename(key);
    const { supabaseUrl, serviceKey } = creds;

    try {
      const res = await fetch(
        `${supabaseUrl}/storage/v1/object/${bucket}/${cleanKey}`,
        {
          method: "POST",
          headers: {
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`,
            "Content-Type": mime,
            "x-upsert": "true",
          },
          body: Buffer.from(bytes),
        }
      );

      if (!res.ok) {
        return localStorageProvider.put(key, bytes, mime, bucket);
      }

      return {
        key: cleanKey,
        url: this.url(cleanKey, bucket),
      };
    } catch {
      return localStorageProvider.put(key, bytes, mime, bucket);
    }
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
    const creds = this.getCredentials();
    if (!creds) {
      return localStorageProvider.get(key, bucket);
    }

    const cleanKey = path.basename(key);
    const { supabaseUrl, serviceKey } = creds;

    const res = await fetch(
      `${supabaseUrl}/storage/v1/object/${bucket}/${cleanKey}`,
      {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
      }
    );

    if (!res.ok) {
      return localStorageProvider.get(key, bucket);
    }

    const arrayBuffer = await res.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  }

  url(key: string, bucket = "card-images"): string {
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.SUPABASE_URL ||
      "https://vmailnuloaoonmqeguok.supabase.co";

    if (!supabaseUrl) {
      return localStorageProvider.url(key, bucket);
    }

    const cleanKey = path.basename(key);
    return `${supabaseUrl}/storage/v1/object/public/${bucket}/${cleanKey}`;
  }

  getUrl(key: string, bucket = "card-images"): string {
    return this.url(key, bucket);
  }

  async delete(key: string, bucket = "card-images"): Promise<void> {
    const creds = this.getCredentials();
    if (!creds) {
      return localStorageProvider.delete(key, bucket);
    }

    const cleanKey = path.basename(key);
    const { supabaseUrl, serviceKey } = creds;

    await fetch(`${supabaseUrl}/storage/v1/object/${bucket}`, {
      method: "DELETE",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prefixes: [cleanKey] }),
    });
  }
}

export const supabaseStorageProvider = new SupabaseStorageProvider();

