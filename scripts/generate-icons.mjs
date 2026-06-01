/**
 * Generates PWA icons from a single SVG source — the Foundry signet.
 *
 * Run: `npm run icons`
 *
 * Outputs:
 *   public/favicon.svg               (F only, no oval — Brand Book min size)
 *   public/icons/icon-192.png        (full mark with oval)
 *   public/icons/icon-512.png
 *   public/icons/icon-maskable-512.png   (safe-zone padding for Android)
 *
 * Brand Book: the mark is a single Mark Gold (#C8A45A) monogram F within an
 * oval cartouche on Foundry Black (#111010). No gradients, shadows, or glow.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const GOLD = '#C8A45A';
const BLACK = '#111010';

// App icon — full mark with oval, centered, single colour.
const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="${BLACK}"/>
  <ellipse cx="256" cy="256" rx="118" ry="146" fill="none" stroke="${GOLD}" stroke-width="5"/>
  <ellipse cx="256" cy="256" rx="106" ry="134" fill="none" stroke="${GOLD}" stroke-width="1.5" opacity="0.32"/>
  <text x="256" y="320" text-anchor="middle"
        font-family="Fraunces, Georgia, 'Times New Roman', serif"
        font-weight="700" font-size="190" letter-spacing="-4"
        fill="${GOLD}">F</text>
</svg>`;

// Favicon — F only, no oval (renders crisp at 16px).
const faviconSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="6" fill="${BLACK}"/>
  <text x="16" y="23" text-anchor="middle"
        font-family="Fraunces, Georgia, 'Times New Roman', serif"
        font-weight="700" font-size="22" letter-spacing="-0.5"
        fill="${GOLD}">F</text>
</svg>`;

mkdirSync(resolve(ROOT, 'public/icons'), { recursive: true });
writeFileSync(resolve(ROOT, 'public/favicon.svg'), faviconSvg);

const buf = Buffer.from(svg);

async function render(size, name, padding = 0) {
  const inset = Math.round(size * padding);
  const inner = size - inset * 2;
  await sharp(buf)
    .resize(inner, inner)
    .extend({ top: inset, bottom: inset, left: inset, right: inset, background: { r: 17, g: 16, b: 16, alpha: 1 } })
    .png()
    .toFile(resolve(ROOT, `public/icons/${name}`));
  console.log(`wrote public/icons/${name}`);
}

await render(192, 'icon-192.png');
await render(512, 'icon-512.png');
await render(512, 'icon-maskable-512.png', 0.12); // ~12% safe zone

console.log('done.');
