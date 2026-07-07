## What
Replace the 4 abstract dimension scores with producer-facing box office metrics: Malaysian gross range, ROI forecast, genre momentum, and audience appeal — plus a Sales Summary card showing actionable numbers a producer can actually use.

## Why
The current metrics (Revenue Potential, Audience Reception, Regional Fit, Global Competitiveness) are academic — they compare films to each other using ratings and vote counts, not box office performance. A Malaysian producer needs to know: what will this film gross, will it break even, and is this genre growing or shrinking in the local market?

## Scope
- [x] Add `scoreMalaysianBoxOffice(finasFilms, budgetMYR?)` to `lib/scoring.ts` — replaces `scoreRevenuePotential`. Shows RM gross range (min/median/max from FINAS); score = (budget / median_gross) × 50 capped at 100, or 50 if no budget.
- [x] Add `scoreRoiForecast(finasFilms, budgetMYR)` to `lib/scoring.ts` — only scored when budgetMYR provided; ROI = median_gross / budget; score = min(100, ROI × 33). Null if no budget or <3 FINAS comps.
- [x] Add `scoreGenreMomentum(finasFilms, releaseYear)` to `lib/scoring.ts` — replaces `scoreRegionalFit`. Counts FINAS films in last 5 years vs prior 5 years; score = min(100, (recent / max(prior,1)) × 50); "Growing", "Stable", or "Declining" label.
- [x] Rename `scoreAudienceReception` → `scoreAudienceAppeal` in `lib/scoring.ts`, update label from "Audience Reception" to "Audience Appeal", keep formula.
- [x] Keep `scoreGlobalCompetitiveness` in `lib/scoring.ts` — fix formula cap so score can reach 100 (change `* 50` → `* 100`, then clamp).
- [x] Update `BenchmarkScores` interface: replace `revenuePotential`, `regionalFit` with `malaysianBoxOffice`, `roiForecast`, `genreMomentum`; rename `audienceReception` → `audienceAppeal`; keep `globalCompetitiveness`.
- [x] Add `SalesSummary` type to `lib/scoring.ts`: `{ grossRangeMin, grossRangeMedian, grossRangeMax, breakEvenAdmissions: number | null, topDistributors: string[], trend: "Growing" | "Stable" | "Declining" }`. Add `computeSalesSummary(finasFilms, budgetMYR?)` function.
- [x] Add `salesSummary: SalesSummary` to `BenchmarkScores`.
- [x] Wire everything into `app/api/benchmark/route.ts`: import `getFinasFilms` from `lib/finas`, call new scoring functions, remove old ones.
- [x] Update results page (`app/(dashboard)/dashboard/results/[id]/page.tsx`): add `<SalesSummaryCard>` component above dimension cards showing gross range, break-even admissions, top distributors, and trend badge. Update `dimensions` array to match new `BenchmarkScores` keys.

## Out of scope
- Opening weekend estimates (no per-week data in FINAS or TMDB)
- Seasonal/Raya/CNY timing analysis (no date-specific data)
- Cast or director bankability scoring (no cast-level box office data)
- OTT vs theatrical split (no streaming revenue data)
- Production Company Track Record (no company-level FINAS data yet)

## Acceptance
- [x] Results page shows a Sales Summary card with: gross range (RM), break-even admissions (when budget provided), top distributors, trend label
- [x] Dimension cards show: Malaysian Box Office, ROI Forecast, Genre Momentum, Audience Appeal
- [x] ROI Forecast shows N/A when no budget is entered on the form
- [x] Genre Momentum shows "Growing", "Stable", or "Declining" as a badge
- [x] Break-even admissions calculated as `budgetMYR / 15` (RM 15 avg ticket price)
- [x] Old dimensions (Revenue Potential, Regional Fit, Global Competitiveness) no longer appear
- [x] `npx vitest run` passes

## Notes
- `lib/finas.ts` has 43 Malaysian films across genres — check it exists (committed in previous branch); recreate if missing
- `getFinasFilms(genreId, releaseYear)` already filters by genre and ±5 year window — reuse directly
- `median()` and `avg()` helpers already in `lib/scoring.ts` — reuse
- `BenchmarkScores.aggregate` uses `Object.values(scores).map(r => r.score)` — `salesSummary` has no `score` field, so exclude it or restructure `computeAggregate` to only average the 4 dimension keys
- Results page `ScoreCard` component already handles `null` scores and empty films arrays — reuse as-is
- RM 15 average ticket price is a reasonable constant for Malaysian cinemas (2024)
- `computeAggregate` must be updated to only average the 4 dimension scores, not `salesSummary`
