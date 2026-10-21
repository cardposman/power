# Region Data Provenance

The user requested expansion using the 269 entries already available in HowCoding, without adding town or neighborhood pages.

- `official-sigungu.json`: copied unchanged from `C:/GitHub/HowCoding/data/official-sigungu.json`. Its source metadata records extraction on 2026-08-21 from administrative legal-dong codes.
- `local-schools.json`: copied unchanged from `C:/GitHub/HowCoding/data/local-schools.json`. Its metadata records a build on 2026-09-15 from school-location public data. These are existing snapshots, not a fresh verification of every administrative name or school.
- `school-supplements.json`: three official school records for Hwaseong-si Manse-gu, which had only two usable school names in the snapshot. Source URLs are included with each record.
- `site.json`: site configuration, main-page settings, and the existing province grouping used for browsing. The combined Gwangju/Jeonnam group follows HowCoding's browsing structure. The root page is a general brand introduction with no regional school names.
- `site.json` also stores `basePath: "/power"` for GitHub Pages. `origin` remains empty during the local URL migration so the previous indexing policy is not silently changed. Absolute production URLs are `origin + basePath + page.url`.
- `route-slugs.json`: explicit, stable short URL suffixes for all 269 district codes and 200 station candidate IDs. District paths start with `reg-`, station paths with `st-`. Duplicate names include a regional qualifier; slugs are readable URL labels, not a claim of official English spelling. The user-requested `yongsangu` and `seomyun` spellings are pinned.
- `generated-pages.json`: generated manifest for the complete local site. Each district records five school names, a thumbnail choice, and one of six wording variants.
- `stations.json`: the user-approved 200-candidate station snapshot imported from `docs/station-shortlist-20261020.md`. Candidate IDs are stable local identifiers, not official station codes. Region labels distinguish same-name stations; representative lines are identifiers, not exhaustive or live service information. The A-group review decisions from `docs/station-validation-20261020.md` are retained, and the other 150 entries remain unreviewed. Inclusion does not certify search demand. `guide` selects shared editorial learning guidance and can be edited per station; it is not a measured audience attribute.
- Station entries in `generated-pages.json` record the station ID, guide topic, preserved screening decision, thumbnail, and route. The complete manifest covers 500 pages: the existing 287 plus 200 station pages and 13 station directories.
- `generated-pages.json` lists the 500 canonical content/list pages separately from 469 legacy redirects. Each migrated detail page records its old nested `legacyFile`; `redirects` maps old files to short target files. `generated-urls.txt` lists only canonical routes relative to the project base, not redirect addresses.

Changing names, images, or wording does not establish a particular similarity score or a search result. No ranking or indexing result is claimed.
