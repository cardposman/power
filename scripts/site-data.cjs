const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const readJson = (name) => JSON.parse(fs.readFileSync(path.join(ROOT, 'data', name), 'utf8'));
const site = readJson('site.json');
const source = readJson('official-sigungu.json');
const schoolSource = readJson('local-schools.json');
const supplements = readJson('school-supplements.json');

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

function hash(value) {
  return [...value].reduce((result, char) => (result * 31 + char.charCodeAt(0)) >>> 0, 0);
}

function origin() {
  const value = process.env.SITE_ORIGIN || site.origin;
  if (!value) return '';
  const parsed = new URL(value);
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password || parsed.pathname !== '/' || parsed.search || parsed.hash) {
    throw new Error('SITE_ORIGIN must be an http(s) origin without a path, query, or credentials.');
  }
  return parsed.origin;
}

function selectSchools(code) {
  const candidates = [...(supplements[code] || []), ...(schoolSource.districts[code]?.schools || [])];
  const unique = [...new Map(candidates.map((school) => [school.name, school])).values()];
  const selected = [];
  for (const kind of ['고등학교', '중학교', '초등학교']) {
    const school = unique.find((item) => item.kind === kind);
    if (school) selected.push(school);
  }
  for (const school of unique) {
    if (selected.length === 5) break;
    if (!selected.some((item) => item.name === school.name)) selected.push(school);
  }
  if (selected.length < 4) throw new Error(`Insufficient verified school data for ${code}`);
  return selected;
}

const districts = source.districts.map((district) => {
  const group = site.groups[district.provinceCode];
  if (!group || !/^\d{5}$/.test(district.pathCode)) throw new Error(`Invalid district: ${district.pathCode}`);
  const label = district.provinceCode === '3600000000' ? '세종' : `${group.label} ${district.displayName.trim()}`;
  const key = `${group.slug}/${district.pathCode}`;
  return { ...district, label, key, group, schools: selectSchools(district.pathCode), thumbnail: (hash(key) % 4) + 1, url: `/region/${key}/` };
});

const groups = [...new Set(districts.map((district) => district.provinceCode))].map((code) => ({
  ...site.groups[code], code, districts: districts.filter((district) => district.provinceCode === code)
}));

const thumbnailAlts = {
  1: '아는 표현을 실제 말하기로 연결하는 외국어 학습 홍보 이미지',
  2: '학교 수행평가와 내신 학습을 주제로 한 홍보 이미지',
  3: '나에게 맞는 외국어 학습법을 찾는 과정을 소개하는 홍보 이미지',
  4: '수준과 필요에 맞는 1:1 맞춤 커리큘럼을 소개하는 홍보 이미지'
};

function localParagraph(label, names, variant = 0) {
  const schools = names.join('·');
  const versions = [
    `${label}에서 ${schools} 주변 일본어과외를 알아보고 계신다면, 학년과 지금까지의 학습 경험을 함께 알려주세요. 글자와 발음부터 시작하려는 학생, 배운 표현을 말하기로 이어가려는 학생, JLPT를 목표로 공부하려는 학생은 필요한 출발점이 다릅니다. 학교 일정과 다른 공부 시간을 함께 살펴보고, 기초·생활회화·시험 대비 중 어떤 과정이 필요한지 1:1 화상수업 상담에서 정리해보세요.`,
    `${label}의 ${schools} 주변에서 일본어 수업을 찾고 있다면, 현재 수준과 배우려는 이유부터 정리해보세요. 히라가나를 처음 배우는 경우와 기초 문법을 다시 확인하려는 경우, 회화나 JLPT를 준비하는 경우에 필요한 과정은 달라집니다. 상담 시 학년과 학습 경험, 학교 일정에 맞춰 희망하는 시간을 함께 남겨주시면 나에게 맞는 1:1 화상수업 방향을 확인할 수 있습니다.`,
    `${schools} 주변에서 학교생활과 일본어 공부를 함께 계획하는 ${label} 학습자라면, 먼저 무리 없이 이어갈 학습 목표를 생각해보세요. 글자와 발음의 기초가 필요한지, 익힌 표현을 대화로 연결하고 싶은지, JLPT 준비가 목적인지에 따라 출발 과정이 달라집니다. 학년과 현재 수준, 다른 공부와 병행할 수 있는 희망 시간을 알려주시고 1:1 화상수업으로 배울 내용을 상담해보세요.`,
    `${label}에서 일본어과외를 비교하고 있다면, ${schools} 등 학교 생활권과 함께 나의 학습 상황도 살펴보세요. 처음 접하는 글자와 표현을 익히는 공부, 일상적인 대화를 연습하는 공부, JLPT를 목표로 영역별로 준비하는 공부는 필요한 내용이 서로 다릅니다. 학년과 배운 경험을 바탕으로 학교 일정과 희망 수업 시간을 확인하고, 나에게 필요한 과정부터 1:1 화상수업 상담으로 정리할 수 있습니다.`,
    `${label}의 ${schools} 주변에서 일본어 공부를 시작하려는 분은 지금까지 무엇을 배웠는지부터 알려주세요. 글자는 읽지만 문장을 말하기 어려울 수도 있고, 처음부터 기초를 쌓거나 JLPT를 목표로 공부하려는 경우도 있습니다. 상담에서는 학년과 현재 수준, 일본어를 쓰고 싶은 상황을 함께 확인합니다. 학교 일정과 다른 학습 시간을 고려해 희망 시간을 남기고, 기초·회화·시험 대비 중 필요한 방향을 살펴보세요.`,
    `${schools} 주변에서 일본어과외를 찾는 ${label} 학습자에게도 목표는 저마다 다릅니다. 일본어 글자를 익히는 첫걸음, 여행과 일상에서 활용할 회화, 자격증을 위한 JLPT 학습 중 무엇이 필요한지 생각해보세요. 학년과 현재 수준, 이전 학습 경험을 알려주시면 상담할 내용을 구체적으로 정리할 수 있습니다. 학교 일정과 희망 시간을 함께 남겨 1:1 화상수업으로 이어갈 학습 과정을 확인해보세요.`
  ];
  return versions[variant % versions.length];
}

module.exports = { ROOT, site, source, schoolSource, supplements, districts, groups, escapeHtml, hash, origin, thumbnailAlts, localParagraph };
