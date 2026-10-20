const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { ROOT } = require('./site-data.cjs');
const { stations, stationGroups, guides } = require('./station-data.cjs');

(async () => {
  const output = path.join(ROOT, 'verification');
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: process.env.BROWSER_EXECUTABLE || undefined, timeout: 20000 });
  const errors = [];
  const page = await browser.newPage({ viewport: { width: 375, height: 844 }, deviceScaleFactor: 1 });
  page.on('pageerror', (error) => errors.push(error.message));
  page.setDefaultTimeout(10000);
  page.setDefaultNavigationTimeout(15000);
  const visit = async (file) => {
    await page.goto(pathToFileURL(path.join(ROOT, file)).href);
    await page.addStyleTag({ content: 'html { scroll-behavior: auto !important; }' });
    assert.equal(await page.locator('input[type="search"], [data-region-search]').count(), 0);
    assert.equal(await page.locator('#main-nav').getByRole('link', { name: '역별 상담', exact: true }).count(), 0);
  };
  const noOverflow = async (label) => assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), label);
  try {
    for (const [index, station] of stations.entries()) {
      await visit(station.file);
      assert((await page.title()).startsWith(`${station.label} 맨투맨 일본어회화 일대일 과외수업`));
      assert((await page.locator('#hero-title').innerText()).includes(station.label));
      assert(await page.locator('.hero .service-notice').isVisible());
      assert.equal(await page.locator('.station-guide li').count(), 3);
      await page.locator('[data-regional-thumbnail]').evaluate((image) => image.decode());
      await noOverflow(station.label);
      assert.equal((await page.locator('.page-shell').boundingBox()).width, 375);
      if ((index + 1) % 50 === 0) console.log(`Checked ${index + 1}/200 stations`);
    }

    const representative = [...new Set([
      ...Object.keys(guides).map((guide) => stations.find((station) => station.guide === guide)),
      ...[...stations].sort((a, b) => b.label.length - a.label.length).slice(0, 3),
      ...stations.filter((station) => ['중앙로', '죽전', '동대구역'].includes(station.name))
    ])];
    for (const width of [320, 1440]) {
      await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 });
      for (const station of representative) {
        await visit(station.file);
        assert.equal((await page.locator('.page-shell').boundingBox()).width, Math.min(width, 480));
        await noOverflow(`${width}: ${station.label}`);
        for (const course of ['basic', 'conversation', 'jlpt', 'business']) {
          await page.locator(`[data-course="${course}"]`).click();
          assert.equal(await page.locator('#course-panel').getAttribute('data-tone'), course);
        }
        await page.locator('.station-guide details summary').click();
        assert(await page.locator('.station-guide details').getAttribute('open') !== null);
        await noOverflow(`${width}, FAQ open: ${station.label}`);
        for (const image of await page.locator('img').all()) await image.evaluate((element) => { element.loading = 'eager'; });
        await page.evaluate(async () => { await Promise.all([...document.images].map((image) => image.decode())); });
        assert(await page.evaluate(() => [...document.images].every((image) => image.naturalWidth > 0)));
        if (station.id === 1) {
          await page.evaluate(() => window.scrollTo(0, 0));
          await page.screenshot({ path: path.join(output, `station-gangnam-${width}.png`) });
          await page.locator('#local-guide').scrollIntoViewIfNeeded();
          await page.screenshot({ path: path.join(output, `station-guide-${width}.png`) });
        }
      }
    }

    for (const group of stationGroups) {
      await visit(`station/${group.slug}/index.html`);
      assert.equal(await page.locator('[data-region-item]').count(), group.stations.length);
      assert.equal(await page.locator('.directory-count').innerText(), `${group.stations.length}개 역`);
      await noOverflow(group.label);
    }

    await page.setViewportSize({ width: 390, height: 844 });
    await visit('station/index.html');
    assert.equal(await page.locator('[data-region-item]').count(), 200);
    assert.equal(await page.locator('.directory-count').innerText(), '200개 역');
    const daegu = page.locator('[data-region-group]').filter({ has: page.locator('summary').filter({ hasText: /^대구/ }) });
    await daegu.locator('summary').click();
    assert(await daegu.getByRole('link', { name: /대구 중앙로역/ }).isVisible());
    await noOverflow('Station directory');
    await page.screenshot({ path: path.join(output, 'station-directory-mobile.png') });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.screenshot({ path: path.join(output, 'station-directory-desktop.png') });
    await daegu.getByRole('link', { name: /대구 중앙로역/ }).click();
    assert((await page.locator('h1').innerText()).includes('대구 중앙로역'));
    await page.locator('.menu-toggle').click();
    assert.equal(await page.locator('#main-nav').getByRole('link', { name: '역별 상담', exact: true }).count(), 0);
    await page.locator('.menu-toggle').click();
    await page.locator('.footer-regions').getByRole('link', { name: /^역별 상담 목록/ }).click();
    assert.equal(await page.locator('[data-region-item]').count(), 200);
    await page.locator('.directory-switch a').filter({ hasText: '시·군·구' }).click();
    assert.equal(await page.locator('[data-region-item]').count(), 269);
    await visit('index.html');
    assert(!(await page.locator('body').innerText()).includes('TS재팬'));
    await page.locator('.footer-regions').getByRole('link', { name: /^역별 상담 목록/ }).click();
    assert.equal(await page.locator('[data-region-item]').count(), 200);
    assert.deepEqual(errors, []);
    const result = { stationPages: 200, stationDirectories: 13, mobile375: 'all stations passed', narrowMobile320AndDesktop1440: `${representative.length} representative pages passed`, searchAndStationMenu: 'removed', navigation: 'passed', images: 'passed', javascriptErrors: 0 };
    fs.writeFileSync(path.join(output, 'station-browser-checks.json'), `${JSON.stringify(result, null, 2)}\n`);
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await browser.close();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
