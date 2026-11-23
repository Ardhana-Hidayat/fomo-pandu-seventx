import signSources from "../../docs/update-pack-2/data/sign-sources.json";

export const SIGN_CONFIG = {
  sources: signSources,
  alphabet: "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""),
  movingLetters: ["J", "Z"],
  minLetterMs: 450,
  targetSize: 512,
  quality: 80,
  maxByteSize: 40 * 1024, // 40 KB
};
