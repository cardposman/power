const fs = require('node:fs');
const path = require('node:path');
const { ROOT } = require('./site-data.cjs');

// These ranges preserve the IDs in the reviewed, fixed 200-candidate snapshot.
const regions = [
  [1, 70, 'seoul', '서울'], [71, 131, 'gyeonggi-do', '경기'],
  [132, 146, 'incheon', '인천'], [147, 164, 'busan', '부산'],
  [165, 166, 'gyeongsangnam-do', '경남'], [167, 179, 'daegu', '대구'],
  [180, 181, 'gyeongsangbuk-do', '경북'], [182, 188, 'daejeon', '대전'],
  [189, 193, 'gwangju', '광주'], [194, 194, 'ulsan', '울산'],
  [195, 196, 'gangwon-do', '강원'], [197, 200, 'chungcheongnam-do', '충남']
];

function guideFor(rationale) {
  if (/직장|업무|통근/.test(rationale)) return 'work';
  if (/대학/.test(rationale)) return 'campus';
  if (/학생|가족|주거/.test(rationale)) return 'routine';
  if (/회화|청년|성인/.test(rationale)) return 'conversation';
  return 'basic';
}

function importStations(shortlist, review) {
  const decisions = new Map();
  for (const line of review.split(/\r?\n/)) {
    if (!/^\| \d+ \| [^|]+ \| (유지|조건부|통합검토|보류) \|/.test(line)) continue;
    const cells = line.split('|').slice(1, -1).map((cell) => cell.trim());
    if (decisions.has(Number(cells[0]))) throw new Error('Duplicate review ID');
    decisions.set(Number(cells[0]), cells[2]);
  }
  if (decisions.size !== 50) throw new Error('Expected 50 reviewed candidates');

  const stations = [];
  for (const line of shortlist.split(/\r?\n/)) {
    if (!/^\| \d+ \|/.test(line)) continue;
    const cells = line.split('|').slice(1, -1).map((cell) => cell.trim());
    if (cells.length !== 6 || !['A', 'B'].includes(cells[3])) throw new Error(`Invalid candidate row: ${line}`);
    const [idText, name, representativeLine, candidateTier, rationale, notes] = cells;
    const id = Number(idText);
    const region = regions.find(([first, last]) => id >= first && id <= last);
    if (!region || !name || !representativeLine) throw new Error(`Invalid station: ${id}`);
    if ((candidateTier === 'A') !== decisions.has(id)) throw new Error(`Review tier mismatch: ${id}`);
    stations.push({
      id, name, representativeLine, regionSlug: region[2], regionLabel: region[3],
      candidateTier, screeningDecision: decisions.get(id) || '미검토',
      guide: guideFor(rationale), rationale, notes
    });
  }
  stations.sort((a, b) => a.id - b.id);
  if (stations.length !== 200 || stations.some((station, index) => station.id !== index + 1)) throw new Error('Expected candidate IDs 1-200 exactly once');
  const identities = stations.map((station) => `${station.regionSlug}/${station.name}/${station.representativeLine}`);
  if (new Set(identities).size !== 200) throw new Error('Duplicate station identity');
  return {
    snapshotDate: '2026-10-20',
    source: 'docs/station-shortlist-20261020.md',
    reviewSource: 'docs/station-validation-20261020.md',
    scope: 'User-approved 200-candidate local expansion; not a search-volume ranking or proof of distinct demand.',
    guidePolicy: 'Editorial starting topic derived from the candidate rationale, not measured local learner characteristics. Editable per station.',
    stations
  };
}

if (require.main === module) {
  const data = importStations(
    fs.readFileSync(path.join(ROOT, 'docs/station-shortlist-20261020.md'), 'utf8'),
    fs.readFileSync(path.join(ROOT, 'docs/station-validation-20261020.md'), 'utf8')
  );
  fs.writeFileSync(path.join(ROOT, 'data/stations.json'), `${JSON.stringify(data, null, 2)}\n`);
  console.log(`Imported ${data.stations.length} station candidates; screening decisions preserved.`);
}

module.exports = { importStations, guideFor };
