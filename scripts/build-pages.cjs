const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { ROOT } = require('./site-data.cjs');

const output = path.resolve(ROOT, '_site');
if (path.dirname(output) !== ROOT || path.basename(output) !== '_site') throw new Error('Invalid deployment directory');
if (fs.existsSync(output)) {
  if (fs.lstatSync(output).isSymbolicLink() || !fs.existsSync(path.join(output, '.power-build'))) throw new Error('Refusing to replace an unrecognized _site directory');
  fs.rmSync(output, { recursive: true, force: true });
}
const generated = spawnSync(process.execPath, [path.join(__dirname, 'generate-regions.cjs'), '--deploy', '--output', output], { cwd: ROOT, stdio: 'inherit' });
if (generated.status !== 0) process.exit(generated.status || 1);
fs.writeFileSync(path.join(output, '.power-build'), 'Generated deployment output. Do not edit.\n');
