## What
Add a Local Market score dimension powered by FINAS (Malaysian film authority) data as the primary comparison source for Malaysian box office performance.

## Why
TMDB's regional query (MY|ID|TH) blends Malaysian films with Indonesian and Thai films, diluting the local market signal. Malaysian producers need a benchmark grounded in actual Malaysian theatrical performance — gross, admissions, distributor — which FINAS tracks but TMDB does not.

## Scope
- [ ] Define `FinasFilm` type in `lib/finas.ts` with fields: title, year, genre, grossMYR, admissions, distributor
- [ ] Seed `lib/finas.ts` with a static dataset of Malaysian films from FINAS records
- [ ] Add `getFinasFilms(genreSlug: string, releaseYear: number): FinasFilm[]` filter function in `lib/finas.ts`
- [ ] Add `scoreLocalMarket(finasFilms: FinasFilm[], budgetMYR?: number): ScoreResult` in `lib/scoring.ts`
- [ ] Add `localMarket: ScoreResult` to `BenchmarkScores` interface in `lib/scoring.ts`
- [ ] Wire `scoreLocalMarket` into `app/api/benchmark/route.ts` alongside existing scores
- [ ] Display `localMarket` as a score card on the results page (`app/(dashboard)/dashboard/results/[id]/page.tsx`)

## Out of scope
- Live FINAS API (no public API exists; static dataset is the only viable approach)
- Admin UI to update the FINAS dataset (update via code for now)
- Scraping finas.gov.my
- Replacing the existing `regionalFit` score (keeps MY|ID|TH TMDB data intact for regional context)

## Acceptance
- [ ] Benchmark results page shows a "Local Market" score card alongside the existing 4 dimensions
- [ ] Score card table lists FINAS comparison films with title, year, gross (MYR), and admissions
- [ ] Score reflects proximity of concept's budget/genre to Malaysian theatrical comps
- [ ] Null score ("Insufficient data") returned when fewer than 3 FINAS films match the genre/year window
- [ ] Existing 4 dimension scores are unchanged
- [ ] `npx vitest run` passes (scoring unit tests)

## Notes
- `BenchmarkScores` in `lib/scoring.ts:19` currently has 4 dimensions + `aggregate` — add `localMarket` as the 5th
- `computeAggregate` at `lib/scoring.ts:140` uses `Object.values(scores)` — will auto-include `localMarket` once added
- Results page `dimensions` array at `app/(dashboard)/dashboard/results/[id]/page.tsx:101` needs a 5th entry
- `ComparisonFilm` type (`lib/scoring.ts:3`) uses `revenue` (USD) — FINAS data is in MYR; add a `grossMYR` field or convert at display time
- FINAS genre slugs will need a mapping to TMDB `genreId` values (e.g. `28 → "action"`) — define this in `lib/finas.ts`
- **Open question:** Do you have a FINAS dataset ready (CSV, JSON, spreadsheet)? If yes, share it and I'll seed from it. If no, I'll seed with publicly known Malaysian box office data from FINAS annual reports (top ~50 films, 2015–2024).
