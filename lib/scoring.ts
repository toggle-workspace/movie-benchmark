import type { TmdbMovie } from "./tmdb"
import type { FinasFilm } from "./finas"
import { getAllFinasFilmsForGenre } from "./finas"

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

export interface SalesSummary {
	grossRangeMin: number
	grossRangeMedian: number
	grossRangeMax: number
	breakEvenAdmissions: number | null
	topDistributors: string[]
	trend: "Growing" | "Stable" | "Declining"
}

export interface BenchmarkScores {
	malaysianBoxOffice: ScoreResult
	roiForecast: ScoreResult
	genreMomentum: ScoreResult
	audienceAppeal: ScoreResult
	globalCompetitiveness: ScoreResult
	salesSummary: SalesSummary
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

function toFinasComparison(f: FinasFilm): ComparisonFilm {
	return {
		title: f.title,
		country: "MY",
		releaseYear: f.year,
		revenue: f.grossMYR,
		avgRating: 0,
		voteCount: f.admissions,
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

// RM 15 average cinema ticket price in Malaysia
const AVG_TICKET_MYR = 15

export function scoreMalaysianBoxOffice(
	finasFilms: FinasFilm[],
	budgetMYR?: number,
): ScoreResult {
	if (finasFilms.length < 3) {
		return {
			score: null,
			label: "Malaysian Box Office",
			description: "Insufficient Malaysian film data for this genre/year window",
			films: finasFilms.map(toFinasComparison),
		}
	}

	const grossValues = finasFilms.map((f) => f.grossMYR)
	const medianGross = median(grossValues)
	const proxy = budgetMYR ?? medianGross
	const score = Math.min(100, Math.round((proxy / medianGross) * 50))

	const minGross = Math.min(...grossValues)
	const maxGross = Math.max(...grossValues)

	return {
		score,
		label: "Malaysian Box Office",
		description: `Comparable MY films grossed RM ${(minGross / 1_000_000).toFixed(1)}M – RM ${(maxGross / 1_000_000).toFixed(1)}M (median RM ${(medianGross / 1_000_000).toFixed(1)}M)`,
		films: [...finasFilms].sort((a, b) => b.grossMYR - a.grossMYR).slice(0, 10).map(toFinasComparison),
	}
}

export function scoreRoiForecast(
	finasFilms: FinasFilm[],
	budgetMYR?: number,
): ScoreResult {
	if (!budgetMYR || finasFilms.length < 3) {
		return {
			score: null,
			label: "ROI Forecast",
			description: budgetMYR ? "Insufficient Malaysian film data for ROI estimate" : "Enter a budget to see ROI forecast",
			films: [],
		}
	}

	const medianGross = median(finasFilms.map((f) => f.grossMYR))
	const roi = medianGross / budgetMYR
	const score = Math.min(100, Math.round(roi * 33))

	return {
		score,
		label: "ROI Forecast",
		description: `At RM ${(budgetMYR / 1_000_000).toFixed(1)}M budget, comparable films suggest ~${roi.toFixed(1)}x return (median gross RM ${(medianGross / 1_000_000).toFixed(1)}M)`,
		films: [],
	}
}

export function scoreGenreMomentum(
	genreId: number,
	releaseYear: number,
): ScoreResult {
	const allGenreFilms = getAllFinasFilmsForGenre(genreId)
	const recent = allGenreFilms.filter((f) => f.year >= releaseYear - 5 && f.year < releaseYear).length
	const prior = allGenreFilms.filter((f) => f.year >= releaseYear - 10 && f.year < releaseYear - 5).length

	const trend: "Growing" | "Stable" | "Declining" =
		recent > prior * 1.2 ? "Growing" : recent < prior * 0.8 ? "Declining" : "Stable"

	const score = Math.min(100, Math.round((recent / Math.max(prior, 1)) * 50))

	return {
		score,
		label: "Genre Momentum",
		description: `${recent} MY releases in last 5 years vs ${prior} in prior 5 years — ${trend}`,
		films: allGenreFilms.slice(0, 10).map(toFinasComparison),
	}
}

export function scoreAudienceAppeal(regionalFilms: TmdbMovie[]): ScoreResult {
	const qualifying = regionalFilms.filter((f) => f.vote_count >= 10)

	if (qualifying.length < 3) {
		return {
			score: null,
			label: "Audience Appeal",
			description: "Insufficient regional audience data",
			films: regionalFilms.slice(0, 10).map(toComparison),
		}
	}

	const avgVote = avg(qualifying.map((f) => f.vote_average))
	const score = Math.round((avgVote / 10) * 100)

	return {
		score,
		label: "Audience Appeal",
		description: `Regional audience average: ${avgVote.toFixed(1)}/10 across MY/ID/TH`,
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
	const score = Math.min(100, Math.round((regionalAvg / globalAvg) * 100))

	return {
		score,
		label: "Global Competitiveness",
		description: `Regional avg ${regionalAvg.toFixed(1)} vs global avg ${globalAvg.toFixed(1)}`,
		films: globalFilms.slice(0, 10).map(toComparison),
	}
}

export function computeSalesSummary(
	finasFilms: FinasFilm[],
	genreId: number,
	releaseYear: number,
	budgetMYR?: number,
): SalesSummary {
	const grossValues = finasFilms.map((f) => f.grossMYR)

	const distributorCounts = finasFilms.reduce<Record<string, number>>((acc, f) => {
		acc[f.distributor] = (acc[f.distributor] ?? 0) + 1
		return acc
	}, {})
	const topDistributors = Object.entries(distributorCounts)
		.sort((a, b) => b[1] - a[1])
		.slice(0, 3)
		.map(([name]) => name)

	const allGenreFilms = getAllFinasFilmsForGenre(genreId)
	const recent = allGenreFilms.filter((f) => f.year >= releaseYear - 5 && f.year < releaseYear).length
	const prior = allGenreFilms.filter((f) => f.year >= releaseYear - 10 && f.year < releaseYear - 5).length
	const trend: "Growing" | "Stable" | "Declining" =
		recent > prior * 1.2 ? "Growing" : recent < prior * 0.8 ? "Declining" : "Stable"

	return {
		grossRangeMin: grossValues.length ? Math.min(...grossValues) : 0,
		grossRangeMedian: grossValues.length ? median(grossValues) : 0,
		grossRangeMax: grossValues.length ? Math.max(...grossValues) : 0,
		breakEvenAdmissions: budgetMYR ? Math.ceil(budgetMYR / AVG_TICKET_MYR) : null,
		topDistributors,
		trend,
	}
}

export function computeAggregate(
	scores: Pick<BenchmarkScores, "malaysianBoxOffice" | "roiForecast" | "genreMomentum" | "audienceAppeal" | "globalCompetitiveness">,
): number {
	const values = [
		scores.malaysianBoxOffice.score,
		scores.roiForecast.score,
		scores.genreMomentum.score,
		scores.audienceAppeal.score,
		scores.globalCompetitiveness.score,
	].filter((s): s is number => s !== null)

	if (!values.length) return 0
	return Math.round(avg(values))
}
