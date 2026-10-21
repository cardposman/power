# TS Japan: Regional Japanese Lesson Pages

Open `index.html` directly in a browser. No build or dependencies are needed to use the page.

- Product: TS Japan 1:1 Japanese lessons
- Main page: a region-neutral TS Japan introduction at `index.html`.
- Mobile-first single-column layout on all devices, capped at 480px. The opening order below the header is a region-assigned thumbnail, the product introduction, then the full product detail image.
- All consultation links: https://naver.me/52c74Jj4
- Source images: `assets/originals/`
- Optimized web images: `assets/images/`
- Pages use `noindex,nofollow` until a production origin is configured.
- Regional directory: `region/index.html`. The 269 district pages now use `reg-{slug}/index.html`; province and national directory paths are unchanged.
- Station directory: `station/index.html`. The 200 station pages now use `st-{slug}/index.html`; the 12 regional directories and national station directory retain their paths. There are 500 content/list pages plus 469 legacy redirect files, not 969 independent content pages.
- Examples: `/power/reg-yongsangu/` and `/power/st-seomyun/`. The old nested detail paths redirect to these short routes. See `docs/short-urls.md` for the migration rules.

Recreate optimized images (Python with Pillow):

```powershell
python scripts/prepare-images.py "<path to supplied ZIP>"
```

Curriculum content is based on the supplied artwork. Lesson prices, schedules, and other unspecified terms are handled through consultation.

Regional context is limited to the page identity and one medium-length consultation paragraph with five verified local school names. Product sections and FAQ use general lesson information. See `docs/regional-content.md` for source references and expansion criteria.

Station pages do not insert school names. They identify the region and representative line, explicitly describe online-only consultation rather than a local classroom, and provide goal-based guidance, a consultation checklist, and a related question. Five shared guidance topics are used; these are editorial starting points, not measured characteristics of each station's learners or 200 independently verified local offerings. See `docs/station-expansion.md` for scope and limitations.

## Generate and Check

```powershell
node scripts/generate-regions.cjs
node --test scripts/test-stations.cjs
node --test scripts/test-routes.cjs
python scripts/check-generated.py
```

`data/stations.json` is the editable, checked-in station snapshot. Stable candidate IDs remain internal identifiers, not official railway codes or public URL slugs. `data/route-slugs.json` explicitly assigns all 269 district and 200 station slugs, including namespaced duplicates. Reimport only when intentionally restoring the station snapshot, as importing will replace manual edits to station guidance topics:

```powershell
node scripts/import-stations.cjs
```

The following packaging commands are optional and should only be run when a deployment package is requested:

```powershell
node scripts/build-netlify-drop.cjs
python scripts/check-generated.py --directory dist-netlify
```

`templates/lesson.html` is the shared page source. `data/site.json` stores the main-page settings, consultation URL, and region groups. Region and school snapshots were copied from HowCoding; no external folder is needed to regenerate this site. Each region receives one of four thumbnails at generation time, so images also work without JavaScript. The main page contains general lesson information instead of the former Hongeun-dong sample text. Logos link back to this main page, and it links to the regional directory.

Packaging produces `dist-netlify.zip`, containing the contents of `dist-netlify` directly. The station expansion was generated and checked locally without rebuilding that package or deploying. Any pre-existing package may therefore be stale.

## Deployment Origin and Indexing

The short-URL migration retains the previous indexing setting: with `origin` empty, pages remain `noindex,nofollow`. Set `SITE_ORIGIN` to the real origin (scheme and host only) or set `origin` in `data/site.json` to enable absolute canonical/Open Graph URLs and indexing metadata. `basePath` defaults to `/power` for this GitHub Pages project. Override it with `SITE_BASE_PATH=/` for a root-domain deployment. Packaging emits a sitemap containing only the 500 canonical pages, never legacy redirects.

```powershell
$env:SITE_ORIGIN = 'https://cardposman.github.io'
$env:SITE_BASE_PATH = '/power'
node scripts/build-netlify-drop.cjs
```

## Verification

`scripts/check-generated.py` checks all 500 content/list pages, 469 redirect targets, local links, assets, unique canonical titles, school data, station IDs and directory counts. It also checks that search and the station header menu remain absent. `scripts/test-stations.cjs` checks candidate provenance; `scripts/test-routes.cjs` checks slug coverage, collisions, and project-prefixed URLs. Browser checks use Playwright supplied by the local Codex runtime. Run `scripts/check-page.cjs`, `scripts/check-regions.cjs`, and `scripts/check-stations.cjs` with that runtime's `NODE_PATH` and `BROWSER_EXECUTABLE`. `scripts/check-routes.cjs` generates an isolated production fixture inside ignored `verification/`, verifies `/power/` routes over a temporary HTTP server, and closes the server afterward. It does not deploy or create a ZIP. Directories remain static lists; station links are available through footers and directory tabs, not the header menu.
