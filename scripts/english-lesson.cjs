const fs = require('node:fs');
const path = require('node:path');
const { ROOT, site, districts, thumbnailAlts, escapeHtml: e, hash, origin } = require('./site-data.cjs');
const { englishLocalContent } = require('./english-local-content.cjs');
const { sharedAssetUrl } = require('./shared-assets.cjs');

const config = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/english.json'), 'utf8'));
const counsel = new URL(config.counselUrl);
if (counsel.protocol !== 'https:' || counsel.username || counsel.password) throw new Error('English consultation URL must be a public HTTPS URL');
const image = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/english-image.json'), 'utf8'));
function renderEnglishLesson(entry, context) {
const { file, relativeTo, headUrls } = context;
const home = entry.kind === 'english-home';
const district = entry;
const local = home ? {
 topic: 'home', heading: ['나에게 필요한 영어,', '목표에서 시작해요.'],
 paragraph: '시험 점수가 필요한 분, 업무에서 영어를 쓰는 분, 오랜만에 회화를 다시 시작하는 분까지. 지금의 학습 경험과 듣기·말하기에서 어려운 점을 알려주세요. 전화·화상수업의 차이와 목표에 맞는 학습 내용을 살펴보고, 무료 레벨테스트와 수업 조건을 상담할 수 있습니다.',
 prompts: ['목표 시험 또는 영어를 사용할 상황', '현재 수준과 이전 학습 경험', '전화·화상수업 방식과 희망 시간']
} : englishLocalContent(district, entry.neighborhoods);
const relative = target => relativeTo(file, target);
const thumbnail = entry.pathCode === config.sampleDistrictCode ? config.thumbnail : [1,3,4][hash(entry.key) % 3];
const assetBase = `${relative('assets')}/`;
const title = `${home ? '' : `${district.label} `}${config.titleProduct} | ${site.name}`;
const entries = Object.entries(config.courses);
if (entries.length !== 4 || entries[0][0] !== 'listening') throw new Error('Expected four English courses starting with listening');
let offset = 0;
for (const part of image.segments) {
  if (part.top !== offset || part.width !== image.width || !/^product-detail-\d+\.webp$/.test(part.filename)) throw new Error('Invalid image segment');
  if (!fs.existsSync(path.join(ROOT, 'assets/images/english', part.filename))) throw new Error('Missing English artwork: run prepare-english-images.cjs first');
  offset += part.height;
}
if (offset !== image.height) throw new Error('English image segments do not cover the complete original');
const first = entries[0][1];
const fields = {
  SITE_SCRIPT: sharedAssetUrl(assetBase, 'js/site.js'), SITE_STYLESHEET: sharedAssetUrl(assetBase, 'css/site.css'),
  TITLE: title, DESCRIPTION: `${home ? '' : `${district.label} `}${config.description}`, SITE_NAME: site.name,
  PRODUCT: config.product, REGION_LABEL: home ? '' : district.label, REGION_KEY: district.key, ROBOTS: origin() ? 'index,follow' : 'noindex,nofollow',
  COUNSEL_URL: config.counselUrl, ASSET_BASE: assetBase, FAVICON: relative('favicon.ico'),
  HOME_LINK: relative('english/index.html'), THUMBNAIL: thumbnail, THUMB_ALT: thumbnailAlts[thumbnail],
  HERO_DESCRIPTION: config.description, FIRST_CATEGORY: first.category, FIRST_DESCRIPTION: first.description,
  FIRST_BOOK: first.book, FIRST_FIT: first.fit, FIRST_CTA: first.cta,
  ORIGINAL_IMAGE: relative(image.source),
  LOCAL_PARAGRAPH: local.paragraph, LOCAL_VARIANT: local.topic
};
const htmlFields = {
  LOCAL_COPY_ATTRIBUTE: local.id ? ` data-copy-id="${e(local.id)}"` : '',
  HEAD_URLS: headUrls(entry.url, thumbnail),
  HEADING_PREFIX: home ? '' : e(entry.label) + '<br>',
  STATION_CONTEXT: entry.kind === 'english-station' ? '<p class="station-context">' + e(entry.regionLabel + ' · 대표 노선 ' + entry.representativeLine) + '</p>' : '',
  LOCAL_CONTEXT: entry.kind === 'english-station' ? '<p class="service-notice">위 지역명은 역 인근 생활권의 참고 예시입니다. 수업은 전화·화상으로 진행되며, 지역 방문수업 안내가 아닙니다.</p>' : '',
  FOOTER_LINKS: [['english/region/index.html','영어 지역 안내'],['english/station/index.html','영어 역 안내'],['index.html','일본어수업']].map(([target,label]) => '<a href="' + e(relative(target)) + '">' + label + '</a>').join(''),

  LOCAL_HEADING: local.heading.map(e).join('<br>'),
  LOCAL_PROMPTS: local.prompts.map((prompt) => `<li>${e(prompt)}</li>`).join(''),
  COURSE_DATA: JSON.stringify(config.courses).replace(/</g, '\\u003c'),
  HERO_LEAD: config.heroLead.map(e).join('<br>'),
  FIRST_TITLE: first.title.map(e).join('<br>'),
  FIRST_POINTS: first.points.map((point) => `<li>${e(point)}</li>`).join(''),
  COURSE_TABS: entries.map(([key, course], index) => `<button id="tab-${key}" type="button" role="tab" aria-selected="${index === 0}" aria-controls="course-panel" data-course="${key}"${index ? ' tabindex="-1"' : ''}><span aria-hidden="true">0${index + 1}</span>${course.label.map(e).join('<br>')}</button>`).join(''),
  COURSE_FALLBACK: entries.slice(1).map(([, course]) => `<h3>${course.label.map(e).join('・')}</h3><p>${e(course.description)}</p>`).join(''),
  POSTER_IMAGES: image.segments.map((part, index) => `<div class="english-poster-segment"><img data-english-poster src="${e(assetBase)}images/english/${part.filename}" alt="영어수업 상세 안내 ${index + 1}/${image.segments.length}: 시험별 학습, 전화·화상수업, 강사와 학습 관리, 무료 레벨테스트 안내" width="${part.width}" height="${part.height}" loading="lazy" decoding="async">${index === image.segments.length - 1 ? `<a class="english-poster-cta" href="${e(config.counselUrl)}" target="_blank" rel="noopener noreferrer" aria-label="본문 이미지의 맞춤 상담 및 무료 레벨테스트 신청하기"></a>` : ''}</div>`).join(''),
  FEATURES: config.features.map(([heading, text], index) => `<div><dt><span>0${index + 1}</span>${e(heading)}</dt><dd>${e(text)}</dd></div>`).join(''),
  FAQ: config.faq.map(([question, answer], index) => `<details${index === 0 ? ' open' : ''}><summary>${e(question)}<span aria-hidden="true">+</span></summary><p>${e(answer)}</p></details>`).join('')
};
const template = fs.readFileSync(path.join(ROOT, 'templates/english-lesson.html'), 'utf8');
const html = template.replace(/\{\{([A-Z_]+)\}\}/g, (_, token) => {
  if (token in htmlFields) return htmlFields[token];
  if (!(token in fields)) throw new Error(`Unknown English template token: ${token}`);
  return e(fields[token]);
});
return { html: html.replace(/[\t ]+$/gm, ''), title, thumbnail, variant: local.variant ?? null, topic: local.topic, copyId: local.id || null };
}
module.exports = { renderEnglishLesson };
