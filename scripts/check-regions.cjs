const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { ROOT } = require('./site-data.cjs');

(async () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'generated-pages.json'), 'utf8'));
  const regionalPages = manifest.pages.filter((page) => page.kind === 'district');
  const navigationOnly = process.argv.includes('--navigation-only');
  const output = path.join(ROOT, 'verification');
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: process.env.BROWSER_EXECUTABLE || undefined, timeout: 20000 });
  const page = await browser.newPage({ viewport: { width: 375, height: 844 }, deviceScaleFactor: 1 });
  page.setDefaultTimeout(10000);
  page.setDefaultNavigationTimeout(15000);
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const visit = async (file) => {
    await page.goto(pathToFileURL(path.join(ROOT, file)).href);
    await page.addStyleTag({ content: 'html { scroll-behavior: auto !important; }' });
    assert.equal(await page.locator('input[type="search"], [data-region-search]').count(), 0);
    assert.equal(await page.locator('#main-nav').getByRole('link', { name: '역별 상담', exact: true }).count(), 0);
  };
  try {
    if (!navigationOnly) {
    for (const [index, entry] of regionalPages.entries()) {
      await visit(entry.file);
      await page.locator('[data-regional-thumbnail]').evaluate((image) => image.decode());
      assert.equal(await page.locator('body').getAttribute('data-region-key'), entry.key);
      assert((await page.locator('h1').innerText()).includes(entry.label));
      assert((await page.locator('[data-regional-thumbnail]').getAttribute('src')).endsWith(`thumbnail-${entry.thumbnail}.webp`));
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Overflow: ${entry.label}`);
      assert.equal((await page.locator('.page-shell').boundingBox()).width, 375);
      if ((index + 1) % 50 === 0) console.log(`Checked ${index + 1}/${regionalPages.length} district pages`);
    }
    const longest = [...regionalPages].sort((a, b) => (b.label.length + b.schools.join('').length) - (a.label.length + a.schools.join('').length)).slice(0, 5);
    const representative = [regionalPages.find((entry) => entry.code === '11410'), regionalPages.find((entry) => entry.code === '41591'), regionalPages.find((entry) => entry.code === '36110'), ...longest];
    for (const width of [320, 1440]) {
      await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 });
      for (const entry of representative) {
        await visit(entry.file);
        await page.locator('[data-regional-thumbnail]').evaluate((image) => image.decode());
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${width}px overflow: ${entry.label}`);
        const panel = page.locator('.course-panel');
        for (const course of ['basic', 'conversation', 'jlpt', 'business']) {
          await page.locator(`[data-course="${course}"]`).click();
          assert.equal(await panel.getAttribute('data-tone'), course);
        }
        if (entry.code === '11410') {
          await page.locator('[data-course="basic"]').click();
          await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
          await page.screenshot({ path: path.join(output, `regional-seodaemun-${width}.png`) });
        }
      }
    }

    }
    for (const entry of manifest.pages.filter((item) => item.kind === 'province')) {
      await visit(entry.file);
      assert.equal(await page.locator('[data-region-item]').count(), entry.districtCount);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Province overflow: ${entry.label}`);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await visit('region/index.html');
    assert.equal(await page.locator('[data-region-item]').count(), 269);
    assert.equal(await page.locator('.directory-count').innerText(), '269개 지역');
    await page.getByRole('link', { name: '서울 서대문구', exact: true }).click();
    assert((await page.locator('h1').innerText()).includes('서울 서대문구'));
    await page.locator('.menu-toggle').click();
    await page.locator('#main-nav a').filter({ hasText: '지역별 상담' }).click();
    assert.equal(await page.locator('[data-region-item]').count(), 269);
    const busan = page.locator('[data-region-group]').filter({ has: page.locator('summary').filter({ hasText: /^부산/ }) });
    await busan.locator('summary').click();
    assert(await busan.locator('[data-region-item]').first().isVisible());
    await busan.locator('summary').click();
    assert(!(await busan.locator('[data-region-item]').first().isVisible()));
    await page.screenshot({ path: path.join(output, 'regional-directory-mobile.png') });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.screenshot({ path: path.join(output, 'regional-directory-desktop.png') });
    assert.deepEqual(errors, []);
    const result = { districtPages: navigationOnly ? 'not rerun' : regionalPages.length, provinceDirectories: 16, searchAndStationMenu: 'removed', regionalNavigation: 'passed', mobile375: navigationOnly ? 'not rerun' : 'all districts passed', desktopAndNarrowMobile: navigationOnly ? 'not rerun' : '8 representative pages passed', javascriptErrors: errors.length };
    fs.writeFileSync(path.join(output, 'regional-browser-checks.json'), `${JSON.stringify(result, null, 2)}\n`);
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await browser.close();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
