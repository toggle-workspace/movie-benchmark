import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { benchmarkRun } from "@/lib/schema"
import { headers } from "next/headers"
import {
	fetchCompanyFilms,
	fetchRegionalFilms,
	fetchGlobalFilms,
	enrichWithRevenue,
} from "@/lib/tmdb"
import {
	scoreRevenuePotential,
	scoreAudienceReception,
	scoreRegionalFit,
	scoreTrackRecord,
	scoreGlobalCompetitiveness,
	computeAggregate,
} from "@/lib/scoring"

export interface MovieConcept {
	title: string
	genreId: number
	releaseYear: number
	companyId: number
	companyName: string
	director?: string
	cast?: string
	budgetMYR?: number
	synopsis?: string
	audience: string
	language: string
	platform: string
}

const MYR_TO_USD = 0.22

export async function POST(req: NextRequest) {
	const session = await auth.api.getSession({ headers: await headers() })
	if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

	const concept: MovieConcept = await req.json()
	if (!concept.title || !concept.genreId || !concept.releaseYear || !concept.companyId) {
		return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
	}

	const [companyFilms, regionalFilms, globalFilms] = await Promise.all([
		fetchCompanyFilms(concept.companyId),
		fetchRegionalFilms(concept.genreId, concept.releaseYear),
		fetchGlobalFilms(concept.genreId, concept.releaseYear),
	])

	const enrichedRegional = await enrichWithRevenue(regionalFilms)

	const budgetUSD = concept.budgetMYR ? concept.budgetMYR * MYR_TO_USD : undefined

	const revenuePotential = scoreRevenuePotential(enrichedRegional, budgetUSD)
	const audienceReception = scoreAudienceReception(regionalFilms)
	const regionalFit = scoreRegionalFit(regionalFilms)
	const trackRecord = scoreTrackRecord(companyFilms)
	const globalCompetitiveness = scoreGlobalCompetitiveness(regionalFilms, globalFilms)

	const scores = { revenuePotential, audienceReception, regionalFit, trackRecord, globalCompetitiveness }
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
