import "server-only";
import { env } from "@/server/config/env";
import { localStorageProvider } from "./local";
import { supabaseStorageProvider } from "./supabase";

export interface StorageProvider {
  put(
    key: string,
    bytes: Uint8Array | Buffer,
    mime: string,
    bucket?: string
  ): Promise<{ key: string; url: string }>;
  upload(
    key: string,
    bytes: Uint8Array | Buffer,
    mime: string,
    bucket?: string
  ): Promise<{ key: string; url: string }>;
  get(key: string, bucket?: string): Promise<Uint8Array | null>;
  url(key: string, bucket?: string): string;
  getUrl(key: string, bucket?: string): string;
  delete(key: string, bucket?: string): Promise<void>;
}

export function getStorageProvider(): StorageProvider {
  if (env.STORAGE_DRIVER === "supabase") {
    return supabaseStorageProvider;
  }
  return localStorageProvider;
}

export const storage: StorageProvider = getStorageProvider();
export { localStorageProvider } from "./local";
export { supabaseStorageProvider } from "./supabase";
