let signSources: Record<string, unknown> = {};
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  signSources = require("../../docs/update-pack-2/data/sign-sources.json");
} catch {
  signSources = {};
}

export const SIGN_CONFIG = {
  sources: signSources,
  alphabet: "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""),
  movingLetters: ["J", "Z"],
  minLetterMs: 450,
  targetSize: 512,
  quality: 80,
  maxByteSize: 40 * 1024, // 40 KB
};
