const fs = require('node:fs');
const path = require('node:path');
const { ROOT, escapeHtml: e } = require('./site-data.cjs');

const categories = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/categories.json'), 'utf8'));
const template = fs.readFileSync(path.join(ROOT, 'templates/category.html'), 'utf8');
const categoryFile = (category) => `course/${category.slug}/index.html`;
const lines = (text) => e(text).replace(/\n/g, '<br>');

function categoryNavigation(file, relativeTo, active = '') {
  return categories.map((category) => `<a href="${e(relativeTo(file, categoryFile(category)))}"${category.slug === active ? ' aria-current="page"' : ''}>${e(category.label)}</a>`).join('');
}

function renderCategory(category, { relativeTo, assetBase, headUrls, siteOrigin, site }) {
  const file = categoryFile(category);
  const fields = {
    TITLE: category.title, DESCRIPTION: category.description, LABEL: category.label,
    ROBOTS: siteOrigin ? 'index,follow' : 'noindex,nofollow', SLUG: category.slug,
    ASSET_BASE: assetBase(file), HOME_LINK: relativeTo(file, 'index.html'),
    REGIONS_LINK: relativeTo(file, 'region/index.html'), STATIONS_LINK: relativeTo(file, 'station/index.html'),
    COUNSEL_URL: site.counselUrl, EYEBROW: category.eyebrow, INTRO: category.intro,
    ART_ROW: category.artRow, ART_ALT: category.artAlt, ART_CAPTION: category.artCaption,
    CURRICULUM_INTRO: category.curriculumIntro, PRACTICE_INTRO: category.practiceIntro,
    CTA: category.cta, NOTE: category.note, CONTACT_TEXT: category.contactText
  };
  const html = {
    HEAD_URLS: headUrls(`/${file.replace(/index\.html$/, '')}`),
    CATEGORY_NAV: categoryNavigation(file, relativeTo, category.slug),
    LEAD: lines(category.lead), FIT_TITLE: lines(category.fitTitle),
    CURRICULUM_TITLE: lines(category.curriculumTitle), PRACTICE_TITLE: lines(category.practiceTitle),
    CONTACT_TITLE: lines(category.contactTitle),
    FIT_ITEMS: category.fit.map(([title, text]) => `<div><dt>${e(title)}</dt><dd>${e(text)}</dd></div>`).join(''),
    MODULES: category.modules.map(([title, text], index) => `<li><span class="module-number" aria-hidden="true">0${index + 1}</span><div><h3>${e(title)}</h3><p>${e(text)}</p></div></li>`).join(''),
    PRACTICE_ITEMS: category.practice.map(([title, text], index) => `<li><span aria-hidden="true">0${index + 1}</span><div><h3>${e(title)}</h3><p>${e(text)}</p></div></li>`).join(''),
    CHECKLIST: category.checklist.map((text) => `<li>${e(text)}</li>`).join(''),
    SOURCE: category.source ? `<a class="category-source" href="${e(category.source.url)}" target="_blank" rel="noopener noreferrer">${e(category.source.label)} <span aria-hidden="true">↗</span></a>` : '',
    FAQ: category.faq.map(([question, answer], index) => `<details${index === 0 ? ' open' : ''}><summary>${e(question)}<span aria-hidden="true">+</span></summary><p>${e(answer)}</p></details>`).join(''),
    RELATED: categories.filter((item) => item.slug !== category.slug).map((item) => `<li><a href="${e(relativeTo(file, categoryFile(item)))}">${e(item.label)} <span aria-hidden="true">→</span></a></li>`).join('')
  };
  return template.replace(/\{\{([A-Z_]+)\}\}/g, (_, token) => {
    if (token in html) return html[token];
    if (!(token in fields)) throw new Error(`Unknown category token: ${token}`);
    return e(fields[token]);
  });
}

module.exports = { categories, categoryFile, categoryNavigation, renderCategory };
