const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const root = path.resolve(__dirname, '..');
const versions = new Map(['js/site.js', 'css/site.css'].map(file => [file,
  createHash('sha256').update(fs.readFileSync(path.join(root, 'assets', file))).digest('hex').slice(0, 12)
]));

function sharedAssetUrl(base, file) {
  if (!versions.has(file)) throw new Error(`Unknown shared asset: ${file}`);
  return `${base}${file}?v=${versions.get(file)}`;
}

module.exports = { sharedAssetUrl };
