const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');
const { ROOT, site, districts } = require('./site-data.cjs');
const { englishLocalContent } = require('./english-local-content.cjs');

(async () => {
  const config = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/english.json'), 'utf8'));
  const image = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/english-image.json'), 'utf8'));
  const expectedLocal = englishLocalContent(districts.find((district) => district.pathCode === config.sampleDistrictCode), config.sampleNeighborhoods);
  const output = path.join(ROOT, 'verification');
  fs.mkdirSync(output, { recursive: true });
  const sampleUrl = pathToFileURL(path.join(ROOT, 'english/region/seoul/11170/index.html')).href;
  const browser = await chromium.launch({ headless: true, executablePath: process.env.BROWSER_EXECUTABLE || undefined });
  const errors = [];
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(12000);
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('requestfailed', (request) => errors.push(request.url()));
    for (const width of [320, 375, 390, 480, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: width > 800 ? 1000 : 844 });
      await page.goto(sampleUrl);
      await page.addStyleTag({ content: 'html { scroll-behavior: auto !important; }' });
      assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'), 'index,follow');
      assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'), 'https://tstudymate.com/en-reg-yongsangu/');
      const localCopy = await page.locator('#local-guide .local-description').innerText();
      assert.equal(await page.locator('#local-guide').getAttribute('data-copy-variant'), expectedLocal.topic);
      assert.equal(await page.locator('#local-title').innerText(), expectedLocal.heading.join('\n'));
      assert.equal(localCopy, expectedLocal.paragraph);
      assert.deepEqual(await page.locator('.english-consult-list li').allTextContents(), expectedLocal.prompts);
      for (const neighborhood of config.sampleNeighborhoods) {
        assert.equal(localCopy.split(neighborhood).length - 1, 1);
        assert(!(await page.title()).includes(neighborhood));
      }
      assert.equal((await page.locator('.page-shell').boundingBox()).width, Math.min(width, 480));
      assert.equal(await page.locator('.site-header .brand').innerText(), site.name);
      const logo = await page.locator('.site-header .brand').boundingBox();
      const headerCta = await page.locator('.header-cta').boundingBox();
      assert(logo.x + logo.width < headerCta.x);
      assert.equal(await page.locator('main > :first-child').getAttribute('id'), 'intro-media');
      assert(await page.locator('main > :nth-child(2)').evaluate((element) => element.classList.contains('hero')));
      assert.equal(await page.locator('main > :nth-child(3)').getAttribute('id'), 'curriculum');
      await page.evaluate(async () => {
        for (const image of document.images) image.loading = 'eager';
        await Promise.all([...document.images].map((image) => image.decode()));
      });
      const parts = await page.locator('[data-english-poster]').all();
      assert.equal(parts.length, 6);
      let lastBottom;
      for (const [index, part] of parts.entries()) {
        const box = await part.boundingBox();
        const dimensions = await part.evaluate((element) => [element.naturalWidth, element.naturalHeight]);
        assert.deepEqual(dimensions, [image.segments[index].width, image.segments[index].height]);
        assert.equal(box.width, Math.min(width, 480));
        if (lastBottom !== undefined) assert(Math.abs(box.y - lastBottom) < .1, 'Gap between artwork segments');
        lastBottom = box.y + box.height;
      }
      const heights = [];
      for (const [key, course] of Object.entries(config.courses)) {
        await page.locator(`[data-course="${key}"]`).click();
        assert.equal(await page.locator('#course-panel').getAttribute('data-tone'), key);
        assert.equal(await page.locator('#course-title').innerText(), course.title.join('\n'));
        assert.equal(await page.locator('#course-book').innerText(), course.book);
        assert.equal(await page.locator('#course-points li').count(), 3);
        heights.push((await page.locator('#course-panel').boundingBox()).height);
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      }
      assert.equal(Math.min(...heights), Math.max(...heights), `Course panel resized at ${width}: ${heights}`);
      await page.locator('#tab-listening').click();
      await page.locator('#tab-listening').press('ArrowRight');
      assert.equal(await page.locator('#tab-speaking').getAttribute('aria-selected'), 'true');
      await page.locator('#tab-speaking').press('Home');
      assert.equal(await page.locator('#tab-listening').getAttribute('aria-selected'), 'true');
      await page.locator('.menu-toggle').click();
      await page.locator('#main-nav a[href="#lesson-format"]').click();
      assert.equal(await page.locator('.menu-toggle').getAttribute('aria-expanded'), 'false');
      await page.locator('.menu-toggle').click();
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('.menu-toggle').getAttribute('aria-expanded'), 'false');
      const faq = page.locator('.faq-list details').nth(3);
      await faq.locator('summary').click();
      assert.equal(await faq.getAttribute('open'), '');
      assert((await page.locator('body').innerText()).includes('무료 레벨테스트'));
      const consultation = await page.locator('a[href^="https:"]').evaluateAll((links) => links.map((link) => [link.href, link.target, link.rel]));
      assert(consultation.length >= 7);
      assert(consultation.every(([url, target, rel]) => url === config.counselUrl && target === '_blank' && rel.includes('noopener')));
      const posterCta = page.locator('.english-poster-cta');
      await posterCta.scrollIntoViewIfNeeded();
      assert(await posterCta.evaluate((element) => {
        const box = element.getBoundingClientRect();
        return element.contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2));
      }));
      await page.evaluate(() => scrollTo(0, 0));
      if ([320, 390, 1440].includes(width)) {
        await page.screenshot({ path: path.join(output, `english-yongsan-${width}.png`) });
        if (width === 390) {
          const style = '.site-header, .fixed-contact, .skip-link { visibility: hidden !important; }';
          await page.locator('.hero').screenshot({ path: path.join(output, 'english-yongsan-intro.png'), style });
          await page.locator('#courses').screenshot({ path: path.join(output, 'english-yongsan-courses.png'), style });
          await page.locator('#local-guide').screenshot({ path: path.join(output, 'english-yongsan-local-390.png'), style });
          await page.locator('.english-poster-segment').last().screenshot({ path: path.join(output, 'english-yongsan-poster-end.png'), style });
        }
      }
      console.log(`English sample passed at ${width}px`);
    }
    const noJs = await browser.newPage({ javaScriptEnabled: false, viewport: { width: 320, height: 844 } });
    await noJs.goto(sampleUrl);
    assert.equal(await noJs.locator('.english-noscript h3').count(), 3);
    assert((await noJs.locator('#hero-title').innerText()).includes(config.product));
    await noJs.close();
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ samplePages: 1, widths: [320, 375, 390, 480, 768, 1024, 1440], posterSegments: 6, courseTabs: 4, menu: 'passed', faq: 'passed', noJavaScriptFallback: 'passed', horizontalOverflow: false, javascriptErrors: 0 }, null, 2));
  } finally {
    await browser.close();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
