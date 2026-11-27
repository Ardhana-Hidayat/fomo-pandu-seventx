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

const EXISTING_SPECS: CustomSvgSpec[] = [
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

const OCEAN_SPECS: CustomSvgSpec[] = [
  {
    filename: "ombak-laut.webp",
    bg: "#E1F5FE",
    svgBody: `
      <circle cx="390" cy="105" r="42" fill="#FFD54F"/>
      <path d="M40 280 Q110 150 215 170 Q275 180 265 235 Q250 260 215 240 Q235 210 190 210 Q145 210 120 285 Z" fill="#0288D1"/>
      <path d="M40 285 Q130 230 220 285 Q310 340 460 270 L460 440 L40 440 Z" fill="#039BE5"/>
      <path d="M40 345 Q150 300 250 345 Q350 390 460 335 L460 440 L40 440 Z" fill="#0277BD"/>
      <path d="M180 165 Q230 148 275 180 Q295 200 275 215" fill="none" stroke="#FFFFFF" stroke-width="12" stroke-linecap="round"/>
      <circle cx="290" cy="195" r="8" fill="#FFFFFF"/><circle cx="315" cy="215" r="6" fill="#FFFFFF"/>
    `,
  },
  {
    filename: "pulau.webp",
    bg: "#E0F7FA",
    svgBody: `
      <circle cx="385" cy="105" r="40" fill="#FFB300"/>
      <rect x="40" y="330" width="420" height="110" rx="18" fill="#0288D1"/>
      <path d="M90 355 Q250 245 410 355 Z" fill="#FFE082"/>
      <path d="M115 355 Q250 280 385 355 Z" fill="#81C784"/>
      <path d="M235 305 Q225 220 255 155" stroke="#6D4C41" stroke-width="18" fill="none" stroke-linecap="round"/>
      <path d="M255 155 Q195 120 155 155 Q210 175 255 155 Z" fill="#2E7D32"/>
      <path d="M255 155 Q315 120 355 155 Q300 175 255 155 Z" fill="#43A047"/>
      <path d="M255 155 Q235 90 190 105 Q225 135 255 155 Z" fill="#66BB6A"/>
      <path d="M255 155 Q285 90 330 105 Q290 135 255 155 Z" fill="#4CAF50"/>
      <circle cx="242" cy="170" r="10" fill="#5D4037"/><circle cx="265" cy="172" r="10" fill="#5D4037"/>
    `,
  },
  {
    filename: "terumbu-karang.webp",
    bg: "#E0F7FA",
    svgBody: `
      <rect x="40" y="365" width="420" height="75" rx="18" fill="#FFE082"/>
      <path d="M135 375 L135 215 Q135 170 105 155 M135 270 Q175 245 175 200 M135 235 Q95 215 95 180" stroke="#FF7043" stroke-width="24" fill="none" stroke-linecap="round"/>
      <path d="M255 375 L255 175 M255 280 Q210 250 205 205 M255 245 Q300 220 305 175 M255 200 Q225 160 225 125" stroke="#EC407A" stroke-width="22" fill="none" stroke-linecap="round"/>
      <path d="M365 375 Q345 275 375 215 Q410 275 385 375 Z" fill="#66BB6A"/>
      <path d="M345 375 Q320 300 340 245 Q360 300 355 375 Z" fill="#43A047"/>
      <circle cx="110" cy="110" r="10" fill="#81D4FA"/><circle cx="320" cy="115" r="12" fill="#81D4FA"/><circle cx="185" cy="145" r="7" fill="#81D4FA"/>
      <ellipse cx="385" cy="145" rx="22" ry="14" fill="#FFB300"/>
      <polygon points="405,145 425,132 425,158" fill="#FB8C00"/>
    `,
  },
  {
    filename: "kapal-selam.webp",
    bg: "#E0F2F1",
    svgBody: `
      <rect x="40" y="40" width="420" height="420" rx="30" fill="#0277BD" opacity="0.14"/>
      <path d="M255 175 L255 120 L290 120" stroke="#455A64" stroke-width="14" fill="none" stroke-linecap="round"/>
      <rect x="200" y="165" width="95" height="65" rx="16" fill="#FB8C00"/>
      <ellipse cx="250" cy="275" rx="155" ry="68" fill="#FFB300"/>
      <rect x="82" y="252" width="22" height="46" rx="8" fill="#F57C00"/>
      <path d="M395 275 L435 245 L435 305 Z" fill="#E65100"/>
      <circle cx="185" cy="275" r="22" fill="#E1F5FE" stroke="#455A64" stroke-width="8"/>
      <circle cx="255" cy="275" r="22" fill="#E1F5FE" stroke="#455A64" stroke-width="8"/>
      <circle cx="325" cy="275" r="22" fill="#E1F5FE" stroke="#455A64" stroke-width="8"/>
      <circle cx="120" cy="140" r="10" fill="#4FC3F7"/><circle cx="145" cy="105" r="14" fill="#4FC3F7"/>
    `,
  },
  {
    filename: "mercusuar.webp",
    bg: "#E3F2FD",
    svgBody: `
      <polygon points="270,120 450,70 450,175 270,140" fill="#FFF176" opacity="0.75"/>
      <polygon points="230,120 50,70 50,175 230,140" fill="#FFF176" opacity="0.75"/>
      <path d="M60 390 Q250 365 440 390 L440 440 L60 440 Z" fill="#0288D1"/>
      <path d="M135 390 Q250 340 365 390 Z" fill="#78909C"/>
      <polygon points="205,370 295,370 278,160 222,160" fill="#FFFFFF" stroke="#B0BEC5" stroke-width="4"/>
      <polygon points="212,300 288,300 283,245 217,245" fill="#E53935"/>
      <polygon points="219,205 281,205 278,160 222,160" fill="#E53935"/>
      <rect x="210" y="145" width="80" height="18" rx="6" fill="#37474F"/>
      <rect x="225" y="105" width="50" height="42" fill="#FFD54F"/>
      <polygon points="215,105 250,72 285,105" fill="#D32F2F"/>
    `,
  },
  {
    filename: "pelabuhan.webp",
    bg: "#E1F5FE",
    svgBody: `
      <rect x="40" y="310" width="420" height="130" rx="16" fill="#0288D1"/>
      <rect x="40" y="265" width="215" height="55" rx="8" fill="#8D6E63"/>
      <rect x="65" y="315" width="22" height="75" fill="#5D4037"/>
      <rect x="135" y="315" width="22" height="75" fill="#5D4037"/>
      <rect x="205" y="315" width="22" height="75" fill="#5D4037"/>
      <rect x="90" y="220" width="26" height="45" rx="6" fill="#455A64"/>
      <path d="M250 285 L435 285 L410 345 L275 345 Z" fill="#E53935"/>
      <rect x="295" y="230" width="105" height="55" rx="8" fill="#FFFFFF"/>
      <rect x="315" y="245" width="25" height="22" fill="#81D4FA"/>
      <rect x="355" y="245" width="25" height="22" fill="#81D4FA"/>
      <rect x="335" y="190" width="24" height="40" fill="#37474F"/>
    `,
  },
  {
    filename: "nelayan.webp",
    bg: "#E3F2FD",
    svgBody: `
      <path d="M40 340 Q250 315 460 340 L460 440 L40 440 Z" fill="#039BE5"/>
      <path d="M85 300 L395 300 L355 360 L125 360 Z" fill="#8D6E63"/>
      <circle cx="215" cy="175" r="34" fill="#FFCC80"/>
      <polygon points="165,160 215,125 265,160" fill="#FFB300"/>
      <path d="M175 295 Q215 215 255 295 Z" fill="#1E88E5"/>
      <line x1="255" y1="245" x2="385" y2="145" stroke="#5D4037" stroke-width="8" stroke-linecap="round"/>
      <line x1="385" y1="145" x2="385" y2="275" stroke="#90A4AE" stroke-width="4"/>
      <ellipse cx="385" cy="285" rx="22" ry="12" fill="#FB8C00"/>
      <polygon points="405,285 422,275 422,295" fill="#FB8C00"/>
    `,
  },
  {
    filename: "ikan-paus.webp",
    bg: "#E1F5FE",
    svgBody: `
      <path d="M235 155 Q215 100 175 110 M245 155 Q265 100 305 110" stroke="#4FC3F7" stroke-width="10" fill="none" stroke-linecap="round"/>
      <path d="M85 275 Q85 160 235 160 Q355 160 385 260 L435 215 L425 280 L450 330 L380 305 Q335 350 205 350 Q95 350 85 275 Z" fill="#1565C0"/>
      <path d="M110 300 Q205 350 330 315 Q265 280 130 285 Z" fill="#BBDEFB"/>
      <circle cx="155" cy="235" r="12" fill="#FFFFFF"/><circle cx="155" cy="235" r="6" fill="#263238"/>
      <path d="M55 375 Q150 355 250 375 T445 375" stroke="#0288D1" stroke-width="12" fill="none" stroke-linecap="round"/>
    `,
  },
  {
    filename: "lumba-lumba.webp",
    bg: "#E0F7FA",
    svgBody: `
      <path d="M90 310 Q145 155 275 160 Q365 165 405 245 Q435 255 430 272 Q405 285 375 275 Q330 250 250 265 Q175 280 135 340 L95 365 L105 325 L70 315 Z" fill="#039BE5"/>
      <path d="M210 165 L245 110 L265 165 Z" fill="#0277BD"/>
      <path d="M270 255 Q315 245 365 270 Q315 295 250 285 Z" fill="#E1F5FE"/>
      <circle cx="350" cy="225" r="9" fill="#263238"/>
      <path d="M60 390 Q160 365 260 390 T440 390" stroke="#0288D1" stroke-width="12" fill="none" stroke-linecap="round"/>
    `,
  },
  {
    filename: "kepiting.webp",
    bg: "#FFF3E0",
    svgBody: `
      <g stroke="#D32F2F" stroke-width="14" fill="none" stroke-linecap="round">
        <path d="M165 265 L95 235 L70 275"/><path d="M160 295 L85 295 L65 335"/><path d="M170 325 L105 355 L90 395"/>
        <path d="M335 265 L405 235 L430 275"/><path d="M340 295 L415 295 L435 335"/><path d="M330 325 L395 355 L410 395"/>
      </g>
      <path d="M175 245 L140 165" stroke="#E53935" stroke-width="16" stroke-linecap="round"/>
      <path d="M325 245 L360 165" stroke="#E53935" stroke-width="16" stroke-linecap="round"/>
      <path d="M110 155 A35 35 0 1 1 165 125 L140 155 Z" fill="#E53935"/>
      <path d="M390 155 A35 35 0 1 0 335 125 L360 155 Z" fill="#E53935"/>
      <ellipse cx="250" cy="295" rx="95" ry="68" fill="#E53935"/>
      <line x1="215" y1="230" x2="215" y2="205" stroke="#D32F2F" stroke-width="10"/>
      <line x1="285" y1="230" x2="285" y2="205" stroke="#D32F2F" stroke-width="10"/>
      <circle cx="215" cy="198" r="14" fill="#FFFFFF"/><circle cx="215" cy="198" r="7" fill="#263238"/>
      <circle cx="285" cy="198" r="14" fill="#FFFFFF"/><circle cx="285" cy="198" r="7" fill="#263238"/>
      <path d="M225 315 Q250 335 275 315" stroke="#FFFFFF" stroke-width="6" fill="none" stroke-linecap="round"/>
    `,
  },
  {
    filename: "kerang-laut.webp",
    bg: "#FFF8E1",
    svgBody: `
      <path d="M95 270 Q95 115 250 115 Q405 115 405 270 Q340 355 250 355 Q160 355 95 270 Z" fill="#FFAB91" stroke="#E64A19" stroke-width="8"/>
      <rect x="195" y="345" width="110" height="36" rx="14" fill="#FF8A65" stroke="#E64A19" stroke-width="6"/>
      <g stroke="#E64A19" stroke-width="7" stroke-linecap="round">
        <line x1="250" y1="120" x2="250" y2="345"/>
        <line x1="185" y1="135" x2="225" y2="345"/>
        <line x1="315" y1="135" x2="275" y2="345"/>
        <line x1="130" y1="185" x2="205" y2="340"/>
        <line x1="370" y1="185" x2="295" y2="340"/>
      </g>
      <circle cx="250" cy="295" r="24" fill="#FFFFFF" stroke="#CFD8DC" stroke-width="4"/>
    `,
  },
];

const URBAN_SPECS: CustomSvgSpec[] = [
  {
    filename: "gedung-bertingkat.webp",
    bg: "#E8EAF6",
    svgBody: `
      <rect x="45" y="405" width="410" height="30" rx="10" fill="#78909C"/>
      <rect x="80" y="160" width="120" height="250" rx="8" fill="#5C6BC0"/>
      <rect x="180" y="85" width="140" height="325" rx="8" fill="#3949AB"/>
      <rect x="300" y="195" width="120" height="215" rx="8" fill="#7986CB"/>
      <g fill="#FFF59D">
        <rect x="102" y="190" width="24" height="28" rx="4"/><rect x="142" y="190" width="24" height="28" rx="4"/>
        <rect x="102" y="240" width="24" height="28" rx="4"/><rect x="142" y="240" width="24" height="28" rx="4"/>
        <rect x="102" y="290" width="24" height="28" rx="4"/><rect x="142" y="290" width="24" height="28" rx="4"/>
        <rect x="205" y="115" width="26" height="30" rx="4"/><rect x="242" y="115" width="26" height="30" rx="4"/><rect x="279" y="115" width="26" height="30" rx="4"/>
        <rect x="205" y="165" width="26" height="30" rx="4"/><rect x="242" y="165" width="26" height="30" rx="4"/><rect x="279" y="165" width="26" height="30" rx="4"/>
        <rect x="205" y="215" width="26" height="30" rx="4"/><rect x="242" y="215" width="26" height="30" rx="4"/><rect x="279" y="215" width="26" height="30" rx="4"/>
        <rect x="205" y="265" width="26" height="30" rx="4"/><rect x="242" y="265" width="26" height="30" rx="4"/><rect x="279" y="265" width="26" height="30" rx="4"/>
        <rect x="330" y="225" width="24" height="28" rx="4"/><rect x="370" y="225" width="24" height="28" rx="4"/>
        <rect x="330" y="275" width="24" height="28" rx="4"/><rect x="370" y="275" width="24" height="28" rx="4"/>
      </g>
      <rect x="230" y="345" width="40" height="65" rx="6" fill="#B3E5FC"/>
    `,
  },
  {
    filename: "lampu-jalan.webp",
    bg: "#ECEFF1",
    svgBody: `
      <rect x="65" y="405" width="370" height="30" rx="12" fill="#607D8B"/>
      <path d="M210 410 L210 135 Q210 95 255 95 L325 95" stroke="#37474F" stroke-width="22" fill="none" stroke-linecap="round"/>
      <rect x="190" y="365" width="40" height="45" rx="6" fill="#455A64"/>
      <polygon points="315,120 275,260 395,260 355,120" fill="#FFF59D" opacity="0.7"/>
      <rect x="290" y="85" width="90" height="30" rx="14" fill="#455A64"/>
      <ellipse cx="335" cy="115" rx="28" ry="14" fill="#FDD835"/>
    `,
  },
  {
    filename: "halte-bus.webp",
    bg: "#E3F2FD",
    svgBody: `
      <rect x="45" y="385" width="410" height="35" rx="10" fill="#90A4AE"/>
      <rect x="95" y="135" width="310" height="26" rx="10" fill="#1E88E5"/>
      <rect x="115" y="160" width="18" height="225" fill="#455A64"/>
      <rect x="365" y="160" width="18" height="225" fill="#455A64"/>
      <rect x="133" y="175" width="232" height="145" fill="#B3E5FC" opacity="0.65"/>
      <rect x="165" y="305" width="170" height="22" rx="6" fill="#FB8C00"/>
      <rect x="180" y="327" width="14" height="58" fill="#5D4037"/>
      <rect x="306" y="327" width="14" height="58" fill="#5D4037"/>
      <rect x="415" y="165" width="10" height="220" fill="#455A64"/>
      <circle cx="420" cy="145" r="28" fill="#1565C0"/>
      <rect x="406" y="132" width="28" height="22" rx="4" fill="#FFFFFF"/>
    `,
  },
  {
    filename: "stasiun-kereta.webp",
    bg: "#E8EAF6",
    svgBody: `
      <rect x="40" y="370" width="420" height="45" rx="8" fill="#90A4AE"/>
      <rect x="75" y="155" width="350" height="215" rx="10" fill="#E57373"/>
      <polygon points="55,155 250,80 445,155" fill="#C62828"/>
      <circle cx="250" cy="122" r="26" fill="#FFFFFF" stroke="#37474F" stroke-width="5"/>
      <line x1="250" y1="122" x2="250" y2="106" stroke="#37474F" stroke-width="4" stroke-linecap="round"/>
      <line x1="250" y1="122" x2="263" y2="122" stroke="#37474F" stroke-width="4" stroke-linecap="round"/>
      <rect x="115" y="210" width="75" height="60" rx="8" fill="#B3E5FC"/>
      <rect x="310" y="210" width="75" height="60" rx="8" fill="#B3E5FC"/>
      <path d="M210 370 L210 245 A40 40 0 0 1 290 245 L290 370 Z" fill="#1E88E5"/>
      <line x1="55" y1="425" x2="445" y2="425" stroke="#455A64" stroke-width="8"/>
    `,
  },
  {
    filename: "jembatan.webp",
    bg: "#E1F5FE",
    svgBody: `
      <rect x="40" y="340" width="420" height="90" rx="14" fill="#0288D1"/>
      <path d="M50 250 L450 250 L450 285 L370 285 Q250 220 130 285 L50 285 Z" fill="#78909C"/>
      <path d="M110 250 Q250 115 390 250" stroke="#E53935" stroke-width="16" fill="none" stroke-linecap="round"/>
      <g stroke="#E53935" stroke-width="8">
        <line x1="160" y1="198" x2="160" y2="250"/>
        <line x1="205" y1="168" x2="205" y2="250"/>
        <line x1="250" y1="158" x2="250" y2="250"/>
        <line x1="295" y1="168" x2="295" y2="250"/>
        <line x1="340" y1="198" x2="340" y2="250"/>
      </g>
      <rect x="40" y="242" width="420" height="18" rx="6" fill="#455A64"/>
    `,
  },
  {
    filename: "kantor-pos.webp",
    bg: "#FFF3E0",
    svgBody: `
      <rect x="75" y="175" width="350" height="225" rx="14" fill="#FB8C00"/>
      <polygon points="60,175 250,90 440,175" fill="#E65100"/>
      <rect x="175" y="110" width="150" height="90" rx="12" fill="#FFFFFF" stroke="#E65100" stroke-width="6"/>
      <polyline points="182,118 250,162 318,118" fill="none" stroke="#E65100" stroke-width="7" stroke-linejoin="round"/>
      <rect x="110" y="245" width="85" height="65" rx="8" fill="#B3E5FC"/>
      <rect x="305" y="245" width="85" height="65" rx="8" fill="#B3E5FC"/>
      <rect x="215" y="265" width="70" height="135" rx="8" fill="#5D4037"/>
      <rect x="55" y="395" width="390" height="24" rx="8" fill="#90A4AE"/>
    `,
  },
];

const NATURE_SPECS: CustomSvgSpec[] = [
  {
    filename: "sawah.webp",
    bg: "#E8F5E9",
    svgBody: `
      <circle cx="380" cy="100" r="40" fill="#FFB300"/>
      <path d="M40 215 L145 125 L250 215 L350 135 L460 215 L460 270 L40 270 Z" fill="#5C6BC0"/>
      <path d="M40 255 Q250 230 460 255 L460 440 L40 440 Z" fill="#81C784"/>
      <path d="M40 310 Q250 280 460 310 L460 440 L40 440 Z" fill="#66BB6A"/>
      <path d="M40 370 Q250 340 460 370 L460 440 L40 440 Z" fill="#43A047"/>
      <g stroke="#2E7D32" stroke-width="6" stroke-linecap="round">
        <line x1="100" y1="335" x2="100" y2="305"/><line x1="150" y1="330" x2="150" y2="300"/>
        <line x1="250" y1="325" x2="250" y2="295"/><line x1="350" y1="330" x2="350" y2="300"/>
        <line x1="130" y1="400" x2="130" y2="370"/><line x1="210" y1="395" x2="210" y2="365"/>
        <line x1="300" y1="395" x2="300" y2="365"/><line x1="380" y1="400" x2="380" y2="370"/>
      </g>
    `,
  },
  {
    filename: "rumah-desa.webp",
    bg: "#F1F8E9",
    svgBody: `
      <rect x="40" y="365" width="420" height="75" rx="14" fill="#66BB6A"/>
      <rect x="115" y="235" width="270" height="145" rx="10" fill="#FFE0B2" stroke="#8D6E63" stroke-width="8"/>
      <polygon points="85,245 250,115 415,245" fill="#8D6E63"/>
      <polygon points="115,235 250,130 385,235" fill="#A1887F"/>
      <rect x="215" y="275" width="70" height="105" rx="6" fill="#6D4C41"/>
      <rect x="135" y="265" width="55" height="55" rx="6" fill="#B3E5FC" stroke="#6D4C41" stroke-width="5"/>
      <rect x="310" y="265" width="55" height="55" rx="6" fill="#B3E5FC" stroke="#6D4C41" stroke-width="5"/>
      <circle cx="75" cy="240" r="35" fill="#43A047"/><rect x="67" y="270" width="16" height="95" fill="#5D4037"/>
    `,
  },
  {
    filename: "kincir-angin.webp",
    bg: "#E1F5FE",
    svgBody: `
      <rect x="40" y="390" width="420" height="50" rx="14" fill="#66BB6A"/>
      <polygon points="200,395 300,395 275,180 225,180" fill="#EFEBE9" stroke="#8D6E63" stroke-width="6"/>
      <path d="M225 180 Q250 135 275 180 Z" fill="#D84315"/>
      <rect x="232" y="325" width="36" height="70" rx="6" fill="#6D4C41"/>
      <g transform="translate(250, 185)">
        <rect x="-12" y="-120" width="24" height="110" rx="8" fill="#1E88E5"/>
        <rect x="-12" y="10" width="24" height="110" rx="8" fill="#1E88E5"/>
        <rect x="-120" y="-12" width="110" height="24" rx="8" fill="#42A5F5"/>
        <rect x="10" y="-12" width="110" height="24" rx="8" fill="#42A5F5"/>
        <circle cx="0" cy="0" r="18" fill="#37474F"/>
      </g>
    `,
  },
  {
    filename: "traktor.webp",
    bg: "#F1F8E9",
    svgBody: `
      <rect x="180" y="135" width="110" height="100" rx="12" fill="#B3E5FC" stroke="#2E7D32" stroke-width="10"/>
      <rect x="165" y="220" width="215" height="95" rx="16" fill="#43A047"/>
      <rect x="330" y="155" width="18" height="65" rx="6" fill="#455A64"/>
      <circle cx="170" cy="335" r="68" fill="#263238"/>
      <circle cx="170" cy="335" r="34" fill="#FDD835"/>
      <circle cx="355" cy="355" r="44" fill="#263238"/>
      <circle cx="355" cy="355" r="20" fill="#FDD835"/>
      <rect x="380" y="245" width="16" height="32" rx="6" fill="#FFF176"/>
    `,
  },
  {
    filename: "hutan.webp",
    bg: "#E8F5E9",
    svgBody: `
      <rect x="40" y="380" width="420" height="60" rx="16" fill="#4CAF50"/>
      <rect x="105" y="275" width="24" height="110" fill="#6D4C41"/>
      <polygon points="117,125 55,285 179,285" fill="#2E7D32"/>
      <polygon points="117,90 70,210 164,210" fill="#388E3C"/>
      <rect x="370" y="275" width="24" height="110" fill="#6D4C41"/>
      <polygon points="382,125 320,285 444,285" fill="#2E7D32"/>
      <polygon points="382,90 335,210 429,210" fill="#388E3C"/>
      <rect x="235" y="255" width="30" height="130" fill="#5D4037"/>
      <circle cx="250" cy="185" r="78" fill="#43A047"/>
      <circle cx="205" cy="215" r="52" fill="#66BB6A"/>
      <circle cx="295" cy="215" r="52" fill="#66BB6A"/>
    `,
  },
  {
    filename: "danau.webp",
    bg: "#E0F7FA",
    svgBody: `
      <path d="M40 215 L155 110 L265 215 L360 130 L460 215 L460 250 L40 250 Z" fill="#5C6BC0"/>
      <rect x="40" y="240" width="420" height="200" rx="16" fill="#81C784"/>
      <ellipse cx="250" cy="340" rx="185" ry="72" fill="#039BE5"/>
      <ellipse cx="250" cy="340" rx="140" ry="48" fill="#29B6F6"/>
      <path d="M165 340 Q210 325 255 340 T340 340" stroke="#E1F5FE" stroke-width="6" fill="none" stroke-linecap="round"/>
      <circle cx="95" cy="220" r="32" fill="#2E7D32"/><rect x="89" y="245" width="12" height="40" fill="#5D4037"/>
    `,
  },
  {
    filename: "air-terjun.webp",
    bg: "#E1F5FE",
    svgBody: `
      <rect x="65" y="95" width="145" height="260" rx="16" fill="#78909C"/>
      <rect x="290" y="95" width="145" height="260" rx="16" fill="#78909C"/>
      <rect x="175" y="95" width="150" height="265" fill="#29B6F6"/>
      <g stroke="#E1F5FE" stroke-width="10" stroke-linecap="round">
        <line x1="205" y1="120" x2="205" y2="335"/>
        <line x1="250" y1="115" x2="250" y2="340"/>
        <line x1="295" y1="120" x2="295" y2="335"/>
      </g>
      <ellipse cx="250" cy="385" rx="190" ry="52" fill="#0288D1"/>
      <ellipse cx="250" cy="358" rx="95" ry="22" fill="#FFFFFF" opacity="0.85"/>
    `,
  },
  {
    filename: "kayu.webp",
    bg: "#EFEBE9",
    svgBody: `
      <path d="M110 210 L355 150 A45 65 0 0 1 380 270 L135 330 Z" fill="#6D4C41"/>
      <ellipse cx="122" cy="270" rx="38" ry="62" fill="#D7CCC8" stroke="#5D4037" stroke-width="8"/>
      <ellipse cx="122" cy="270" rx="22" ry="38" fill="none" stroke="#8D6E63" stroke-width="5"/>
      <circle cx="122" cy="270" r="8" fill="#8D6E63"/>
      <path d="M175 215 L335 178 M185 260 L350 222" stroke="#4E342E" stroke-width="7" stroke-linecap="round"/>
      <path d="M225 182 L205 140 L240 178 Z" fill="#6D4C41"/>
    `,
  },
  {
    filename: "api.webp",
    bg: "#FFF3E0",
    svgBody: `
      <rect x="120" y="365" width="260" height="30" rx="14" transform="rotate(-12 250 380)" fill="#6D4C41"/>
      <rect x="120" y="365" width="260" height="30" rx="14" transform="rotate(12 250 380)" fill="#5D4037"/>
      <path d="M250 85 Q355 180 350 280 Q345 365 250 365 Q155 365 150 280 Q145 205 215 150 Q210 195 235 205 Q215 135 250 85 Z" fill="#FF5722"/>
      <path d="M250 165 Q315 225 310 290 Q305 350 250 350 Q195 350 190 290 Q188 235 250 165 Z" fill="#FF9800"/>
      <path d="M250 235 Q280 270 278 310 Q275 340 250 340 Q225 340 222 310 Q220 270 250 235 Z" fill="#FFEB3B"/>
    `,
  },
];

const ANIMAL_SPECS: CustomSvgSpec[] = [
  {
    filename: "sayap-burung.webp",
    bg: "#E3F2FD",
    svgBody: `
      <path d="M90 325 Q105 155 265 110 Q385 80 420 120 Q395 190 330 220 Q380 230 390 255 Q335 280 275 280 Q315 305 320 335 Q225 365 90 325 Z" fill="#1E88E5"/>
      <path d="M115 310 Q165 215 365 140" stroke="#90CAF9" stroke-width="10" fill="none" stroke-linecap="round"/>
      <path d="M125 315 Q205 255 340 235" stroke="#BBDEFB" stroke-width="8" fill="none" stroke-linecap="round"/>
      <path d="M135 320 Q205 300 285 315" stroke="#E3F2FD" stroke-width="8" fill="none" stroke-linecap="round"/>
    `,
  },
  {
    filename: "paruh-burung.webp",
    bg: "#FFFDE7",
    svgBody: `
      <circle cx="170" cy="240" r="105" fill="#42A5F5"/>
      <circle cx="195" cy="215" r="18" fill="#FFFFFF"/><circle cx="198" cy="215" r="9" fill="#263238"/>
      <path d="M250 195 Q365 195 425 265 Q335 275 245 255 Z" fill="#FFB300" stroke="#EF6C00" stroke-width="6"/>
      <path d="M250 255 L370 262 Q315 300 245 285 Z" fill="#FB8C00" stroke="#E65100" stroke-width="5"/>
    `,
  },
  {
    filename: "sirip-ikan.webp",
    bg: "#E0F7FA",
    svgBody: `
      <path d="M75 255 Q195 150 365 255 Q195 360 75 255 Z" fill="#80DEEA" stroke="#0097A7" stroke-width="6"/>
      <path d="M185 195 Q235 100 315 125 Q295 185 265 205 Z" fill="#FF7043" stroke="#D84315" stroke-width="6"/>
      <path d="M210 265 Q260 280 285 335 Q220 340 195 290 Z" fill="#FF7043" stroke="#D84315" stroke-width="6"/>
      <path d="M350 255 L425 190 L410 255 L425 320 Z" fill="#FF7043" stroke="#D84315" stroke-width="6"/>
      <circle cx="135" cy="245" r="10" fill="#263238"/>
    `,
  },
  {
    filename: "ekor-hewan.webp",
    bg: "#FFF3E0",
    svgBody: `
      <path d="M85 160 L210 160 Q245 160 245 240 L245 365 L145 365 L145 285 L85 285 Z" fill="#FFCC80"/>
      <path d="M240 225 Q340 215 385 155 Q415 115 385 95 Q355 80 345 120 Q320 180 240 195" fill="none" stroke="#FB8C00" stroke-width="32" stroke-linecap="round"/>
      <circle cx="380" cy="108" r="22" fill="#E65100"/>
    `,
  },
  {
    filename: "cakar-hewan.webp",
    bg: "#FFF8E1",
    svgBody: `
      <ellipse cx="250" cy="310" rx="115" ry="75" fill="#8D6E63"/>
      <ellipse cx="250" cy="325" rx="68" ry="42" fill="#D7CCC8"/>
      <ellipse cx="145" cy="215" rx="30" ry="38" fill="#8D6E63"/>
      <ellipse cx="215" cy="190" rx="30" ry="38" fill="#8D6E63"/>
      <ellipse cx="285" cy="190" rx="30" ry="38" fill="#8D6E63"/>
      <ellipse cx="355" cy="215" rx="30" ry="38" fill="#8D6E63"/>
      <polygon points="135,180 145,105 160,180" fill="#FFFDE7" stroke="#5D4037" stroke-width="4"/>
      <polygon points="205,155 215,75 230,155" fill="#FFFDE7" stroke="#5D4037" stroke-width="4"/>
      <polygon points="275,155 285,75 300,155" fill="#FFFDE7" stroke="#5D4037" stroke-width="4"/>
      <polygon points="345,180 355,105 370,180" fill="#FFFDE7" stroke="#5D4037" stroke-width="4"/>
    `,
  },
  {
    filename: "tanduk-hewan.webp",
    bg: "#EFEBE9",
    svgBody: `
      <path d="M185 215 Q105 190 95 95 Q135 145 195 175 Z" fill="#FFF8E1" stroke="#6D4C41" stroke-width="7"/>
      <path d="M315 215 Q395 190 405 95 Q365 145 305 175 Z" fill="#FFF8E1" stroke="#6D4C41" stroke-width="7"/>
      <path d="M165 205 L335 205 L310 370 Q250 405 190 370 Z" fill="#8D6E63"/>
      <circle cx="215" cy="260" r="12" fill="#263238"/><circle cx="285" cy="260" r="12" fill="#263238"/>
      <ellipse cx="250" cy="340" rx="52" ry="30" fill="#FFCCBC"/>
      <circle cx="232" cy="340" r="7" fill="#6D4C41"/><circle cx="268" cy="340" r="7" fill="#6D4C41"/>
    `,
  },
  {
    filename: "belalai-gajah.webp",
    bg: "#ECEFF1",
    svgBody: `
      <ellipse cx="145" cy="215" rx="65" ry="90" fill="#78909C"/>
      <circle cx="235" cy="205" r="95" fill="#90A4AE"/>
      <circle cx="235" cy="180" r="13" fill="#263238"/>
      <path d="M275 235 Q360 250 370 330 Q375 395 315 395 Q275 395 280 355" fill="none" stroke="#90A4AE" stroke-width="46" stroke-linecap="round"/>
      <path d="M285 255 Q340 275 365 260" fill="none" stroke="#FFFDE7" stroke-width="18" stroke-linecap="round"/>
    `,
  },
  {
    filename: "insang-ikan.webp",
    bg: "#E0F2F1",
    svgBody: `
      <path d="M85 250 Q180 120 355 150 Q425 200 425 250 Q425 300 355 350 Q180 380 85 250 Z" fill="#29B6F6"/>
      <circle cx="345" cy="215" r="16" fill="#FFFFFF"/><circle cx="348" cy="215" r="8" fill="#263238"/>
      <path d="M265 185 Q240 250 265 315" stroke="#E53935" stroke-width="14" fill="none" stroke-linecap="round"/>
      <path d="M240 195 Q215 250 240 305" stroke="#EF5350" stroke-width="12" fill="none" stroke-linecap="round"/>
      <path d="M215 205 Q195 250 215 295" stroke="#E57373" stroke-width="10" fill="none" stroke-linecap="round"/>
      <path d="M85 250 L45 195 L60 250 L45 305 Z" fill="#0288D1"/>
    `,
  },
  {
    filename: "sisik-ikan.webp",
    bg: "#E0F7FA",
    svgBody: `
      <rect x="85" y="105" width="330" height="290" rx="34" fill="#0288D1"/>
      <g fill="#29B6F6" stroke="#E1F5FE" stroke-width="6">
        <circle cx="155" cy="175" r="46"/><circle cx="250" cy="175" r="46"/><circle cx="345" cy="175" r="46"/>
        <circle cx="202" cy="235" r="46"/><circle cx="298" cy="235" r="46"/>
        <circle cx="155" cy="295" r="46"/><circle cx="250" cy="295" r="46"/><circle cx="345" cy="295" r="46"/>
      </g>
    `,
  },
  {
    filename: "harimau.webp",
    bg: "#FFF3E0",
    svgBody: `
      <circle cx="145" cy="145" r="42" fill="#FB8C00"/><circle cx="355" cy="145" r="42" fill="#FB8C00"/>
      <circle cx="145" cy="145" r="22" fill="#FFE0B2"/><circle cx="355" cy="145" r="22" fill="#FFE0B2"/>
      <circle cx="250" cy="255" r="130" fill="#FB8C00"/>
      <ellipse cx="250" cy="310" rx="68" ry="52" fill="#FFF3E0"/>
      <g stroke="#263238" stroke-width="12" stroke-linecap="round">
        <line x1="250" y1="135" x2="250" y2="185"/>
        <line x1="215" y1="150" x2="232" y2="185"/><line x1="285" y1="150" x2="268" y2="185"/>
        <line x1="130" y1="240" x2="170" y2="250"/><line x1="370" y1="240" x2="330" y2="250"/>
        <line x1="135" y1="280" x2="175" y2="275"/><line x1="365" y1="280" x2="325" y2="275"/>
      </g>
      <circle cx="205" cy="235" r="15" fill="#263238"/><circle cx="295" cy="235" r="15" fill="#263238"/>
      <polygon points="232,285 268,285 250,310" fill="#E65100"/>
      <path d="M220 330 Q250 350 280 330" stroke="#263238" stroke-width="6" fill="none" stroke-linecap="round"/>
    `,
  },
  {
    filename: "jerapah.webp",
    bg: "#FFFDE7",
    svgBody: `
      <rect x="200" y="210" width="58" height="220" rx="22" fill="#FFD54F"/>
      <circle cx="220" cy="275" r="14" fill="#8D6E63"/><circle cx="240" cy="340" r="16" fill="#8D6E63"/><circle cx="215" cy="395" r="12" fill="#8D6E63"/>
      <line x1="205" y1="125" x2="195" y2="75" stroke="#8D6E63" stroke-width="10" stroke-linecap="round"/>
      <line x1="245" y1="125" x2="255" y2="75" stroke="#8D6E63" stroke-width="10" stroke-linecap="round"/>
      <circle cx="195" cy="72" r="10" fill="#6D4C41"/><circle cx="255" cy="72" r="10" fill="#6D4C41"/>
      <ellipse cx="170" cy="145" rx="35" ry="18" fill="#FFB300"/>
      <ellipse cx="285" cy="145" rx="35" ry="18" fill="#FFB300"/>
      <ellipse cx="235" cy="175" rx="64" ry="72" fill="#FFD54F"/>
      <ellipse cx="245" cy="215" rx="48" ry="30" fill="#FFE0B2"/>
      <circle cx="210" cy="160" r="11" fill="#263238"/><circle cx="260" cy="160" r="11" fill="#263238"/>
      <circle cx="230" cy="212" r="6" fill="#6D4C41"/><circle cx="260" cy="212" r="6" fill="#6D4C41"/>
    `,
  },
  {
    filename: "penyu.webp",
    bg: "#E0F7FA",
    svgBody: `
      <path d="M160 195 Q95 140 80 185 Q105 225 160 225 Z" fill="#66BB6A"/>
      <path d="M340 195 Q405 140 420 185 Q395 225 340 225 Z" fill="#66BB6A"/>
      <path d="M175 320 Q125 375 155 405 Q195 385 205 335 Z" fill="#66BB6A"/>
      <path d="M325 320 Q375 375 345 405 Q305 385 295 335 Z" fill="#66BB6A"/>
      <ellipse cx="250" cy="120" rx="38" ry="46" fill="#81C784"/>
      <circle cx="235" cy="108" r="7" fill="#263238"/><circle cx="265" cy="108" r="7" fill="#263238"/>
      <ellipse cx="250" cy="260" rx="102" ry="118" fill="#2E7D32"/>
      <polygon points="250,185 295,220 280,295 220,295 205,220" fill="#66BB6A" stroke="#1B5E20" stroke-width="6"/>
    `,
  },
  {
    filename: "lebah.webp",
    bg: "#FFFDE7",
    svgBody: `
      <ellipse cx="195" cy="155" rx="58" ry="38" transform="rotate(-25 195 155)" fill="#E1F5FE" stroke="#81D4FA" stroke-width="6"/>
      <ellipse cx="305" cy="155" rx="58" ry="38" transform="rotate(25 305 155)" fill="#E1F5FE" stroke="#81D4FA" stroke-width="6"/>
      <ellipse cx="250" cy="275" rx="115" ry="75" fill="#FDD835"/>
      <rect x="200" y="208" width="28" height="134" rx="10" fill="#263238"/>
      <rect x="255" y="205" width="28" height="140" rx="10" fill="#263238"/>
      <rect x="310" y="220" width="22" height="110" rx="10" fill="#263238"/>
      <circle cx="155" cy="265" r="42" fill="#263238"/>
      <circle cx="142" cy="255" r="9" fill="#FFFFFF"/>
      <path d="M135 225 L110 190 M160 225 L155 185" stroke="#263238" stroke-width="6" stroke-linecap="round"/>
      <polygon points="362,275 395,275 362,288" fill="#263238"/>
    `,
  },
  {
    filename: "burung-elang.webp",
    bg: "#EFEBE9",
    svgBody: `
      <path d="M80 185 Q150 110 250 195 Q350 110 420 185 Q385 275 295 265 L250 385 L205 265 Q115 275 80 185 Z" fill="#6D4C41"/>
      <circle cx="250" cy="155" r="48" fill="#FFFFFF"/>
      <path d="M250 155 Q295 155 305 185 Q275 185 250 175 Z" fill="#FFB300"/>
      <circle cx="235" cy="148" r="8" fill="#263238"/>
      <polygon points="225,365 250,415 275,365" fill="#5D4037"/>
    `,
  },
];

const BODY_SPECS: CustomSvgSpec[] = [
  {
    filename: "lutut.webp",
    bg: "#FFF8E1",
    svgBody: `
      <path d="M165 85 L210 235 L195 415" stroke="#FFCC80" stroke-width="76" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="215" cy="235" r="56" fill="#E53935" opacity="0.22"/>
      <circle cx="215" cy="235" r="56" fill="none" stroke="#E53935" stroke-width="8" stroke-dasharray="14 10"/>
      <path d="M340 235 L275 235" stroke="#E53935" stroke-width="10" stroke-linecap="round"/>
      <polygon points="260,235 285,220 285,250" fill="#E53935"/>
    `,
  },
  {
    filename: "siku.webp",
    bg: "#FFF3E0",
    svgBody: `
      <path d="M165 95 L165 280 L365 280" stroke="#FFCC80" stroke-width="70" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="165" cy="285" r="54" fill="#FB8C00" opacity="0.25"/>
      <circle cx="165" cy="285" r="54" fill="none" stroke="#E65100" stroke-width="8" stroke-dasharray="14 10"/>
      <circle cx="385" cy="280" r="32" fill="#FFCC80"/>
    `,
  },
  {
    filename: "bahu.webp",
    bg: "#E3F2FD",
    svgBody: `
      <circle cx="250" cy="125" r="54" fill="#FFCC80"/>
      <rect x="228" y="170" width="44" height="45" fill="#FFCC80"/>
      <path d="M125 255 Q125 205 250 205 Q375 205 375 255 L390 400 L110 400 Z" fill="#1E88E5"/>
      <circle cx="145" cy="235" r="42" fill="#E53935" opacity="0.28"/>
      <circle cx="145" cy="235" r="42" fill="none" stroke="#D32F2F" stroke-width="8"/>
      <circle cx="355" cy="235" r="42" fill="#E53935" opacity="0.28"/>
      <circle cx="355" cy="235" r="42" fill="none" stroke="#D32F2F" stroke-width="8"/>
    `,
  },
  {
    filename: "otak-manusia.webp",
    bg: "#FCE4EC",
    svgBody: `
      <path d="M145 285 Q105 265 115 215 Q115 155 170 140 Q205 100 255 115 Q310 100 345 145 Q395 165 385 225 Q390 275 340 295 Q305 315 260 295 Q205 315 145 285 Z" fill="#F48FB1" stroke="#AD1457" stroke-width="8"/>
      <line x1="250" y1="120" x2="250" y2="295" stroke="#AD1457" stroke-width="7"/>
      <path d="M155 190 Q190 175 220 200 M155 245 Q195 230 225 255 M280 190 Q315 175 345 200 M280 245 Q315 230 345 255" stroke="#AD1457" stroke-width="7" fill="none" stroke-linecap="round"/>
      <rect x="232" y="295" width="36" height="80" rx="14" fill="#F48FB1" stroke="#AD1457" stroke-width="7"/>
    `,
  },
];

const PROFESSION_SPECS: CustomSvgSpec[] = [
  {
    filename: "pedagang.webp",
    bg: "#FFF8E1",
    svgBody: `
      <rect x="85" y="105" width="330" height="55" rx="12" fill="#E53935"/>
      <rect x="135" y="105" width="55" height="55" fill="#FFFFFF"/><rect x="255" y="105" width="55" height="55" fill="#FFFFFF"/>
      <circle cx="250" cy="205" r="38" fill="#FFCC80"/>
      <path d="M195 295 Q250 245 305 295 Z" fill="#43A047"/>
      <rect x="75" y="295" width="350" height="120" rx="14" fill="#8D6E63"/>
      <circle cx="155" cy="275" r="24" fill="#E53935"/><circle cx="210" cy="275" r="24" fill="#FFB300"/><circle cx="340" cy="275" r="24" fill="#66BB6A"/>
    `,
  },
  {
    filename: "kasir.webp",
    bg: "#E8F5E9",
    svgBody: `
      <circle cx="190" cy="145" r="38" fill="#FFCC80"/>
      <path d="M135 265 Q190 195 245 265 Z" fill="#1E88E5"/>
      <rect x="75" y="265" width="350" height="140" rx="14" fill="#78909C"/>
      <rect x="250" y="175" width="135" height="90" rx="10" fill="#37474F"/>
      <rect x="268" y="190" width="98" height="44" rx="6" fill="#81D4FA"/>
      <rect x="250" y="255" width="135" height="32" rx="6" fill="#B0BEC5"/>
    `,
  },
  {
    filename: "tukang-kayu.webp",
    bg: "#EFEBE9",
    svgBody: `
      <circle cx="250" cy="145" r="44" fill="#FFCC80"/>
      <path d="M198 130 Q250 85 302 130 Z" fill="#FFB300"/>
      <path d="M165 290 Q250 205 335 290 L325 395 L175 395 Z" fill="#1E88E5"/>
      <rect x="195" y="255" width="110" height="140" rx="10" fill="#8D6E63"/>
      <rect x="110" y="250" width="16" height="115" rx="6" fill="#5D4037"/>
      <rect x="85" y="235" width="66" height="28" rx="6" fill="#90A4AE"/>
    `,
  },
  {
    filename: "montir.webp",
    bg: "#ECEFF1",
    svgBody: `
      <circle cx="250" cy="145" r="44" fill="#FFCC80"/>
      <path d="M198 130 Q250 90 302 130 Z" fill="#1565C0"/>
      <path d="M165 290 Q250 205 335 290 L325 395 L175 395 Z" fill="#1E88E5"/>
      <path d="M350 215 L350 365" stroke="#90A4AE" stroke-width="24" stroke-linecap="round"/>
      <circle cx="350" cy="205" r="32" fill="#90A4AE"/>
      <rect x="336" y="175" width="28" height="28" fill="#ECEFF1"/>
    `,
  },
  {
    filename: "pilot.webp",
    bg: "#E3F2FD",
    svgBody: `
      <circle cx="250" cy="165" r="48" fill="#FFCC80"/>
      <path d="M192 145 L308 145 L295 102 L205 102 Z" fill="#1A237E"/>
      <rect x="198" y="142" width="104" height="14" rx="4" fill="#FFD54F"/>
      <path d="M155 310 Q250 225 345 310 L335 415 L165 415 Z" fill="#1A237E"/>
      <polygon points="235,245 265,245 258,340 242,340" fill="#FFFFFF"/>
      <circle cx="228" cy="162" r="7" fill="#263238"/><circle cx="272" cy="162" r="7" fill="#263238"/>
    `,
  },
  {
    filename: "penjahit.webp",
    bg: "#FCE4EC",
    svgBody: `
      <rect x="85" y="340" width="330" height="45" rx="12" fill="#8D6E63"/>
      <path d="M150 340 L150 185 Q150 145 195 145 L335 145 Q365 145 365 185 L365 245 L325 245 L325 205 L210 205 L210 340 Z" fill="#EC407A"/>
      <line x1="175" y1="245" x2="175" y2="305" stroke="#90A4AE" stroke-width="6"/>
      <circle cx="345" cy="195" r="24" fill="#37474F"/>
      <rect x="245" y="110" width="36" height="35" rx="6" fill="#FFB300"/>
    `,
  },
  {
    filename: "orang-dewasa.webp",
    bg: "#E8EAF6",
    svgBody: `
      <circle cx="250" cy="115" r="46" fill="#FFCC80"/>
      <path d="M204 105 Q250 60 296 105 Z" fill="#4E342E"/>
      <path d="M180 235 Q180 175 250 175 Q320 175 320 235 L310 315 L190 315 Z" fill="#1E88E5"/>
      <rect x="200" y="315" width="42" height="115" rx="14" fill="#37474F"/>
      <rect x="258" y="315" width="42" height="115" rx="14" fill="#37474F"/>
      <circle cx="233" cy="115" r="6" fill="#263238"/><circle cx="267" cy="115" r="6" fill="#263238"/>
    `,
  },
  {
    filename: "lansia.webp",
    bg: "#FFF3E0",
    svgBody: `
      <circle cx="240" cy="118" r="46" fill="#FFCC80"/>
      <path d="M194 108 Q240 65 286 108 Z" fill="#ECEFF1"/>
      <circle cx="222" cy="120" r="14" fill="none" stroke="#455A64" stroke-width="5"/>
      <circle cx="258" cy="120" r="14" fill="none" stroke="#455A64" stroke-width="5"/>
      <path d="M175 240 Q175 178 240 178 Q305 178 305 240 L295 320 L185 320 Z" fill="#8D6E63"/>
      <rect x="195" y="320" width="38" height="105" rx="12" fill="#5D4037"/>
      <rect x="247" y="320" width="38" height="105" rx="12" fill="#5D4037"/>
      <path d="M330 250 L330 425 M330 250 Q330 230 350 230" stroke="#6D4C41" stroke-width="14" fill="none" stroke-linecap="round"/>
    `,
  },
];

const CLOTHING_TRANSPORT_SPECS: CustomSvgSpec[] = [
  {
    filename: "jas-hujan.webp",
    bg: "#E1F5FE",
    svgBody: `
      <path d="M185 135 Q250 75 315 135 L395 235 L350 265 L315 215 L315 415 L185 415 L185 215 L150 265 L105 235 Z" fill="#FDD835" stroke="#F57F17" stroke-width="8" stroke-linejoin="round"/>
      <line x1="250" y1="150" x2="250" y2="415" stroke="#F57F17" stroke-width="7"/>
      <circle cx="250" cy="120" r="32" fill="#FFF9C4" stroke="#F57F17" stroke-width="6"/>
    `,
  },
  {
    filename: "ambulans.webp",
    bg: "#FFEBEE",
    svgBody: `
      <rect x="70" y="185" width="245" height="155" rx="18" fill="#FFFFFF" stroke="#CFD8DC" stroke-width="6"/>
      <path d="M315 215 L395 215 Q425 215 425 250 L425 340 L315 340 Z" fill="#FFFFFF" stroke="#CFD8DC" stroke-width="6"/>
      <rect x="335" y="230" width="68" height="50" rx="8" fill="#B3E5FC"/>
      <rect x="165" y="220" width="54" height="20" rx="4" fill="#E53935"/>
      <rect x="182" y="203" width="20" height="54" rx="4" fill="#E53935"/>
      <rect x="275" y="158" width="38" height="26" rx="8" fill="#1E88E5"/>
      <circle cx="145" cy="350" r="38" fill="#263238"/><circle cx="145" cy="350" r="18" fill="#CFD8DC"/>
      <circle cx="355" cy="350" r="38" fill="#263238"/><circle cx="355" cy="350" r="18" fill="#CFD8DC"/>
    `,
  },
  {
    filename: "helikopter.webp",
    bg: "#E3F2FD",
    svgBody: `
      <rect x="75" y="130" width="350" height="16" rx="8" fill="#37474F"/>
      <rect x="242" y="140" width="16" height="45" fill="#455A64"/>
      <rect x="75" y="245" width="145" height="26" rx="10" fill="#E53935"/>
      <circle cx="75" cy="255" r="24" fill="none" stroke="#37474F" stroke-width="8"/>
      <ellipse cx="285" cy="255" rx="115" ry="68" fill="#E53935"/>
      <path d="M290 200 Q375 200 390 255 L290 255 Z" fill="#B3E5FC"/>
      <line x1="215" y1="320" x2="215" y2="355" stroke="#455A64" stroke-width="10"/>
      <line x1="340" y1="320" x2="340" y2="355" stroke="#455A64" stroke-width="10"/>
      <line x1="175" y1="355" x2="385" y2="355" stroke="#37474F" stroke-width="14" stroke-linecap="round"/>
    `,
  },
];

const HOME_TOOLS_SPECS: CustomSvgSpec[] = [
  {
    filename: "ruang-tamu.webp",
    bg: "#FFF8E1",
    svgBody: `
      <rect x="55" y="340" width="390" height="75" rx="14" fill="#FFE0B2"/>
      <rect x="115" y="220" width="270" height="110" rx="22" fill="#5C6BC0"/>
      <rect x="95" y="265" width="38" height="75" rx="12" fill="#3949AB"/>
      <rect x="367" y="265" width="38" height="75" rx="12" fill="#3949AB"/>
      <rect x="145" y="280" width="210" height="50" rx="10" fill="#7986CB"/>
      <rect x="175" y="100" width="150" height="90" rx="10" fill="#FFFFFF" stroke="#8D6E63" stroke-width="8"/>
      <circle cx="220" cy="145" r="22" fill="#FFB300"/><polygon points="245,175 280,125 310,175" fill="#66BB6A"/>
      <rect x="180" y="360" width="140" height="24" rx="8" fill="#8D6E63"/>
    `,
  },
  {
    filename: "kunci-kamar.webp",
    bg: "#FFFDE7",
    svgBody: `
      <g transform="rotate(-30 250 250)">
        <circle cx="155" cy="250" r="68" fill="#FFB300" stroke="#F57F17" stroke-width="10"/>
        <circle cx="155" cy="250" r="26" fill="#FFFDE7"/>
        <rect x="215" y="232" width="195" height="36" rx="12" fill="#FFB300" stroke="#F57F17" stroke-width="8"/>
        <rect x="330" y="268" width="22" height="42" rx="6" fill="#FFB300" stroke="#F57F17" stroke-width="6"/>
        <rect x="372" y="268" width="22" height="54" rx="6" fill="#FFB300" stroke="#F57F17" stroke-width="6"/>
      </g>
    `,
  },
  {
    filename: "koper.webp",
    bg: "#E3F2FD",
    svgBody: `
      <path d="M205 140 L205 90 L295 90 L295 140" fill="none" stroke="#455A64" stroke-width="14" stroke-linecap="round"/>
      <rect x="125" y="140" width="250" height="255" rx="28" fill="#1E88E5"/>
      <rect x="165" y="175" width="35" height="185" rx="10" fill="#1565C0"/>
      <rect x="300" y="175" width="35" height="185" rx="10" fill="#1565C0"/>
      <rect x="215" y="230" width="70" height="42" rx="8" fill="#FFD54F"/>
      <circle cx="170" cy="412" r="20" fill="#263238"/><circle cx="330" cy="412" r="20" fill="#263238"/>
    `,
  },
  {
    filename: "lift-elevator.webp",
    bg: "#ECEFF1",
    svgBody: `
      <rect x="115" y="85" width="270" height="340" rx="16" fill="#607D8B"/>
      <rect x="145" y="145" width="100" height="280" fill="#CFD8DC" stroke="#455A64" stroke-width="4"/>
      <rect x="255" y="145" width="100" height="280" fill="#CFD8DC" stroke="#455A64" stroke-width="4"/>
      <polygon points="225,125 245,98 265,125" fill="#43A047"/>
      <polygon points="275,100 295,127 315,100" fill="#E53935"/>
      <circle cx="410" cy="245" r="14" fill="#43A047"/>
      <circle cx="410" cy="285" r="14" fill="#E53935"/>
    `,
  },
  {
    filename: "lemari.webp",
    bg: "#EFEBE9",
    svgBody: `
      <rect x="115" y="75" width="270" height="345" rx="14" fill="#8D6E63"/>
      <rect x="132" y="92" width="112" height="240" rx="6" fill="#A1887F"/>
      <rect x="256" y="92" width="112" height="240" rx="6" fill="#A1887F"/>
      <circle cx="228" cy="215" r="10" fill="#FFD54F"/><circle cx="272" cy="215" r="10" fill="#FFD54F"/>
      <rect x="132" y="344" width="236" height="58" rx="6" fill="#A1887F"/>
      <rect x="225" y="366" width="50" height="12" rx="6" fill="#FFD54F"/>
    `,
  },
  {
    filename: "sofa.webp",
    bg: "#FFF3E0",
    svgBody: `
      <rect x="95" y="155" width="310" height="135" rx="28" fill="#EF5350"/>
      <rect x="70" y="215" width="55" height="125" rx="22" fill="#D32F2F"/>
      <rect x="375" y="215" width="55" height="125" rx="22" fill="#D32F2F"/>
      <rect x="125" y="255" width="250" height="85" rx="12" fill="#E57373"/>
      <rect x="110" y="340" width="24" height="42" rx="6" fill="#5D4037"/>
      <rect x="366" y="340" width="24" height="42" rx="6" fill="#5D4037"/>
    `,
  },
  {
    filename: "kompor.webp",
    bg: "#ECEFF1",
    svgBody: `
      <rect x="85" y="230" width="330" height="145" rx="18" fill="#455A64"/>
      <rect x="120" y="200" width="95" height="30" rx="6" fill="#263238"/>
      <rect x="285" y="200" width="95" height="30" rx="6" fill="#263238"/>
      <path d="M145 195 Q167 145 190 195 Z" fill="#29B6F6"/><path d="M310 195 Q332 145 355 195 Z" fill="#29B6F6"/>
      <circle cx="165" cy="305" r="24" fill="#CFD8DC"/><circle cx="335" cy="305" r="24" fill="#CFD8DC"/>
      <rect x="160" y="285" width="10" height="40" rx="4" fill="#37474F"/><rect x="330" y="285" width="10" height="40" rx="4" fill="#37474F"/>
    `,
  },
  {
    filename: "panci.webp",
    bg: "#FFF8E1",
    svgBody: `
      <rect x="225" y="130" width="50" height="24" rx="10" fill="#37474F"/>
      <path d="M125 185 Q250 135 375 185 Z" fill="#B0BEC5"/>
      <rect x="75" y="220" width="55" height="24" rx="10" fill="#37474F"/>
      <rect x="370" y="220" width="55" height="24" rx="10" fill="#37474F"/>
      <path d="M125 195 L375 195 L355 345 Q350 370 320 370 L180 370 Q150 370 145 345 Z" fill="#90A4AE"/>
      <rect x="155" y="220" width="32" height="120" rx="10" fill="#CFD8DC" opacity="0.6"/>
    `,
  },
  {
    filename: "wajan.webp",
    bg: "#ECEFF1",
    svgBody: `
      <rect x="305" y="228" width="135" height="32" rx="14" fill="#D84315"/>
      <circle cx="205" cy="245" r="128" fill="#37474F"/>
      <circle cx="205" cy="245" r="98" fill="#546E7A"/>
      <circle cx="195" cy="245" r="40" fill="#FFFFFF"/>
      <circle cx="195" cy="245" r="18" fill="#FFB300"/>
    `,
  },
  {
    filename: "bantal.webp",
    bg: "#E8EAF6",
    svgBody: `
      <path d="M85 170 Q250 145 415 170 Q435 250 415 330 Q250 355 85 330 Q65 250 85 170 Z" fill="#FFFFFF" stroke="#90CAF9" stroke-width="10"/>
      <path d="M115 195 Q250 175 385 195" stroke="#E3F2FD" stroke-width="12" fill="none" stroke-linecap="round"/>
      <path d="M115 305 Q250 325 385 305" stroke="#BBDEFB" stroke-width="12" fill="none" stroke-linecap="round"/>
    `,
  },
  {
    filename: "selimut.webp",
    bg: "#FCE4EC",
    svgBody: `
      <rect x="105" y="135" width="290" height="230" rx="28" fill="#EC407A"/>
      <rect x="105" y="135" width="290" height="65" rx="22" fill="#F48FB1"/>
      <line x1="115" y1="240" x2="385" y2="240" stroke="#F8BBD0" stroke-width="10" stroke-dasharray="18 14"/>
      <line x1="115" y1="300" x2="385" y2="300" stroke="#F8BBD0" stroke-width="10" stroke-dasharray="18 14"/>
    `,
  },
  {
    filename: "palu.webp",
    bg: "#EFEBE9",
    svgBody: `
      <g transform="rotate(-40 250 250)">
        <rect x="230" y="160" width="40" height="260" rx="14" fill="#8D6E63"/>
        <rect x="145" y="105" width="210" height="68" rx="16" fill="#607D8B"/>
        <rect x="145" y="105" width="38" height="68" rx="8" fill="#90A4AE"/>
      </g>
    `,
  },
  {
    filename: "obeng.webp",
    bg: "#FFF3E0",
    svgBody: `
      <g transform="rotate(-40 250 250)">
        <rect x="236" y="75" width="28" height="175" rx="8" fill="#90A4AE"/>
        <polygon points="232,75 268,75 258,52 242,52" fill="#607D8B"/>
        <rect x="212" y="245" width="76" height="175" rx="24" fill="#FB8C00"/>
        <line x1="234" y1="270" x2="234" y2="395" stroke="#E65100" stroke-width="8" stroke-linecap="round"/>
        <line x1="266" y1="270" x2="266" y2="395" stroke="#E65100" stroke-width="8" stroke-linecap="round"/>
      </g>
    `,
  },
  {
    filename: "cangkul.webp",
    bg: "#F1F8E9",
    svgBody: `
      <g transform="rotate(-30 250 250)">
        <rect x="232" y="95" width="34" height="315" rx="14" fill="#8D6E63"/>
        <path d="M135 125 L275 125 L275 180 L165 210 L135 165 Z" fill="#546E7A"/>
        <path d="M135 165 L165 210 L145 215 Z" fill="#90A4AE"/>
      </g>
    `,
  },
];

const TRAFFIC_FOOD_SPECS: CustomSvgSpec[] = [
  {
    filename: "trotoar.webp",
    bg: "#ECEFF1",
    svgBody: `
      <polygon points="40,420 185,180 315,180 460,420" fill="#455A64"/>
      <polygon points="40,420 40,290 185,180 120,420" fill="#B0BEC5"/>
      <polygon points="460,420 460,290 315,180 380,420" fill="#B0BEC5"/>
      <line x1="250" y1="205" x2="250" y2="245" stroke="#FDD835" stroke-width="10" stroke-linecap="round"/>
      <line x1="250" y1="280" x2="250" y2="335" stroke="#FDD835" stroke-width="12" stroke-linecap="round"/>
      <line x1="250" y1="365" x2="250" y2="410" stroke="#FDD835" stroke-width="14" stroke-linecap="round"/>
      <circle cx="95" cy="235" r="22" fill="#FFCC80"/>
      <path d="M72 300 Q95 255 118 300 Z" fill="#1E88E5"/>
    `,
  },
  {
    filename: "simpang-jalan.webp",
    bg: "#F1F8E9",
    svgBody: `
      <rect x="40" y="40" width="420" height="420" rx="28" fill="#81C784"/>
      <rect x="190" y="40" width="120" height="420" fill="#455A64"/>
      <rect x="40" y="190" width="420" height="120" fill="#455A64"/>
      <g stroke="#FFFFFF" stroke-width="8" stroke-dasharray="20 18">
        <line x1="250" y1="55" x2="250" y2="175"/><line x1="250" y1="325" x2="250" y2="445"/>
        <line x1="55" y1="250" x2="175" y2="250"/><line x1="325" y1="250" x2="445" y2="250"/>
      </g>
    `,
  },
  {
    filename: "ayam-goreng.webp",
    bg: "#FFF8E1",
    svgBody: `
      <circle cx="250" cy="265" r="145" fill="#FFFFFF" stroke="#CFD8DC" stroke-width="10"/>
      <g transform="rotate(-25 250 265)">
        <rect x="275" y="250" width="90" height="28" rx="12" fill="#EFEBE9"/>
        <circle cx="370" cy="252" r="16" fill="#EFEBE9"/><circle cx="370" cy="276" r="16" fill="#EFEBE9"/>
        <ellipse cx="215" cy="264" rx="85" ry="58" fill="#E65100"/>
        <ellipse cx="215" cy="254" rx="68" ry="40" fill="#FB8C00"/>
      </g>
    `,
  },
  {
    filename: "sayur-bayam.webp",
    bg: "#E8F5E9",
    svgBody: `
      <path d="M250 385 L250 235" stroke="#2E7D32" stroke-width="16" stroke-linecap="round"/>
      <path d="M250 315 L175 235" stroke="#388E3C" stroke-width="12" stroke-linecap="round"/>
      <path d="M250 315 L325 235" stroke="#388E3C" stroke-width="12" stroke-linecap="round"/>
      <ellipse cx="250" cy="175" rx="62" ry="82" fill="#43A047"/>
      <ellipse cx="160" cy="220" rx="52" ry="68" transform="rotate(-30 160 220)" fill="#66BB6A"/>
      <ellipse cx="340" cy="220" rx="52" ry="68" transform="rotate(30 340 220)" fill="#66BB6A"/>
      <line x1="250" y1="115" x2="250" y2="240" stroke="#A5D6A7" stroke-width="6" stroke-linecap="round"/>
    `,
  },
  {
    filename: "wortel.webp",
    bg: "#FFF3E0",
    svgBody: `
      <g transform="rotate(30 250 250)">
        <path d="M250 135 Q215 70 195 95 M250 135 Q250 60 250 80 M250 135 Q285 70 305 95" stroke="#43A047" stroke-width="16" fill="none" stroke-linecap="round"/>
        <path d="M190 145 Q250 120 310 145 L265 395 Q250 420 235 395 Z" fill="#FB8C00"/>
        <line x1="215" y1="200" x2="245" y2="200" stroke="#E65100" stroke-width="8" stroke-linecap="round"/>
        <line x1="245" y1="260" x2="280" y2="260" stroke="#E65100" stroke-width="8" stroke-linecap="round"/>
        <line x1="228" y1="320" x2="258" y2="320" stroke="#E65100" stroke-width="8" stroke-linecap="round"/>
      </g>
    `,
  },
  {
    filename: "kue.webp",
    bg: "#FCE4EC",
    svgBody: `
      <rect x="242" y="95" width="16" height="55" rx="6" fill="#29B6F6"/>
      <ellipse cx="250" cy="82" rx="10" ry="16" fill="#FFB300"/>
      <rect x="135" y="150" width="230" height="80" rx="18" fill="#F48FB1"/>
      <rect x="100" y="225" width="300" height="125" rx="20" fill="#FFE0B2"/>
      <path d="M100 225 L400 225 L400 258 Q365 280 330 258 Q295 280 250 258 Q205 280 170 258 Q135 280 100 258 Z" fill="#EC407A"/>
      <rect x="85" y="350" width="330" height="24" rx="12" fill="#CFD8DC"/>
    `,
  },
];

const CURRICULUM_SPECS: CustomSvgSpec[] = [
  {
    filename: "uang-rupiah.webp",
    bg: "#E8F5E9",
    svgBody: `
      <rect x="75" y="130" width="320" height="175" rx="20" fill="#43A047" stroke="#1B5E20" stroke-width="8"/>
      <rect x="98" y="152" width="274" height="131" rx="10" fill="#66BB6A"/>
      <circle cx="235" cy="218" r="44" fill="#A5D6A7"/>
      <text x="235" y="232" font-family="Arial, sans-serif" font-size="38" font-weight="bold" fill="#1B5E20" text-anchor="middle">Rp</text>
      <circle cx="365" cy="315" r="68" fill="#FFD54F" stroke="#F57F17" stroke-width="8"/>
      <text x="365" y="330" font-family="Arial, sans-serif" font-size="38" font-weight="bold" fill="#E65100" text-anchor="middle">Rp</text>
    `,
  },
  {
    filename: "tata-surya.webp",
    bg: "#1A237E",
    svgBody: `
      <circle cx="250" cy="250" r="105" fill="none" stroke="#5C6BC0" stroke-width="4" stroke-dasharray="10 8"/>
      <circle cx="250" cy="250" r="165" fill="none" stroke="#5C6BC0" stroke-width="4" stroke-dasharray="10 8"/>
      <circle cx="250" cy="250" r="56" fill="#FFB300"/>
      <circle cx="355" cy="250" r="24" fill="#29B6F6"/>
      <circle cx="110" cy="165" r="22" fill="#E53935"/>
      <circle cx="370" cy="365" r="32" fill="#FFCC80"/>
      <ellipse cx="370" cy="365" rx="54" ry="14" transform="rotate(-20 370 365)" fill="none" stroke="#FFE082" stroke-width="6"/>
      <circle cx="95" cy="95" r="5" fill="#FFFFFF"/><circle cx="405" cy="95" r="5" fill="#FFFFFF"/><circle cx="105" cy="395" r="5" fill="#FFFFFF"/>
    `,
  },
  {
    filename: "termometer.webp",
    bg: "#FFEBEE",
    svgBody: `
      <rect x="215" y="70" width="70" height="275" rx="35" fill="#FFFFFF" stroke="#90A4AE" stroke-width="10"/>
      <circle cx="250" cy="365" r="62" fill="#FFFFFF" stroke="#90A4AE" stroke-width="10"/>
      <rect x="234" y="140" width="32" height="215" rx="16" fill="#E53935"/>
      <circle cx="250" cy="365" r="44" fill="#E53935"/>
      <g stroke="#607D8B" stroke-width="6" stroke-linecap="round">
        <line x1="295" y1="125" x2="330" y2="125"/><line x1="295" y1="175" x2="320" y2="175"/>
        <line x1="295" y1="225" x2="330" y2="225"/><line x1="295" y1="275" x2="320" y2="275"/>
      </g>
    `,
  },
  {
    filename: "kaca-pembesar.webp",
    bg: "#E3F2FD",
    svgBody: `
      <g transform="rotate(-35 250 250)">
        <rect x="232" y="275" width="36" height="145" rx="16" fill="#6D4C41"/>
        <circle cx="250" cy="185" r="105" fill="#B3E5FC" stroke="#37474F" stroke-width="22"/>
        <path d="M185 150 A65 65 0 0 1 250 110" stroke="#FFFFFF" stroke-width="12" fill="none" stroke-linecap="round"/>
      </g>
    `,
  },
  {
    filename: "biji-tumbuhan.webp",
    bg: "#F1F8E9",
    svgBody: `
      <rect x="40" y="330" width="420" height="110" rx="20" fill="#8D6E63"/>
      <ellipse cx="240" cy="320" rx="52" ry="38" fill="#D7CCC8" stroke="#6D4C41" stroke-width="8"/>
      <path d="M240 295 Q240 205 265 155" stroke="#43A047" stroke-width="14" fill="none" stroke-linecap="round"/>
      <ellipse cx="220" cy="165" rx="42" ry="22" transform="rotate(-30 220 165)" fill="#66BB6A"/>
      <ellipse cx="305" cy="150" rx="42" ry="22" transform="rotate(25 305 150)" fill="#81C784"/>
      <path d="M240 355 Q215 390 190 410 M240 355 Q265 390 290 410" stroke="#EFEBE9" stroke-width="8" fill="none" stroke-linecap="round"/>
    `,
  },
  {
    filename: "ranting-pohon.webp",
    bg: "#F8FBF5",
    svgBody: `
      <path d="M85 375 Q195 280 400 160" stroke="#6D4C41" stroke-width="24" fill="none" stroke-linecap="round"/>
      <path d="M195 290 L165 170" stroke="#6D4C41" stroke-width="14" stroke-linecap="round"/>
      <path d="M295 220 L345 295" stroke="#6D4C41" stroke-width="14" stroke-linecap="round"/>
      <ellipse cx="155" cy="145" rx="34" ry="20" transform="rotate(-30 155 145)" fill="#43A047"/>
      <ellipse cx="405" cy="145" rx="36" ry="20" transform="rotate(-15 405 145)" fill="#66BB6A"/>
      <ellipse cx="360" cy="310" rx="32" ry="18" transform="rotate(35 360 310)" fill="#43A047"/>
    `,
  },
  {
    filename: "peta-indonesia.webp",
    bg: "#E1F5FE",
    svgBody: `
      <rect x="45" y="95" width="410" height="310" rx="24" fill="#B3E5FC" stroke="#0288D1" stroke-width="8"/>
      <path d="M75 185 L125 225 L150 265 L120 275 L75 210 Z" fill="#43A047"/>
      <rect x="145" y="295" width="95" height="24" rx="10" fill="#2E7D32"/>
      <path d="M175 220 Q215 175 250 205 L245 265 L180 265 Z" fill="#66BB6A"/>
      <path d="M270 195 L315 190 L300 260 L270 250 Z" fill="#43A047"/>
      <path d="M355 230 L425 230 L425 290 L375 280 Z" fill="#2E7D32"/>
      <circle cx="210" cy="340" r="8" fill="#43A047"/><circle cx="275" cy="335" r="10" fill="#43A047"/>
    `,
  },
  {
    filename: "lambang-garuda.webp",
    bg: "#FFF8E1",
    svgBody: `
      <path d="M85 185 Q145 125 225 185 L275 185 Q355 125 415 185 Q395 270 310 280 L250 390 L190 280 Q105 270 85 185 Z" fill="#FFB300" stroke="#E65100" stroke-width="6"/>
      <circle cx="250" cy="145" r="34" fill="#FFB300"/>
      <polygon points="278,140 305,152 278,162" fill="#E65100"/>
      <path d="M205 195 L295 195 L288 285 Q250 325 212 285 Z" fill="#FFFFFF" stroke="#B71C1C" stroke-width="6"/>
      <rect x="212" y="202" width="38" height="40" fill="#D32F2F"/>
      <rect x="250" y="242" width="38" height="40" fill="#D32F2F"/>
      <polygon points="250,228 258,244 275,244 261,254 266,270 250,260 234,270 239,254 225,244 242,244" fill="#FFB300"/>
    `,
  },
];

const TECH_SPECS: CustomSvgSpec[] = [
  {
    filename: "laptop.webp",
    bg: "#E8EAF6",
    svgBody: `
      <rect x="95" y="105" width="310" height="205" rx="18" fill="#37474F"/>
      <rect x="115" y="125" width="270" height="165" rx="8" fill="#81D4FA"/>
      <polygon points="95,315 405,315 445,385 55,385" fill="#90A4AE"/>
      <rect x="205" y="345" width="90" height="24" rx="6" fill="#CFD8DC"/>
    `,
  },
  {
    filename: "televisi.webp",
    bg: "#ECEFF1",
    svgBody: `
      <line x1="250" y1="125" x2="195" y2="75" stroke="#455A64" stroke-width="10" stroke-linecap="round"/>
      <line x1="250" y1="125" x2="305" y2="75" stroke="#455A64" stroke-width="10" stroke-linecap="round"/>
      <rect x="75" y="125" width="350" height="230" rx="22" fill="#263238"/>
      <rect x="98" y="148" width="304" height="184" rx="10" fill="#4FC3F7"/>
      <rect x="225" y="355" width="50" height="35" fill="#455A64"/>
      <rect x="165" y="388" width="170" height="18" rx="9" fill="#37474F"/>
    `,
  },
  {
    filename: "kipas-angin.webp",
    bg: "#E0F7FA",
    svgBody: `
      <rect x="235" y="290" width="30" height="105" fill="#546E7A"/>
      <rect x="165" y="390" width="170" height="26" rx="12" fill="#37474F"/>
      <circle cx="250" cy="195" r="120" fill="#FFFFFF" stroke="#0288D1" stroke-width="12"/>
      <ellipse cx="250" cy="135" rx="26" ry="48" fill="#29B6F6"/>
      <ellipse cx="195" cy="230" rx="26" ry="48" transform="rotate(-120 195 230)" fill="#29B6F6"/>
      <ellipse cx="305" cy="230" rx="26" ry="48" transform="rotate(120 305 230)" fill="#29B6F6"/>
      <circle cx="250" cy="195" r="24" fill="#0277BD"/>
    `,
  },
  {
    filename: "kulkas.webp",
    bg: "#E3F2FD",
    svgBody: `
      <rect x="145" y="75" width="210" height="345" rx="24" fill="#90CAF9" stroke="#1E88E5" stroke-width="8"/>
      <line x1="145" y1="205" x2="355" y2="205" stroke="#1E88E5" stroke-width="8"/>
      <rect x="175" y="125" width="14" height="50" rx="7" fill="#FFFFFF"/>
      <rect x="175" y="245" width="14" height="90" rx="7" fill="#FFFFFF"/>
      <rect x="170" y="420" width="24" height="16" rx="4" fill="#455A64"/>
      <rect x="306" y="420" width="24" height="16" rx="4" fill="#455A64"/>
    `,
  },
  {
    filename: "mesin-cuci.webp",
    bg: "#E0F2F1",
    svgBody: `
      <rect x="120" y="85" width="260" height="330" rx="24" fill="#FFFFFF" stroke="#78909C" stroke-width="10"/>
      <line x1="120" y1="155" x2="380" y2="155" stroke="#B0BEC5" stroke-width="8"/>
      <rect x="145" y="108" width="75" height="28" rx="6" fill="#90A4AE"/>
      <circle cx="330" cy="122" r="14" fill="#26A69A"/>
      <circle cx="250" cy="285" r="88" fill="#4FC3F7" stroke="#546E7A" stroke-width="18"/>
      <path d="M180 285 Q215 260 250 285 T320 285 L320 355 L180 355 Z" fill="#0288D1" opacity="0.7"/>
    `,
  },
  {
    filename: "setrika.webp",
    bg: "#FFF3E0",
    svgBody: `
      <path d="M145 215 Q145 155 235 155 L345 155 Q375 155 375 215 L375 250 L330 250 L330 195 L185 195 L185 250 Z" fill="#455A64"/>
      <path d="M85 315 Q115 230 245 230 L395 230 L405 315 Z" fill="#1E88E5"/>
      <rect x="75" y="315" width="340" height="28" rx="12" fill="#B0BEC5"/>
      <circle cx="265" cy="272" r="14" fill="#FFD54F"/>
    `,
  },
  {
    filename: "baterai.webp",
    bg: "#E8F5E9",
    svgBody: `
      <rect x="210" y="75" width="80" height="32" rx="8" fill="#90A4AE"/>
      <rect x="165" y="105" width="170" height="315" rx="24" fill="#43A047" stroke="#1B5E20" stroke-width="8"/>
      <rect x="165" y="105" width="170" height="85" rx="16" fill="#263238"/>
      <rect x="220" y="138" width="60" height="16" rx="8" fill="#FFD54F"/>
      <rect x="242" y="116" width="16" height="60" rx="8" fill="#FFD54F"/>
      <polygon points="260,220 220,295 255,295 235,365 290,275 255,275" fill="#FDD835"/>
    `,
  },
  {
    filename: "kamera.webp",
    bg: "#ECEFF1",
    svgBody: `
      <rect x="180" y="120" width="140" height="40" rx="12" fill="#37474F"/>
      <rect x="85" y="150" width="330" height="225" rx="28" fill="#455A64"/>
      <rect x="115" y="128" width="44" height="24" rx="6" fill="#E53935"/>
      <circle cx="250" cy="262" r="78" fill="#CFD8DC"/>
      <circle cx="250" cy="262" r="56" fill="#1565C0"/>
      <circle cx="232" cy="244" r="16" fill="#81D4FA"/>
      <circle cx="365" cy="192" r="14" fill="#FFF59D"/>
    `,
  },
  {
    filename: "printer.webp",
    bg: "#E8EAF6",
    svgBody: `
      <rect x="155" y="95" width="190" height="90" rx="10" fill="#FFFFFF" stroke="#90A4AE" stroke-width="8"/>
      <rect x="85" y="175" width="330" height="145" rx="22" fill="#37474F"/>
      <circle cx="360" cy="215" r="12" fill="#66BB6A"/>
      <rect x="155" y="275" width="190" height="130" rx="10" fill="#FFFFFF" stroke="#90A4AE" stroke-width="8"/>
      <line x1="185" y1="315" x2="315" y2="315" stroke="#90A4AE" stroke-width="10" stroke-linecap="round"/>
      <line x1="185" y1="350" x2="290" y2="350" stroke="#90A4AE" stroke-width="10" stroke-linecap="round"/>
    `,
  },
  {
    filename: "mikrofon.webp",
    bg: "#F3E5F5",
    svgBody: `
      <circle cx="250" cy="155" r="72" fill="#78909C" stroke="#455A64" stroke-width="8"/>
      <line x1="180" y1="155" x2="320" y2="155" stroke="#37474F" stroke-width="10"/>
      <polygon points="220,220 280,220 268,385 232,385" fill="#263238"/>
      <rect x="242" y="255" width="16" height="45" rx="8" fill="#AB47BC"/>
      <path d="M245 385 Q245 435 315 435" stroke="#263238" stroke-width="12" fill="none" stroke-linecap="round"/>
    `,
  },
];

const SPORTS_GAMES_SPECS: CustomSvgSpec[] = [
  {
    filename: "bola-sepak.webp",
    bg: "#E8F5E9",
    svgBody: `
      <circle cx="250" cy="250" r="145" fill="#FFFFFF" stroke="#263238" stroke-width="10"/>
      <polygon points="250,190 305,230 284,295 216,295 195,230" fill="#263238"/>
      <polygon points="250,105 288,132 250,162 212,132" fill="#263238"/>
      <polygon points="115,215 152,202 162,248 128,270" fill="#263238"/>
      <polygon points="385,215 348,202 338,248 372,270" fill="#263238"/>
      <polygon points="180,378 212,340 244,365 215,392" fill="#263238"/>
      <polygon points="320,378 288,340 256,365 285,392" fill="#263238"/>
      <line x1="250" y1="160" x2="250" y2="195" stroke="#263238" stroke-width="7"/>
      <line x1="160" y1="242" x2="200" y2="232" stroke="#263238" stroke-width="7"/>
      <line x1="340" y1="242" x2="300" y2="232" stroke="#263238" stroke-width="7"/>
    `,
  },
  {
    filename: "layang-layang.webp",
    bg: "#E1F5FE",
    svgBody: `
      <polygon points="250,75 375,205 250,355 125,205" fill="#E53935"/>
      <polygon points="250,75 375,205 250,205" fill="#FDD835"/>
      <polygon points="125,205 250,205 250,355" fill="#1E88E5"/>
      <line x1="250" y1="75" x2="250" y2="355" stroke="#5D4037" stroke-width="8"/>
      <line x1="125" y1="205" x2="375" y2="205" stroke="#5D4037" stroke-width="8"/>
      <path d="M250 355 Q275 395 235 425 Q205 445 245 465" stroke="#FB8C00" stroke-width="8" fill="none" stroke-linecap="round"/>
    `,
  },
  {
    filename: "ayunan.webp",
    bg: "#F1F8E9",
    svgBody: `
      <rect x="40" y="395" width="420" height="45" rx="14" fill="#66BB6A"/>
      <line x1="130" y1="100" x2="85" y2="400" stroke="#E53935" stroke-width="16" stroke-linecap="round"/>
      <line x1="130" y1="100" x2="175" y2="400" stroke="#E53935" stroke-width="16" stroke-linecap="round"/>
      <line x1="370" y1="100" x2="325" y2="400" stroke="#E53935" stroke-width="16" stroke-linecap="round"/>
      <line x1="370" y1="100" x2="415" y2="400" stroke="#E53935" stroke-width="16" stroke-linecap="round"/>
      <rect x="110" y="90" width="280" height="22" rx="10" fill="#1E88E5"/>
      <line x1="205" y1="112" x2="205" y2="320" stroke="#546E7A" stroke-width="8"/>
      <line x1="295" y1="112" x2="295" y2="320" stroke="#546E7A" stroke-width="8"/>
      <rect x="180" y="315" width="140" height="24" rx="10" fill="#FFB300"/>
    `,
  },
  {
    filename: "perosotan.webp",
    bg: "#FFF8E1",
    svgBody: `
      <rect x="40" y="395" width="420" height="45" rx="14" fill="#66BB6A"/>
      <line x1="135" y1="145" x2="105" y2="400" stroke="#1E88E5" stroke-width="16" stroke-linecap="round"/>
      <line x1="190" y1="145" x2="160" y2="400" stroke="#1E88E5" stroke-width="16" stroke-linecap="round"/>
      <line x1="125" y1="220" x2="178" y2="220" stroke="#1E88E5" stroke-width="12"/>
      <line x1="115" y1="295" x2="168" y2="295" stroke="#1E88E5" stroke-width="12"/>
      <path d="M165 145 Q235 150 280 265 Q325 375 415 375" stroke="#FB8C00" stroke-width="38" fill="none" stroke-linecap="round"/>
    `,
  },
  {
    filename: "puzzle.webp",
    bg: "#F3E5F5",
    svgBody: `
      <path d="M110 110 H230 V145 A24 24 0 1 1 230 195 V240 H195 A24 24 0 1 0 145 240 H110 Z" fill="#1E88E5"/>
      <path d="M240 110 H380 V240 H335 A24 24 0 1 0 285 240 H240 V195 A24 24 0 1 1 240 145 Z" fill="#FFB300"/>
      <path d="M110 250 H145 A24 24 0 1 1 195 250 H240 V295 A24 24 0 1 0 240 345 V390 H110 Z" fill="#43A047"/>
      <path d="M250 250 H285 A24 24 0 1 1 335 250 H380 V390 H250 V345 A24 24 0 1 0 250 295 Z" fill="#E53935"/>
    `,
  },
  {
    filename: "balok-susun.webp",
    bg: "#FFFDE7",
    svgBody: `
      <rect x="85" y="280" width="145" height="110" rx="14" fill="#E53935"/>
      <rect x="255" y="280" width="145" height="110" rx="14" fill="#1E88E5"/>
      <rect x="170" y="165" width="145" height="110" rx="14" fill="#FDD835"/>
      <rect x="115" y="260" width="34" height="22" rx="6" fill="#C62828"/><rect x="170" y="260" width="34" height="22" rx="6" fill="#C62828"/>
      <rect x="285" y="260" width="34" height="22" rx="6" fill="#1565C0"/><rect x="340" y="260" width="34" height="22" rx="6" fill="#1565C0"/>
      <rect x="200" y="145" width="34" height="22" rx="6" fill="#F9A825"/><rect x="255" y="145" width="34" height="22" rx="6" fill="#F9A825"/>
    `,
  },
  {
    filename: "catur.webp",
    bg: "#EFEBE9",
    svgBody: `
      <rect x="110" y="310" width="280" height="90" rx="12" fill="#8D6E63"/>
      <rect x="125" y="325" width="62" height="30" fill="#FFF8E1"/><rect x="250" y="325" width="62" height="30" fill="#FFF8E1"/>
      <rect x="187" y="355" width="62" height="30" fill="#FFF8E1"/><rect x="312" y="355" width="62" height="30" fill="#FFF8E1"/>
      <path d="M210 310 L290 310 L272 195 Q295 165 250 140 Q205 165 228 195 Z" fill="#263238"/>
      <rect x="242" y="88" width="16" height="44" rx="4" fill="#263238"/>
      <rect x="228" y="102" width="44" height="16" rx="4" fill="#263238"/>
    `,
  },
  {
    filename: "lompat-tali.webp",
    bg: "#E0F2F1",
    svgBody: `
      <path d="M105 320 Q105 90 250 90 Q395 90 395 320 Q395 405 250 405 Q105 405 105 320 Z" fill="none" stroke="#FB8C00" stroke-width="12" stroke-dasharray="16 0"/>
      <circle cx="250" cy="145" r="34" fill="#FFCC80"/>
      <path d="M210 245 Q250 190 290 245 L280 310 L220 310 Z" fill="#1E88E5"/>
      <line x1="230" y1="310" x2="215" y2="365" stroke="#37474F" stroke-width="18" stroke-linecap="round"/>
      <line x1="270" y1="310" x2="285" y2="365" stroke="#37474F" stroke-width="18" stroke-linecap="round"/>
      <line x1="215" y1="215" x2="135" y2="270" stroke="#FFCC80" stroke-width="14" stroke-linecap="round"/>
      <line x1="285" y1="215" x2="365" y2="270" stroke="#FFCC80" stroke-width="14" stroke-linecap="round"/>
      <rect x="115" y="265" width="22" height="46" rx="8" fill="#E53935"/>
      <rect x="363" y="265" width="22" height="46" rx="8" fill="#E53935"/>
    `,
  },
];

const SPECS: CustomSvgSpec[] = [
  ...EXISTING_SPECS,
  ...OCEAN_SPECS,
  ...URBAN_SPECS,
  ...NATURE_SPECS,
  ...ANIMAL_SPECS,
  ...BODY_SPECS,
  ...PROFESSION_SPECS,
  ...CLOTHING_TRANSPORT_SPECS,
  ...HOME_TOOLS_SPECS,
  ...TRAFFIC_FOOD_SPECS,
  ...CURRICULUM_SPECS,
  ...TECH_SPECS,
  ...SPORTS_GAMES_SPECS,
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
