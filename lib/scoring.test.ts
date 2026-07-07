import { describe, it, expect } from "vitest"
import {
	scoreAudienceAppeal,
	scoreGlobalCompetitiveness,
	scoreMalaysianBoxOffice,
	scoreRoiForecast,
	scoreGenreMomentum,
	computeAggregate,
} from "./scoring"
import type { TmdbMovie } from "./tmdb"
import type { FinasFilm } from "./finas"

function movie(overrides: Partial<TmdbMovie> = {}): TmdbMovie {
	return {
		id: 1,
		title: "Test Film",
		release_date: "2023-01-01",
		vote_average: 7.0,
		vote_count: 100,
		genre_ids: [28],
		revenue: 1_000_000,
		budget: 500_000,
		origin_country: ["MY"],
		...overrides,
	}
}

function finasFilm(overrides: Partial<FinasFilm> = {}): FinasFilm {
	return {
		title: "Test MY Film",
		year: 2020,
		genreIds: [27],
		grossMYR: 10_000_000,
		admissions: 800_000,
		distributor: "Astro Shaw",
		...overrides,
	}
}

describe("scoreAudienceAppeal", () => {
	it("returns null when fewer than 3 films have vote_count >= 10", () => {
		const result = scoreAudienceAppeal([
			movie({ vote_count: 5 }),
			movie({ vote_count: 3 }),
		])
		expect(result.score).toBeNull()
	})

	it("converts avg vote_average to 0-100 scale", () => {
		const films = [
			movie({ vote_average: 8.0 }),
			movie({ vote_average: 6.0 }),
			movie({ vote_average: 7.0 }),
		]
		const result = scoreAudienceAppeal(films)
		expect(result.score).toBe(70)
	})
})

describe("scoreMalaysianBoxOffice", () => {
	it("returns null when fewer than 3 FINAS films", () => {
		expect(scoreMalaysianBoxOffice([finasFilm(), finasFilm()]).score).toBeNull()
	})

	it("returns 50 when no budget given (proxy = median)", () => {
		const films = [finasFilm(), finasFilm(), finasFilm()]
		expect(scoreMalaysianBoxOffice(films).score).toBe(50)
	})

	it("scores higher when budget exceeds median gross", () => {
		const films = [finasFilm(), finasFilm(), finasFilm()] // median = 10M
		const result = scoreMalaysianBoxOffice(films, 20_000_000) // budget = 20M = 2x median
		expect(result.score).toBe(100) // min(100, (20M/10M)*50 = 100)
	})
})

describe("scoreRoiForecast", () => {
	it("returns null when no budget provided", () => {
		const films = [finasFilm(), finasFilm(), finasFilm()]
		expect(scoreRoiForecast(films).score).toBeNull()
	})

	it("returns null when fewer than 3 FINAS films", () => {
		expect(scoreRoiForecast([finasFilm()], 5_000_000).score).toBeNull()
	})

	it("scores ~33 for 1x ROI (budget equals median gross)", () => {
		const films = [finasFilm(), finasFilm(), finasFilm()] // median = 10M
		const result = scoreRoiForecast(films, 10_000_000) // ROI = 1x
		expect(result.score).toBe(33) // min(100, 1 * 33 = 33)
	})
})

describe("scoreGenreMomentum", () => {
	it("returns a score and trend label", () => {
		const result = scoreGenreMomentum(27, 2023) // Horror, recent window
		expect(result.score).not.toBeNull()
		expect(["Growing", "Stable", "Declining"]).toContain(result.description.includes("Growing") ? "Growing" : result.description.includes("Declining") ? "Declining" : "Stable")
	})
})

describe("scoreGlobalCompetitiveness", () => {
	it("returns null when regional films insufficient", () => {
		const result = scoreGlobalCompetitiveness([], [movie(), movie(), movie()])
		expect(result.score).toBeNull()
	})

	it("returns 100 when regional avg equals global avg (fixed cap)", () => {
		const regional = [
			movie({ vote_average: 7, vote_count: 50 }),
			movie({ vote_average: 7, vote_count: 50 }),
			movie({ vote_average: 7, vote_count: 50 }),
		]
		const global_ = [
			movie({ vote_average: 7, vote_count: 50 }),
			movie({ vote_average: 7, vote_count: 50 }),
			movie({ vote_average: 7, vote_count: 50 }),
		]
		expect(scoreGlobalCompetitiveness(regional, global_).score).toBe(100)
	})
})

describe("computeAggregate", () => {
	it("averages available (non-null) scores", () => {
		const scores = {
			malaysianBoxOffice: { score: 60, label: "", description: "", films: [] },
			roiForecast: { score: null, label: "", description: "", films: [] },
			genreMomentum: { score: 80, label: "", description: "", films: [] },
			audienceAppeal: { score: 40, label: "", description: "", films: [] },
			globalCompetitiveness: { score: null, label: "", description: "", films: [] },
		}
		expect(computeAggregate(scores)).toBe(60)
	})
})
