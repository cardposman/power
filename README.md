# TS Japan: Regional Japanese Lesson Pages

Open `index.html` directly in a browser. No build or dependencies are needed to use the page.

- Product: TS Japan 1:1 Japanese lessons
- Main page: a region-neutral TS Japan introduction at `index.html`.
- Mobile-first single-column layout on all devices, capped at 480px. The opening order below the header is a region-assigned thumbnail, the product introduction, then the full product detail image.
- All consultation links: https://naver.me/52c74Jj4
- Source images: `assets/originals/`
- Optimized web images: `assets/images/`
- Production origin: `https://tstudymate.com` with no `/power` prefix. Canonical pages use `index,follow`; legacy redirects stay `noindex,follow`.
- Regional source: `region/{province}/{code}/index.html` for 269 full district pages. Regional directory: `region/index.html`.
- Station source: `station/{province}/{id}/index.html` for 200 full station pages. Station directory: `station/index.html`.
- The repository keeps all 504 content/list pages grouped: the existing 500 plus four learning-purpose categories. No `reg-*` or `st-*` folders are stored at the repository root.
- New category pages: `course/jlpt/` (certification), `course/travel/`, `course/business/`, and `course/hobby/`. Every page's header links to these four categories instead of the regional directory. Regional and station directories remain available through footer links.
- Public URLs remain `https://tstudymate.com/reg-yongsangu/` and `https://tstudymate.com/st-seomyun/`. GitHub Actions creates these flat routes only inside the ignored `_site/` deployment artifact, including 469 old-path redirects. The four category paths are the same in source and deployment. See `docs/short-urls.md` and `docs/domain-setup.md`.
- Naver ownership file: `naver686492ec587065ddaf1ebc2627b5b46f.html` at the site root, preserved byte-for-byte. `CNAME`, the verification file, `robots.txt`, and `sitemap.xml` are included in generation/package checks.

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
node --test scripts/test-stations.cjs scripts/test-routes.cjs scripts/test-layout.cjs scripts/test-categories.cjs
python scripts/check-generated.py
node scripts/build-pages.cjs
python scripts/check-generated.py --directory _site
```

`data/stations.json` is the editable, checked-in station snapshot. Stable candidate IDs remain internal identifiers, not official railway codes or public URL slugs. `data/route-slugs.json` explicitly assigns all 269 district and 200 station slugs, including namespaced duplicates. Reimport only when intentionally restoring the station snapshot, as importing will replace manual edits to station guidance topics:

```powershell
node scripts/import-stations.cjs
```

Default generation writes grouped source pages only. `build-pages.cjs` builds the short public paths separately into `_site/`, never back into the checkout. The layout regression test checks this separation and repeated builds. `.github/workflows/pages.yml` tests, builds, and uploads only `_site/`. GitHub Pages must use **GitHub Actions** as its publishing source, not **Deploy from a branch**. Generated deployment files are not committed.

The following packaging commands are optional and should only be run when a deployment package is requested:

```powershell
node scripts/build-netlify-drop.cjs
python scripts/check-generated.py --directory dist-netlify
```

`templates/lesson.html` is the shared page source. `data/site.json` stores the main-page settings, consultation URL, and region groups. Region and school snapshots were copied from HowCoding; no external folder is needed to regenerate this site. Each region receives one of four thumbnails at generation time, so images also work without JavaScript. The main page contains general lesson information instead of the former Hongeun-dong sample text. Logos link back to this main page, and it links to the regional directory.

`data/categories.json` contains distinct learning guidance, practice examples, consultation checklists and FAQs for the four new categories. `templates/category.html` and `scripts/category-pages.cjs` render them. Curriculum illustrations show the relevant section of the supplied product artwork with a link to the complete original. Suggested practice activities are editorial examples, not guaranteed service terms. JLPT factual context is linked to the official exam overview; prices, schedules, individual material requests and availability remain subject to consultation. `scripts/check-categories.cjs` checks category navigation, responsive layout, artwork, FAQ and no-JavaScript content on both source and deployment files.

Packaging produces `dist-netlify.zip`, containing the contents of `dist-netlify` directly. The station expansion was generated and checked locally without rebuilding that package or deploying. Any pre-existing package may therefore be stale.

## Deployment Origin and Indexing

`data/site.json` now sets `origin` to `https://tstudymate.com` and `basePath` to an empty string. Generation emits production canonical/Open Graph URLs, root `robots.txt`, and a sitemap containing only the 504 canonical pages, never legacy redirects. Indexing is enabled for canonical pages. `SITE_ORIGIN` and `SITE_BASE_PATH` override defaults; an explicitly empty `SITE_ORIGIN` generates a blocked preview with no canonical URLs and an empty sitemap.

```powershell
$env:SITE_ORIGIN = 'https://tstudymate.com'
$env:SITE_BASE_PATH = '/'
node scripts/generate-regions.cjs
```

## Verification

`scripts/check-generated.py` checks all 504 grouped source pages with zero redirects, or 504 deployment pages plus 469 redirects when passed `--directory _site`. It checks links, assets, canonical URLs, school data, station IDs, directories, root verification/CNAME files, sitemap contents, robots policy, and the absence of search and the station header menu. `scripts/test-stations.cjs` checks provenance; `scripts/test-routes.cjs` checks slugs and domain defaults; `scripts/test-layout.cjs` guards source/deployment separation. Browser checks use Playwright supplied by the local Codex runtime. Run `scripts/check-page.cjs`, `scripts/check-regions.cjs`, and `scripts/check-stations.cjs` with that runtime's `NODE_PATH` and `BROWSER_EXECUTABLE`. `scripts/check-routes.cjs` generates an isolated deployment fixture inside ignored `verification/`, verifies routes over a temporary HTTP server, and closes it afterward. It does not deploy or create a ZIP. Local previews navigate grouped source pages; deployment links use the short public paths.
