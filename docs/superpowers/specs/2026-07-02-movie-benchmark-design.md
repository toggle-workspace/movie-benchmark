# PRD: Toggle Movie Benchmark

**Date:** 2026-07-02  
**Status:** Draft

---

## 1. Summary

Toggle Movie Benchmark is a web tool for Malaysian film production companies to evaluate a movie concept before greenlighting it. A user inputs a movie idea — including genre, budget, cast, release year, and distribution channel — and the system returns multi-dimensional benchmark scores derived entirely from real TMDB data. Scores compare the concept against the production company's own track record, regional films (Malaysia, Indonesia, Thailand), trends for the target release year, and global films in the same genre. No AI is used in scoring; all dimensions are formula-driven from factual data.

---

## 2. Problem Statement

Malaysian film producers currently have no structured, data-backed way to evaluate a movie concept before committing budget and resources. Decisions rely on intuition, personal experience, and anecdotal awareness of the market. There is no easy way to answer: "How do films like this typically perform in our region?" or "How has our production company's past output compared to market trends?" This tool fills that gap by surfacing objective comparisons from a trusted global movie database.

---

## 3. Goals and Non-Goals

**Goals:**
1. Allow a user to submit a movie concept with structured metadata.
2. Return 4–5 quantitative benchmark scores per submission, each derived from TMDB data.
3. Show the underlying comparison data (comparable films, averages) alongside each score so users understand how the score was derived.
4. Persist all benchmark runs to a database so users can revisit and compare past evaluations.
5. Require authentication — benchmark history is per-user/account.

**Non-Goals:**
- No AI-generated explanations or narratives in v1 (slot preserved for future).
- No user-submitted reviews or community features.
- No box office forecasting or predictive modelling beyond formula-based scoring.
- No scraping of non-TMDB sources (e.g. local cinema ticketing systems).
- No mobile app — web only.

---

## 4. User Stories

1. As a producer, I want to submit a movie concept with title, genre, release year, production company, director, cast, estimated budget, target audience, language, and distribution platform, so that I have a complete profile to benchmark against.
2. As a producer, I want to see a Revenue Potential score, so that I can gauge how films like mine have performed financially in the region.
3. As a producer, I want to see an Audience Reception score, so that I can understand how similar films have been rated by audiences.
4. As a producer, I want to see a Regional Fit score, so that I can see how active and successful this genre has been in Malaysia, Indonesia, and Thailand recently.
5. As a producer, I want to see a Production Company Track Record score, so that I can benchmark this concept against our studio's own historical output.
6. As a producer, I want to see a Global Competitiveness score, so that I understand how this concept compares to worldwide releases in the same genre and year.
7. As a producer, I want to see the actual films used for comparison (titles, revenue, ratings) below each score, so that I trust and understand how the score was derived.
8. As a producer, I want my past benchmark runs saved and listed in a history view, so that I can revisit and compare multiple concepts over time.
9. As a user, I want to log in with email and password, so that my benchmark history is private and persisted to my account.
10. As a user, I want to register a new account, so that I can start using the tool.
11. As a user, I want to delete a past benchmark run, so that I can clean up irrelevant entries.

---

## 5. Functional Requirements

### 5.1 Movie Concept Input Form

Fields (all text/select inputs, no file uploads):

| Field | Type | Required |
|---|---|---|
| Title | Text | Yes |
| Genre | Multi-select (TMDB genre list) | Yes |
| Planned Release Year | Number (YYYY) | Yes |
| Production Company | Text (matched to TMDB company search) | Yes |
| Director | Text | No |
| Lead Cast | Text (comma-separated) | No |
| Estimated Budget (MYR) | Number | No |
| Synopsis | Textarea | No |
| Target Audience | Select: General / Family / Teen / Adult | Yes |
| Language | Select: Malay / English / Mandarin / Tamil / Other | Yes |
| Distribution Platform | Select: Cinema / Streaming / Both | Yes |

Validation: Title, Genre, Release Year, Production Company, Target Audience, Language, Distribution Platform are required. Submission is blocked until these are filled.

### 5.2 TMDB Data Fetching

On submission, 4 parallel TMDB API queries are made server-side (Next.js API route):

1. **Production company films** — discover movies by the submitted production company ID, sorted by release date, up to 20 most recent.
2. **Regional films** — discover movies with origin_country in [MY, ID, TH], matching primary genre, released within 5 years of the planned release year.
3. **Global films by genre + year** — discover movies matching primary genre, released in the planned release year ± 1, sorted by popularity, top 50.
4. **Trending regional** — discover top-grossing films in [MY, ID, TH] from the planned release year ± 2, any genre.

Each query fetches: `title`, `revenue`, `vote_average`, `vote_count`, `release_date`, `origin_country`, `genres`, `budget`, `production_companies`.

Films with `vote_count < 10` or `revenue = 0` are excluded from revenue-based scoring to avoid noise.

### 5.3 Scoring Engine

All scores are returned as a value between 0–100. Each score is accompanied by the list of comparison films and the computed averages used.

**Score 1: Revenue Potential (0–100)**
- Baseline: median revenue of regional films (MY/ID/TH) in same genre, ± 5 years.
- If estimated budget provided: compare budget-to-revenue ratio of concept vs. comparable films.
- If no budget: score is relative to median regional revenue alone.
- Formula: `min(100, (estimated_revenue_proxy / regional_median_revenue) * 50)` where `estimated_revenue_proxy` defaults to regional median if no budget given.

**Score 2: Audience Reception (0–100)**
- Baseline: average `vote_average` of regional films (MY/ID/TH) in same genre, ± 5 years.
- Formula: `(regional_avg_vote / 10) * 100`
- This score reflects what audiences in the region have given similar films — not a prediction for this concept specifically.

**Score 3: Regional Fit (0–100)**
- Count of films in same genre from MY/ID/TH released in planned release year ± 2.
- Higher count = more active market = higher fit score (genre has proven regional appetite).
- Formula: `min(100, count * 10)` (capped at 10+ films = 100).

**Score 4: Production Company Track Record (0–100)**
- Average `vote_average` of the production company's last 10 films on TMDB with `vote_count ≥ 10`.
- Formula: `(company_avg_vote / 10) * 100`
- If company has < 3 films on TMDB: score is shown as "Insufficient data" and excluded from aggregate.

**Score 5: Global Competitiveness (0–100)**
- Average `vote_average` of top 50 global films in same genre for planned release year.
- Formula: `(regional_avg_vote / global_avg_vote) * 50` — measures how regional reception compares to global bar.
- Capped at 100.

**Aggregate Score:** Arithmetic mean of all available dimension scores (excluding "Insufficient data" dimensions).

### 5.4 Results Display

- Aggregate score shown prominently as a circular gauge (0–100).
- Each dimension shown as a card with: score value, label, brief descriptor of what it means, and a collapsible table of the comparison films used.
- Comparison film table columns: Title, Country, Release Year, Revenue (USD), Avg Rating, Vote Count.

### 5.5 Benchmark History

- Authenticated users see a `/history` page listing past runs: concept title, date submitted, aggregate score.
- Clicking a run loads the full results view.
- Delete button per run (with confirmation).

### 5.6 Authentication

- Uses NextAuth.js wired to existing auth UI (`/login`, `/register`).
- Credentials provider (email + password) with hashed passwords stored in Postgres.
- Sessions are JWT-based.
- Unauthenticated users hitting `/benchmark` or `/history` are redirected to `/login`.

---

## 6. Non-Functional Requirements

- **Latency:** Benchmark result should return within 5 seconds. TMDB calls are parallelised server-side.
- **TMDB rate limits:** Free tier allows 40 requests/10 seconds. 4 parallel queries per submission is within limits.
- **Data freshness:** No caching of TMDB data — every submission fetches live data. (Add caching later if rate limits become an issue.)
- **Security:** TMDB API key and database credentials stored as environment variables, never exposed to the client.
- **Availability:** No SLA defined for v1. Neon free tier is acceptable.
- **Accessibility:** Standard shadcn/ui components used throughout — keyboard navigable, screen-reader compatible labels on all form fields.

---

## 7. Implementation Notes and Architecture

### Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 App Router |
| UI | shadcn/ui + Tailwind CSS 4 |
| Auth | NextAuth.js (credentials provider) |
| Database | Neon Postgres (via Vercel Marketplace) |
| ORM | Prisma |
| External API | TMDB API v3 |
| Deployment | Vercel |

### New files / modules

```
app/
  (dashboard)/
    benchmark/
      page.tsx          ← concept input form
    history/
      page.tsx          ← list of past runs
    results/
      [id]/
        page.tsx        ← single benchmark result view
  api/
    benchmark/
      route.ts          ← POST: fetch TMDB data, score, save, return result
    auth/
      [...nextauth]/
        route.ts        ← NextAuth handler

lib/
  tmdb.ts               ← TMDB API client (fetch wrappers for 4 query types)
  scoring.ts            ← all 5 scoring formulas
  db.ts                 ← Prisma client singleton

prisma/
  schema.prisma         ← User, BenchmarkRun, BenchmarkResult tables
```

### Database Schema (Prisma)

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String
  createdAt DateTime @default(now())
  runs      BenchmarkRun[]
}

model BenchmarkRun {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  createdAt   DateTime @default(now())
  concept     Json     // raw input form data
  result      Json     // scores + comparison film arrays
}
```

### Existing files modified

- `components/shared/sidebar.tsx` — add Benchmark and History nav links
- `app/(auth)/login/page.tsx` — wire submit to NextAuth `signIn()`
- `app/(auth)/register/page.tsx` — wire submit to POST `/api/auth/register`
- `app/page.tsx` — redirect to `/benchmark` for authenticated users, `/login` for guests

---

## 8. Out of Scope

- AI-generated explanations or narratives (future phase — HuggingFace or similar)
- Export to PDF / shareable link
- Team/organisation accounts (multi-user under one company)
- Integration with local Malaysian box office data (e.g. GSC, TGV ticketing data)
- Streaming vs cinema performance differentiation in TMDB data
- Budget estimation wizard
- Competitor analysis (comparing two concepts head-to-head)

---

## 9. Risks and Open Questions

| Risk / Question | Notes |
|---|---|
| TMDB coverage of Malaysian/Indonesian films is sparse | Many local films may not be on TMDB or lack revenue data. Scoring engine must handle low-data gracefully (show "Insufficient data" rather than a misleading score). |
| Production company name matching | User types a company name; we must search TMDB's company list and let them confirm a match. Mis-matches produce wrong Track Record scores. |
| TMDB free API key limits | 4 calls per submission is fine. If traffic grows, add server-side caching (e.g. Redis or Vercel KV). |
| Neon free tier limits | 0.5 GB storage, 1 GB data transfer/month. Sufficient for v1. |
| Revenue data is USD | TMDB revenue is in USD. Display as-is and note the currency. MYR conversion is a future enhancement. |

---

## 10. Success Metrics

- A user can submit a movie concept and receive benchmark scores within 5 seconds.
- All 5 score dimensions return a value (or "Insufficient data") for every submission.
- Comparison films are visible and traceable for each dimension.
- Past runs are retrievable from the history page.
- No TMDB API key is exposed in client-side network requests.
