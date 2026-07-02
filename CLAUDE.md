# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # start dev server with Turbopack at localhost:3000
npm run build    # production build
npm run lint     # ESLint via next lint
npx biome check  # Biome lint + format check (tabs, double quotes)
npx biome format --write .  # auto-format with Biome
npx vitest run   # run unit tests (scoring engine only, in lib/)
npx vitest run lib/scoring.test.ts  # run a single test file
npx prisma migrate dev --name <name>  # create and apply a migration
npx prisma generate  # regenerate Prisma client after schema changes
npx prisma studio   # GUI to inspect the database
```

## Architecture

This is a **Next.js 15 App Router** project (Turbopack enabled) being built into a movie concept benchmarking tool for Malaysian film producers. The spec lives at `docs/superpowers/specs/2026-07-02-movie-benchmark-design.md` and the implementation plan at `docs/superpowers/plans/2026-07-02-movie-benchmark.md`.

### Route groups

- `app/(auth)/` — login, register, forgot-password. No sidebar/topbar. Auth forms use react-hook-form + zod.
- `app/(dashboard)/` — all protected pages. Layout renders `<Sidebar>` + `<Topbar>` + `<main>`. Navigation items are defined in the `sidebarGroups` array in `components/shared/sidebar.tsx`.
- `app/api/` — server-side API routes only. TMDB API key is **never** sent to the client — all TMDB calls go through API routes.

### Key lib files (planned/in-progress)

- `lib/auth.ts` — Better Auth server instance (`betterAuth()`). Session check in server components: `auth.api.getSession({ headers: await headers() })`.
- `lib/auth-client.ts` — Better Auth React client (`createAuthClient()`). Use in client components: `authClient.signIn.email()`, `authClient.signUp.email()`, `authClient.useSession()`.
- `lib/db.ts` — Prisma client singleton (prevents connection pool exhaustion in dev)
- `lib/tmdb.ts` — TMDB API v3 wrapper: `fetchCompanyFilms`, `fetchRegionalFilms`, `fetchGlobalFilms`, `enrichWithRevenue`, `searchCompanies`. All functions read `process.env.TMDB_API_KEY`.
- `lib/scoring.ts` — pure functions for 5 benchmark dimensions (0–100 scale, `null` = insufficient data). The only file covered by Vitest tests.

### UI components

shadcn/ui components live in `components/ui/` — do not edit these directly, reinstall via `npx shadcn add <component>`. Shared layout components (Sidebar, Topbar) are in `components/shared/`. The `cn()` utility (`lib/utils.ts`) combines clsx + tailwind-merge.

### Styling

Tailwind CSS v4 via `@tailwindcss/postcss`. Biome enforces **tabs** for indentation and **double quotes** for JS strings. Biome's `noUnusedImports` rule is set to `error`.

### Database

Prisma + Neon Postgres. Schema has two models: `User` (email/password) and `BenchmarkRun` (stores `concept` and `result` as JSON). `DATABASE_URL` must be set in `.env.local`.

### Project skills (`.agents/skills/`)

- `better-auth-best-practices` — Better Auth server/client setup, plugins, session config
- `better-auth-security-best-practices` — rate limiting, CSRF, cookie hardening, audit hooks
- `neon-postgres` — Neon connection methods; use the **pooler** connection string (`-pooler` in hostname) on Vercel

### Environment variables (`.env.local`, never committed)

```
DATABASE_URL=            # Neon pooler connection string (hostname ends in -pooler)
BETTER_AUTH_SECRET=      # generate with: openssl rand -base64 32
BETTER_AUTH_URL=         # http://localhost:3000 in dev
NEXT_PUBLIC_APP_URL=     # http://localhost:3000 in dev
TMDB_API_KEY=            # from themoviedb.org/settings/api
```

### Better Auth schema

Better Auth manages its own tables. After changing auth config or adding plugins, regenerate:

```bash
npx @better-auth/cli@latest generate --output prisma/schema.prisma
npx prisma migrate dev --name <name>
```
