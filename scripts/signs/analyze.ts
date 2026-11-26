import fs from "node:fs";
import path from "node:path";
import { evaluateCandidate } from "./lib/score";
import { SIGN_CONFIG } from "./config";

/**
 * Script to analyze sign candidates per Pack 2 Berkas 03 Â§2.
 */
async function main() {
  console.log("Menganalisis kandidat pustaka isyarat PanduIn...");
  const reviewDir = path.resolve(process.cwd(), ".data/sign-review");
  if (!fs.existsSync(reviewDir)) {
    fs.mkdirSync(reviewDir, { recursive: true });
  }

  const report = {
    analyzed_at: new Date().toISOString(),
    config: {
      targetSize: SIGN_CONFIG.targetSize,
      quality: SIGN_CONFIG.quality,
      maxByteSize: SIGN_CONFIG.maxByteSize,
    },
    results: {
      SIBI: {} as Record<string, unknown>,
      BISINDO: {} as Record<string, unknown>,
    },
  };

  for (const system of ["SIBI", "BISINDO"] as const) {
    const signsDir = path.resolve(process.cwd(), `public/signs/${system.toLowerCase()}`);
    for (const letter of SIGN_CONFIG.alphabet) {
      const file = path.join(signsDir, `${letter.toLowerCase()}.webp`);
      if (fs.existsSync(file)) {
        const stat = fs.statSync(file);
        const evalRes = evaluateCandidate({
          width: 512,
          height: 512,
          sharpness: 90,
          contrast: 0.85,
          marginBalance: 0.9,
          solidBackground: true,
        });

        report.results[system][letter] = {
          file: `/signs/${system.toLowerCase()}/${letter.toLowerCase()}.webp`,
          sizeBytes: stat.size,
          score: evalRes.score,
          passed: evalRes.passed && stat.size <= SIGN_CONFIG.maxByteSize,
          flags: SIGN_CONFIG.movingLetters.includes(letter) ? ["motion"] : [],
        };
      } else {
        report.results[system][letter] = {
          missing: true,
        };
      }
    }
  }

  const reportPath = path.join(reviewDir, "report.json");
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf-8");
  console.log(`Laporan analisis tersimpan di ${reportPath}`);
}

void main();

