// Builds the OLMapKit icon set from one glyph definition (hfps style: viewBox 128, rx 28, #5b7a3a).
//   docs/img/icon.svg, icon-light.svg, icon.png (1024)
//   demo/icon.svg, favicon.ico (16/32/48), apple-touch-icon.png (180), icon-192.png, icon-512.png
// Dev-only: uses sharp, which is already present via wrangler's dependencies (not a runtime dep).
// Usage: node scripts/build-icons.mjs
import { writeFile } from 'node:fs/promises';
import sharp from 'sharp';

const docs = new URL('../docs/img/', import.meta.url);
const demo = new URL('../demo/', import.meta.url);
const GREEN = '#5b7a3a';

// Map pin standing on three stacked map layers.
const glyph = (c) => `<g transform="translate(14 14) scale(0.78125)">
    <g stroke="${c}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" fill="none">
      <path d="M22 98 L64 118 L106 98" opacity="0.45"/>
      <path d="M22 82 L64 102 L106 82" opacity="0.7"/>
      <path d="M22 66 L64 86 L106 66"/>
      <path d="M64 59 C64 59 44 42 44 26 A20 20 0 0 1 84 26 C84 42 64 59 64 59 Z"/>
    </g>
    <circle cx="64" cy="26" r="6.5" fill="${c}"/>
  </g>`;
const svg = (bg, c) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="512" height="512">${bg}${glyph(c)}</svg>`;

const dark = svg(`<rect width="128" height="128" rx="28" fill="${GREEN}"/>`, '#fff');
const light = svg(`<rect x="1" y="1" width="126" height="126" rx="27" fill="#fff" stroke="#d3d4cb" stroke-width="2"/>`, GREEN);
await writeFile(new URL('icon.svg', docs), dark);
await writeFile(new URL('icon-light.svg', docs), light);
await writeFile(new URL('icon.svg', demo), dark);

const render = (size, { background } = {}) =>
  sharp(Buffer.from(dark), { density: (72 * size * 2) / 512 })
    .resize(size, size)
    .flatten(background ? { background } : false)
    .png()
    .toBuffer();

await writeFile(new URL('icon.png', docs), await render(1024));
// The apple-touch-icon must be opaque (iOS fills transparency with black), so it gets the full green square.
await writeFile(new URL('apple-touch-icon.png', demo), await sharp(Buffer.from(dark.replace('rx="28"', 'rx="0"')), { density: (72 * 360) / 512 }).resize(180, 180).png().toBuffer());
await writeFile(new URL('icon-192.png', demo), await render(192));
await writeFile(new URL('icon-512.png', demo), await render(512));

// favicon.ico: PNG-compressed entries at 16, 32 and 48 px
const sizes = [16, 32, 48];
const pngs = await Promise.all(sizes.map((s) => render(s)));
const header = Buffer.alloc(6);
header.writeUInt16LE(1, 2); // type: icon
header.writeUInt16LE(sizes.length, 4);
let offset = 6 + 16 * sizes.length;
const entries = pngs.map((png, i) => {
  const e = Buffer.alloc(16);
  e[0] = sizes[i];
  e[1] = sizes[i];
  e.writeUInt16LE(1, 4); // planes
  e.writeUInt16LE(32, 6); // bits per pixel
  e.writeUInt32LE(png.length, 8);
  e.writeUInt32LE(offset, 12);
  offset += png.length;
  return e;
});
await writeFile(new URL('favicon.ico', demo), Buffer.concat([header, ...entries, ...pngs]));

// Preview sheet for eyeballing small sizes (scratch use only; pass a path to write it)
if (process.argv[2]) {
  const tiles = await Promise.all([16, 32, 64, 128].map((s) => render(s)));
  const sheet = sharp({ create: { width: 260, height: 140, channels: 4, background: '#fff' } });
  let x = 8;
  await sheet.composite(tiles.map((input, i) => { const l = x; x += [16, 32, 64, 128][i] + 12; return { input, left: l, top: 6 }; })).png().toFile(process.argv[2]);
}
console.log('Icons written to docs/img/ and demo/');
