/**
 * Generates PWA icons from a single SVG source.
 *
 * Run: `npm run icons`
 *
 * Outputs:
 *   public/favicon.svg
 *   public/icons/icon-192.png
 *   public/icons/icon-512.png
 *   public/icons/icon-maskable-512.png   (safe-zone padding for Android)
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// Anvil + ember mark. Warm dark background, ember-orange anvil silhouette.
const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <radialGradient id="g" cx="50%" cy="38%" r="65%">
      <stop offset="0%" stop-color="#241813"/>
      <stop offset="100%" stop-color="#0d0a08"/>
    </radialGradient>
    <linearGradient id="ember" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ff8a3d"/>
      <stop offset="100%" stop-color="#b35a1f"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="96" fill="url(#g)"/>
  <!-- anvil -->
  <g fill="url(#ember)">
    <path d="M120 230 h272 a32 32 0 0 1 32 32 v18 h-336 v-18 a32 32 0 0 1 32 -32 z"/>
    <path d="M168 300 h176 v44 h-176 z"/>
    <path d="M148 360 h216 v22 h-216 z"/>
  </g>
  <!-- spark / ember -->
  <circle cx="368" cy="160" r="14" fill="#ff8a3d"/>
  <circle cx="396" cy="186" r="6" fill="#ff8a3d" opacity="0.7"/>
  <circle cx="346" cy="138" r="4" fill="#ff8a3d" opacity="0.6"/>
</svg>`;

const faviconSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="6" fill="#0d0a08"/>
  <circle cx="22" cy="10" r="2" fill="#ff8a3d"/>
  <path d="M6 18 h20 v2 h-20 z M9 22 h14 v3 h-14 z" fill="#e8742c"/>
</svg>`;

mkdirSync(resolve(ROOT, 'public/icons'), { recursive: true });
writeFileSync(resolve(ROOT, 'public/favicon.svg'), faviconSvg);

const buf = Buffer.from(svg);

async function render(size, name, padding = 0) {
  const inset = Math.round(size * padding);
  const inner = size - inset * 2;
  await sharp(buf)
    .resize(inner, inner)
    .extend({ top: inset, bottom: inset, left: inset, right: inset, background: { r: 13, g: 10, b: 8, alpha: 1 } })
    .png()
    .toFile(resolve(ROOT, `public/icons/${name}`));
  console.log(`wrote public/icons/${name}`);
}

await render(192, 'icon-192.png');
await render(512, 'icon-512.png');
await render(512, 'icon-maskable-512.png', 0.12); // ~12% safe zone

console.log('done.');
