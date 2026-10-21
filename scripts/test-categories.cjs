const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ROOT } = require('./site-data.cjs');
const { categories, categoryFile } = require('./category-pages.cjs');

test('four complete, distinct category pages match the requested topics', () => {
  assert.deepEqual(categories.map((item) => item.label), ['일본어자격증', '여행회화', '비즈니스회화', '성인취미']);
  for (const field of ['slug', 'title', 'description', 'lead', 'intro', 'note', 'cta']) {
    assert.equal(new Set(categories.map((item) => item[field])).size, 4, field);
  }
  for (const category of categories) {
    assert.match(category.slug, /^[a-z]+$/);
    assert.equal(category.fit.length, 3);
    assert.equal(category.modules.length, 4);
    assert.equal(category.practice.length, 3);
    assert.equal(category.checklist.length, 4);
    assert.equal(category.faq.length, 4);
    assert(category.artRow >= 3 && category.artRow <= 6);
    const text = JSON.stringify(category);
    assert(text.length > 2000, category.slug);
    assert(!text.includes('합격 보장'));
    if (category.source) assert.equal(new URL(category.source.url).hostname, 'jlpt.jp');
  }
});

test('category pages are rendered in both the manifest and sitemap without altering regional routes', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/generated-pages.json'), 'utf8'));
  assert.equal(manifest.pages.length, 504);
  assert.equal(manifest.pages.filter((page) => page.kind === 'district').length, 269);
  assert.equal(manifest.pages.filter((page) => page.kind === 'station').length, 200);
  const sitemap = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
  for (const category of categories) {
    const entry = manifest.pages.find((page) => page.slug === category.slug && page.kind === 'category');
    assert(entry, category.slug);
    assert.equal(entry.file, categoryFile(category));
    assert.equal(entry.sourceFile, entry.deployFile);
    assert(sitemap.includes(`<loc>${manifest.origin}${manifest.basePath}${entry.url}</loc>`));
    const html = fs.readFileSync(path.join(ROOT, entry.file), 'utf8');
    assert(!html.includes('{{'));
    assert(html.includes(`data-category="${category.slug}"`));
    assert(html.includes('1:1 화상수업 상담'));
  }
});
