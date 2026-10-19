# TS Japan: Regional Japanese Lesson Pages

Open `index.html` directly in a browser. No build or dependencies are needed to use the page.

- Product: TS Japan 1:1 Japanese lessons
- Sample location: Hongeun-dong, Seodaemun-gu, Seoul
- Mobile-first single-column layout on all devices, capped at 480px. The opening order below the header is a region-assigned thumbnail, the product introduction, then the full product detail image.
- All consultation links: https://naver.me/52c74Jj4
- Source images: `assets/originals/`
- Optimized web images: `assets/images/`
- Sample intentionally uses `noindex,nofollow`; add the production domain and indexing metadata before release.
- Regional directory: `region/index.html`. There are 269 district pages and 16 province directory pages, plus the national directory and retained Hongeun-dong sample (287 HTML pages total).

Recreate optimized images (Python with Pillow):

```powershell
python scripts/prepare-images.py "<path to supplied ZIP>"
```

Curriculum content is based on the supplied artwork. Lesson prices, schedules, and other unspecified terms are handled through consultation.

Regional context is limited to the page identity and one medium-length consultation paragraph with five verified local school names. Product sections and FAQ use general lesson information. See `docs/regional-content.md` for source references and expansion criteria.

## Generate and Package

```powershell
node scripts/generate-regions.cjs
python scripts/check-generated.py
node scripts/build-netlify-drop.cjs
python scripts/check-generated.py --directory dist-netlify
```

`templates/lesson.html` is the shared page source. `data/site.json` stores the sample settings, consultation URL, and region groups. Region and school snapshots were copied from HowCoding; no external folder is needed to regenerate this site. Each region receives one of four thumbnails at generation time, so images also work without JavaScript.

The package is `dist-netlify.zip`, containing the contents of `dist-netlify` directly. These files have been prepared locally, not deployed.

## Deployment Origin and Indexing

The default build is a review package with `noindex,nofollow` and a disallowing `robots.txt`, because no production domain has been supplied. No example-domain canonical or sitemap is emitted. Set `SITE_ORIGIN` to the real deployment origin, or set `origin` in `data/site.json`, then rebuild to emit regional canonical URLs, Open Graph URLs, a sitemap, and indexing metadata. The retained Hongeun-dong sample stays noindex.

```powershell
$env:SITE_ORIGIN = 'https://your-actual-domain.example'
node scripts/build-netlify-drop.cjs
```

## Verification

`scripts/check-generated.py` checks all generated pages, local links, assets, titles, and region-school data. Browser checks use Playwright supplied by the local Codex runtime; no browser dependency is required to use the site itself. Run `scripts/check-page.cjs` for the sample and `scripts/check-regions.cjs` for all regional pages with that runtime's `NODE_PATH` and an available `BROWSER_EXECUTABLE`.
