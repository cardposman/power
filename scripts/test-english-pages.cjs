const test = require('node:test');
const assert = require('node:assert/strict');
const { englishDistricts, englishStations, englishGroups, englishStationGroups } = require('./english-data.cjs');
const { districts } = require('./site-data.cjs');
const { stations } = require('./station-data.cjs');

test('English reuses all district and station identities with independent routes', () => {
  assert.equal(englishDistricts.length,269);
  assert.equal(englishStations.length,200);
  assert.equal(englishGroups.length,16);
  assert.equal(englishStationGroups.length,12);
  const entries = [...englishDistricts,...englishStations];
  assert.equal(new Set(entries.map(entry => entry.url)).size,469);
  for (const entry of entries) {
    assert.match(entry.file,/^english\/(?:region|station)\/[a-z-]+\/\d+\/index\.html$/);
    assert.match(entry.deployFile,/^en-(?:reg|st)-[a-z0-9-]+\/index\.html$/);
    assert.equal(entry.url,'/'+entry.deployFile.replace(/index\.html$/,''));
  }
  assert.equal(englishDistricts.find(entry=>entry.pathCode==='11170').url,'/en-reg-yongsangu/');
  assert.equal(englishStations.find(entry=>entry.id===147).url,'/en-st-seomyun/');
  assert.equal(new Set([...districts,...stations,...entries].map(entry=>entry.url)).size,938);
  assert.equal(englishGroups.reduce((sum,group)=>sum+group.districts.length,0),269);
  assert.equal(englishStationGroups.reduce((sum,group)=>sum+group.stations.length,0),200);
});
