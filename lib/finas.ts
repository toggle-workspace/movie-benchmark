import { db } from "./db"
import { finasMovieArchive } from "./schema"
import { sql } from "drizzle-orm"

export interface FinasFilm {
	title: string
	year: number
	genreIds: number[]
	grossMYR: number
	admissions: number
	distributor: string
}

export async function getFinasFilms(genreId: number, releaseYear: number): Promise<FinasFilm[]> {
	const rows = await db
		.select()
		.from(finasMovieArchive)
		.where(sql`${finasMovieArchive.genreIds} @> ${JSON.stringify([genreId])}::json
			AND ABS(${finasMovieArchive.year} - ${releaseYear}) <= 5`)
	return rows.map(toFinasFilm)
}

export async function getAllFinasFilmsForGenre(genreId: number): Promise<FinasFilm[]> {
	const rows = await db
		.select()
		.from(finasMovieArchive)
		.where(sql`${finasMovieArchive.genreIds} @> ${JSON.stringify([genreId])}::json`)
	return rows.map(toFinasFilm)
}

function toFinasFilm(row: typeof finasMovieArchive.$inferSelect): FinasFilm {
	return {
		title: row.title,
		year: row.year,
		genreIds: row.genreIds as number[],
		grossMYR: Number(row.grossMYR),
		admissions: row.admissions,
		distributor: row.distributor,
	}
}
