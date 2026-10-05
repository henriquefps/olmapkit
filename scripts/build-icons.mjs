// Renders demo/icon.svg into the PNG and ICO files the demo page links to.
// Dev-only: uses sharp, which is already present via wrangler's dependencies (not a runtime dep).
// Usage: node scripts/build-icons.mjs
import { readFile, writeFile } from 'node:fs/promises';
import sharp from 'sharp';

const dir = new URL('../demo/', import.meta.url);
const svg = await readFile(new URL('icon.svg', dir));

// The apple-touch-icon must be opaque, so it gets a white background; the others stay transparent.
const render = (size, { background } = {}) =>
  sharp(svg, { density: (72 * size) / 24 * 4 })
    .resize(size, size)
    .flatten(background ? { background } : false)
    .png()
    .toBuffer();

for (const [name, size, opts] of [
  ['apple-touch-icon.png', 180, { background: '#ffffff' }],
  ['icon-192.png', 192],
  ['icon-512.png', 512],
]) {
  await writeFile(new URL(name, dir), await render(size, opts));
}

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
await writeFile(new URL('favicon.ico', dir), Buffer.concat([header, ...entries, ...pngs]));
console.log('Icons written to demo/');
