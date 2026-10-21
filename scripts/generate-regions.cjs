const fs = require('node:fs');
const path = require('node:path');
const { ROOT, site, source, schoolSource, districts, groups, escapeHtml: e, hash, origin, basePath, publicUrl, thumbnailAlts, localParagraph } = require('./site-data.cjs');
const { stationSource, stations, stationGroups } = require('./station-data.cjs');

const siteOrigin = origin();
const args = process.argv.slice(2);
let deployMode = false;
let outputArgument;
for (let index = 0; index < args.length; index += 1) {
  if (args[index] === '--deploy' && !deployMode) deployMode = true;
  else if (args[index] === '--output' && args[index + 1] && outputArgument === undefined) outputArgument = args[++index];
  else throw new Error('Usage: node scripts/generate-regions.cjs [--deploy] [--output workspace-subdirectory]');
}
const outputRoot = path.resolve(ROOT, outputArgument || (deployMode ? '_site' : '.'));
const outputRelative = path.relative(ROOT, outputRoot);
if (outputRelative.startsWith('..') || path.isAbsolute(outputRelative)) throw new Error('Output directory must stay inside the workspace');
if (deployMode && outputRoot === ROOT) throw new Error('Deployment output must not be the source checkout');
const outputParts = outputRelative.split(path.sep);
if (deployMode && outputRelative !== '_site' && !(outputParts[0] === 'verification' && outputParts.length > 1)) throw new Error('Deployment output must be _site or a verification subdirectory');
const template = fs.readFileSync(path.join(ROOT, 'templates', 'lesson.html'), 'utf8');
const pages = [];
const redirects = [];
const details = [...districts, ...stations];
const deploymentFiles = new Map(details.map((entry) => [entry.file, entry.deployFile]));
const publicRoutes = new Map(details.flatMap((entry) => [[entry.file, entry.url], [entry.deployFile, entry.url]]));
const deployFileFor = (file) => deploymentFiles.get(file) || file;
const outputFileFor = (file) => deployMode ? deployFileFor(file) : file;
const relativeFile = (file, target) => path.posix.relative(path.posix.dirname(file), target) || 'index.html';
const relativeTo = (file, target) => target.endsWith('index.html') ? relativeFile(file, outputFileFor(target)).replace(/index\.html$/, '') || './' : relativeFile(file, target);
const assetBase = (file) => `${relativeTo(file, 'assets')}/`;
const storageRoute = (file) => `/${file.replace(/index\.html$/, '')}`;
const routeFor = (file) => publicRoutes.get(file) || storageRoute(file);

function write(file, content) {
  if (!deployMode && /^(?:reg|st)-[^/]+\//.test(file)) throw new Error('Short-route files may only be written to deployment output');
  const target = path.resolve(outputRoot, file);
  const relative = path.relative(outputRoot, target);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) throw new Error(`Invalid output: ${file}`);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content, 'utf8');
}

function headUrls(url, thumbnail = 3) {
  if (!siteOrigin) return '';
  return `<link rel="canonical" href="${e(publicUrl(url))}">\n  <meta property="og:url" content="${e(publicUrl(url))}">\n  <meta property="og:image" content="${e(publicUrl(`/assets/originals/thumbnail-${thumbnail}.png`))}">`;
}

function redirect(legacyFile, file, label) {
  const target = relativeFile(legacyFile, file);
  const targetUrl = routeFor(file);
  const title = `${label} 일본어 수업 안내`;
  write(legacyFile, `<!doctype html>
<html lang="ko"><head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${e(title)}</title><meta name="robots" content="noindex,follow">
${siteOrigin ? `  <link rel="canonical" href="${e(publicUrl(targetUrl))}">\n` : ''}  <script src="${e(assetBase(legacyFile))}js/redirect.js" defer></script>
  <noscript><meta http-equiv="refresh" content="0;url=${e(target)}"></noscript>
</head><body><p>페이지 주소가 변경되었습니다. <a data-redirect-target href="${e(target)}">${e(label)} 일본어 수업 안내로 이동</a></p></body></html>
`);
  redirects.push({ file: legacyFile, url: storageRoute(legacyFile), targetFile: file, targetUrl });
}

function lesson({ file: sourceFile, key, label = site.product, schools = [], home = false, code = '', station = null }) {
  const file = outputFileFor(sourceFile);
  const thumbnail = home ? site.home.thumbnail : (hash(key) % 4) + 1;
  const variant = home ? 0 : hash(`copy:${key}`) % 6;
  const paragraph = home
    ? '일본어를 처음 시작하는 분부터 생활회화, JLPT, 비즈니스 표현을 배우려는 분까지 현재 수준과 목적에 맞는 과정을 상담합니다. 글자와 발음부터 차근차근 배울지, 배운 표현을 말하기로 연결할지, 시험 준비를 이어갈지 함께 정리해보세요. 학습 경험과 희망 수업 시간을 알려주시면 1:1 화상수업으로 배울 내용을 안내합니다.'
    : station ? `${label}에서 일본어 수업을 알아보고 있다면, 배우려는 목적과 현재 수준을 먼저 정리해보세요. ${station.content.paragraph}` : localParagraph(label, schools, variant);
  const title = home ? site.titleProduct : `${label} ${site.titleProduct} | ${site.brand}`;
  const description = station ? `${label} 맨투맨 일본어회화 일대일 과외수업. ${station.content.description}` : `${home ? site.product : `${label} ${site.product} ${site.brand}`}. 기초 일본어부터 생활회화, JLPT, 비즈니스 일본어까지 나의 목표에 맞는 1:1 화상수업을 상담하세요.`;
  const fields = {
    TITLE: title, DESCRIPTION: description, ROBOTS: !siteOrigin ? 'noindex,nofollow' : 'index,follow',
    ASSET_BASE: assetBase(file), THUMBNAIL: thumbnail, THUMB_ALT: thumbnailAlts[thumbnail], PAGE_KEY: key,
    HOME_LINK: relativeTo(file, 'index.html'), REGIONS_LINK: relativeTo(file, 'region/index.html'),
    STATIONS_LINK: relativeTo(file, 'station/index.html'),
    COURSE_ASIDE: station ? '처음 배우는 기초, 여행과 일상의 대화, JLPT와 업무 표현까지. 지금 필요한 내용을 중심으로 과정을 살펴보세요.' : '학교생활과 함께 준비할 JLPT, 여행에서 써보고 싶은 한마디, 일에 필요한 경어까지. 필요한 장면을 떠올리며 과정을 살펴보세요.',
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
    CONSULT_HEADING_FIRST: home ? '나에게 맞는 일본어,' : station ? station.content.heading : '학년과 목표에 맞춘',
    CONSULT_HEADING_SECOND: home ? '함께 시작해요.' : '일본어 학습 상담.',
    FIXED_TITLE: `${home ? '' : `${label} `}${site.product}`
  };
  const html = template.replace(/\{\{([A-Z_]+)\}\}/g, (_, token) => {
    if (token === 'HEAD_URLS') return headUrls(routeFor(file), thumbnail);
    if (token === 'HEADING_PREFIX') return home ? '' : `${e(label)}<br>`;
    if (token === 'STATION_NOTICE') return station ? `<p class="station-context">${e(station.regionLabel)} · 대표 노선 ${e(station.representativeLine)}</p><p class="service-notice">1:1 화상수업 안내입니다. 해당 역 주변의 오프라인 교실 안내가 아닙니다.</p>` : '';
    if (token === 'LOCAL_EXTRA') return station ? `<div class="station-guide"><h3>과정을 고르기 전에</h3><p>${e(station.content.comparison)}</p><h3>상담할 때 알려주세요</h3><ul>${station.content.prompts.map((prompt) => `<li>${e(prompt)}</li>`).join('')}</ul><details><summary>${e(station.content.question)}</summary><p>${e(station.content.answer)}</p></details><a class="inline-cta" href="${e(relativeTo(file, `station/${station.regionSlug}/index.html`))}">${e(station.regionLabel)} 역별 상담 목록 <span aria-hidden="true">→</span></a></div>` : '';
    if (!(token in fields)) throw new Error(`Unknown lesson token: ${token}`);
    return e(fields[token]);
  });
  write(file, html);
  pages.push({ kind: home ? 'home' : station ? 'station' : 'district', file, sourceFile, deployFile: deployFileFor(sourceFile), url: routeFor(file), title, label, key, code, schools, thumbnail, variant: station ? null : variant, ...(station ? { stationId: station.id, representativeLine: station.representativeLine, regionSlug: station.regionSlug, guide: station.guide, screeningDecision: station.screeningDecision } : {}) });
  if (deployMode && file !== sourceFile) redirect(sourceFile, file, label);
}

function districtLinks(fromFile, items) {
  return `<ul class="region-links">${items.map((district) => `<li data-region-item><a href="${e(relativeTo(fromFile, district.file || `region/${district.key}/index.html`))}"><span>${e(district.label)}${district.representativeLine ? `<small class="station-line">${e(district.representativeLine)}</small>` : ''}</span><span aria-hidden="true">→</span></a></li>`).join('')}</ul>`;
}

function directory(group = null, mode = 'district') {
  const stationMode = mode === 'station';
  const folder = stationMode ? 'station' : 'region';
  const file = group ? `${folder}/${group.slug}/index.html` : `${folder}/index.html`;
  const base = assetBase(file);
  const directoryLabel = stationMode ? '역별 상담' : '지역별 상담';
  const unit = stationMode ? '역' : '지역';
  const label = group ? `${group.label} ${directoryLabel}` : directoryLabel;
  const title = `${label} | ${site.brand} ${site.titleProduct}`;
  const items = group ? (stationMode ? group.stations : group.districts) : stationMode ? stations : districts;
  const directoryGroups = stationMode ? stationGroups : groups;
  const description = stationMode ? `${group ? group.label : '전국'} 역별 맨투맨 일본어회화 일대일 과외수업 상담 안내. 수업은 1:1 화상 방식이며 역 주변 오프라인 지점 안내가 아닙니다.` : `${group ? group.label : '전국'} 시·군·구별 맨투맨 일본어과외 상담 지역을 확인하세요.`;
  const list = group ? districtLinks(file, items) : directoryGroups.map((entry, index) => {
    const entries = stationMode ? entry.stations : entry.districts;
    return `<details class="region-group" data-region-group${index === 0 ? ' open' : ''}><summary>${e(entry.label)}<span>${entries.length}개 ${unit} <span aria-hidden="true">+</span></span></summary><a class="province-link" href="${e(relativeTo(file, `${folder}/${entry.slug}/index.html`))}">${e(entry.label)} 전체 보기 <span aria-hidden="true">→</span></a>${districtLinks(file, entries)}</details>`;
  }).join('\n');
  write(file, `<!doctype html>
<html lang="ko"><head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${e(title)}</title><meta name="description" content="${e(description)}">
  <meta name="robots" content="${siteOrigin ? 'index,follow' : 'noindex,nofollow'}"><meta name="theme-color" content="#eb5b22">
  <meta property="og:type" content="website"><meta property="og:title" content="${e(title)}"><meta property="og:description" content="${e(description)}">
${headUrls(routeFor(file))}
  <link rel="icon" href="data:,"><link rel="stylesheet" href="${e(base)}css/site.css">
  <script src="${e(base)}js/site.js" defer></script>
</head><body><div class="page-shell">
<a class="skip-link" href="#main">본문 바로가기</a>
<header class="site-header"><div class="container header-inner">
  <a class="brand" href="${e(relativeTo(file, 'index.html'))}" aria-label="TS재팬 홈"><span class="brand-symbol">TS</span><span>재팬<span class="brand-dot">.</span></span></a>
  <nav class="navigation" id="main-nav" aria-label="주요 메뉴"><a href="${e(relativeTo(file, 'index.html'))}">TS재팬 소개</a><a href="${e(relativeTo(file, 'region/index.html'))}">전체 지역</a></nav>
  <a class="button header-cta" href="${e(site.counselUrl)}" target="_blank" rel="noopener noreferrer">상담접수 <span aria-hidden="true">↗</span></a>
  <button class="menu-toggle" type="button" aria-label="메뉴 열기" aria-expanded="false" aria-controls="main-nav"><span aria-hidden="true">☰</span></button>
</div></header>
<main id="main">
  <section class="directory-heading container"><p class="section-label">TS재팬 · 맨투맨 일본어과외</p><h1>${e(label)}</h1>${stationMode ? '<p class="service-notice">1:1 화상수업 상담 안내입니다. 역 주변 오프라인 지점 안내가 아닙니다.</p>' : ''}<nav class="directory-switch" aria-label="상담 목록 구분"><a href="${e(relativeTo(file, 'region/index.html'))}"${stationMode ? '' : ' aria-current="page"'}>시·군·구</a><a href="${e(relativeTo(file, 'station/index.html'))}"${stationMode ? ' aria-current="page"' : ''}>역별</a></nav>${group ? `<a class="inline-cta" href="${e(relativeTo(file, `${folder}/index.html`))}"><span aria-hidden="true">←</span> 전체 ${unit}</a>` : ''}</section>
  <p class="directory-count container">${items.length}개 ${unit}</p>
  <section class="directory-list container" aria-label="상담 ${unit} 목록">${list}</section>
</main>
<footer class="site-footer"><div class="container footer-inner"><a class="brand" href="${e(relativeTo(file, 'index.html'))}"><span class="brand-symbol">TS</span><span>재팬<span class="brand-dot">.</span></span></a><a href="#main">맨 위로 <span aria-hidden="true">↑</span></a></div></footer>
<aside class="fixed-contact" aria-label="빠른 상담접수"><div class="container fixed-inner"><div><strong>맨투맨 일본어과외</strong></div><a class="button" href="${e(site.counselUrl)}" target="_blank" rel="noopener noreferrer">상담접수 <span aria-hidden="true">↗</span></a></div></aside>
</div></body></html>\n`);
  pages.push({ kind: stationMode ? group ? 'station-province' : 'station-directory' : group ? 'province' : 'directory', file, sourceFile: file, deployFile: file, url: routeFor(file), title, label, [stationMode ? 'stationCount' : 'districtCount']: items.length });
}

lesson({ file: 'index.html', key: site.home.key, home: true });
directory();
for (const group of groups) directory(group);
for (const district of districts) lesson({ file: district.file, key: district.key, label: district.label, schools: district.schools.map((school) => school.name), code: district.pathCode });
directory(null, 'station');
for (const group of stationGroups) directory(group, 'station');
for (const station of stations) lesson({ file: station.file, key: `station/${station.key}`, label: station.label, station });

if (deployMode) fs.cpSync(path.join(ROOT, 'assets'), path.join(outputRoot, 'assets'), { recursive: true });

write('.nojekyll', '');
const verificationFiles = site.verificationFiles || [];
for (const file of verificationFiles) {
  if (!/^naver[a-f0-9]+\.html$/.test(file)) throw new Error(`Invalid verification filename: ${file}`);
}
const suppliedFiles = ['CNAME', ...verificationFiles];
for (const file of suppliedFiles) {
  const sourceFile = path.join(ROOT, file);
  if (!fs.statSync(sourceFile).isFile()) throw new Error(`Missing public file: ${file}`);
  if (outputRoot !== ROOT) fs.copyFileSync(sourceFile, path.join(outputRoot, file));
}
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${siteOrigin ? pages.map((page) => `  <url><loc>${e(publicUrl(page.url))}</loc></url>`).join('\n') : ''}\n</urlset>\n`);
write('robots.txt', siteOrigin ? `User-agent: *\nAllow: /\nSitemap: ${publicUrl('/sitemap.xml')}\n` : 'User-agent: *\nDisallow: /\n');
const publicFiles = ['.nojekyll', ...suppliedFiles, 'sitemap.xml', 'robots.txt'];
write('data/generated-pages.json', `${JSON.stringify({ mode: deployMode ? 'deployment' : 'source', origin: siteOrigin, basePath: basePath(), districtCount: districts.length, groupCount: groups.length, stationCount: stations.length, stationGroupCount: stationGroups.length, redirectCount: redirects.length, publicFiles, sources: { regions: source.source, schools: schoolSource.source, supplements: 'data/school-supplements.json', stations: stationSource.source, stationReview: stationSource.reviewSource, slugs: 'data/route-slugs.json' }, pages, redirects }, null, 2)}\n`);
write('data/generated-urls.txt', `${pages.map((page) => page.url).join('\n')}\n`);
const thumbnails = districts.reduce((totals, district) => { totals[district.thumbnail] = (totals[district.thumbnail] || 0) + 1; return totals; }, {});
console.log(JSON.stringify({ mode: deployMode ? 'deployment' : 'source', output: path.relative(ROOT, outputRoot) || '.', districts: districts.length, provinceDirectories: groups.length, stations: stations.length, stationDirectories: stationGroups.length + 1, totalPages: pages.length, legacyRedirects: redirects.length, basePath: basePath(), thumbnails, indexing: siteOrigin ? 'pages enabled' : 'disabled until SITE_ORIGIN is configured' }, null, 2));
