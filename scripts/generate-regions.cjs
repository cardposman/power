const fs = require('node:fs');
const path = require('node:path');
const { ROOT, site, source, schoolSource, districts, groups, escapeHtml: e, hash, origin, thumbnailAlts, localParagraph } = require('./site-data.cjs');

const siteOrigin = origin();
const template = fs.readFileSync(path.join(ROOT, 'templates', 'lesson.html'), 'utf8');
const pages = [];
const relativeTo = (file, target) => path.posix.relative(path.posix.dirname(file), target) || 'index.html';
const assetBase = (file) => `${relativeTo(file, 'assets')}/`;
const routeFor = (file) => `/${file.replace(/index\.html$/, '')}`;

function write(file, content) {
  const target = path.resolve(ROOT, file);
  const relative = path.relative(ROOT, target);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) throw new Error(`Invalid output: ${file}`);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content, 'utf8');
}

function headUrls(url, thumbnail = 3) {
  if (!siteOrigin) return '';
  return `<link rel="canonical" href="${e(siteOrigin + url)}">\n  <meta property="og:url" content="${e(siteOrigin + url)}">\n  <meta property="og:image" content="${e(`${siteOrigin}/assets/originals/thumbnail-${thumbnail}.png`)}">`;
}

function lesson({ file, key, label = site.product, schools = [], home = false, code = '' }) {
  const thumbnail = home ? site.home.thumbnail : (hash(key) % 4) + 1;
  const variant = home ? 0 : hash(`copy:${key}`) % 6;
  const paragraph = home
    ? '일본어를 처음 시작하는 분부터 생활회화, JLPT, 비즈니스 표현을 배우려는 분까지 현재 수준과 목적에 맞는 과정을 상담합니다. 글자와 발음부터 차근차근 배울지, 배운 표현을 말하기로 연결할지, 시험 준비를 이어갈지 함께 정리해보세요. 학습 경험과 희망 수업 시간을 알려주시면 1:1 화상수업으로 배울 내용을 안내합니다.'
    : localParagraph(label, schools, variant);
  const title = home ? site.titleProduct : `${label} ${site.titleProduct} | ${site.brand}`;
  const description = `${home ? site.product : `${label} ${site.product} ${site.brand}`}. 기초 일본어부터 생활회화, JLPT, 비즈니스 일본어까지 나의 목표에 맞는 1:1 화상수업을 상담하세요.`;
  const fields = {
    TITLE: title, DESCRIPTION: description, ROBOTS: !siteOrigin ? 'noindex,nofollow' : 'index,follow',
    ASSET_BASE: assetBase(file), THUMBNAIL: thumbnail, THUMB_ALT: thumbnailAlts[thumbnail], PAGE_KEY: key,
    HOME_LINK: relativeTo(file, 'index.html'), REGIONS_LINK: relativeTo(file, 'region/index.html'),
    COUNSEL_URL: site.counselUrl, LOCAL_PARAGRAPH: paragraph,
    SITE_NAME: home ? site.product : site.brand,
    HOME_LABEL: `${home ? site.product : site.brand} 홈`,
    BRAND_SYMBOL: home ? '맨투맨' : 'TS',
    BRAND_WORD: home ? '' : '재팬',
    BRAND_DOT: home ? '' : '.',
    HERO_EYEBROW: home ? '1:1 화상수업' : `${site.brand} · 1:1 화상수업`,
    CONTACT_LABEL: home ? '일본어 상담' : `${site.brand} · 일본어 상담`,
    FIXED_SUBTITLE: `${home ? '' : `${site.brand} · `}나에게 맞는 1:1 일본어`,
    HERO_SECONDARY_LINK: home ? relativeTo(file, 'region/index.html') : '#local-guide',
    HERO_SECONDARY_LABEL: home ? '지역별 상담 보기' : '학습 상담 안내',
    HERO_SECONDARY_ICON: home ? '→' : '↓',
    CONSULT_LABEL: home ? '맞춤 수강 상담' : '학습 상담 안내',
    CONSULT_HEADING_FIRST: home ? '나에게 맞는 일본어,' : '학년과 목표에 맞춘',
    CONSULT_HEADING_SECOND: home ? '함께 시작해요.' : '일본어 학습 상담.',
    FIXED_TITLE: `${home ? '' : `${label} `}${site.product}`
  };
  const html = template.replace(/\{\{([A-Z_]+)\}\}/g, (_, token) => {
    if (token === 'HEAD_URLS') return headUrls(routeFor(file), thumbnail);
    if (token === 'HEADING_PREFIX') return home ? '' : `${e(label)}<br>`;
    if (!(token in fields)) throw new Error(`Unknown lesson token: ${token}`);
    return e(fields[token]);
  });
  write(file, html);
  pages.push({ kind: home ? 'home' : 'district', file, url: routeFor(file), title, label, key, code, schools, thumbnail, variant });
}

function districtLinks(fromFile, items) {
  return `<ul class="region-links">${items.map((district) => `<li data-region-item data-region-text="${e(`${district.label} ${district.officialName}`)}"><a href="${e(relativeTo(fromFile, `region/${district.key}/index.html`))}"><span>${e(district.label)}</span><span aria-hidden="true">→</span></a></li>`).join('')}</ul>`;
}

function directory(group = null) {
  const file = group ? `region/${group.slug}/index.html` : 'region/index.html';
  const base = assetBase(file);
  const label = group ? `${group.label} 지역별 상담` : '지역별 상담';
  const title = `${label} | ${site.brand} ${site.titleProduct}`;
  const items = group ? group.districts : districts;
  const description = `${group ? group.label : '전국'} 시·군·구별 맨투맨 일본어과외 상담 지역을 확인하세요.`;
  const list = group ? districtLinks(file, items) : groups.map((entry, index) => `<details class="region-group" data-region-group${index === 0 ? ' open' : ''}><summary>${e(entry.label)}<span><span data-group-count>${entry.districts.length}</span>개 지역 <span aria-hidden="true">+</span></span></summary><a class="province-link" href="${e(relativeTo(file, `region/${entry.slug}/index.html`))}">${e(entry.label)} 전체 보기 <span aria-hidden="true">→</span></a>${districtLinks(file, entry.districts)}</details>`).join('\n');
  write(file, `<!doctype html>
<html lang="ko"><head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${e(title)}</title><meta name="description" content="${e(description)}">
  <meta name="robots" content="${siteOrigin ? 'index,follow' : 'noindex,nofollow'}"><meta name="theme-color" content="#eb5b22">
  <meta property="og:type" content="website"><meta property="og:title" content="${e(title)}"><meta property="og:description" content="${e(description)}">
  ${headUrls(routeFor(file))}
  <link rel="icon" href="data:,"><link rel="stylesheet" href="${e(base)}css/site.css">
  <script src="${e(base)}js/site.js" defer></script><script src="${e(base)}js/regions.js" defer></script>
</head><body><div class="page-shell">
<a class="skip-link" href="#main">본문 바로가기</a>
<header class="site-header"><div class="container header-inner">
  <a class="brand" href="${e(relativeTo(file, 'index.html'))}" aria-label="TS재팬 홈"><span class="brand-symbol">TS</span><span>재팬<span class="brand-dot">.</span></span></a>
  <nav class="navigation" id="main-nav" aria-label="주요 메뉴"><a href="${e(relativeTo(file, 'index.html'))}">TS재팬 소개</a><a href="${e(relativeTo(file, 'region/index.html'))}">전체 지역</a></nav>
  <a class="button header-cta" href="${e(site.counselUrl)}" target="_blank" rel="noopener noreferrer">상담접수 <span aria-hidden="true">↗</span></a>
  <button class="menu-toggle" type="button" aria-label="메뉴 열기" aria-expanded="false" aria-controls="main-nav"><span aria-hidden="true">☰</span></button>
</div></header>
<main id="main">
  <section class="directory-heading container"><p class="section-label">TS재팬 · 맨투맨 일본어과외</p><h1>${e(label)}</h1>${group ? `<a class="inline-cta" href="${e(relativeTo(file, 'region/index.html'))}"><span aria-hidden="true">←</span> 전체 지역</a>` : ''}</section>
  <div class="directory-tools"><div class="container"><label class="search-label" for="region-search">지역명 검색</label><input type="search" id="region-search" data-region-search autocomplete="off" placeholder="예: ${group ? e(group.districts[0].displayName) : '서대문구, 부산 해운대구'}"><p class="region-count" role="status" aria-live="polite"><span data-region-count>${items.length}</span>개 지역</p></div></div>
  <section class="directory-list container" aria-label="상담 지역 목록">${list}<p class="search-empty" data-region-empty hidden>검색 결과가 없습니다.</p></section>
</main>
<footer class="site-footer"><div class="container footer-inner"><a class="brand" href="${e(relativeTo(file, 'index.html'))}"><span class="brand-symbol">TS</span><span>재팬<span class="brand-dot">.</span></span></a><a href="#main">맨 위로 <span aria-hidden="true">↑</span></a></div></footer>
<aside class="fixed-contact" aria-label="빠른 상담접수"><div class="container fixed-inner"><div><strong>맨투맨 일본어과외</strong></div><a class="button" href="${e(site.counselUrl)}" target="_blank" rel="noopener noreferrer">상담접수 <span aria-hidden="true">↗</span></a></div></aside>
</div></body></html>\n`);
  pages.push({ kind: group ? 'province' : 'directory', file, url: routeFor(file), title, label, districtCount: items.length });
}

lesson({ file: 'index.html', key: site.home.key, home: true });
directory();
for (const group of groups) directory(group);
for (const district of districts) lesson({ file: `region/${district.key}/index.html`, key: district.key, label: district.label, schools: district.schools.map((school) => school.name), code: district.pathCode });

write('data/generated-pages.json', `${JSON.stringify({ origin: siteOrigin, districtCount: districts.length, groupCount: groups.length, sources: { regions: source.source, schools: schoolSource.source, supplements: 'data/school-supplements.json' }, pages }, null, 2)}\n`);
write('data/generated-urls.txt', `${pages.map((page) => page.url).join('\n')}\n`);
const thumbnails = districts.reduce((totals, district) => { totals[district.thumbnail] = (totals[district.thumbnail] || 0) + 1; return totals; }, {});
console.log(JSON.stringify({ districts: districts.length, provinceDirectories: groups.length, totalPages: pages.length, thumbnails, indexing: siteOrigin ? 'regional pages enabled' : 'disabled until SITE_ORIGIN is configured' }, null, 2));
