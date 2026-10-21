const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { ROOT } = require('./site-data.cjs');

const readManifest = (directory) => JSON.parse(fs.readFileSync(path.join(directory, 'data/generated-pages.json'), 'utf8'));
const flatSourceFolders = () => fs.readdirSync(ROOT).filter((name) => /^(?:reg|st)-/.test(name));
const run = (script, args = []) => spawnSync(process.execPath, [path.join(__dirname, script), ...args], { cwd: ROOT, encoding: 'utf8' });
const fingerprint = (files) => Object.fromEntries(files.map((file) => [file, createHash('sha256').update(fs.readFileSync(path.join(ROOT, file))).digest('hex')]));

test('source checkout stores full grouped pages without short-route folders', () => {
  const manifest = readManifest(ROOT);
  assert.equal(manifest.mode, 'source');
  assert.equal(manifest.pages.length, 500);
  assert.equal(manifest.redirects.length, 0);
  assert.deepEqual(flatSourceFolders(), []);
  for (const page of manifest.pages) {
    assert.equal(page.file, page.sourceFile);
    if (['district', 'station'].includes(page.kind)) {
      assert.match(page.file, /^(?:region|station)\/[a-z-]+\/\d+\/index\.html$/);
      assert.match(fs.readFileSync(path.join(ROOT, page.file), 'utf8'), /<h1 id="hero-title">/);
    }
  }
  assert.match(fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf8'), /^_site\/$/m);
  const workflow = fs.readFileSync(path.join(ROOT, '.github/workflows/pages.yml'), 'utf8');
  assert.match(workflow, /uses: actions\/upload-pages-artifact@v4\s+with:\s+path: _site/);
});

test('deployment generation cannot target the checkout or grouped source folders', () => {
  for (const output of ['.', 'region', 'station', 'region/seoul']) {
    const result = run('generate-regions.cjs', ['--deploy', '--output', output]);
    assert.notEqual(result.status, 0, output);
    assert.match(result.stderr, /Deployment output must/);
  }
});

test('repeated source generation and deployment builds preserve source and public support files', () => {
  const source = readManifest(ROOT);
  const files = [...source.pages.map((page) => page.file), ...source.publicFiles, 'data/generated-pages.json', 'data/generated-urls.txt'];
  const before = fingerprint(files);
  let result = run('generate-regions.cjs');
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(fingerprint(files), before);
  for (let iteration = 0; iteration < 2; iteration += 1) {
    result = run('build-pages.cjs');
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(fingerprint(files), before);
    assert.deepEqual(flatSourceFolders(), []);
    const output = path.join(ROOT, '_site');
    const deployed = readManifest(output);
    assert.equal(deployed.mode, 'deployment');
    assert.equal(deployed.pages.length, 500);
    assert.equal(deployed.redirects.length, 469);
    for (const page of deployed.pages) {
      assert.equal(page.file, page.deployFile);
      assert(fs.existsSync(path.join(output, page.file)), page.file);
      const original = source.pages.find((entry) => entry.sourceFile === page.sourceFile);
      assert(original, page.sourceFile);
      assert.equal(page.url, original.url);
      assert.equal(page.title, original.title);
    }
    for (const file of source.publicFiles) {
      assert(fs.readFileSync(path.join(ROOT, file)).equals(fs.readFileSync(path.join(output, file))), file);
    }
    assert(fs.existsSync(path.join(output, '.power-build')));
  }
});
