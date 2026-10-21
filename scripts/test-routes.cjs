const test = require('node:test');
const assert = require('node:assert/strict');
const { districtRoute, stationRoute, routes } = require('./page-routes.cjs');
const { districts, origin, basePath, publicUrl } = require('./site-data.cjs');
const { stations } = require('./station-data.cjs');

function withEnvironment(values, run) {
  const previous = Object.fromEntries(Object.keys(values).map((key) => [key, process.env[key]]));
  try {
    for (const [key, value] of Object.entries(values)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    run();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test('short routes match the requested examples exactly', () => {
  assert.deepEqual(districtRoute('11170'), { file: 'reg-yongsangu/index.html', url: '/reg-yongsangu/' });
  assert.deepEqual(stationRoute(147), { file: 'st-seomyun/index.html', url: '/st-seomyun/' });
});

test('all 469 identities keep grouped source paths and separate short deployment paths', () => {
  const entries = [...districts, ...stations];
  assert.equal(entries.length, 469);
  assert.equal(new Set(entries.map((entry) => entry.url)).size, 469);
  assert.equal(new Set(entries.map((entry) => entry.file)).size, 469);
  for (const entry of entries) {
    assert.match(entry.deployFile, /^(?:reg|st)-[a-z0-9]+(?:-[a-z0-9]+)*\/index\.html$/);
    assert.match(entry.file, /^(?:region|station)\/[a-z-]+\/\d+\/index\.html$/);
    assert.notEqual(entry.file, entry.deployFile);
  }
  assert.equal(districtRoute('11140').url, '/reg-seoul-junggu/');
  assert.equal(districtRoute('26110').url, '/reg-busan-junggu/');
  assert.equal(stationRoute(168).url, '/st-daegu-jungangno/');
  assert.equal(stationRoute(183).url, '/st-daejeon-jungangno/');
  assert.notEqual(stationRoute(95).url, stationRoute(179).url);
});

test('explicit tables reject missing, extra, unsafe and duplicate slugs', () => {
  assert.throws(() => routes({ 1: 'one' }, ['1', '2'], 'st'), /Incomplete/);
  assert.throws(() => routes({ 1: 'one', 2: 'two' }, ['1'], 'st'), /Incomplete/);
  for (const slug of ['../one', 'One', 'one two', '역', 'one/', 'one?x', 'one#x', 'one%2ftwo', '-one', 'one--two']) {
    assert.throws(() => routes({ 1: slug }, ['1'], 'st'), /Invalid/);
  }
  assert.throws(() => routes({ 1: 'one', 2: 'one' }, ['1', '2'], 'st'), /Duplicate/);
  assert.throws(() => districtRoute('missing'), /Missing/);
});

test('canonical URLs include the GitHub Pages project prefix once', () => {
  withEnvironment({ SITE_ORIGIN: 'https://cardposman.github.io', SITE_BASE_PATH: '/power/' }, () => {
    assert.equal(origin(), 'https://cardposman.github.io');
    assert.equal(basePath(), '/power');
    assert.equal(publicUrl(districtRoute('11170').url), 'https://cardposman.github.io/power/reg-yongsangu/');
    assert.equal(publicUrl(stationRoute(147).url), 'https://cardposman.github.io/power/st-seomyun/');
    assert.equal(publicUrl('/assets/originals/thumbnail-1.png'), 'https://cardposman.github.io/power/assets/originals/thumbnail-1.png');
  });
  withEnvironment({ SITE_ORIGIN: 'https://example.com', SITE_BASE_PATH: '' }, () => {
    assert.equal(publicUrl('/reg-yongsangu/'), 'https://example.com/reg-yongsangu/');
  });
  withEnvironment({ SITE_ORIGIN: '', SITE_BASE_PATH: '/power' }, () => assert.equal(publicUrl('/reg-yongsangu/'), ''));
});

test('production defaults use the custom domain root without the old project path', () => {
  withEnvironment({ SITE_ORIGIN: undefined, SITE_BASE_PATH: undefined }, () => {
    assert.equal(origin(), 'https://tstudymate.com');
    assert.equal(basePath(), '');
    assert.equal(publicUrl('/'), 'https://tstudymate.com/');
    assert.equal(publicUrl(districtRoute('11170').url), 'https://tstudymate.com/reg-yongsangu/');
    assert.equal(publicUrl(stationRoute(147).url), 'https://tstudymate.com/st-seomyun/');
    assert.equal(publicUrl('/sitemap.xml'), 'https://tstudymate.com/sitemap.xml');
  });
});

test('invalid origins and path prefixes fail without generating misleading canonicals', () => {
  for (const prefix of ['power', '//power', '/power/../other', '/power?x', '/power#x', '/power%2fother']) {
    withEnvironment({ SITE_BASE_PATH: prefix }, () => assert.throws(basePath, /SITE_BASE_PATH/));
  }
  for (const value of ['ftp://example.com', 'https://user@example.com', 'https://example.com/power', 'https://example.com?x']) {
    withEnvironment({ SITE_ORIGIN: value }, () => assert.throws(origin, /SITE_ORIGIN/));
  }
});
