const fs = require('node:fs');
const path = require('node:path');
const { ROOT } = require('./site-data.cjs');
const { englishDistricts, englishStations } = require('./english-data.cjs');

// Every detail page owns an authored heading, body and question set.
// The only shared text here is the geographic/service context.
const sourceDir = path.join(ROOT, 'data/english-copy');
const expected = new Map([
  ...englishDistricts.map(entry => [`district-${entry.pathCode}`, entry]),
  ...englishStations.map(entry => [`station-${entry.id}`, entry])
]);
const records = new Map();
const headings = new Set();
const paragraphs = new Set();
const questionSets = new Set();
const normalize = text => text.normalize('NFKC').replace(/[\p{P}\p{Z}\s]/gu, '');
for (const filename of fs.readdirSync(sourceDir).filter(name => /^(regions|stations)-[a-z]\.txt$/.test(name)).sort()) {
  const kind = filename.startsWith('regions-') ? 'district' : 'station';
  for (const line of fs.readFileSync(path.join(sourceDir,filename),'utf8').trim().split(/\r?\n/)) {
    const fields = line.split('|');
    if (fields.length !== 4) throw new Error(`Malformed individual copy in ${filename}`);
    const [id, title, body, questions] = fields;
    const recordId = `${kind}-${id}`;
    const entry = expected.get(recordId);
    const prompts = questions.split('/');
    if (!entry || records.has(entry.key)) throw new Error(`Unknown or duplicate individual copy: ${recordId}`);
    if (title.length < 10 || body.length < 70 || !body.endsWith('.') || prompts.length !== 3 || new Set(prompts).size !== 3 || prompts.some(text => !text.trim())) throw new Error(`Incomplete individual copy: ${recordId}`);
    for (const [value, seen, label] of [[title,headings,'heading'],[body,paragraphs,'body'],[prompts.join('|'),questionSets,'question set']]) {
      const normalized = normalize(value);
      if (seen.has(normalized)) throw new Error(`Duplicate individual ${label}: ${recordId}`);
      seen.add(normalized);
    }
    const split = title.indexOf(', ');
    records.set(entry.key, { id:recordId, label:entry.label, neighborhoods:[...entry.neighborhoods], topic:'individual', variant:null,
      heading:split < 0 ? [title] : [title.slice(0,split+1),title.slice(split+2)], body, prompts });
  }
}
if (records.size !== expected.size || expected.size !== 469) throw new Error(`Expected exactly 469 individual copies; found ${records.size}`);

function englishLocalContent(entry, neighborhoods) {
  if (!entry || typeof entry.key !== 'string' || !entry.key || typeof entry.label !== 'string' || !entry.label) throw new Error('Expected a district key and label');
  if (!Array.isArray(neighborhoods) || neighborhoods.length < 2 || neighborhoods.length > 3 || new Set(neighborhoods).size !== neighborhoods.length || neighborhoods.some(name => typeof name !== 'string' || !name.trim())) throw new Error('Expected two or three distinct neighborhood names');
  const record = records.get(entry.key);
  if (!record) throw new Error(`Missing individual copy: ${entry.key}`);
  if (entry.label !== record.label || neighborhoods.join('|') !== record.neighborhoods.join('|')) throw new Error(`Individual copy place mismatch: ${entry.key}`);
  const areas = neighborhoods.join('·');
  const context = entry.key.startsWith('station/')
    ? `${entry.label} 주변 ${areas}에서 전화·화상수업을 알아본다면 이 내용을 상담할 때 알려주세요.`
    : `${entry.label}의 ${areas} 학습자는 전화·화상수업으로 필요한 연습을 상담할 수 있습니다.`;
  return { id:record.id, variant:null, topic:record.topic, heading:[...record.heading], paragraph:`${record.body} ${context}`, body:record.body, prompts:[...record.prompts] };
}
module.exports = { englishLocalContent, copyCount:records.size };
