const { site, origin, escapeHtml: e } = require('./site-data.cjs');
const { config, englishDistricts, englishStations, englishGroups, englishStationGroups } = require('./english-data.cjs');
const { renderEnglishLesson } = require('./english-lesson.cjs');
const { sharedAssetUrl } = require('./shared-assets.cjs');

function generateEnglish(ctx) {
  const { write, pages, outputFileFor, relativeTo, headUrls, faviconLinks, siteBrand, assetBase } = ctx;
  const home = { kind: 'english-home', file: 'english/index.html', deployFile: 'english/index.html', url: '/english/', key: 'home', label: config.product };
  for (const entry of [home, ...englishDistricts, ...englishStations]) {
    const file = outputFileFor(entry.file);
    const result = renderEnglishLesson(entry, { file, relativeTo, headUrls });
    write(file, result.html);
    pages.push({ kind: entry.kind, file, sourceFile: entry.file, deployFile: entry.deployFile, url: entry.url, key: entry.key, label: entry.label, title: result.title, thumbnail: result.thumbnail, variant: result.variant, topic: result.topic, copyId: result.copyId, neighborhoods: entry.neighborhoods || [], ...(entry.pathCode ? { code: entry.pathCode } : {}), ...(entry.id ? { stationId: entry.id } : {}) });
  }
  function directory(group, stationMode) {
    const folder = stationMode ? 'station' : 'region';
    const file = `english/${folder}/${group ? group.slug + '/' : ''}index.html`;
    const items = group ? group[stationMode ? 'stations' : 'districts'] : stationMode ? englishStations : englishDistricts;
    const groups = stationMode ? englishStationGroups : englishGroups;
    const label = `${group ? group.label + ' ' : ''}영어 ${stationMode ? '역별' : '지역별'} 안내`;
    const title = `${label} | ${site.name}`;
    const description = `${group ? group.label : '전국'} ${stationMode ? '역별' : '시·군·구별'} 맨투맨영어회화 일대일 과외수업 안내. 목표 시험과 생활·업무 영어를 위한 1:1 전화·화상수업을 상담하세요.`;
    const links = entries => `<ul class="region-links">${entries.map(item => `<li data-region-item><a href="${e(relativeTo(file,item.file))}"><span>${e(item.label)}${stationMode ? `<small class="station-line">${e(item.representativeLine)}</small>` : ''}</span><span aria-hidden="true">→</span></a></li>`).join('')}</ul>`;
    const list = group ? links(items) : groups.map((item,index) => `<details class="region-group"${index ? '' : ' open'}><summary>${e(item.label)}<span>${item[stationMode ? 'stations' : 'districts'].length}곳 +</span></summary><a class="province-link" href="${e(relativeTo(file,`english/${folder}/${item.slug}/index.html`))}">${e(item.label)} 전체 보기 →</a>${links(item[stationMode ? 'stations' : 'districts'])}</details>`).join('');
    write(file, `<!doctype html><html lang="ko"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${e(title)}</title><meta name="description" content="${e(description)}"><meta name="robots" content="${origin() ? 'index,follow' : 'noindex,nofollow'}">
<meta name="theme-color" content="#eb5b22"><meta property="og:type" content="website"><meta property="og:title" content="${e(title)}"><meta property="og:description" content="${e(description)}"><meta property="og:site_name" content="${e(site.name)}">
${headUrls('/'+file.replace(/index\.html$/,''))}${faviconLinks(file)}
<link rel="stylesheet" href="${e(sharedAssetUrl(assetBase(file),'css/site.css'))}"><script src="${e(sharedAssetUrl(assetBase(file),'js/site.js'))}" defer></script>
</head><body data-subject="english"><div class="page-shell"><a class="skip-link" href="#main">본문 바로가기</a>
<header class="site-header"><div class="container header-inner">${siteBrand(file)}<nav class="navigation" id="main-nav" aria-label="주요 메뉴"><a href="${e(relativeTo(file,'english/index.html'))}">영어수업</a><a href="${e(relativeTo(file,'index.html'))}">일본어수업</a></nav><a class="button header-cta" href="${e(config.counselUrl)}" target="_blank" rel="noopener noreferrer">상담접수 ↗</a><button class="menu-toggle" type="button" aria-label="메뉴 열기" aria-expanded="false" aria-controls="main-nav"><span aria-hidden="true">☰</span></button></div></header>
<main id="main"><section class="directory-heading container"><p class="section-label">${e(site.name)} · ${e(config.product)}</p><h1>${e(label)}</h1><p class="service-notice">전화·화상수업 안내입니다. 지역별 오프라인 교실 안내가 아닙니다.</p><nav class="directory-switch" aria-label="안내 목록 구분"><a href="${e(relativeTo(file,'english/region/index.html'))}">시·군·구</a><a href="${e(relativeTo(file,'english/station/index.html'))}">역별</a></nav>${group ? `<a class="inline-cta" href="${e(relativeTo(file,`english/${folder}/index.html`))}">← 전체 목록</a>` : ''}</section><p class="directory-count container">${items.length}곳</p><section class="directory-list container" aria-label="영어수업 안내 목록">${list}</section></main>
<footer class="site-footer"><div class="container footer-inner">${siteBrand(file)}<a href="${e(relativeTo(file,'english/index.html'))}">영어수업 홈</a><a href="#main">맨 위로 ↑</a></div></footer>
<aside class="fixed-contact" aria-label="빠른 상담접수"><div class="container fixed-inner"><div><strong>${e(config.product)}</strong></div><a class="button" href="${e(config.counselUrl)}" target="_blank" rel="noopener noreferrer">상담접수 ↗</a></div></aside></div></body></html>\n`);
    pages.push({ kind: stationMode ? group ? 'english-station-province' : 'english-station-directory' : group ? 'english-province' : 'english-directory', file, sourceFile:file, deployFile:file, url:'/'+file.replace(/index\.html$/,''), title,label, count:items.length });
  }
  directory(null,false);
  for (const group of englishGroups) directory(group,false);
  directory(null,true);
  for (const group of englishStationGroups) directory(group,true);
}
module.exports = { generateEnglish };
