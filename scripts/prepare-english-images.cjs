const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');

const root = path.resolve(__dirname, '..');
const input = process.argv[2];
if (!input || process.argv.length !== 3) throw new Error('Usage: node scripts/prepare-english-images.cjs <supplied-image.png>');

(async () => {
  const image = sharp(path.resolve(input));
  const { width, height, format } = await image.metadata();
  if (format !== 'png' || !width || !height) throw new Error('Expected a valid source PNG');
  const originals = path.join(root, 'assets/originals/english');
  const output = path.join(root, 'assets/images/english');
  fs.mkdirSync(originals, { recursive: true });
  fs.mkdirSync(output, { recursive: true });
  fs.copyFileSync(path.resolve(input), path.join(originals, 'product-detail.png'));
  const segments = [];
  for (let top = 0, index = 1; top < height; top += 4096, index += 1) {
    const segmentHeight = Math.min(4096, height - top);
    const filename = `product-detail-${index}.webp`;
    await image.clone().extract({ left: 0, top, width, height: segmentHeight }).webp({ quality: 90, effort: 6 }).toFile(path.join(output, filename));
    segments.push({ filename, top, width, height: segmentHeight });
  }
  const metadata = { source: 'assets/originals/english/product-detail.png', width, height, segments };
  fs.writeFileSync(path.join(root, 'data/english-image.json'), `${JSON.stringify(metadata, null, 2)}\n`);
  console.log(JSON.stringify({ width, height, segments: segments.length, originalBytes: fs.statSync(path.resolve(input)).size, webBytes: segments.reduce((sum, item) => sum + fs.statSync(path.join(output, item.filename)).size, 0) }, null, 2));
})().catch((error) => { console.error(error); process.exitCode = 1; });
