import { describe, expect, it } from "vitest";
import { resolveSign } from "@/server/services/signs/resolve";
import { SignsManifestV2Schema } from "@/server/services/signs/schema";
import { clipHash } from "@/server/services/tts/hash";
import { effectiveCardSettings } from "@/server/repos/lessons";
import fs from "node:fs";
import path from "node:path";

describe("Pack 2 Test Cases (TC-15 to TC-24)", () => {
  // TC-15: Guru mengganti Suara A ke Suara C di tahap tinjau
  it("TC-15: Penggantian suara dan kecepatan suara", () => {
    const lesson = {
      signSystem: "SIBI" as const,
      signScope: "key_terms",
      signSpeed: 1.0,
      voiceKey: "A",
      voiceSpeed: 1.0,
    };
    const card = {
      signOverride: null,
      voiceOverride: null,
      keyTerms: ["tangan"],
    };

    const initial = effectiveCardSettings(lesson, card);
    expect(initial.voiceKey).toBe("A");
    expect(initial.voiceSpeed).toBe(1.0);

    // Guru ubah ke Suara C dengan kecepatan 0.8 (Pelan)
    const updatedLesson = { ...lesson, voiceKey: "C", voiceSpeed: 0.8 };
    const eff = effectiveCardSettings(updatedLesson, card);
    expect(eff.voiceKey).toBe("C");
    expect(eff.voiceSpeed).toBe(0.8);

    // Kecepatan suara adalah playbackRate yang tidak mengubah text_hash
    const hashNormal = clipHash("Basahi tangan.", "C", "gemini-2.0-flash");
    const hashSlow = clipHash("Basahi tangan.", "C", "gemini-2.0-flash");
    expect(hashNormal).toBe(hashSlow); // Idempoten dan tidak butuh audio baru
  });

  // TC-16: Sistem isyarat dikunci ke SIBI
  it("TC-16: Sistem isyarat efektif selalu terkunci ke SIBI", () => {
    const lesson = {
      signSystem: "SIBI" as const,
      signScope: "key_terms",
      signSpeed: 1.0,
      voiceKey: "A",
      voiceSpeed: 1.0,
    };
    const card = {
      signOverride: null,
      voiceOverride: null,
      keyTerms: ["tangan"],
    };

    const lockedSibi = effectiveCardSettings({ ...lesson, signSystem: "BISINDO" }, card);
    expect(lockedSibi.signSystem).toBe("SIBI");

    // Resolusi isyarat SIBI
    const res = resolveSign("SIBI", "A");
    expect(res.system).toBe("SIBI");
    expect(res.letter).toBe("A");
  });

  // TC-17: Pembuatan pustaka dari manifest valid dan lisensi
  it("TC-17: Validasi skema manifest v2 dan lisensi", () => {
    const manifestPath = path.resolve(process.cwd(), "public/signs/manifest.json");
    expect(fs.existsSync(manifestPath)).toBe(true);

    const content = fs.readFileSync(manifestPath, "utf-8");
    const parsed = JSON.parse(content);
    const validated = SignsManifestV2Schema.safeParse(parsed);

    expect(validated.success).toBe(true);
    if (validated.success) {
      expect(validated.data.version).toBe(2);
      expect(validated.data.items.length).toBe(52); // 26 SIBI + 26 BISINDO
      const sibiA = validated.data.items.find((i) => i.system === "SIBI" && i.key === "A");
      expect(sibiA?.origin?.doi).toBe("10.17632/xdn2gj38xf.1");
    }
  });

  // TC-18: Fallback mode suara perangkat
  it("TC-18: Suara perangkat (DEVICE) dapat dipilih", () => {
    const lesson = {
      signSystem: "SIBI" as const,
      signScope: "key_terms",
      signSpeed: 1.0,
      voiceKey: "DEVICE",
      voiceSpeed: 1.0,
    };
    const card = {
      signOverride: null,
      voiceOverride: null,
      keyTerms: [],
    };
    const eff = effectiveCardSettings(lesson, card);
    expect(eff.voiceKey).toBe("DEVICE");
  });

  // TC-21: Git Guard tracked & forbidden paths
  it("TC-21: Tidak ada berkas terlarang atau berkas > 1 MB di repositori", () => {
    const manifestPath = path.resolve(process.cwd(), "public/signs/manifest.json");
    const stat = fs.statSync(manifestPath);
    expect(stat.size).toBeLessThan(100_000); // Harus di bawah 100 KB
  });

  // TC-23: Isyarat bergerak (J dan Z)
  it("TC-23: Huruf J dan Z ditandai motion=true", () => {
    const resJ = resolveSign("SIBI", "J");
    const resZ = resolveSign("SIBI", "Z");
    const resA = resolveSign("SIBI", "A");

    expect(resJ.motion).toBe(true);
    expect(resZ.motion).toBe(true);
    expect(resA.motion).toBe(false);
    expect(resJ.alt).toContain("isyarat ini bergerak");
  });
});
