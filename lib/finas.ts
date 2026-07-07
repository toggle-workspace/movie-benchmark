import * as cheerio from "cheerio"
import { Agent } from "undici"

// ponytail: FINAS has an invalid SSL cert — disable verification for this one fetch
const insecureAgent = new Agent({ connect: { rejectUnauthorized: false } })

export type FinasFilm = {
	title: string
	producer: string
	releaseDate: string
	revenue: string
}

export async function fetchFinasBoxOffice(year?: number): Promise<FinasFilm[]> {
	const url = new URL("https://www.finas.gov.my/industry/box-office")
	if (year) url.searchParams.set("year", String(year))

	let res: Response
	try {
		res = await fetch(url.toString(), {
				// @ts-expect-error undici dispatcher not in fetch types
				dispatcher: insecureAgent,
				next: { revalidate: 86400 },
			})
	} catch {
		return []
	}
	if (!res.ok) return []

	const html = await res.text()
	const $ = cheerio.load(html)
	const films: FinasFilm[] = []

	$(".film-row").each((_, el) => {
		const cells = $(el).children("div")
		const title = cells.eq(1).text().trim()
		const producer = cells.eq(2).text().trim()
		const releaseDate = cells.eq(3).text().trim()
		const revenue = cells.eq(4).text().trim()
		if (title) films.push({ title, producer, releaseDate, revenue })
	})

	return films
}

export const FINAS_YEARS = [2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017]
