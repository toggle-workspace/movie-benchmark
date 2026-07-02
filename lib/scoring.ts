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

function toComparison(m: TmdbMovie): ComparisonFilm {
	return {
		title: m.title,
		country: m.origin_country?.[0] ?? "Unknown",
		releaseYear: Number(m.release_date?.slice(0, 4) ?? 0),
		revenue: m.revenue ?? 0,
		avgRating: m.vote_average,
		voteCount: m.vote_count,
	}
}

function median(nums: number[]): number {
	if (!nums.length) return 0
	const sorted = [...nums].sort((a, b) => a - b)
	const mid = Math.floor(sorted.length / 2)
	return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

function avg(nums: number[]): number {
	if (!nums.length) return 0
	return nums.reduce((s, n) => s + n, 0) / nums.length
}

export function scoreRevenuePotential(
	regionalFilms: TmdbMovie[],
	budgetUSD?: number,
): ScoreResult {
	const withRevenue = regionalFilms.filter((f) => (f.revenue ?? 0) > 0)

	if (withRevenue.length < 3) {
		return {
			score: null,
			label: "Revenue Potential",
			description: "Insufficient regional revenue data",
			films: regionalFilms.slice(0, 10).map(toComparison),
		}
	}

	const medianRevenue = median(withRevenue.map((f) => f.revenue))
	const proxy = budgetUSD ?? medianRevenue
	const score = Math.min(100, Math.round((proxy / medianRevenue) * 50))

	return {
		score,
		label: "Revenue Potential",
		description: `Based on median regional revenue of $${medianRevenue.toLocaleString()}`,
		films: withRevenue.slice(0, 10).map(toComparison),
	}
}

export function scoreAudienceReception(regionalFilms: TmdbMovie[]): ScoreResult {
	const qualifying = regionalFilms.filter((f) => f.vote_count >= 10)

	if (qualifying.length < 3) {
		return {
			score: null,
			label: "Audience Reception",
			description: "Insufficient regional ratings data",
			films: regionalFilms.slice(0, 10).map(toComparison),
		}
	}

	const avgVote = avg(qualifying.map((f) => f.vote_average))
	const score = Math.round((avgVote / 10) * 100)

	return {
		score,
		label: "Audience Reception",
		description: `Regional average rating: ${avgVote.toFixed(1)}/10`,
		films: qualifying.slice(0, 10).map(toComparison),
	}
}

export function scoreRegionalFit(regionalFilms: TmdbMovie[]): ScoreResult {
	const count = regionalFilms.length
	const score = Math.min(100, count * 10)

	return {
		score,
		label: "Regional Fit",
		description: `${count} comparable films found in MY/ID/TH`,
		films: regionalFilms.slice(0, 10).map(toComparison),
	}
}

export function scoreTrackRecord(companyFilms: TmdbMovie[]): ScoreResult {
	const qualifying = companyFilms.filter((f) => f.vote_count >= 10)

	if (qualifying.length < 3) {
		return {
			score: null,
			label: "Production Company Track Record",
			description: "Insufficient company filmography data",
			films: companyFilms.slice(0, 10).map(toComparison),
		}
	}

	const avgVote = avg(qualifying.map((f) => f.vote_average))
	const score = Math.round((avgVote / 10) * 100)

	return {
		score,
		label: "Production Company Track Record",
		description: `Company average rating: ${avgVote.toFixed(1)}/10 across ${qualifying.length} films`,
		films: qualifying.slice(0, 10).map(toComparison),
	}
}

export function scoreGlobalCompetitiveness(
	regionalFilms: TmdbMovie[],
	globalFilms: TmdbMovie[],
): ScoreResult {
	const regionalQualifying = regionalFilms.filter((f) => f.vote_count >= 10)
	const globalQualifying = globalFilms.filter((f) => f.vote_count >= 10)

	if (regionalQualifying.length < 3 || globalQualifying.length < 3) {
		return {
			score: null,
			label: "Global Competitiveness",
			description: "Insufficient data for global comparison",
			films: globalFilms.slice(0, 10).map(toComparison),
		}
	}

	const regionalAvg = avg(regionalQualifying.map((f) => f.vote_average))
	const globalAvg = avg(globalQualifying.map((f) => f.vote_average))
	const score = Math.min(100, Math.round((regionalAvg / globalAvg) * 50))

	return {
		score,
		label: "Global Competitiveness",
		description: `Regional avg ${regionalAvg.toFixed(1)} vs global avg ${globalAvg.toFixed(1)}`,
		films: globalFilms.slice(0, 10).map(toComparison),
	}
}

export function computeAggregate(
	scores: Omit<BenchmarkScores, "aggregate">,
): number {
	const values = Object.values(scores)
		.map((r) => r.score)
		.filter((s): s is number => s !== null)

	if (!values.length) return 0
	return Math.round(avg(values))
}
