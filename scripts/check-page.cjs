const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');

(async () => {
  const root = path.resolve(__dirname, '..');
  const output = path.join(root, 'verification');
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: process.env.BROWSER_EXECUTABLE || undefined, timeout: 20000 });
  const results = [];
  try {
    for (const width of [1440, 1024, 768, 480, 390, 375, 320]) {
      console.log(`Checking ${width}px`);
      const page = await browser.newPage({ viewport: { width, height: width > 800 ? 1000 : 844 }, deviceScaleFactor: 1 });
      page.setDefaultTimeout(10000);
      page.setDefaultNavigationTimeout(15000);
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.goto(pathToFileURL(path.join(root, 'index.html')).href);
      await page.addStyleTag({ content: 'html { scroll-behavior: auto !important; }' });
      assert.equal(await page.locator('.intro-strip').count(), 0);
      assert.equal(await page.locator('main > :first-child').getAttribute('id'), 'intro-media');
      assert(await page.locator('main > :nth-child(2)').evaluate((element) => element.classList.contains('hero')));
      assert.equal(await page.locator('main > :nth-child(3)').getAttribute('id'), 'curriculum');
      assert.equal(await page.locator('.curriculum-poster').count(), 1);
      assert.equal(await page.locator('[data-regional-thumbnail]').count(), 1);
      assert.equal(await page.locator('[data-regional-thumbnail]').getAttribute('loading'), 'eager');
      const shell = await page.locator('.page-shell').boundingBox();
      assert.equal(shell.width, Math.min(width, 480), `Incorrect page width at ${width}`);
      assert.equal(shell.x, (width - shell.width) / 2, `Page not centered at ${width}`);
      const header = await page.locator('.site-header').boundingBox();
      const thumbnail = await page.locator('[data-regional-thumbnail]').boundingBox();
      const hero = await page.locator('.hero').boundingBox();
      const poster = await page.locator('.curriculum-poster').boundingBox();
      assert.equal(thumbnail.y, header.y + header.height, `Thumbnail is not immediately below the header at ${width}`);
      assert.equal(hero.y, thumbnail.y + thumbnail.height, `Intro is not immediately below the thumbnail at ${width}`);
      assert.equal(poster.y, hero.y + hero.height, `Poster is not immediately below the intro at ${width}`);
      assert.equal(poster.width, shell.width);
      const fixedBar = await page.locator('.fixed-contact').boundingBox();
      assert.equal(fixedBar.width, shell.width, `Fixed CTA width at ${width}`);
      assert.equal(fixedBar.x, shell.x, `Fixed CTA alignment at ${width}`);
      const columnCount = await page.locator('.course-panel').evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(' ').length);
      assert.equal(columnCount, 1, `Multiple content columns at ${width}`);
      assert.equal(await page.title(), '맨투맨 일본어회화 일대일 과외수업');
      assert((await page.locator('#hero-title').innerText()).includes('맨투맨 일본어과외'));
      assert(!(await page.locator('body').innerText()).includes('TS재팬'));
      assert(!(await page.locator('body').innerText()).includes('홍은동'));
      assert.equal(await page.locator('.hero-actions .text-link').getAttribute('href'), pathToFileURL(path.join(root, 'region/index.html')).href);
      for (const image of await page.locator('img').all()) await image.scrollIntoViewIfNeeded();
      await page.evaluate(async () => {
        await Promise.all([...document.images].map((image) => image.decode()));
      });
      const dimensions = await page.evaluate(() => ({
        viewport: innerWidth,
        document: document.documentElement.scrollWidth,
        images: [...document.images].map((image) => ({ src: image.getAttribute('src'), loaded: image.complete && image.naturalWidth > 0 }))
      }));
      assert(dimensions.document <= width, `Overflow at ${width}: ${dimensions.document}`);
      assert(dimensions.images.every((image) => image.loaded), `Unloaded image at ${width}`);
      const panelHeights = [];
      for (const course of ['basic', 'conversation', 'jlpt', 'business']) {
        await page.locator(`[data-course="${course}"]`).click();
        assert.equal(await page.locator(`[data-course="${course}"]`).getAttribute('aria-selected'), 'true');
        assert.equal(await page.locator('#course-panel').getAttribute('aria-labelledby'), `tab-${course}`);
        assert.equal(await page.locator('#course-points li').count(), 3);
        assert.equal(await page.locator('#course-panel').getAttribute('data-tone'), course);
        panelHeights.push((await page.locator('#course-panel').boundingBox()).height);
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Tab overflow at ${width}/${course}`);
      }
      await page.locator('#tab-basic').click();
      await page.locator('#tab-basic').press('ArrowRight');
      assert.equal(await page.locator('#tab-conversation').getAttribute('aria-selected'), 'true');
      await page.locator('#tab-conversation').press('Home');
      assert.equal(await page.locator('#tab-basic').getAttribute('aria-selected'), 'true');
      {
        await page.locator('.menu-toggle').click();
        assert.equal(await page.locator('.menu-toggle').getAttribute('aria-expanded'), 'true');
        await page.locator('#main-nav a[href="#faq"]').click();
        assert.equal(await page.locator('.menu-toggle').getAttribute('aria-expanded'), 'false');
        await page.locator('.menu-toggle').click();
        await page.keyboard.press('Escape');
        assert.equal(await page.locator('.menu-toggle').getAttribute('aria-expanded'), 'false');
      }
      const faq = page.locator('.faq-list details').nth(1);
      await faq.locator('summary').click();
      assert.equal(await faq.getAttribute('open'), '');
      const links = await page.locator('a[href^="https:"]').evaluateAll((elements) => elements.map((element) => ({ href: element.href, rel: element.rel, target: element.target })));
      assert(links.length >= 7);
      assert(links.every((link) => link.href === 'https://naver.me/52c74Jj4' && link.target === '_blank' && link.rel.includes('noopener')));
      const badAnchors = await page.evaluate(() => [...document.querySelectorAll('a[href^="#"]')].filter((link) => link.hash && !document.getElementById(link.hash.slice(1))).map((link) => link.hash));
      assert.deepEqual(badAnchors, []);
      assert.deepEqual(errors, []);
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
      assert.equal(await page.evaluate(() => scrollY), 0);
      assert.equal(Math.max(...panelHeights), Math.min(...panelHeights), `Course layout shifts at ${width}`);
      await page.screenshot({ path: path.join(output, `page-${width}.png`), fullPage: width === 390 });
      if (width === 1440) {
        await page.locator('#courses').scrollIntoViewIfNeeded();
        await page.locator('#courses').screenshot({ path: path.join(output, 'courses-desktop.png') });
        await page.locator('.hero').screenshot({ path: path.join(output, 'intro-desktop.png') });
        await page.locator('#local-guide').screenshot({ path: path.join(output, 'local-desktop.png') });
      }
      if (width === 390) await page.locator('#local-guide').screenshot({ path: path.join(output, 'local-mobile.png') });
      results.push({ width, pageWidth: shell.width, openingOrder: 'thumbnail, intro, poster', singleColumn: true, horizontalOverflow: false, imagesLoaded: dimensions.images.length, consultationLinks: links.length, panelHeights, javascriptErrors: errors.length });
      await page.close();
    }
    console.log(JSON.stringify(results, null, 2));
  } finally {
    await browser.close();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
