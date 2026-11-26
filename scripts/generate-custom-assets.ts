import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

interface CustomSvgSpec {
  filename: string;
  svgBody: string;
  bg?: string;
}

function wrapSvg(body: string, bg = "#FFFFFF"): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="500" height="500" viewBox="0 0 500 500">
  <rect width="500" height="500" rx="36" fill="${bg}"/>
  ${body}
</svg>`;
}

const SPECS: CustomSvgSpec[] = [
  {
    filename: "akar-tumbuhan.webp",
    bg: "#F8FBF5",
    svgBody: `
      <rect x="40" y="250" width="420" height="190" rx="20" fill="#8D6E63"/>
      <rect x="40" y="240" width="420" height="24" rx="8" fill="#66BB6A"/>
      <path d="M250 110 L250 250" stroke="#43A047" stroke-width="18" stroke-linecap="round"/>
      <path d="M250 160 Q200 120 170 150 Q210 185 250 165" fill="#66BB6A"/>
      <path d="M250 140 Q300 100 330 130 Q290 165 250 145" fill="#81C784"/>
      <path d="M250 250 Q245 310 250 400" stroke="#EFEBE9" stroke-width="12" fill="none" stroke-linecap="round"/>
      <path d="M250 275 Q200 310 150 365" stroke="#EFEBE9" stroke-width="8" fill="none" stroke-linecap="round"/>
      <path d="M250 285 Q300 320 350 375" stroke="#EFEBE9" stroke-width="8" fill="none" stroke-linecap="round"/>
      <path d="M210 315 Q175 340 135 345" stroke="#D7CCC8" stroke-width="5" fill="none" stroke-linecap="round"/>
      <path d="M290 325 Q330 350 370 355" stroke="#D7CCC8" stroke-width="5" fill="none" stroke-linecap="round"/>
      <path d="M250 340 Q220 380 190 415" stroke="#D7CCC8" stroke-width="5" fill="none" stroke-linecap="round"/>
      <path d="M250 350 Q280 390 315 415" stroke="#D7CCC8" stroke-width="5" fill="none" stroke-linecap="round"/>
    `,
  },
  {
    filename: "batang-tumbuhan.webp",
    bg: "#F8FBF5",
    svgBody: `
      <rect x="60" y="390" width="380" height="40" rx="16" fill="#8D6E63"/>
      <path d="M250 400 L250 100" stroke="#2E7D32" stroke-width="34" stroke-linecap="round"/>
      <path d="M250 395 L250 105" stroke="#4CAF50" stroke-width="20" stroke-linecap="round"/>
      <path d="M250 290 L165 235" stroke="#388E3C" stroke-width="14" stroke-linecap="round"/>
      <path d="M250 215 L335 160" stroke="#388E3C" stroke-width="14" stroke-linecap="round"/>
      <ellipse cx="145" cy="220" rx="34" ry="18" transform="rotate(-20 145 220)" fill="#81C784"/>
      <ellipse cx="355" cy="145" rx="34" ry="18" transform="rotate(20 355 145)" fill="#81C784"/>
      <ellipse cx="250" cy="88" rx="22" ry="30" fill="#66BB6A"/>
    `,
  },
  {
    filename: "daun-hijau.webp",
    bg: "#F5FBF5",
    svgBody: `
      <path d="M110 390 Q90 210 240 120 Q370 70 400 100 Q420 240 310 350 Q200 420 110 390 Z" fill="#43A047"/>
      <path d="M110 390 Q240 260 385 115" stroke="#A5D6A7" stroke-width="10" fill="none" stroke-linecap="round"/>
      <path d="M110 390 L75 425" stroke="#2E7D32" stroke-width="14" stroke-linecap="round"/>
      <path d="M185 315 L155 245" stroke="#A5D6A7" stroke-width="6" stroke-linecap="round"/>
      <path d="M235 265 L210 190" stroke="#A5D6A7" stroke-width="6" stroke-linecap="round"/>
      <path d="M285 215 L265 150" stroke="#A5D6A7" stroke-width="6" stroke-linecap="round"/>
      <path d="M205 295 L285 310" stroke="#A5D6A7" stroke-width="6" stroke-linecap="round"/>
      <path d="M255 245 L335 255" stroke="#A5D6A7" stroke-width="6" stroke-linecap="round"/>
      <path d="M305 195 L370 200" stroke="#A5D6A7" stroke-width="6" stroke-linecap="round"/>
    `,
  },
  {
    filename: "siklus-air.webp",
    bg: "#E3F2FD",
    svgBody: `
      <circle cx="110" cy="105" r="46" fill="#FFB300"/>
      <g stroke="#FFB300" stroke-width="6" stroke-linecap="round">
        <line x1="110" y1="40" x2="110" y2="26"/><line x1="110" y1="184" x2="110" y2="170"/>
        <line x1="45" y1="105" x2="31" y2="105"/><line x1="189" y1="105" x2="175" y2="105"/>
      </g>
      <path d="M240 135 Q240 90 290 90 Q320 65 360 85 Q405 85 405 125 Q405 155 370 155 L265 155 Q240 155 240 135 Z" fill="#90CAF9"/>
      <path d="M295 175 L285 215 M330 175 L320 215 M365 175 L355 215" stroke="#1E88E5" stroke-width="8" stroke-linecap="round"/>
      <path d="M60 365 Q180 330 300 360 T440 350 L440 440 L60 440 Z" fill="#1E88E5"/>
      <path d="M135 320 Q135 265 160 225" stroke="#FB8C00" stroke-width="8" fill="none" stroke-dasharray="10 8" stroke-linecap="round"/>
      <polygon points="160,210 146,234 174,234" fill="#FB8C00"/>
      <path d="M330 235 L330 315" stroke="#1565C0" stroke-width="8" stroke-linecap="round"/>
      <polygon points="330,330 316,306 344,306" fill="#1565C0"/>
    `,
  },
  {
    filename: "cuaca-cerah.webp",
    bg: "#E1F5FE",
    svgBody: `
      <circle cx="250" cy="250" r="95" fill="#FFB300"/>
      <circle cx="250" cy="250" r="72" fill="#FFD54F"/>
      <g stroke="#FFA000" stroke-width="14" stroke-linecap="round">
        <line x1="250" y1="70" x2="250" y2="120"/>
        <line x1="250" y1="380" x2="250" y2="430"/>
        <line x1="70" y1="250" x2="120" y2="250"/>
        <line x1="380" y1="250" x2="430" y2="250"/>
        <line x1="122" y1="122" x2="158" y2="158"/>
        <line x1="342" y1="342" x2="378" y2="378"/>
        <line x1="378" y1="122" x2="342" y2="158"/>
        <line x1="158" y1="342" x2="122" y2="378"/>
      </g>
    `,
  },
  {
    filename: "cuaca-berawan.webp",
    bg: "#E3F2FD",
    svgBody: `
      <circle cx="175" cy="185" r="70" fill="#FFB300"/>
      <path d="M135 330 Q120 265 185 255 Q210 195 280 205 Q340 205 360 255 Q410 260 410 305 Q410 345 365 345 L165 345 Q135 345 135 330 Z" fill="#FFFFFF" stroke="#90CAF9" stroke-width="8"/>
    `,
  },
  {
    filename: "cuaca-badai-petir.webp",
    bg: "#ECEFF1",
    svgBody: `
      <path d="M100 240 Q90 175 155 165 Q185 105 260 115 Q325 115 350 165 Q405 170 405 220 Q405 260 360 260 L135 260 Q100 260 100 240 Z" fill="#607D8B"/>
      <polygon points="260,260 215,345 255,345 230,425 310,320 265,320 295,260" fill="#FFC107"/>
      <path d="M150 285 L135 340 M190 285 L175 340 M340 285 L325 340" stroke="#1E88E5" stroke-width="10" stroke-linecap="round"/>
    `,
  },
  {
    filename: "sistem-pencernaan.webp",
    bg: "#FFF8F6",
    svgBody: `
      <circle cx="250" cy="85" r="42" fill="#FFCCBC"/>
      <path d="M150 155 Q150 130 250 130 Q350 130 350 155 L365 420 Q365 445 250 445 Q135 445 135 420 Z" fill="#FFE0B2" opacity="0.55"/>
      <path d="M250 105 L250 200" stroke="#E57373" stroke-width="18" stroke-linecap="round"/>
      <path d="M250 195 Q320 195 315 245 Q310 295 235 280 Q200 270 215 230 Q225 205 250 195 Z" fill="#EF5350"/>
      <rect x="190" y="305" width="120" height="95" rx="28" fill="none" stroke="#8D6E63" stroke-width="22"/>
      <path d="M220 335 Q250 320 280 335 Q250 355 220 370 Q250 385 280 370" fill="none" stroke="#FF8A65" stroke-width="14" stroke-linecap="round"/>
    `,
  },
  {
    filename: "jantung-organ.webp",
    bg: "#FFF5F5",
    svgBody: `
      <path d="M220 135 L220 75 M260 125 L260 65 M295 140 L325 90" stroke="#1E88E5" stroke-width="22" stroke-linecap="round"/>
      <path d="M250 140 Q150 120 135 230 Q125 340 245 420 Q365 360 365 245 Q365 150 275 155 Z" fill="#E53935"/>
      <path d="M240 165 Q280 230 255 345" stroke="#B71C1C" stroke-width="10" fill="none" stroke-linecap="round"/>
      <path d="M265 230 L320 265 M262 280 L310 315" stroke="#FFCDD2" stroke-width="7" stroke-linecap="round"/>
    `,
  },
  {
    filename: "paru-paru.webp",
    bg: "#FFF5F7",
    svgBody: `
      <path d="M250 75 L250 195" stroke="#90CAF9" stroke-width="24" stroke-linecap="round"/>
      <path d="M250 185 L185 230 M250 185 L315 230" stroke="#90CAF9" stroke-width="16" stroke-linecap="round"/>
      <path d="M225 145 Q125 150 105 265 Q95 385 170 400 Q225 405 225 320 Z" fill="#F48FB1"/>
      <path d="M275 145 Q375 150 395 265 Q405 385 330 400 Q275 405 275 320 Z" fill="#F48FB1"/>
      <path d="M185 230 L150 285 M185 230 L195 305 M315 230 L350 285 M315 230 L305 305" stroke="#FCE4EC" stroke-width="7" stroke-linecap="round"/>
    `,
  },
  {
    filename: "magnet-tapal-kuda.webp",
    bg: "#F5F7FA",
    svgBody: `
      <path d="M145 140 L145 270 A105 105 0 0 0 355 270 L355 140" fill="none" stroke="#E53935" stroke-width="64" stroke-linecap="butt"/>
      <path d="M250 375 A105 105 0 0 0 355 270 L355 140" fill="none" stroke="#1E88E5" stroke-width="64" stroke-linecap="butt"/>
      <rect x="113" y="105" width="64" height="45" fill="#CFD8DC"/>
      <rect x="323" y="105" width="64" height="45" fill="#CFD8DC"/>
      <text x="145" y="210" font-family="Arial, sans-serif" font-size="36" font-weight="bold" fill="#FFFFFF" text-anchor="middle">U</text>
      <text x="355" y="210" font-family="Arial, sans-serif" font-size="36" font-weight="bold" fill="#FFFFFF" text-anchor="middle">S</text>
    `,
  },
  {
    filename: "penjumlahan.webp",
    bg: "#FFFDE7",
    svgBody: `
      <circle cx="115" cy="145" r="42" fill="#E53935"/>
      <path d="M115 105 Q125 85 140 90" stroke="#43A047" stroke-width="8" fill="none" stroke-linecap="round"/>
      <circle cx="115" cy="255" r="42" fill="#E53935"/>
      <rect x="215" y="175" width="70" height="22" rx="11" fill="#1E88E5"/>
      <rect x="239" y="151" width="22" height="70" rx="11" fill="#1E88E5"/>
      <circle cx="385" cy="200" r="42" fill="#E53935"/>
      <rect x="130" y="365" width="240" height="22" rx="11" fill="#43A047"/>
      <text x="250" y="445" font-family="Arial, sans-serif" font-size="48" font-weight="bold" fill="#2E7D32" text-anchor="middle">2 + 1 = 3</text>
    `,
  },
  {
    filename: "pengurangan.webp",
    bg: "#FFF3E0",
    svgBody: `
      <circle cx="105" cy="175" r="38" fill="#FB8C00"/>
      <circle cx="195" cy="175" r="38" fill="#FB8C00"/>
      <circle cx="285" cy="175" r="38" fill="#BDBDBD" opacity="0.5"/>
      <line x1="255" y1="145" x2="315" y2="205" stroke="#D32F2F" stroke-width="10" stroke-linecap="round"/>
      <line x1="315" y1="145" x2="255" y2="205" stroke="#D32F2F" stroke-width="10" stroke-linecap="round"/>
      <rect x="355" y="165" width="70" height="20" rx="10" fill="#1E88E5"/>
      <rect x="130" y="310" width="240" height="20" rx="10" fill="#E65100"/>
      <text x="250" y="410" font-family="Arial, sans-serif" font-size="48" font-weight="bold" fill="#E65100" text-anchor="middle">3 - 1 = 2</text>
    `,
  },
  {
    filename: "perkalian.webp",
    bg: "#F3E5F5",
    svgBody: `
      <rect x="65" y="110" width="120" height="120" rx="20" fill="#E1BEE7"/>
      <circle cx="105" cy="170" r="20" fill="#8E24AA"/>
      <circle cx="145" cy="170" r="20" fill="#8E24AA"/>
      <g transform="translate(250, 170) rotate(45)">
        <rect x="-35" y="-10" width="70" height="20" rx="10" fill="#6A1B9A"/>
        <rect x="-10" y="-35" width="20" height="70" rx="10" fill="#6A1B9A"/>
      </g>
      <rect x="315" y="110" width="120" height="120" rx="20" fill="#E1BEE7"/>
      <circle cx="355" cy="170" r="20" fill="#8E24AA"/>
      <circle cx="395" cy="170" r="20" fill="#8E24AA"/>
      <text x="250" y="380" font-family="Arial, sans-serif" font-size="52" font-weight="bold" fill="#6A1B9A" text-anchor="middle">2 × 2 = 4</text>
    `,
  },
  {
    filename: "pembagian.webp",
    bg: "#E0F2F1",
    svgBody: `
      <rect x="175" y="170" width="150" height="24" rx="12" fill="#00796B"/>
      <circle cx="250" cy="120" r="22" fill="#00796B"/>
      <circle cx="250" cy="244" r="22" fill="#00796B"/>
      <circle cx="135" cy="340" r="28" fill="#26A69A"/>
      <circle cx="195" cy="340" r="28" fill="#26A69A"/>
      <circle cx="305" cy="340" r="28" fill="#26A69A"/>
      <circle cx="365" cy="340" r="28" fill="#26A69A"/>
      <text x="250" y="435" font-family="Arial, sans-serif" font-size="44" font-weight="bold" fill="#00695C" text-anchor="middle">4 ÷ 2 = 2</text>
    `,
  },
  {
    filename: "pecahan-setengah.webp",
    bg: "#FFF8E1",
    svgBody: `
      <circle cx="250" cy="215" r="130" fill="#FFE082" stroke="#F57F17" stroke-width="10"/>
      <path d="M250 85 A130 130 0 0 0 250 345 Z" fill="#FB8C00"/>
      <line x1="250" y1="85" x2="250" y2="345" stroke="#5D4037" stroke-width="8"/>
      <text x="250" y="430" font-family="Arial, sans-serif" font-size="54" font-weight="bold" fill="#E65100" text-anchor="middle">1 / 2</text>
    `,
  },
  {
    filename: "pecahan-seperempat.webp",
    bg: "#E8F5E9",
    svgBody: `
      <circle cx="250" cy="215" r="130" fill="#C8E6C9" stroke="#2E7D32" stroke-width="10"/>
      <path d="M250 215 L250 85 A130 130 0 0 1 380 215 Z" fill="#43A047"/>
      <line x1="250" y1="85" x2="250" y2="345" stroke="#1B5E20" stroke-width="8"/>
      <line x1="120" y1="215" x2="380" y2="215" stroke="#1B5E20" stroke-width="8"/>
      <text x="250" y="430" font-family="Arial, sans-serif" font-size="54" font-weight="bold" fill="#1B5E20" text-anchor="middle">1 / 4</text>
    `,
  },
  {
    filename: "persegi-panjang.webp",
    bg: "#E8EAF6",
    svgBody: `
      <rect x="75" y="145" width="350" height="210" rx="12" fill="#5C6BC0" stroke="#283593" stroke-width="12"/>
      <rect x="95" y="165" width="310" height="170" rx="6" fill="#7986CB"/>
    `,
  },
  {
    filename: "kubus-geometri.webp",
    bg: "#E0F7FA",
    svgBody: `
      <polygon points="250,90 385,165 250,240 115,165" fill="#4DD0E1" stroke="#006064" stroke-width="8" stroke-linejoin="round"/>
      <polygon points="115,165 250,240 250,400 115,325" fill="#00ACC1" stroke="#006064" stroke-width="8" stroke-linejoin="round"/>
      <polygon points="385,165 250,240 250,400 385,325" fill="#00838F" stroke="#006064" stroke-width="8" stroke-linejoin="round"/>
    `,
  },
  {
    filename: "gotong-royong.webp",
    bg: "#F1F8E9",
    svgBody: `
      <circle cx="155" cy="145" r="38" fill="#FFCC80"/>
      <path d="M105 260 Q155 195 205 260 L195 360 L115 360 Z" fill="#1E88E5"/>
      <circle cx="345" cy="145" r="38" fill="#FFCC80"/>
      <path d="M295 260 Q345 195 395 260 L385 360 L305 360 Z" fill="#43A047"/>
      <rect x="175" y="255" width="150" height="65" rx="14" fill="#FFB300" stroke="#F57F17" stroke-width="6"/>
      <rect x="80" y="365" width="340" height="22" rx="11" fill="#81C784"/>
    `,
  },
  {
    filename: "musyawarah.webp",
    bg: "#FFF8E1",
    svgBody: `
      <ellipse cx="250" cy="295" rx="135" ry="60" fill="#8D6E63"/>
      <circle cx="120" cy="175" r="34" fill="#FFCC80"/>
      <path d="M80 265 Q120 215 160 265 Z" fill="#E53935"/>
      <circle cx="250" cy="145" r="36" fill="#FFCC80"/>
      <path d="M205 240 Q250 185 295 240 Z" fill="#1E88E5"/>
      <circle cx="380" cy="175" r="34" fill="#FFCC80"/>
      <path d="M340 265 Q380 215 420 265 Z" fill="#43A047"/>
      <rect x="200" y="65" width="100" height="44" rx="16" fill="#FFFFFF" stroke="#FFB300" stroke-width="5"/>
      <circle cx="228" cy="87" r="5" fill="#FFB300"/><circle cx="250" cy="87" r="5" fill="#FFB300"/><circle cx="272" cy="87" r="5" fill="#FFB300"/>
    `,
  },
  {
    filename: "upacara-bendera.webp",
    bg: "#E3F2FD",
    svgBody: `
      <rect x="95" y="400" width="310" height="35" rx="10" fill="#90A4AE"/>
      <rect x="242" y="75" width="16" height="330" rx="8" fill="#CFD8DC"/>
      <circle cx="250" cy="70" r="14" fill="#FFD54F"/>
      <rect x="258" y="90" width="150" height="50" fill="#D32F2F"/>
      <rect x="258" y="140" width="150" height="50" fill="#FFFFFF"/>
      <rect x="258" y="90" width="150" height="100" fill="none" stroke="#B0BEC5" stroke-width="2"/>
    `,
  },
  {
    filename: "lampu-lalu-lintas.webp",
    bg: "#ECEFF1",
    svgBody: `
      <rect x="235" y="370" width="30" height="80" fill="#455A64"/>
      <rect x="175" y="65" width="150" height="315" rx="32" fill="#263238"/>
      <circle cx="250" cy="130" r="38" fill="#E53935"/>
      <circle cx="250" cy="222" r="38" fill="#FDD835"/>
      <circle cx="250" cy="314" r="38" fill="#43A047"/>
    `,
  },
  {
    filename: "pemadam-kebakaran.webp",
    bg: "#FFF3E0",
    svgBody: `
      <rect x="85" y="210" width="250" height="135" rx="20" fill="#E53935"/>
      <path d="M335 235 L405 235 Q425 235 425 260 L425 345 L335 345 Z" fill="#D32F2F"/>
      <rect x="350" y="250" width="55" height="45" rx="8" fill="#B3E5FC"/>
      <rect x="115" y="175" width="190" height="24" rx="8" fill="#CFD8DC"/>
      <circle cx="155" cy="355" r="38" fill="#263238"/><circle cx="155" cy="355" r="18" fill="#CFD8DC"/>
      <circle cx="365" cy="355" r="38" fill="#263238"/><circle cx="365" cy="355" r="18" fill="#CFD8DC"/>
      <rect x="260" y="185" width="35" height="25" rx="8" fill="#1E88E5"/>
    `,
  },
];

async function main() {
  const outDir = path.join(process.cwd(), "public", "media", "custom");
  fs.mkdirSync(outDir, { recursive: true });

  for (const spec of SPECS) {
    const svg = wrapSvg(spec.svgBody, spec.bg);
    const outPath = path.join(outDir, spec.filename);
    await sharp(Buffer.from(svg))
      .resize(500, 500)
      .webp({ quality: 90 })
      .toFile(outPath);
    const meta = await sharp(outPath).metadata();
    console.log(`Generated ${spec.filename}: ${meta.width}x${meta.height} (${fs.statSync(outPath).size} B)`);
  }
  console.log(`Total custom illustrations generated: ${SPECS.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
