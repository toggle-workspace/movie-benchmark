import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { benchmarkRun } from "@/lib/schema"
import { headers } from "next/headers"
import { fetchRegionalFilms, fetchGlobalFilms, enrichWithRevenue } from "@/lib/tmdb"
import {
	scoreMalaysianBoxOffice,
	scoreRoiForecast,
	scoreGenreMomentum,
	scoreAudienceAppeal,
	scoreGlobalCompetitiveness,
	computeSalesSummary,
	computeAggregate,
} from "@/lib/scoring"
import { getFinasFilms } from "@/lib/finas"

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

	const [regionalFilms, globalFilms, finasFilms] = await Promise.all([
		fetchRegionalFilms(concept.genreId, concept.releaseYear),
		fetchGlobalFilms(concept.genreId, concept.releaseYear),
		Promise.resolve(getFinasFilms(concept.genreId, concept.releaseYear)),
	])

	const enrichedRegional = await enrichWithRevenue(regionalFilms)

	const malaysianBoxOffice = scoreMalaysianBoxOffice(finasFilms, concept.budgetMYR)
	const roiForecast = scoreRoiForecast(finasFilms, concept.budgetMYR)
	const genreMomentum = scoreGenreMomentum(concept.genreId, concept.releaseYear)
	const audienceAppeal = scoreAudienceAppeal(enrichedRegional)
	const globalCompetitiveness = scoreGlobalCompetitiveness(regionalFilms, globalFilms)
	const salesSummary = computeSalesSummary(finasFilms, concept.genreId, concept.releaseYear, concept.budgetMYR)

	const dimensionScores = { malaysianBoxOffice, roiForecast, genreMomentum, audienceAppeal, globalCompetitiveness }
	const aggregate = computeAggregate(dimensionScores)

	const result = { ...dimensionScores, salesSummary, aggregate }

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
