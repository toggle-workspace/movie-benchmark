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

describe("scoreAudienceReception", () => {
	it("returns null when fewer than 3 films have vote_count >= 10", () => {
		const result = scoreAudienceReception([
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
		const result = scoreAudienceReception(films)
		expect(result.score).toBe(70)
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
		const result = scoreGlobalCompetitiveness([], [
			movie(),
			movie(),
			movie(),
		])
		expect(result.score).toBeNull()
	})

	it("returns 50 when regional avg equals global avg", () => {
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
		expect(scoreGlobalCompetitiveness(regional, global_).score).toBe(50)
	})
})

describe("scoreRevenuePotential", () => {
	it("returns null when no qualifying films have revenue > 0", () => {
		const films = [
			movie({ revenue: 0 }),
			movie({ revenue: 0 }),
			movie({ revenue: 0 }),
		]
		expect(scoreRevenuePotential(films).score).toBeNull()
	})

	it("returns 50 when no budget given (proxy = median)", () => {
		const films = [
			movie({ revenue: 2_000_000, vote_count: 50 }),
			movie({ revenue: 2_000_000, vote_count: 50 }),
			movie({ revenue: 2_000_000, vote_count: 50 }),
		]
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
		expect(computeAggregate(scores)).toBe(60)
	})
})
