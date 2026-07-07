import { config } from "dotenv"
config({ path: ".env.local" })

import { db } from "../lib/db"
import { finasMovieArchive } from "../lib/schema"
import { sql } from "drizzle-orm"

async function run() {
	const rows = await db
		.select()
		.from(finasMovieArchive)
		.where(sql`${finasMovieArchive.genreIds}::jsonb @> '[27]'::jsonb AND ABS(${finasMovieArchive.year} - 2022) <= 5`)
	console.log("rows:", rows.length)
	console.log(rows)
}

run().catch((e) => { console.error(e.message); process.exit(1) })
