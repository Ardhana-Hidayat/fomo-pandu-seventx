import fs from "node:fs";
import path from "node:path";
import { SIGN_CONFIG } from "./config";

/**
 * Generates contact review metadata and HTML contact sheet in .data/sign-review/
 * per Pack 2 Berkas 03 §2.
 */
async function main() {
  console.log("Membuat lembar tinjau pustaka isyarat (contact sheet)...");
  const reviewDir = path.resolve(process.cwd(), ".data/sign-review");
  if (!fs.existsSync(reviewDir)) {
    fs.mkdirSync(reviewDir, { recursive: true });
  }

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Lembar Tinjau Isyarat InkluDidik (SIBI &amp; BISINDO)</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #f8fafc; color: #0f172a; padding: 24px; }
    h1 { font-size: 24px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 16px; margin-top: 16px; }
    .card { background: white; border: 2px solid #cbd5e1; border-radius: 12px; padding: 12px; text-align: center; }
    .card img { width: 100%; height: auto; border-radius: 8px; }
    .label { font-weight: bold; margin-top: 8px; }
  </style>
</head>
<body>
  <h1>Lembar Tinjau Pustaka Isyarat InkluDidik</h1>
  <h2>SIBI</h2>
  <div class="grid">
    ${SIGN_CONFIG.alphabet
      .map(
        (letter) => `
      <div class="card">
        <img src="/signs/sibi/${letter.toLowerCase()}.webp" alt="SIBI ${letter}">
        <div class="label">SIBI - ${letter}</div>
      </div>`
      )
      .join("")}
  </div>
  <h2 style="margin-top: 32px;">BISINDO</h2>
  <div class="grid">
    ${SIGN_CONFIG.alphabet
      .map(
        (letter) => `
      <div class="card">
        <img src="/signs/bisindo/${letter.toLowerCase()}.webp" alt="BISINDO ${letter}">
        <div class="label">BISINDO - ${letter}</div>
      </div>`
      )
      .join("")}
  </div>
</body>
</html>`;

  fs.writeFileSync(path.join(reviewDir, "index.html"), html, "utf-8");
  console.log(`Lembar tinjau ditulis ke ${path.join(reviewDir, "index.html")}`);
}

void main();
