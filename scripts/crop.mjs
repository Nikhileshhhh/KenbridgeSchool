// Cut a tall comparison image into readable slices for review.
// Usage: node scripts/crop.mjs <image> [sliceHeight=2200] → writes <image>-a.png, -b.png … next to the scratch dir.
import sharp from 'sharp';
import { basename, join } from 'node:path';
import { tmpdir } from 'node:os';

const [file, h = '2200'] = process.argv.slice(2);
const step = Number(h);
const meta = await sharp(file).metadata();
const out = [];
for (let top = 0, i = 0; top < meta.height; top += step, i++) {
  const name = join(tmpdir(), `${basename(file, '.png')}-${String.fromCharCode(97 + i)}.png`);
  await sharp(file).extract({ left: 0, top, width: meta.width, height: Math.min(step, meta.height - top) }).toFile(name);
  out.push(name);
}
console.log(out.join('\n'));
