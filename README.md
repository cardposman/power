# TS Japan: Regional Japanese Lesson Pages

Open `index.html` directly in a browser. No build or dependencies are needed to use the page.

- Product: TS Japan 1:1 Japanese lessons
- Main page: a region-neutral TS Japan introduction at `index.html`.
- Mobile-first single-column layout on all devices, capped at 480px. The opening order below the header is a region-assigned thumbnail, the product introduction, then the full product detail image.
- All consultation links: https://naver.me/52c74Jj4
- Source images: `assets/originals/`
- Optimized web images: `assets/images/`
- Pages use `noindex,nofollow` until a production origin is configured.
- Regional directory: `region/index.html`. Existing district content is retained: 269 district pages and 16 province directories, plus the national directory and main page.
- Station directory: `station/index.html`. There are 200 station pages and 12 regional station directories, plus the national station directory. The complete local site has 500 HTML pages.

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
python scripts/check-generated.py
```

`data/stations.json` is the editable, checked-in station snapshot. URLs use the region slug and stable candidate ID, not an official railway station code. The IDs are preserved from the initial 200-candidate list. Reimport only when intentionally restoring that snapshot, as importing will replace manual edits to station guidance topics:

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

The default build is a review package with `noindex,nofollow` and a disallowing `robots.txt`, because no production domain has been supplied. No example-domain canonical or sitemap is emitted. Set `SITE_ORIGIN` to the real deployment origin, or set `origin` in `data/site.json`, then rebuild to emit canonical URLs, Open Graph URLs, a sitemap including the main page, and indexing metadata.

```powershell
$env:SITE_ORIGIN = 'https://your-actual-domain.example'
node scripts/build-netlify-drop.cjs
```

## Verification

`scripts/check-generated.py` checks all 500 generated pages, local links, assets, unique titles, region-school data, station IDs, directory counts, and the absence of search controls and the station entry in the header menu. `scripts/test-stations.cjs` checks the candidate import and regional identities. Browser checks use Playwright supplied by the local Codex runtime; no browser dependency is required to use the site itself. Run `scripts/check-page.cjs` for the main page, `scripts/check-regions.cjs` for regional pages, and `scripts/check-stations.cjs` for all 200 stations and directory navigation with that runtime's `NODE_PATH` and an available `BROWSER_EXECUTABLE`. Directories use static grouped lists without search; the station list remains accessible through footer links and directory tabs, not the header menu.
