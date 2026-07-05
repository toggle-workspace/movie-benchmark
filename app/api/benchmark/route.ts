import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { benchmarkRun } from "@/lib/schema"
import { headers } from "next/headers"
import {
	fetchRegionalFilms,
	fetchGlobalFilms,
	enrichWithRevenue,
} from "@/lib/tmdb"
import {
	scoreRevenuePotential,
	scoreAudienceReception,
	scoreRegionalFit,
	scoreGlobalCompetitiveness,
	computeAggregate,
} from "@/lib/scoring"
import { getMyrToUsdRate } from "@/lib/exchange"

export interface MovieConcept {
	title: string
	genreId: number
	releaseYear: number
	director?: string
	cast?: string
	budgetMYR?: number
	synopsis?: string
	audience: string
	language: string
	platform: string
}

export async function POST(req: NextRequest) {
	const session = await auth.api.getSession({ headers: await headers() })
	if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

	const concept: MovieConcept = await req.json()
	if (!concept.title || !concept.genreId || !concept.releaseYear) {
		return NextResponse.json({ error: "Missing required fields: title, genreId, releaseYear" }, { status: 400 })
	}

	const [regionalFilms, globalFilms, myrToUsd] = await Promise.all([
		fetchRegionalFilms(concept.genreId, concept.releaseYear),
		fetchGlobalFilms(concept.genreId, concept.releaseYear),
		getMyrToUsdRate(),
	])

	const enrichedRegional = await enrichWithRevenue(regionalFilms)

	const budgetUSD = concept.budgetMYR ? concept.budgetMYR * myrToUsd : undefined

	const revenuePotential = scoreRevenuePotential(enrichedRegional, budgetUSD)
	const audienceReception = scoreAudienceReception(regionalFilms)
	const regionalFit = scoreRegionalFit(regionalFilms)
	const globalCompetitiveness = scoreGlobalCompetitiveness(regionalFilms, globalFilms)

	const scores = { revenuePotential, audienceReception, regionalFit, globalCompetitiveness }
	const aggregate = computeAggregate(scores)

	const result = { ...scores, aggregate }

	const [run] = await db
		.insert(benchmarkRun)
		.values({
			id: crypto.randomUUID(),
			userId: session.user.id,
			concept,
			result,
		})
		.returning({ id: benchmarkRun.id })

	return NextResponse.json({ id: run.id, result })
}
