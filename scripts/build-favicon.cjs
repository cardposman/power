const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');

const root = path.resolve(__dirname, '..');
const directory = path.join(root, 'assets/icons');
const source = path.join(directory, 'favicon.svg');

(async () => {
  for (const [size, filename] of [[16, 'favicon-16.png'], [32, 'favicon-32.png'], [180, 'apple-touch-icon.png'], [128, 'favicon-preview.png']]) {
    await sharp(source, { density: 384 }).resize(size, size).png().toFile(path.join(directory, filename));
  }
  const sizes = [16, 32, 48];
  const images = [];
  for (const size of sizes) images.push(await sharp(source, { density: 384 }).resize(size, size).png().toBuffer());
  const header = Buffer.alloc(6 + images.length * 16);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach((image, index) => {
    const entry = 6 + index * 16;
    header[entry] = sizes[index];
    header[entry + 1] = sizes[index];
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(image.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += image.length;
  });
  fs.writeFileSync(path.join(root, 'favicon.ico'), Buffer.concat([header, ...images]));
  console.log('Built SVG-based favicon assets and 16/32/48px ICO.');
})().catch((error) => { console.error(error); process.exitCode = 1; });
