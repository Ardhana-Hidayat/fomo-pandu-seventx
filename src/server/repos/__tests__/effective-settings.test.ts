import { describe, expect, it } from "vitest";
import { effectiveCardSettings } from "../lessons";

describe("effectiveCardSettings", () => {
  const baseLesson = {
    signSystem: "SIBI" as const,
    signScope: "key_terms",
    signSpeed: 1.0,
    voiceKey: "A",
    voiceSpeed: 1.0,
  };

  it("mengikuti materi jika tidak ada override pada kartu", () => {
    const card = {
      signOverride: null,
      voiceOverride: null,
      keyTerms: ["sabun", "air"],
    };
    const eff = effectiveCardSettings(baseLesson, card);
    expect(eff.signSystem).toBe("SIBI");
    expect(eff.voiceKey).toBe("A");
    expect(eff.keyTerms).toEqual(["sabun", "air"]);
  });

  it("override suara menimpa materi sementara sistem isyarat tetap terkunci ke SIBI", () => {
    const card = {
      signOverride: "BISINDO",
      voiceOverride: "C",
      keyTerms: ["tangan"],
    };
    const eff = effectiveCardSettings(baseLesson, card);
    expect(eff.signSystem).toBe("SIBI");
    expect(eff.voiceKey).toBe("C");
  });

  it("override NONE mematikan isyarat kartu", () => {
    const card = {
      signOverride: "NONE",
      voiceOverride: null,
      keyTerms: [],
    };
    const eff = effectiveCardSettings(baseLesson, card);
    expect(eff.signSystem).toBeNull();
  });
});
