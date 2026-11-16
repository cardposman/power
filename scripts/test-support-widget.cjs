const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { ROOT } = require('./site-data.cjs');
const { sharedAssetUrl } = require('./shared-assets.cjs');
const source = fs.readFileSync(path.join(ROOT, 'assets/js/site.js'), 'utf8');

function harness(origin = 'https://tstudymate.com', readyState = 'complete') {
  const scripts = [];
  const documentEvents = new Map();
  const windowEvents = new Map();
  const classes = new Set();
  const menu = { attributes: {}, events: {}, setAttribute(key,value) { this.attributes[key]=value; }, addEventListener(name,fn) { this.events[name]=fn; } };
  const nav = { classList: { contains: key=>classes.has(key), remove: key=>classes.delete(key), toggle(key,force) { if(force) classes.add(key); else classes.delete(key); } }, addEventListener() {} };
  const state = { widget:null, rect:{top:800,bottom:900,height:100,width:480}, footer:true, observations:0 };
  const footer = { getBoundingClientRect:()=>state.rect };
  const document = {
    readyState,
    getElementById(id) { return id==='unified-support-loader' ? scripts.find(script=>script.id===id) : id==='main-nav' ? nav : null; },
    querySelector(selector) { return selector==='unified-support-chat' ? state.widget : selector==='.fixed-contact' ? (state.footer ? footer : null) : selector==='.menu-toggle' ? menu : null; },
    querySelectorAll() { return []; },
    addEventListener(name,callback) { if(!documentEvents.has(name)) documentEvents.set(name,[]); documentEvents.get(name).push(callback); },
    createElement(tag) { assert.equal(tag,'script'); return { dataset:{}, events:{}, addEventListener(name,fn) { this.events[name]=fn; } }; },
    body: { append(script) { scripts.push(script); } }
  };
  const context = { location:{origin,protocol:origin==='null'?'file:':new URL(origin).protocol}, document, URL, innerHeight:900,
    requestAnimationFrame(fn) { fn(); return 1; }, cancelAnimationFrame() {},
    addEventListener(name,fn) { windowEvents.set(name,fn); },
    ResizeObserver: class { constructor(fn) { this.callback=fn; } observe(target) { assert.equal(target,footer); state.observations++; } }
  };
  context.window=context;
  vm.createContext(context);
  return {scripts,state,documentEvents,windowEvents,menu,context,run() { vm.runInContext(source,context); },
    load() { state.widget={style:{values:{},setProperty(name,value) { this.values[name]=value; }}};scripts[0].events.load();return state.widget.style.values; }
  };
}

test('support loads only on the exact production origin', () => {
  for(const origin of ['null','http://localhost:8000','https://example.com','https://www.tstudymate.com','http://tstudymate.com','https://tstudymate.com.example.com']) {
    const page=harness(origin); page.run(); assert.equal(page.scripts.length,0,origin);
  }
});

test('one independent loader serves both languages and survives repeated initialization', () => {
  const page=harness();page.run();page.run();assert.equal(page.scripts.length,1);
  const script=page.scripts[0];
  assert.equal(script.src,'https://lxrjy-92bbd.web.app/widget.js');
  assert.equal(script.dataset.config,'https://lxrjy-92bbd.web.app/config.json');
  assert.equal(script.dataset.siteId,'tstudymate');assert.equal(script.async,true);
  const existing=harness();existing.state.widget={};existing.run();assert.equal(existing.scripts.length,0);
});

test('loader waits for a document body and still deduplicates ready events', () => {
  const page=harness('https://tstudymate.com','loading');page.run();page.run();assert.equal(page.scripts.length,0);
  for(const callback of page.documentEvents.get('DOMContentLoaded')) callback();
  assert.equal(page.scripts.length,1);
});

test('footer height, resize and scrolling keep a 16px clearance', () => {
  const page=harness();page.run();const values=page.load();
  assert.equal(values['--support-bottom'],'116px');assert.equal(page.state.observations,1);
  page.state.rect={top:770,bottom:900,height:130,width:480};page.windowEvents.get('resize')();assert.equal(values['--support-bottom'],'146px');
  page.state.rect={top:920,bottom:1020,height:100,width:480};page.windowEvents.get('scroll')();assert.equal(values['--support-bottom'],'16px');
  page.state.footer=false;page.windowEvents.get('resize')();assert.equal(values['--support-bottom'],'16px');
});

test('a failed external script does not change existing menu behavior', () => {
  const page=harness();page.run();assert.equal(page.scripts.length,1);
  page.menu.events.click();assert.equal(page.menu.attributes['aria-expanded'],'true');
  page.menu.events.click();assert.equal(page.menu.attributes['aria-expanded'],'false');
});

test('every canonical source page uses one versioned shared loader with no second direct widget tag', () => {
  const manifest=JSON.parse(fs.readFileSync(path.join(ROOT,'data/generated-pages.json'),'utf8'));
  assert.equal(manifest.pages.length,1004);
  for(const entry of manifest.pages) {
    const html=fs.readFileSync(path.join(ROOT,entry.sourceFile),'utf8');
    const scripts=[...html.matchAll(/<script\b[^>]*src="([^"]+)"[^>]*>/g)].map(match=>match[1]);
    const siteScripts=scripts.filter(url=>url.includes('js/site.js'));
    const base=path.posix.relative(path.posix.dirname(entry.sourceFile),'assets')+'/';
    assert.deepEqual(siteScripts,[sharedAssetUrl(base,'js/site.js')],entry.sourceFile);
    assert(!scripts.some(url=>url.includes('lxrjy-92bbd.web.app/widget.js')),entry.sourceFile);
    assert(html.includes(sharedAssetUrl(base,'css/site.css')),entry.sourceFile);
  }
});
