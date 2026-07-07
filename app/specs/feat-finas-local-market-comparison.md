## What
Add a Local Market score dimension powered by FINAS (Malaysian film authority) data as the primary comparison source for Malaysian box office performance.

## Why
TMDB's regional query (MY|ID|TH) blends Malaysian films with Indonesian and Thai films, diluting the local market signal. Malaysian producers need a benchmark grounded in actual Malaysian theatrical performance — gross, admissions, distributor — which FINAS tracks but TMDB does not.

## Scope
- [x] Define `FinasFilm` type in `lib/finas.ts` with fields: title, year, genre, grossMYR, admissions, distributor
- [x] Seed `lib/finas.ts` with a static dataset of Malaysian films from FINAS records
- [x] Add `getFinasFilms(genreSlug: string, releaseYear: number): FinasFilm[]` filter function in `lib/finas.ts`
- [x] Add `scoreLocalMarket(finasFilms: FinasFilm[], budgetMYR?: number): ScoreResult` in `lib/scoring.ts`
- [x] Add `localMarket: ScoreResult` to `BenchmarkScores` interface in `lib/scoring.ts`
- [x] Wire `scoreLocalMarket` into `app/api/benchmark/route.ts` alongside existing scores
- [x] Display `localMarket` as a score card on the results page (`app/(dashboard)/dashboard/results/[id]/page.tsx`)

## Out of scope
- Live FINAS API (no public API exists; static dataset is the only viable approach)
- Admin UI to update the FINAS dataset (update via code for now)
- Scraping finas.gov.my
- Replacing the existing `regionalFit` score (keeps MY|ID|TH TMDB data intact for regional context)

## Acceptance
- [x] Benchmark results page shows a "Local Market (FINAS)" score card alongside the existing 4 dimensions
- [x] Score card table lists FINAS comparison films with title, year, gross (RM), and admissions
- [x] Score reflects proximity of concept's budget/genre to Malaysian theatrical comps
- [x] Null score ("Insufficient data") returned when fewer than 3 FINAS films match the genre/year window
- [x] Existing 4 dimension scores are unchanged
- [x] `npx vitest run` passes (10/10 tests)

## Notes
- `BenchmarkScores` in `lib/scoring.ts:19` currently has 4 dimensions + `aggregate` — add `localMarket` as the 5th
- `computeAggregate` at `lib/scoring.ts:140` uses `Object.values(scores)` — will auto-include `localMarket` once added
- Results page `dimensions` array at `app/(dashboard)/dashboard/results/[id]/page.tsx:101` needs a 5th entry
- `ComparisonFilm` type (`lib/scoring.ts:3`) uses `revenue` (USD) — FINAS data is in MYR; add a `grossMYR` field or convert at display time
- FINAS genre slugs will need a mapping to TMDB `genreId` values (e.g. `28 → "action"`) — define this in `lib/finas.ts`
- **Open question:** Do you have a FINAS dataset ready (CSV, JSON, spreadsheet)? If yes, share it and I'll seed from it. If no, I'll seed with publicly known Malaysian box office data from FINAS annual reports (top ~50 films, 2015–2024).
