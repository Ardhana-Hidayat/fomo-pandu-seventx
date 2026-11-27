import "server-only";
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  hkdfSync,
  randomBytes,
} from "node:crypto";

const ENC_PREFIX = "enc:v1:";
const IV_BYTES = 12;
const TAG_BYTES = 16;
const DEV_FALLBACK_SEED =
  "dev-session-secret-at-least-32-characters-long-example-seventx";

function getRootSecret(): { value: string; isDedicated: boolean } {
  const dedicated = process.env.KEY_ENCRYPTION_SECRET?.trim();
  if (dedicated) {
    return { value: dedicated, isDedicated: true };
  }
  const sessionSecret = process.env.SESSION_SECRET?.trim() || DEV_FALLBACK_SEED;
  return { value: sessionSecret, isDedicated: false };
}

function deriveAesKey(): Buffer {
  const { value, isDedicated } = getRootSecret();
  if (isDedicated) {
    return createHash("sha256").update(value, "utf8").digest();
  }
  return Buffer.from(
    hkdfSync("sha256", value, "panduin-key-encryption-v1", "aes-256-gcm", 32)
  );
}

function deriveHmacKey(): Buffer {
  const { value } = getRootSecret();
  return Buffer.from(
    hkdfSync("sha256", value, "panduin-key-fingerprint-v1", "hmac-sha256", 32)
  );
}

export function isEncryptedSecret(value: string): boolean {
  return value.startsWith(ENC_PREFIX);
}

/**
 * Encrypts a plaintext secret using AES-256-GCM with `enc:v1:` prefix.
 */
export function encryptSecret(plaintext: string): string {
  const key = deriveAesKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return `${ENC_PREFIX}${iv.toString("base64url")}:${tag.toString("base64url")}:${encrypted.toString("base64url")}`;
}

/**
 * Decrypts an `enc:v1:` AES-256-GCM secret.
 * Backward-compatible with legacy plaintext keys that lack the `enc:v1:` prefix.
 */
export function decryptSecret(ciphertext: string): string {
  if (!isEncryptedSecret(ciphertext)) {
    return ciphertext;
  }

  const payload = ciphertext.slice(ENC_PREFIX.length);
  const parts = payload.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted secret format");
  }

  const [ivB64, tagB64, dataB64] = parts;
  if (!ivB64 || !tagB64 || dataB64 === undefined) {
    throw new Error("Invalid encrypted secret components");
  }

  const iv = Buffer.from(ivB64, "base64url");
  const tag = Buffer.from(tagB64, "base64url");
  const data = Buffer.from(dataB64, "base64url");

  if (iv.length !== IV_BYTES || tag.length !== TAG_BYTES) {
    throw new Error("Invalid encrypted secret metadata length");
  }

  const key = deriveAesKey();
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return decrypted.toString("utf8");
}

/**
 * Masks an API key so only the last 4 characters are visible (e.g. `••••1234`).
 */
export function maskApiKey(key: string): string {
  const trimmed = key.trim();
  if (trimmed.length <= 4) {
    return "••••";
  }
  return `••••${trimmed.slice(-4)}`;
}

/**
 * Computes a deterministic HMAC-SHA256 hex fingerprint for an API key.
 */
export function fingerprintKey(key: string): string {
  const hmacKey = deriveHmacKey();
  return createHmac("sha256", hmacKey).update(key.trim(), "utf8").digest("hex");
}
