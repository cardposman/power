const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => JSON.parse(fs.readFileSync(path.join(root, 'data', file), 'utf8'));
const slugs = read('route-slugs.json');

function routes(table, identifiers, prefix) {
  const expected = new Set(identifiers.map(String));
  if (!table || Object.keys(table).length !== expected.size || Object.keys(table).some((id) => !expected.has(id))) throw new Error(`Incomplete ${prefix} slug table`);
  const result = new Map();
  const used = new Set();
  for (const id of expected) {
    const slug = table[id];
    if (typeof slug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error(`Invalid ${prefix} slug: ${id}`);
    if (used.has(slug)) throw new Error(`Duplicate ${prefix} slug: ${slug}`);
    used.add(slug);
    const route = `${prefix}-${slug}`;
    result.set(id, { file: `${route}/index.html`, url: `/${route}/` });
  }
  return result;
}

const districtRoutes = routes(slugs.districts, read('official-sigungu.json').districts.map((item) => item.pathCode), 'reg');
const stationRoutes = routes(slugs.stations, read('stations.json').stations.map((item) => item.id), 'st');

function lookup(table, id) {
  const route = table.get(String(id));
  if (!route) throw new Error(`Missing short route: ${id}`);
  return route;
}

module.exports = {
  districtRoute: (code) => lookup(districtRoutes, code),
  stationRoute: (id) => lookup(stationRoutes, id),
  routes
};
