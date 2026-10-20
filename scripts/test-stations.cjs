const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ROOT } = require('./site-data.cjs');
const { importStations, guideFor } = require('./import-stations.cjs');
const { stationSource, stations, stationGroups, guides } = require('./station-data.cjs');

const shortlist = fs.readFileSync(path.join(ROOT, stationSource.source), 'utf8');
const review = fs.readFileSync(path.join(ROOT, stationSource.reviewSource), 'utf8');

test('snapshot exactly reproduces the original 200 candidates and screening decisions', () => {
  assert.deepEqual(importStations(shortlist, review), stationSource);
  assert.equal(stations.length, 200);
  assert.equal(stationGroups.length, 12);
  const count = (field, value) => stations.filter((station) => station[field] === value).length;
  for (const [status, expected] of [['유지', 14], ['조건부', 12], ['통합검토', 5], ['보류', 19], ['미검토', 150]]) {
    assert.equal(count('screeningDecision', status), expected);
  }
  for (const [region, expected] of [['서울', 70], ['경기', 61], ['인천', 15], ['부산', 18], ['경남', 2], ['대구', 13], ['경북', 2], ['대전', 7], ['광주', 5], ['울산', 1], ['강원', 2], ['충남', 4]]) {
    assert.equal(count('regionLabel', region), expected);
  }
});

test('routes, regional labels, same-name stations and station suffixes are distinct', () => {
  assert.equal(new Set(stations.map((station) => station.file)).size, 200);
  assert.equal(new Set(stations.map((station) => station.label)).size, 200);
  for (const name of ['중앙로', '죽전']) {
    const matches = stations.filter((station) => station.name === name);
    assert.equal(matches.length, 2);
    assert.equal(new Set(matches.map((station) => station.regionSlug)).size, 2);
  }
  assert.equal(stations.find((station) => station.id === 177).displayName, '동대구역');
  assert.equal(stations.find((station) => station.id === 165).regionLabel, '경남');
  assert.equal(stations.find((station) => station.id === 180).regionLabel, '경북');
});

test('guide topics are editorial and cover useful consultation questions', () => {
  assert.equal(guideFor('직장인·업무 생활권'), 'work');
  assert.equal(guideFor('대학생 생활권'), 'campus');
  assert.equal(guideFor('가족·학생 학습'), 'routine');
  assert.equal(guideFor('회화 학습'), 'conversation');
  assert.equal(guideFor('교육'), 'basic');
  for (const station of stations) {
    assert(guides[station.guide]);
    assert.equal(station.content.prompts.length, 3);
    assert(station.content.comparison.length > 60);
    assert(station.content.question && station.content.answer);
  }
});

test('import refuses malformed rows, missing candidates and review mismatches', () => {
  assert.throws(() => importStations(shortlist.replace('| 200 |', '| 199 |'), review), /IDs/);
  assert.throws(() => importStations(shortlist.replace('| 강남 | 2호선 | A |', '| 강남 | 2호선 | B |'), review), /tier mismatch/);
  assert.throws(() => importStations(shortlist.replace('| 1 | 강남 |', '| 1 | |'), review), /Invalid station/);
  assert.throws(() => importStations(shortlist.replace('| 200 | 온양온천 |', '| 201 | 온양온천 |'), review), /Invalid station/);
  assert.throws(() => importStations(shortlist, ''), /50 reviewed/);
});
