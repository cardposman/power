const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { ROOT, origin, publicUrl, escapeHtml } = require('./site-data.cjs');

const generation = spawnSync(process.execPath, [path.join(__dirname, 'generate-regions.cjs')], { cwd: ROOT, stdio: 'inherit' });
if (generation.status !== 0) process.exit(generation.status || 1);
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'generated-pages.json'), 'utf8'));
const dist = path.resolve(ROOT, 'dist-netlify');
if (path.dirname(dist) !== ROOT || path.basename(dist) !== 'dist-netlify') throw new Error('Invalid distribution directory');
if (fs.existsSync(dist)) fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist);

function copy(source, destination) {
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
}

function copyTree(source, destination) {
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const from = path.join(source, entry.name);
    const to = path.join(destination, entry.name);
    if (entry.isDirectory()) copyTree(from, to);
    else copy(from, to);
  }
}

for (const page of manifest.pages) copy(path.join(ROOT, page.file), path.join(dist, page.file));
for (const entry of manifest.redirects) copy(path.join(ROOT, entry.file), path.join(dist, entry.file));
copy(path.join(ROOT, '.nojekyll'), path.join(dist, '.nojekyll'));
copyTree(path.join(ROOT, 'assets'), path.join(dist, 'assets'));
const siteOrigin = origin();
if (siteOrigin) {
  const urls = manifest.pages;
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((page) => `  <url><loc>${escapeHtml(publicUrl(page.url))}</loc></url>`).join('\n')}\n</urlset>\n`;
  fs.writeFileSync(path.join(dist, 'sitemap.xml'), sitemap);
  fs.writeFileSync(path.join(dist, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${publicUrl('/sitemap.xml')}\n`);
} else {
  fs.writeFileSync(path.join(dist, 'robots.txt'), 'User-agent: *\nDisallow: /\n');
}
fs.writeFileSync(path.join(dist, '_headers'), `/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n/assets/*\n  Cache-Control: public, max-age=3600, must-revalidate\n/*.html\n  Cache-Control: public, max-age=0, must-revalidate\n/region/*\n  Cache-Control: public, max-age=0, must-revalidate\n/station/*\n  Cache-Control: public, max-age=0, must-revalidate\n`);

const result = spawnSync(process.env.PYTHON || 'python', [path.join(__dirname, 'package-site.py')], { cwd: ROOT, stdio: 'inherit' });
if (result.status !== 0) process.exit(result.status || 1);
console.log(`Ready: ${manifest.districtCount} district pages, ${manifest.groupCount} regional directories, ${manifest.stationCount} station pages, ${manifest.stationGroupCount} station region directories, and two national directories. ${siteOrigin ? `Origin: ${siteOrigin}` : 'Preview package: indexing disabled until a deployment origin is configured.'}`);
