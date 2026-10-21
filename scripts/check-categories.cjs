const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');
const { ROOT, site } = require('./site-data.cjs');
const { categories } = require('./category-pages.cjs');

(async () => {
  const args = process.argv.slice(2);
  assert(args.length === 0 || (args.length === 2 && args[0] === '--directory'));
  const directory = path.resolve(ROOT, args[1] || '.');
  const manifest = JSON.parse(fs.readFileSync(path.join(directory, 'data/generated-pages.json'), 'utf8'));
  const output = path.join(ROOT, 'verification');
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: process.env.BROWSER_EXECUTABLE || undefined });
  const errors = [];
  const page = await browser.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('requestfailed', (request) => errors.push(request.url()));
  const fileUrl = (file) => pathToFileURL(path.join(directory, file)).href;
  try {
    for (const width of [320, 390, 1440]) {
      await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 });
      for (const category of categories) {
        const entry = manifest.pages.find((item) => item.kind === 'category' && item.slug === category.slug);
        await page.goto(fileUrl(entry.file));
        await page.addStyleTag({ content: 'html { scroll-behavior: auto !important; }' });
        assert.equal(await page.title(), category.title);
        assert.equal(await page.locator('h1').innerText(), `${category.label}.`);
        assert.equal((await page.locator('.page-shell').boundingBox()).width, Math.min(width, 480));
        assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'), `${manifest.origin}${manifest.basePath}${entry.url}`);
        const art = page.locator('.curriculum-excerpt img');
        await art.evaluate((image) => image.decode());
        assert.equal(await art.evaluate((image) => image.naturalWidth), 1025);
        const crop = await page.locator('.curriculum-excerpt').boundingBox();
        assert(Math.abs(crop.width / crop.height - 1025 / 576) < .01);
        await page.locator('.category-jump').getByRole('link', { name: /학습 내용/ }).click();
        assert.equal(await page.locator('.category-modules > li').count(), 4);
        const faq = page.locator('.category-faq details').nth(1);
        await faq.locator('summary').click();
        assert.equal(await faq.getAttribute('open'), '');
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        assert.equal(await page.locator('.category-primary').getAttribute('href'), site.counselUrl);
        const bar = await page.locator('.fixed-contact').boundingBox();
        assert.equal(bar.width, Math.min(width, 480));
        await page.evaluate(() => scrollTo(0, 0));
        if (width !== 1440) {
          await page.screenshot({ path: path.join(output, `category-${category.slug}-${manifest.mode}-${width}.png`), fullPage: width === 390 });
        } else {
          await page.screenshot({ path: path.join(output, `category-${category.slug}-${manifest.mode}-desktop.png`) });
        }
        await page.locator('.menu-toggle').click();
        assert.equal(await page.locator('#main-nav a[aria-current="page"]').innerText(), category.label);
        assert.equal(await page.locator('#main-nav').getByRole('link', { name: '지역별 상담', exact: true }).count(), 0);
        const next = categories[(categories.indexOf(category) + 1) % categories.length];
        await page.locator('#main-nav').getByRole('link', { name: next.label, exact: true }).click();
        assert.equal(await page.locator('h1').innerText(), `${next.label}.`);
        await page.locator('.menu-toggle').click();
        await page.keyboard.press('Escape');
        assert.equal(await page.locator('.menu-toggle').getAttribute('aria-expanded'), 'false');
      }
    }
    for (const kind of ['home', 'directory', 'province', 'district', 'station-directory', 'station-province', 'station']) {
      const entry = manifest.pages.find((item) => item.kind === kind);
      await page.goto(fileUrl(entry.file));
      await page.locator('.menu-toggle').click();
      for (const category of categories) assert.equal(await page.locator('#main-nav').getByRole('link', { name: category.label, exact: true }).count(), 1);
      assert.equal(await page.locator('#main-nav').getByRole('link', { name: '지역별 상담', exact: true }).count(), 0);
      await page.locator('#main-nav').getByRole('link', { name: '성인취미', exact: true }).click();
      assert.equal(await page.locator('h1').innerText(), '성인취미.');
    }
    const noJs = await browser.newPage({ javaScriptEnabled: false, viewport: { width: 320, height: 844 } });
    await noJs.goto(fileUrl('course/jlpt/index.html'));
    assert.equal(await noJs.locator('h1').innerText(), '일본어자격증.');
    await noJs.locator('.category-faq details').nth(1).locator('summary').click();
    assert.equal(await noJs.locator('.category-faq details').nth(1).getAttribute('open'), '');
    await noJs.close();
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ mode: manifest.mode, categories: 4, widths: [320, 390, 1440], menuOrigins: 7, images: 'passed', faq: 'passed', noJavaScriptContentAndFaq: 'passed', horizontalOverflow: false, javascriptErrors: 0 }, null, 2));
  } finally {
    await browser.close();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
