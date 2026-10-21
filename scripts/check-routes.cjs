const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');
const { ROOT, districts } = require('./site-data.cjs');
const { stations } = require('./station-data.cjs');

(async () => {
  const output = path.join(ROOT, 'verification', 'short-routes-production');
  const env = { ...process.env, SITE_ORIGIN: 'https://tstudymate.com', SITE_BASE_PATH: '/' };
  const generated = spawnSync(process.execPath, [path.join(__dirname, 'generate-regions.cjs'), '--output', output], { env, stdio: 'inherit' });
  assert.equal(generated.status, 0);
  fs.cpSync(path.join(ROOT, 'assets'), path.join(output, 'assets'), { recursive: true });
  const checked = spawnSync(process.env.PYTHON || 'python', [path.join(__dirname, 'check-generated.py'), '--directory', output], { stdio: 'inherit' });
  assert.equal(checked.status, 0);
  const manifest = JSON.parse(fs.readFileSync(path.join(output, 'data/generated-pages.json'), 'utf8'));
  const prefix = manifest.basePath;
  const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.webp': 'image/webp' };
  const server = http.createServer((request, response) => {
    try {
      const url = new URL(request.url, 'http://localhost');
      if (prefix && url.pathname === prefix) {
        response.writeHead(301, { Location: `${prefix}/${url.search}` });
        response.end();
        return;
      }
      if (!url.pathname.startsWith(`${prefix}/`)) throw new Error('Outside project');
      let file = path.resolve(output, decodeURIComponent(url.pathname.slice(prefix.length + 1)));
      const relative = path.relative(output, file);
      if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('Outside fixture');
      if (fs.statSync(file).isDirectory()) {
        if (!url.pathname.endsWith('/')) {
          response.writeHead(301, { Location: `${url.pathname}/${url.search}` });
          response.end();
          return;
        }
        file = path.join(file, 'index.html');
      }
      response.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' });
      response.end(fs.readFileSync(file));
    } catch {
      response.writeHead(404);
      response.end('Not found');
    }
  });
  let browser;
  try {
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', resolve);
    });
    const base = `http://127.0.0.1:${server.address().port}${prefix}`;
    browser = await chromium.launch({ headless: true, executablePath: process.env.BROWSER_EXECUTABLE || undefined, timeout: 20000 });
    for (const route of [...manifest.pages.map((entry) => entry.url), ...manifest.redirects.map((entry) => entry.url), ...manifest.publicFiles.map((file) => `/${file}`)]) {
      const response = await fetch(base + route);
      assert.equal(response.status, 200, route);
      await response.text();
    }
    const cases = [districts.find((item) => item.pathCode === '11170'), districts.find((item) => item.pathCode === '11140'), districts.find((item) => item.pathCode === '26110'), ...[147, 168, 183].map((id) => stations.find((item) => item.id === id))];
    const errors = [];
    const failedRequests = [];
    const page = await browser.newPage({ viewport: { width: 320, height: 844 } });
    page.setDefaultTimeout(15000);
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('response', (response) => { if (response.status() >= 400) failedRequests.push(response.url()); });
    for (const width of [320, 1440]) {
      await page.setViewportSize({ width, height: width === 320 ? 844 : 1000 });
      for (const entry of cases) {
        await page.goto(base + entry.url.slice(0, -1));
        assert.equal(page.url(), base + entry.url);
        assert((await page.locator('h1').innerText()).includes(entry.label));
        assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'), `${env.SITE_ORIGIN}${prefix}${entry.url}`);
        assert.equal((await page.locator('.page-shell').boundingBox()).width, Math.min(width, 480));
        await page.evaluate(async () => {
          for (const image of document.images) image.loading = 'eager';
          await Promise.all([...document.images].map((image) => image.decode()));
        });
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        if (entry.file === 'reg-yongsangu/index.html') {
          await page.locator('.hero').screenshot({ path: path.join(ROOT, 'verification', `short-route-yongsan-${width}.png`) });
        }
        for (const old of [entry.legacyUrl.slice(0, -1), entry.legacyUrl, `/${entry.legacyFile}`]) {
          await page.goto(`${base}${old}?from=old#local-guide`, { waitUntil: 'commit' });
          await page.waitForURL(`${base}${entry.url}?from=old#local-guide`);
          await page.waitForLoadState('load');
          assert((await page.locator('h1').innerText()).includes(entry.label));
        }
        await page.goto(pathToFileURL(path.join(ROOT, entry.legacyFile)).href, { waitUntil: 'commit' });
        await page.waitForURL(pathToFileURL(path.join(ROOT, entry.file)).href);
        await page.waitForLoadState('load');
        assert((await page.locator('h1').innerText()).includes(entry.label));
      }
    }
    await page.goto(`${base}/region/`);
    await page.getByRole('link', { name: '서울 용산구', exact: true }).click();
    assert.equal(page.url(), `${base}/reg-yongsangu/`);
    await page.locator('.footer-regions').getByRole('link', { name: /^역별 상담 목록/ }).click();
    const busan = page.locator('[data-region-group]').filter({ has: page.locator('summary').filter({ hasText: /^부산/ }) });
    await busan.locator('summary').click();
    await busan.getByRole('link', { name: /부산 서면역/ }).click();
    assert.equal(page.url(), `${base}/st-seomyun/`);
    const noJs = await browser.newPage({ javaScriptEnabled: false });
    await noJs.goto(`${base}/region/seoul/11170/`, { waitUntil: 'commit' });
    await noJs.waitForURL(`${base}/reg-yongsangu/index.html`);
    assert((await noJs.locator('h1').innerText()).includes('서울 용산구'));
    await noJs.close();
    assert.deepEqual(errors, []);
    assert.deepEqual(failedRequests, []);
    const result = { canonicalPages: manifest.pages.length, legacyRedirects: manifest.redirects.length, siteOrigin: env.SITE_ORIGIN, projectPrefix: prefix, httpRoutes: `${manifest.pages.length + manifest.redirects.length + manifest.publicFiles.length} passed`, redirectsWithQueryAndFragment: 'slash, no slash and index.html passed', filePreview: 'passed', noJavaScriptFallback: 'passed', internalNavigation: 'passed', viewportWidths: [320, 1440], javascriptErrors: 0, missingAssets: 0 };
    fs.writeFileSync(path.join(ROOT, 'verification', 'short-route-checks.json'), `${JSON.stringify(result, null, 2)}\n`);
    console.log(JSON.stringify(result, null, 2));
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
