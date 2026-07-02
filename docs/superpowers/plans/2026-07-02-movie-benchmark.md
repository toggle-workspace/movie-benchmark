# Toggle Movie Benchmark — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a data-only movie concept evaluator that returns 5 formula-driven benchmark scores from TMDB data, persists runs to Neon Postgres, and requires NextAuth authentication.

**Architecture:** A Next.js 15 API route fetches 4 parallel TMDB queries on form submission, runs scoring formulas server-side, saves the result as JSON to Postgres, and returns scores + comparison film lists to the client. No AI in v1.

**Tech Stack:** Next.js 15 App Router, NextAuth v4, Prisma + Neon Postgres, TMDB API v3, shadcn/ui, Tailwind CSS 4, Vitest (scoring tests only)

## Global Constraints

- Next.js 15.3.8, React 19
- All TMDB calls server-side only — API key never sent to client
- Scores 0–100; `null` means "Insufficient data" (< 3 films available)
- Revenue data in USD (TMDB standard) — no MYR conversion in v1
- `vote_count < 10` films excluded from all scoring
- Neon free tier — single DATABASE_URL connection string
- Passwords hashed with bcryptjs (saltRounds = 10)
- Sessions JWT-based (NextAuth default)

---

## File Map

**New files:**
```
prisma/schema.prisma
lib/db.ts
lib/auth.ts
lib/tmdb.ts
lib/scoring.ts
lib/scoring.test.ts
middleware.ts
app/api/auth/[...nextauth]/route.ts
app/api/auth/register/route.ts
app/api/benchmark/route.ts
app/api/benchmark/[id]/route.ts
app/(dashboard)/dashboard/benchmark/page.tsx
app/(dashboard)/dashboard/results/[id]/page.tsx
app/(dashboard)/dashboard/history/page.tsx
```

**Modified files:**
```
package.json                          ← add deps
.env.local                            ← created (not committed)
app/page.tsx                          ← redirect logic
app/(auth)/login/page.tsx             ← wire signIn()
app/(auth)/register/page.tsx          ← wire register API
components/shared/sidebar.tsx         ← add Benchmark + History links
```

---

## Task 1: Install dependencies and environment

**Files:**
- Modify: `package.json`
- Create: `.env.local` (not committed — add to .gitignore)

**Interfaces:**
- Produces: `prisma`, `@prisma/client`, `next-auth`, `bcryptjs`, `@types/bcryptjs`, `vitest` available in project

- [ ] **Step 1: Install packages**

```bash
cd /Users/aizad/Desktop/toggle-movie-benchmark
npm install prisma @prisma/client next-auth bcryptjs
npm install -D @types/bcryptjs vitest
```

Expected: packages added to node_modules, package-lock.json updated.

- [ ] **Step 2: Initialise Prisma**

```bash
npx prisma init --datasource-provider postgresql
```

Expected: `prisma/schema.prisma` created, `.env` created with `DATABASE_URL` placeholder.

- [ ] **Step 3: Create `.env.local` with required vars**

Create the file `.env.local` at the project root (not `.env` — Next.js loads `.env.local`):

```
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DBNAME?sslmode=require"
NEXTAUTH_SECRET="replace-with-output-of-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"
TMDB_API_KEY="your-tmdb-api-key-from-themoviedb.org"
```

> To generate NEXTAUTH_SECRET run: `openssl rand -base64 32`
> Get TMDB_API_KEY free at https://www.themoviedb.org/settings/api

- [ ] **Step 4: Add `.env.local` to `.gitignore`**

Open `.gitignore` and verify `.env.local` is listed. If not, add it:

```
.env.local
```

- [ ] **Step 5: Remove the `.env` that prisma init created (it duplicates .env.local)**

```bash
rm .env
```

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json prisma/schema.prisma .gitignore
git commit -m "chore: add prisma, next-auth, bcryptjs, vitest deps"
```

---

## Task 2: Database schema and Prisma client

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `lib/db.ts`

**Interfaces:**
- Produces:
  - `db` — Prisma client singleton, import from `@/lib/db`
  - `db.user.findUnique({ where: { email } })` → `{ id, email, password, createdAt } | null`
  - `db.benchmarkRun.create({ data: { userId, concept, result } })` → `{ id, userId, createdAt, concept, result }`
  - `db.benchmarkRun.findMany({ where: { userId } })` → array
  - `db.benchmarkRun.findUnique({ where: { id } })` → single run or null
  - `db.benchmarkRun.delete({ where: { id } })`

- [ ] **Step 1: Write `prisma/schema.prisma`**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String         @id @default(cuid())
  email     String         @unique
  password  String
  createdAt DateTime       @default(now())
  runs      BenchmarkRun[]
}

model BenchmarkRun {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
  concept   Json
  result    Json
}
```

- [ ] **Step 2: Run migration**

```bash
npx prisma migrate dev --name init
```

Expected output includes: `Your database is now in sync with your schema.`
This requires DATABASE_URL in `.env.local` to point to a real Neon database.

> If you don't have a Neon DB yet: go to neon.tech, create a free project, copy the connection string into `.env.local`.

- [ ] **Step 3: Generate Prisma client**

```bash
npx prisma generate
```

Expected: `✔ Generated Prisma Client`

- [ ] **Step 4: Create `lib/db.ts`**

```typescript
import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({ log: process.env.NODE_ENV === "development" ? ["error"] : [] })

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db
```

- [ ] **Step 5: Commit**

```bash
git add prisma/ lib/db.ts
git commit -m "feat: add prisma schema and db client singleton"
```

---

## Task 3: NextAuth setup and register API

**Files:**
- Create: `lib/auth.ts`
- Create: `app/api/auth/[...nextauth]/route.ts`
- Create: `app/api/auth/register/route.ts`

**Interfaces:**
- Consumes: `db` from `@/lib/db`
- Produces:
  - `authOptions` — NextAuth config, exported from `@/lib/auth`
  - `POST /api/auth/register` — body `{ email, password }` → `201 { id, email }` or `400`/`409`
  - `POST /api/auth/callback/credentials` — handled by NextAuth

- [ ] **Step 1: Create `lib/auth.ts`**

```typescript
import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { db } from "@/lib/db"

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        const user = await db.user.findUnique({ where: { email: credentials.email } })
        if (!user) return null
        const valid = await bcrypt.compare(credentials.password, user.password)
        if (!valid) return null
        return { id: user.id, email: user.email }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) token.id = user.id
      return token
    },
    session({ session, token }) {
      if (token && session.user) session.user.id = token.id as string
      return session
    },
  },
}
```

- [ ] **Step 2: Create `app/api/auth/[...nextauth]/route.ts`**

```typescript
import NextAuth from "next-auth"
import { authOptions } from "@/lib/auth"

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
```

- [ ] **Step 3: Create `app/api/auth/register/route.ts`**

```typescript
import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { db } from "@/lib/db"

export async function POST(req: Request) {
  const { email, password } = await req.json()
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 })
  }
  const existing = await db.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json({ error: "Email already registered" }, { status: 409 })
  }
  const hashed = await bcrypt.hash(password, 10)
  const user = await db.user.create({ data: { email, password: hashed } })
  return NextResponse.json({ id: user.id, email: user.email }, { status: 201 })
}
```

- [ ] **Step 4: Add `id` to NextAuth Session type — create `types/next-auth.d.ts`**

```typescript
import "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
      image?: string | null
    }
  }
}
```

- [ ] **Step 5: Commit**

```bash
git add lib/auth.ts app/api/auth/ types/
git commit -m "feat: add nextauth credentials provider and register route"
```

---

## Task 4: Auth middleware (route protection)

**Files:**
- Create: `middleware.ts` (project root)

**Interfaces:**
- Consumes: NextAuth JWT token via `getToken`
- Produces: Redirects unauthenticated requests to `/login`; allows auth routes through

- [ ] **Step 1: Create `middleware.ts`**

```typescript
import { getToken } from "next-auth/jwt"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  const { pathname } = req.nextUrl

  const isAuthRoute = pathname.startsWith("/login") || pathname.startsWith("/register")
  const isProtected =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/api/benchmark")

  if (isProtected && !token) {
    const loginUrl = new URL("/login", req.url)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (isAuthRoute && token) {
    return NextResponse.redirect(new URL("/dashboard/benchmark", req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/benchmark/:path*", "/login", "/register"],
}
```

- [ ] **Step 2: Verify middleware is at project root (same level as `app/`)**

```bash
ls /Users/aizad/Desktop/toggle-movie-benchmark/middleware.ts
```

Expected: file listed.

- [ ] **Step 3: Commit**

```bash
git add middleware.ts
git commit -m "feat: add route protection middleware"
```

---

## Task 5: Wire auth to login and register pages

**Files:**
- Modify: `app/(auth)/login/page.tsx`
- Modify: `app/(auth)/register/page.tsx`

**Interfaces:**
- Consumes: `signIn` from `next-auth/react`, `POST /api/auth/register`
- Produces: Working login/register that creates sessions and redirects to `/dashboard/benchmark`

- [ ] **Step 1: Replace `app/(auth)/login/page.tsx` `onSubmit` function**

The file already has the form; only the `onSubmit` and imports need updating. Replace the entire file:

```typescript
"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { toast } from "sonner"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { LogIn, Mail, Lock } from "lucide-react"
import Link from "next/link"

const formSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
})

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard/benchmark"

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "", password: "" },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const result = await signIn("credentials", {
      email: values.email,
      password: values.password,
      redirect: false,
    })
    if (result?.error) {
      toast.error("Invalid email or password")
      return
    }
    router.push(callbackUrl)
    router.refresh()
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <LogIn className="mx-auto h-12 w-12 text-gray-400" />
        <CardTitle className="mt-4 text-2xl">Welcome back</CardTitle>
        <CardDescription>Enter your credentials to access your account</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input placeholder="Enter your email" className="pl-10" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input type="password" placeholder="Enter your password" className="pl-10" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Signing in…" : "Sign In"}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex flex-col gap-4">
        <div className="text-center text-sm">
          <Link href="/forgot-password" className="text-blue-600 hover:text-blue-800 underline">
            Forgot your password?
          </Link>
        </div>
        <div className="text-center text-sm">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-blue-600 hover:text-blue-800 underline">
            Sign up
          </Link>
        </div>
      </CardFooter>
    </Card>
  )
}
```

- [ ] **Step 2: Replace `app/(auth)/register/page.tsx`**

```typescript
"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { toast } from "sonner"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { UserPlus, Mail, Lock } from "lucide-react"
import Link from "next/link"

const formSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
})

export default function RegisterPage() {
  const router = useRouter()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "", password: "", confirmPassword: "" },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: values.email, password: values.password }),
    })
    if (res.status === 409) {
      toast.error("This email is already registered")
      return
    }
    if (!res.ok) {
      toast.error("Registration failed. Please try again.")
      return
    }
    await signIn("credentials", { email: values.email, password: values.password, redirect: false })
    router.push("/dashboard/benchmark")
    router.refresh()
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <UserPlus className="mx-auto h-12 w-12 text-gray-400" />
        <CardTitle className="mt-4 text-2xl">Create an account</CardTitle>
        <CardDescription>Sign up to start benchmarking your movie ideas</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input placeholder="Enter your email" className="pl-10" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input type="password" placeholder="Create a password" className="pl-10" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input type="password" placeholder="Confirm your password" className="pl-10" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Creating account…" : "Create Account"}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter>
        <div className="text-center text-sm w-full">
          Already have an account?{" "}
          <Link href="/login" className="text-blue-600 hover:text-blue-800 underline">
            Sign in
          </Link>
        </div>
      </CardFooter>
    </Card>
  )
}
```

- [ ] **Step 3: Update `app/page.tsx` to redirect based on auth**

Replace the full file:

```typescript
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"

export default async function RootPage() {
  const session = await getServerSession(authOptions)
  redirect(session ? "/dashboard/benchmark" : "/login")
}
```

- [ ] **Step 4: Commit**

```bash
git add app/\(auth\)/login/page.tsx app/\(auth\)/register/page.tsx app/page.tsx
git commit -m "feat: wire login and register pages to nextauth"
```

---

## Task 6: TMDB API client

**Files:**
- Create: `lib/tmdb.ts`

**Interfaces:**
- Produces:
  - `TmdbMovie` — `{ id, title, release_date, vote_average, vote_count, genre_ids, revenue, budget, origin_country }`
  - `TmdbCompany` — `{ id, name }`
  - `TMDB_GENRES` — `Record<number, string>` mapping genre IDs to names
  - `fetchCompanyFilms(companyId: number): Promise<TmdbMovie[]>` — last 20 films
  - `fetchRegionalFilms(genreId: number, releaseYear: number): Promise<TmdbMovie[]>` — MY/ID/TH, ±5yr
  - `fetchGlobalFilms(genreId: number, releaseYear: number): Promise<TmdbMovie[]>` — top 50 global
  - `fetchMovieDetails(movieId: number): Promise<TmdbMovie>` — includes revenue/budget
  - `searchCompanies(query: string): Promise<TmdbCompany[]>`

- [ ] **Step 1: Create `lib/tmdb.ts`**

```typescript
export interface TmdbMovie {
  id: number
  title: string
  release_date: string
  vote_average: number
  vote_count: number
  genre_ids: number[]
  revenue: number
  budget: number
  origin_country: string[]
}

export interface TmdbCompany {
  id: number
  name: string
}

export const TMDB_GENRES: Record<number, string> = {
  28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy",
  80: "Crime", 99: "Documentary", 18: "Drama", 10751: "Family",
  14: "Fantasy", 36: "History", 27: "Horror", 10402: "Music",
  9648: "Mystery", 10749: "Romance", 878: "Science Fiction",
  53: "Thriller", 10752: "War", 37: "Western",
}

const BASE = "https://api.themoviedb.org/3"

async function tmdb<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${BASE}${path}`)
  url.searchParams.set("api_key", process.env.TMDB_API_KEY!)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  const res = await fetch(url.toString(), { next: { revalidate: 0 } })
  if (!res.ok) throw new Error(`TMDB ${path} → ${res.status}`)
  return res.json()
}

export async function fetchCompanyFilms(companyId: number): Promise<TmdbMovie[]> {
  const data = await tmdb<{ results: TmdbMovie[] }>("/discover/movie", {
    with_companies: String(companyId),
    sort_by: "release_date.desc",
    page: "1",
  })
  return data.results.slice(0, 20)
}

export async function fetchRegionalFilms(genreId: number, releaseYear: number): Promise<TmdbMovie[]> {
  const data = await tmdb<{ results: TmdbMovie[] }>("/discover/movie", {
    with_genres: String(genreId),
    "primary_release_date.gte": `${releaseYear - 5}-01-01`,
    "primary_release_date.lte": `${releaseYear + 5}-12-31`,
    with_origin_country: "MY|ID|TH",
    sort_by: "vote_count.desc",
    page: "1",
  })
  return data.results
}

export async function fetchGlobalFilms(genreId: number, releaseYear: number): Promise<TmdbMovie[]> {
  const [page1, page2] = await Promise.all([
    tmdb<{ results: TmdbMovie[] }>("/discover/movie", {
      with_genres: String(genreId),
      "primary_release_date.gte": `${releaseYear - 1}-01-01`,
      "primary_release_date.lte": `${releaseYear + 1}-12-31`,
      sort_by: "popularity.desc",
      page: "1",
    }),
    tmdb<{ results: TmdbMovie[] }>("/discover/movie", {
      with_genres: String(genreId),
      "primary_release_date.gte": `${releaseYear - 1}-01-01`,
      "primary_release_date.lte": `${releaseYear + 1}-12-31`,
      sort_by: "popularity.desc",
      page: "2",
    }),
  ])
  return [...page1.results, ...page2.results].slice(0, 50)
}

export async function fetchMovieDetails(movieId: number): Promise<TmdbMovie> {
  return tmdb<TmdbMovie>(`/movie/${movieId}`)
}

export async function searchCompanies(query: string): Promise<TmdbCompany[]> {
  const data = await tmdb<{ results: TmdbCompany[] }>("/search/company", { query })
  return data.results.slice(0, 10)
}

/** Enrich a list of movies with revenue/budget from the detail endpoint (top N only) */
export async function enrichWithRevenue(movies: TmdbMovie[], limit = 10): Promise<TmdbMovie[]> {
  const top = movies.slice(0, limit)
  const detailed = await Promise.all(top.map((m) => fetchMovieDetails(m.id).catch(() => m)))
  return detailed
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/tmdb.ts
git commit -m "feat: add TMDB API client with 4 query functions"
```

---

## Task 7: Scoring engine (with tests)

**Files:**
- Create: `lib/scoring.ts`
- Create: `lib/scoring.test.ts`

**Interfaces:**
- Consumes: `TmdbMovie` from `@/lib/tmdb`
- Produces:
  - `ScoreResult` — `{ score: number | null, label: string, description: string, films: ComparisonFilm[] }`
  - `ComparisonFilm` — `{ title, country, releaseYear, revenue, avgRating, voteCount }`
  - `BenchmarkScores` — `{ revenuePotential, audienceReception, regionalFit, trackRecord, globalCompetitiveness, aggregate }`
  - `scoreRevenuePotential(films, estimatedBudgetMYR?): ScoreResult`
  - `scoreAudienceReception(films): ScoreResult`
  - `scoreRegionalFit(films): ScoreResult`
  - `scoreTrackRecord(films): ScoreResult`
  - `scoreGlobalCompetitiveness(regionalFilms, globalFilms): ScoreResult`
  - `computeAggregate(scores: Omit<BenchmarkScores, "aggregate">): number`

- [ ] **Step 1: Write failing tests in `lib/scoring.test.ts`**

```typescript
import { describe, it, expect } from "vitest"
import {
  scoreAudienceReception,
  scoreRegionalFit,
  scoreTrackRecord,
  scoreGlobalCompetitiveness,
  scoreRevenuePotential,
  computeAggregate,
} from "./scoring"
import type { TmdbMovie } from "./tmdb"

function movie(overrides: Partial<TmdbMovie> = {}): TmdbMovie {
  return {
    id: 1, title: "Test Film", release_date: "2023-01-01",
    vote_average: 7.0, vote_count: 100, genre_ids: [28],
    revenue: 1_000_000, budget: 500_000, origin_country: ["MY"],
    ...overrides,
  }
}

describe("scoreAudienceReception", () => {
  it("returns null when fewer than 3 films have vote_count >= 10", () => {
    const result = scoreAudienceReception([movie({ vote_count: 5 }), movie({ vote_count: 3 })])
    expect(result.score).toBeNull()
  })

  it("converts avg vote_average to 0-100 scale", () => {
    const films = [movie({ vote_average: 8.0 }), movie({ vote_average: 6.0 }), movie({ vote_average: 7.0 })]
    const result = scoreAudienceReception(films)
    expect(result.score).toBe(70) // (7.0 / 10) * 100
  })
})

describe("scoreRegionalFit", () => {
  it("returns 0 for empty film list", () => {
    expect(scoreRegionalFit([]).score).toBe(0)
  })

  it("caps at 100 for 10+ films", () => {
    const films = Array.from({ length: 12 }, () => movie())
    expect(scoreRegionalFit(films).score).toBe(100)
  })

  it("scores 3 films as 30", () => {
    const films = [movie(), movie(), movie()]
    expect(scoreRegionalFit(films).score).toBe(30)
  })
})

describe("scoreTrackRecord", () => {
  it("returns null for fewer than 3 qualifying films", () => {
    const films = [movie({ vote_count: 15 }), movie({ vote_count: 20 })]
    expect(scoreTrackRecord(films).score).toBeNull()
  })

  it("averages vote_average of qualifying films", () => {
    const films = [
      movie({ vote_average: 8.0, vote_count: 50 }),
      movie({ vote_average: 6.0, vote_count: 50 }),
      movie({ vote_average: 7.0, vote_count: 50 }),
    ]
    expect(scoreTrackRecord(films).score).toBe(70)
  })
})

describe("scoreGlobalCompetitiveness", () => {
  it("returns null when regional films insufficient", () => {
    const result = scoreGlobalCompetitiveness([], [movie(), movie(), movie()])
    expect(result.score).toBeNull()
  })

  it("returns 50 when regional avg equals global avg", () => {
    const regional = [movie({ vote_average: 7, vote_count: 50 }), movie({ vote_average: 7, vote_count: 50 }), movie({ vote_average: 7, vote_count: 50 })]
    const global_ = [movie({ vote_average: 7, vote_count: 50 }), movie({ vote_average: 7, vote_count: 50 }), movie({ vote_average: 7, vote_count: 50 })]
    expect(scoreGlobalCompetitiveness(regional, global_).score).toBe(50)
  })
})

describe("scoreRevenuePotential", () => {
  it("returns null when no qualifying films have revenue > 0", () => {
    const films = [movie({ revenue: 0 }), movie({ revenue: 0 }), movie({ revenue: 0 })]
    expect(scoreRevenuePotential(films).score).toBeNull()
  })

  it("returns 50 when budget matches median revenue", () => {
    const films = [
      movie({ revenue: 2_000_000, vote_count: 50 }),
      movie({ revenue: 2_000_000, vote_count: 50 }),
      movie({ revenue: 2_000_000, vote_count: 50 }),
    ]
    // MYR_TO_USD ≈ 0.21; 2_000_000 / 0.21 ≈ 9_523_809 MYR budget matches median of 2M USD
    // When no budget passed, proxy = median, so score = min(100, (median/median) * 50) = 50
    expect(scoreRevenuePotential(films).score).toBe(50)
  })
})

describe("computeAggregate", () => {
  it("averages available (non-null) scores", () => {
    const scores = {
      revenuePotential: { score: 60, label: "", description: "", films: [] },
      audienceReception: { score: 80, label: "", description: "", films: [] },
      regionalFit: { score: null, label: "", description: "", films: [] },
      trackRecord: { score: 40, label: "", description: "", films: [] },
      globalCompetitiveness: { score: null, label: "", description: "", films: [] },
    }
    expect(computeAggregate(scores)).toBe(60) // (60+80+40) / 3
  })
})
```

- [ ] **Step 2: Run tests — expect ALL to fail**

```bash
npx vitest run lib/scoring.test.ts
```

Expected: errors about `scoring` module not found.

- [ ] **Step 3: Create `lib/scoring.ts`**

```typescript
import type { TmdbMovie } from "./tmdb"

export interface ComparisonFilm {
  title: string
  country: string
  releaseYear: number
  revenue: number
  avgRating: number
  voteCount: number
}

export interface ScoreResult {
  score: number | null
  label: string
  description: string
  films: ComparisonFilm[]
}

export interface BenchmarkScores {
  revenuePotential: ScoreResult
  audienceReception: ScoreResult
  regionalFit: ScoreResult
  trackRecord: ScoreResult
  globalCompetitiveness: ScoreResult
  aggregate: number
}

const MYR_TO_USD = 0.21 // approximate; not updated dynamically in v1

function toFilm(m: TmdbMovie): ComparisonFilm {
  return {
    title: m.title,
    country: m.origin_country?.[0] ?? "Unknown",
    releaseYear: new Date(m.release_date).getFullYear(),
    revenue: m.revenue,
    avgRating: m.vote_average,
    voteCount: m.vote_count,
  }
}

function median(values: number[]): number {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

function avg(values: number[]): number {
  if (!values.length) return 0
  return values.reduce((a, b) => a + b, 0) / values.length
}

export function scoreRevenuePotential(
  films: TmdbMovie[],
  estimatedBudgetMYR?: number
): ScoreResult {
  const qualified = films.filter((f) => f.vote_count >= 10 && f.revenue > 0)
  if (qualified.length < 3) {
    return {
      score: null,
      label: "Revenue Potential",
      description: "Insufficient revenue data for this genre in the region.",
      films: films.slice(0, 10).map(toFilm),
    }
  }
  const medianRevenue = median(qualified.map((f) => f.revenue))
  const budgetUSD = estimatedBudgetMYR ? estimatedBudgetMYR * MYR_TO_USD : medianRevenue
  const score = Math.min(100, Math.round((budgetUSD / medianRevenue) * 50))
  return {
    score,
    label: "Revenue Potential",
    description: `Median regional revenue for this genre: USD ${medianRevenue.toLocaleString()}`,
    films: qualified.slice(0, 10).map(toFilm),
  }
}

export function scoreAudienceReception(films: TmdbMovie[]): ScoreResult {
  const qualified = films.filter((f) => f.vote_count >= 10)
  if (qualified.length < 3) {
    return {
      score: null,
      label: "Audience Reception",
      description: "Insufficient rating data for this genre in the region.",
      films: films.slice(0, 10).map(toFilm),
    }
  }
  const avgVote = avg(qualified.map((f) => f.vote_average))
  const score = Math.round((avgVote / 10) * 100)
  return {
    score,
    label: "Audience Reception",
    description: `Average regional rating for this genre: ${avgVote.toFixed(1)}/10`,
    films: qualified.slice(0, 10).map(toFilm),
  }
}

export function scoreRegionalFit(films: TmdbMovie[]): ScoreResult {
  const score = Math.min(100, films.length * 10)
  return {
    score,
    label: "Regional Fit",
    description: `${films.length} films in this genre released in the region around the target year.`,
    films: films.slice(0, 10).map(toFilm),
  }
}

export function scoreTrackRecord(films: TmdbMovie[]): ScoreResult {
  const qualified = films.filter((f) => f.vote_count >= 10).slice(0, 10)
  if (qualified.length < 3) {
    return {
      score: null,
      label: "Production Company Track Record",
      description: "Insufficient TMDB data for this production company.",
      films: films.slice(0, 10).map(toFilm),
    }
  }
  const avgVote = avg(qualified.map((f) => f.vote_average))
  const score = Math.round((avgVote / 10) * 100)
  return {
    score,
    label: "Production Company Track Record",
    description: `Company's average TMDB rating across last ${qualified.length} rated films: ${avgVote.toFixed(1)}/10`,
    films: qualified.map(toFilm),
  }
}

export function scoreGlobalCompetitiveness(
  regionalFilms: TmdbMovie[],
  globalFilms: TmdbMovie[]
): ScoreResult {
  const qualifiedRegional = regionalFilms.filter((f) => f.vote_count >= 10)
  const qualifiedGlobal = globalFilms.filter((f) => f.vote_count >= 10)
  if (qualifiedRegional.length < 3 || qualifiedGlobal.length < 3) {
    return {
      score: null,
      label: "Global Competitiveness",
      description: "Insufficient data to compare regional vs global performance.",
      films: globalFilms.slice(0, 10).map(toFilm),
    }
  }
  const regionalAvg = avg(qualifiedRegional.map((f) => f.vote_average))
  const globalAvg = avg(qualifiedGlobal.map((f) => f.vote_average))
  const score = Math.min(100, Math.round((regionalAvg / globalAvg) * 50))
  return {
    score,
    label: "Global Competitiveness",
    description: `Regional avg: ${regionalAvg.toFixed(1)} vs Global avg: ${globalAvg.toFixed(1)}`,
    films: qualifiedGlobal.slice(0, 10).map(toFilm),
  }
}

export function computeAggregate(
  scores: Omit<BenchmarkScores, "aggregate">
): number {
  const values = Object.values(scores)
    .map((s) => s.score)
    .filter((s): s is number => s !== null)
  if (!values.length) return 0
  return Math.round(avg(values))
}
```

- [ ] **Step 4: Add vitest config to `package.json`**

Add to the root of `package.json`:

```json
"scripts": {
  ...existing scripts...,
  "test": "vitest run"
},
"vitest": {
  "environment": "node"
}
```

- [ ] **Step 5: Run tests — expect ALL to pass**

```bash
npx vitest run lib/scoring.test.ts
```

Expected output: all 10 tests pass, 0 failures.

- [ ] **Step 6: Commit**

```bash
git add lib/scoring.ts lib/scoring.test.ts package.json
git commit -m "feat: add scoring engine with vitest unit tests"
```

---

## Task 8: Benchmark API route

**Files:**
- Create: `app/api/benchmark/route.ts`
- Create: `app/api/benchmark/[id]/route.ts`

**Interfaces:**
- Consumes: `fetchCompanyFilms`, `fetchRegionalFilms`, `fetchGlobalFilms`, `enrichWithRevenue` from `@/lib/tmdb`; all score functions from `@/lib/scoring`; `db` from `@/lib/db`; `getServerSession` from `next-auth`
- Produces:
  - `POST /api/benchmark` — body: `ConceptInput` → `{ id, scores: BenchmarkScores, concept: ConceptInput }`
  - `DELETE /api/benchmark/[id]` → `204` or `403`/`404`

- [ ] **Step 1: Create `app/api/benchmark/route.ts`**

```typescript
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import {
  fetchCompanyFilms, fetchRegionalFilms, fetchGlobalFilms, enrichWithRevenue,
} from "@/lib/tmdb"
import {
  scoreRevenuePotential, scoreAudienceReception, scoreRegionalFit,
  scoreTrackRecord, scoreGlobalCompetitiveness, computeAggregate,
} from "@/lib/scoring"
import { db } from "@/lib/db"

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const concept = await req.json()
  const { genreId, releaseYear, companyId, estimatedBudgetMYR } = concept

  if (!genreId || !releaseYear || !companyId) {
    return NextResponse.json({ error: "genreId, releaseYear, and companyId are required" }, { status: 400 })
  }

  const [companyFilms, regionalFilms, globalFilms] = await Promise.all([
    fetchCompanyFilms(Number(companyId)),
    fetchRegionalFilms(Number(genreId), Number(releaseYear)),
    fetchGlobalFilms(Number(genreId), Number(releaseYear)),
  ])

  const enrichedCompanyFilms = await enrichWithRevenue(companyFilms, 10)
  const enrichedRegionalFilms = await enrichWithRevenue(regionalFilms, 10)

  const scores = {
    revenuePotential: scoreRevenuePotential(enrichedRegionalFilms, estimatedBudgetMYR),
    audienceReception: scoreAudienceReception(regionalFilms),
    regionalFit: scoreRegionalFit(regionalFilms),
    trackRecord: scoreTrackRecord(enrichedCompanyFilms),
    globalCompetitiveness: scoreGlobalCompetitiveness(regionalFilms, globalFilms),
  }

  const aggregate = computeAggregate(scores)
  const result = { ...scores, aggregate }

  const run = await db.benchmarkRun.create({
    data: { userId: session.user.id, concept, result },
  })

  return NextResponse.json({ id: run.id, scores: result, concept })
}
```

- [ ] **Step 2: Create `app/api/benchmark/[id]/route.ts`**

```typescript
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const run = await db.benchmarkRun.findUnique({ where: { id: params.id } })
  if (!run) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (run.userId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  await db.benchmarkRun.delete({ where: { id: params.id } })
  return new NextResponse(null, { status: 204 })
}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/benchmark/
git commit -m "feat: add benchmark POST route and DELETE by id"
```

---

## Task 9: Benchmark form page

**Files:**
- Create: `app/(dashboard)/dashboard/benchmark/page.tsx`

**Interfaces:**
- Consumes: `POST /api/benchmark`, `GET /api/company-search?q=` (via TMDB)
- Produces: Form that submits concept and redirects to `/dashboard/results/[id]`

Note: Company search needs its own API route to keep TMDB key server-side.

- [ ] **Step 1: Create company search API route `app/api/company-search/route.ts`**

```typescript
import { NextResponse } from "next/server"
import { searchCompanies } from "@/lib/tmdb"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get("q") ?? ""
  if (q.length < 2) return NextResponse.json([])
  const companies = await searchCompanies(q)
  return NextResponse.json(companies)
}
```

- [ ] **Step 2: Create `app/(dashboard)/dashboard/benchmark/page.tsx`**

```typescript
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { TMDB_GENRES } from "@/lib/tmdb"

const schema = z.object({
  title: z.string().min(1),
  genreId: z.string().min(1),
  releaseYear: z.coerce.number().min(1900).max(2100),
  companyId: z.string().min(1),
  companyName: z.string().min(1),
  director: z.string().optional(),
  cast: z.string().optional(),
  estimatedBudgetMYR: z.coerce.number().optional(),
  synopsis: z.string().optional(),
  targetAudience: z.string().min(1),
  language: z.string().min(1),
  distributionPlatform: z.string().min(1),
})

type FormValues = z.infer<typeof schema>

export default function BenchmarkPage() {
  const router = useRouter()
  const [companyQuery, setCompanyQuery] = useState("")
  const [companySuggestions, setCompanySuggestions] = useState<{ id: number; name: string }[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { releaseYear: new Date().getFullYear() + 1 },
  })

  useEffect(() => {
    if (companyQuery.length < 2) { setCompanySuggestions([]); return }
    const t = setTimeout(async () => {
      const res = await fetch(`/api/company-search?q=${encodeURIComponent(companyQuery)}`)
      const data = await res.json()
      setCompanySuggestions(data)
    }, 300)
    return () => clearTimeout(t)
  }, [companyQuery])

  async function onSubmit(values: FormValues) {
    setIsSubmitting(true)
    try {
      const res = await fetch("/api/benchmark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      })
      if (!res.ok) { toast.error("Benchmark failed. Please try again."); return }
      const data = await res.json()
      router.push(`/dashboard/results/${data.id}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">New Movie Benchmark</h1>
        <p className="text-muted-foreground mt-1">Enter your movie concept to get data-driven benchmark scores.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Core Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label>Movie Title *</Label>
              <Input placeholder="e.g. Polis Evo 4" {...register("title")} />
              {errors.title && <p className="text-sm text-red-500">Title is required</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Primary Genre *</Label>
                <Select onValueChange={(v) => setValue("genreId", v)}>
                  <SelectTrigger><SelectValue placeholder="Select genre" /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TMDB_GENRES).map(([id, name]) => (
                      <SelectItem key={id} value={id}>{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.genreId && <p className="text-sm text-red-500">Genre is required</p>}
              </div>

              <div className="space-y-1">
                <Label>Planned Release Year *</Label>
                <Input type="number" placeholder="2026" {...register("releaseYear")} />
                {errors.releaseYear && <p className="text-sm text-red-500">Valid year required</p>}
              </div>
            </div>

            <div className="space-y-1">
              <Label>Production Company *</Label>
              <Input
                placeholder="Search company name…"
                value={companyQuery}
                onChange={(e) => setCompanyQuery(e.target.value)}
              />
              {companySuggestions.length > 0 && (
                <div className="border rounded-md bg-popover shadow-md">
                  {companySuggestions.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm hover:bg-muted"
                      onClick={() => {
                        setValue("companyId", String(c.id))
                        setValue("companyName", c.name)
                        setCompanyQuery(c.name)
                        setCompanySuggestions([])
                      }}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              )}
              {errors.companyId && <p className="text-sm text-red-500">Select a company from the list</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Optional Details</CardTitle><CardDescription>More detail improves score context</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Director</Label>
                <Input placeholder="e.g. Syafiq Yusof" {...register("director")} />
              </div>
              <div className="space-y-1">
                <Label>Estimated Budget (MYR)</Label>
                <Input type="number" placeholder="e.g. 5000000" {...register("estimatedBudgetMYR")} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Lead Cast (comma-separated)</Label>
              <Input placeholder="e.g. Shaheizy Sam, Zizan Razak" {...register("cast")} />
            </div>
            <div className="space-y-1">
              <Label>Synopsis</Label>
              <Textarea placeholder="Brief description of the movie concept…" rows={3} {...register("synopsis")} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Release Context</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label>Target Audience *</Label>
                <Select onValueChange={(v) => setValue("targetAudience", v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {["General", "Family", "Teen", "Adult"].map((v) => (
                      <SelectItem key={v} value={v}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Language *</Label>
                <Select onValueChange={(v) => setValue("language", v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {["Malay", "English", "Mandarin", "Tamil", "Other"].map((v) => (
                      <SelectItem key={v} value={v}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Distribution *</Label>
                <Select onValueChange={(v) => setValue("distributionPlatform", v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {["Cinema", "Streaming", "Both"].map((v) => (
                      <SelectItem key={v} value={v}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
          {isSubmitting ? "Benchmarking…" : "Run Benchmark"}
        </Button>
      </form>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add app/\(dashboard\)/dashboard/benchmark/ app/api/company-search/
git commit -m "feat: add benchmark form page with company search"
```

---

## Task 10: Results page

**Files:**
- Create: `app/(dashboard)/dashboard/results/[id]/page.tsx`

**Interfaces:**
- Consumes: `db.benchmarkRun.findUnique` — returns `{ id, concept, result, createdAt }`
- Produces: Results view with aggregate gauge, 5 score cards, collapsible comparison tables

- [ ] **Step 1: Create `app/(dashboard)/dashboard/results/[id]/page.tsx`**

```typescript
import { notFound, redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import type { BenchmarkScores, ScoreResult, ComparisonFilm } from "@/lib/scoring"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

function ScoreGauge({ score, size = "lg" }: { score: number | null; size?: "sm" | "lg" }) {
  const dim = size === "lg" ? "w-32 h-32 text-3xl" : "w-16 h-16 text-lg"
  const color = score === null ? "text-muted-foreground" :
    score >= 70 ? "text-green-600" : score >= 40 ? "text-yellow-600" : "text-red-600"
  return (
    <div className={`${dim} rounded-full border-4 flex items-center justify-center font-bold ${color} border-current`}>
      {score === null ? "N/A" : score}
    </div>
  )
}

function FilmTable({ films }: { films: ComparisonFilm[] }) {
  if (!films.length) return <p className="text-sm text-muted-foreground">No comparison films available.</p>
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-muted-foreground border-b">
            <th className="text-left py-2 pr-4">Title</th>
            <th className="text-left py-2 pr-4">Country</th>
            <th className="text-right py-2 pr-4">Year</th>
            <th className="text-right py-2 pr-4">Revenue (USD)</th>
            <th className="text-right py-2 pr-4">Rating</th>
            <th className="text-right py-2">Votes</th>
          </tr>
        </thead>
        <tbody>
          {films.map((f, i) => (
            <tr key={i} className="border-b last:border-0">
              <td className="py-2 pr-4 font-medium">{f.title}</td>
              <td className="py-2 pr-4">{f.country}</td>
              <td className="py-2 pr-4 text-right">{f.releaseYear}</td>
              <td className="py-2 pr-4 text-right">{f.revenue > 0 ? `$${f.revenue.toLocaleString()}` : "—"}</td>
              <td className="py-2 pr-4 text-right">{f.avgRating.toFixed(1)}</td>
              <td className="py-2 text-right">{f.voteCount.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function DimensionCard({ result, open = false }: { result: ScoreResult; open?: boolean }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base">{result.label}</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">{result.description}</p>
        </div>
        <ScoreGauge score={result.score} size="sm" />
      </CardHeader>
      <CardContent>
        <details open={open}>
          <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground select-none">
            {result.films.length} comparison films ▸
          </summary>
          <div className="mt-3">
            <FilmTable films={result.films} />
          </div>
        </details>
      </CardContent>
    </Card>
  )
}

export default async function ResultsPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect("/login")

  const run = await db.benchmarkRun.findUnique({ where: { id: params.id } })
  if (!run || run.userId !== session.user.id) notFound()

  const concept = run.concept as Record<string, unknown>
  const scores = run.result as BenchmarkScores

  const dimensions: ScoreResult[] = [
    scores.revenuePotential,
    scores.audienceReception,
    scores.regionalFit,
    scores.trackRecord,
    scores.globalCompetitiveness,
  ]

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{String(concept.title)}</h1>
          <div className="flex gap-2 mt-2 flex-wrap">
            <Badge variant="secondary">{String(concept.companyName)}</Badge>
            <Badge variant="secondary">{String(concept.releaseYear)}</Badge>
            <Badge variant="secondary">{String(concept.language)}</Badge>
            <Badge variant="secondary">{String(concept.distributionPlatform)}</Badge>
          </div>
        </div>
        <div className="text-center">
          <ScoreGauge score={scores.aggregate} />
          <p className="text-xs text-muted-foreground mt-1">Aggregate</p>
        </div>
      </div>

      <div className="space-y-4">
        {dimensions.map((d, i) => (
          <DimensionCard key={i} result={d} />
        ))}
      </div>

      <p className="text-xs text-muted-foreground text-center">
        All data from TMDB. Revenue figures in USD. Scores 0–100.
      </p>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/\(dashboard\)/dashboard/results/
git commit -m "feat: add benchmark results page with score cards and film tables"
```

---

## Task 11: History page

**Files:**
- Create: `app/(dashboard)/dashboard/history/page.tsx`

**Interfaces:**
- Consumes: `db.benchmarkRun.findMany`, `DELETE /api/benchmark/[id]`
- Produces: List of past runs with link to results and delete button

- [ ] **Step 1: Create `app/(dashboard)/dashboard/history/page.tsx`**

```typescript
"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Trash2 } from "lucide-react"
import { toast } from "sonner"

interface Run {
  id: string
  createdAt: string
  concept: { title: string; companyName: string; releaseYear: number }
  aggregate: number | null
}

export default function HistoryPage() {
  const [runs, setRuns] = useState<Run[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetch("/api/benchmark/history")
      .then((r) => r.json())
      .then(setRuns)
      .finally(() => setLoading(false))
  }, [])

  async function deleteRun(id: string) {
    if (!confirm("Delete this benchmark run?")) return
    const res = await fetch(`/api/benchmark/${id}`, { method: "DELETE" })
    if (res.ok) {
      setRuns((prev) => prev.filter((r) => r.id !== id))
      toast.success("Run deleted")
    } else {
      toast.error("Failed to delete")
    }
  }

  if (loading) return <div className="p-6 text-muted-foreground">Loading history…</div>
  if (!runs.length) return (
    <div className="p-6 text-center space-y-4">
      <p className="text-muted-foreground">No benchmark runs yet.</p>
      <Button asChild><Link href="/dashboard/benchmark">Run your first benchmark</Link></Button>
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">Benchmark History</h1>
      {runs.map((run) => (
        <Card key={run.id}>
          <CardContent className="flex items-center justify-between py-4">
            <Link href={`/dashboard/results/${run.id}`} className="hover:underline flex-1">
              <p className="font-medium">{run.concept.title}</p>
              <p className="text-sm text-muted-foreground">
                {run.concept.companyName} · {run.concept.releaseYear} ·{" "}
                {new Date(run.createdAt).toLocaleDateString()}
              </p>
            </Link>
            <div className="flex items-center gap-4">
              <span className="font-bold text-lg">
                {run.aggregate !== null ? run.aggregate : "N/A"}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-red-500"
                onClick={() => deleteRun(run.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Create `app/api/benchmark/history/route.ts`**

```typescript
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const runs = await db.benchmarkRun.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      createdAt: true,
      concept: true,
      result: true,
    },
  })

  return NextResponse.json(
    runs.map((r) => ({
      id: r.id,
      createdAt: r.createdAt,
      concept: r.concept,
      aggregate: (r.result as { aggregate?: number })?.aggregate ?? null,
    }))
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add app/\(dashboard\)/dashboard/history/ app/api/benchmark/history/
git commit -m "feat: add benchmark history page and history API route"
```

---

## Task 12: Update sidebar and navigation

**Files:**
- Modify: `components/shared/sidebar.tsx`

**Interfaces:**
- Consumes: existing `sidebarGroups` array in sidebar
- Produces: Sidebar with Benchmark and History links added

- [ ] **Step 1: Update `sidebarGroups` in `components/shared/sidebar.tsx`**

Replace the `sidebarGroups` definition (lines 14–32):

```typescript
import { LayoutDashboard, BarChart3, Film, History, ChevronLeft, ChevronRight } from "lucide-react"

const sidebarGroups = [
  {
    title: "General",
    items: [
      { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard, badge: null },
      { title: "Analytics", href: "/dashboard/analytics", icon: BarChart3, badge: null },
    ],
  },
  {
    title: "Movie Benchmark",
    items: [
      { title: "New Benchmark", href: "/dashboard/benchmark", icon: Film, badge: null },
      { title: "History", href: "/dashboard/history", icon: History, badge: null },
    ],
  },
]
```

Also add `Film` and `History` to the existing lucide-react import at the top of the file.

- [ ] **Step 2: Verify sidebar renders both groups**

```bash
npm run dev
```

Open http://localhost:3000 in browser. Navigate to `/login`, log in, confirm sidebar shows "Movie Benchmark" section with "New Benchmark" and "History" links.

- [ ] **Step 3: Commit**

```bash
git add components/shared/sidebar.tsx
git commit -m "feat: add Benchmark and History links to sidebar"
```

---

## Verification Checklist

After all tasks complete, test the full flow:

1. `npm run dev` starts without errors
2. `npx vitest run` — all scoring tests pass
3. Navigate to `http://localhost:3000` → redirects to `/login`
4. Register a new account → redirected to `/dashboard/benchmark`
5. Fill out benchmark form, pick a company from autocomplete, submit
6. Results page loads within 5 seconds with 5 dimension cards
7. Comparison film tables are visible and show real film titles
8. Navigate to `/dashboard/history` — run appears in list
9. Click run → returns to results page
10. Delete run → row removed from history list
11. Open browser DevTools → Network tab → confirm no requests to `api.themoviedb.org` from the browser (all TMDB calls are server-side)
