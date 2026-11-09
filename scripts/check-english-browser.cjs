const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');
const { ROOT } = require('./site-data.cjs');

(async () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT,'data/generated-pages.json'),'utf8'));
  const entries = manifest.pages.filter(entry=>entry.kind.startsWith('english-'));
  const browser = await chromium.launch({ headless:true, executablePath:process.env.BROWSER_EXECUTABLE || undefined });
  const errors = [];
  const missing = [];
  try {
    const page = await browser.newPage({viewport:{width:375,height:844}});
    page.on('pageerror',error=>errors.push(error.message));
    page.on('requestfailed',request=>missing.push(request.url()));
    for (const [index,entry] of entries.entries()) {
      await page.goto(pathToFileURL(path.join(ROOT,entry.file)).href);
      await page.evaluate(()=>document.fonts.ready);
      assert.equal(await page.title(),entry.title);
      assert.equal(await page.locator('h1').count(),1);
      assert.equal((await page.locator('.page-shell').boundingBox()).width,375);
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),entry.file);
      assert.equal(await page.locator('input[type=search]').count(),0);
      assert.equal(await page.locator('a[href="https://naver.me/52c74Jj4"]').count(),0);
      if ((index+1)%50===0) console.log(`English mobile pages checked: ${index+1}/${entries.length}`);
    }
    for (const width of [320,1440]) {
      await page.setViewportSize({width,height:900});
      for (const file of ['english/index.html','english/station/busan/147/index.html','english/region/busan/26470/index.html','english/region/index.html','english/station/index.html']) {
        await page.goto(pathToFileURL(path.join(ROOT,file)).href);
        assert.equal((await page.locator('.page-shell').boundingBox()).width,Math.min(width,480));
        assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),file);
      }
    }
    await page.goto(pathToFileURL(path.join(ROOT,'english/index.html')).href);
    await page.locator('.site-footer').getByRole('link',{name:'영어 지역 안내',exact:true}).click();
    await page.getByRole('link',{name:'서울 용산구',exact:true}).click();
    assert.equal(page.url(),pathToFileURL(path.join(ROOT,'english/region/seoul/11170/index.html')).href);
    await page.locator('.site-footer').getByRole('link',{name:'일본어수업',exact:true}).click();
    assert.equal(page.url(),pathToFileURL(path.join(ROOT,'index.html')).href);
    await page.locator('.menu-toggle').click();
    await page.locator('#main-nav').getByRole('link',{name:'영어수업',exact:true}).click();
    assert.equal(page.url(),pathToFileURL(path.join(ROOT,'english/index.html')).href);
    assert.deepEqual(errors,[]);
    assert.deepEqual(missing,[]);
    const result = {englishPages:entries.length,mobileWidth:375,additionalWidths:[320,1440],horizontalOverflow:0,javascriptErrors:0,missingAssets:0,subjectNavigation:'passed'};
    fs.writeFileSync(path.join(ROOT,'verification/english-browser.json'),JSON.stringify(result,null,2)+'\n');
    console.log(JSON.stringify(result,null,2));
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
