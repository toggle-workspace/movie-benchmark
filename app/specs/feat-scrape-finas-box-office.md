## What

Scrape live box-office data from `https://wajibtayang.finas.gov.my/ms/pdf_kutipan.php?year=YYYY` and upsert it into the existing `finas_movie_archive` table.

## Why

The current table is seeded with 43 hand-curated films. Scraping FINAS directly gives us the full authoritative dataset with more years, more titles, and automatic updates.

## Scope

- [x] Fetch and parse the FINAS Wajib Tayang PDFs (per-year 2017–2026) via `pdftotext -layout`
- [x] Map scraped rows (title, year, distributor, gross MYR, admissions) to `FinasFilm`; leave `genreIds: []` since FINAS has no TMDB genre IDs
- [x] Upsert records into `finas_movie_archive` (conflict on title+year slug ID, update gross/admissions/distributor)
- [x] Write `scripts/scrape-finas.ts` — runnable with `npx tsx --env-file=.env.local scripts/scrape-finas.ts`
- [x] Add a protected admin API route `POST /api/admin/scrape-finas` that triggers the scrape server-side
- [x] Log progress (year, rows found, rows upserted) to stdout

## Out of scope

- Scheduling / cron auto-refresh (add when stale data becomes a problem)
- Genre ID resolution via TMDB search (add if scoring accuracy needs it)
- UI trigger button in the dashboard (CLI + API route is sufficient for now)

## Acceptance

- [x] Running `npx tsx --env-file=.env.local scripts/scrape-finas.ts` inserts at least one new row into `finas_movie_archive`
- [x] Re-running does not duplicate rows (upsert is idempotent)
- [x] Records with `genreIds: []` are handled gracefully by existing `getFinasFilms` (genre filter skips them, which is correct)
- [ ] `POST /api/admin/scrape-finas` returns `{ inserted, skipped }` counts

## Notes

- Data source: PDF reports at `https://wajibtayang.finas.gov.my/ms/pdf_kutipan.php?year=YYYY` (requires `-k` for SSL)
- PDF parsed with `pdftotext -layout` (poppler, must be installed). Columns split by ≥4 consecutive spaces; lines with >35 leading spaces are distributor-only.
- ID derived as `${year}-${slugify(title)}` — stable across re-runs.
- Existing seed script: `scripts/seed-finas.ts` — 43 hand-curated films remain in table alongside scraped data.
- `getFinasFilms` filters `@> ARRAY[genreId]::int[]` — rows with `genreIds: []` never match genre filter, won't pollute scoring until genre IDs are resolved.
- 446 total records across 10 years (2017–2026) as of July 2026.
