import { config } from "dotenv"
config({ path: ".env.local" })

import { execSync } from "child_process"
import { writeFileSync, unlinkSync } from "fs"
import { tmpdir } from "os"
import { join } from "path"
import { db } from "../lib/db"
import { finasMovieArchive } from "../lib/schema"
import { sql } from "drizzle-orm"

const YEARS = [2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026]
const PDF_URL = (year: number) =>
	`https://wajibtayang.finas.gov.my/ms/pdf_kutipan.php?year=${year}`

// ponytail: ANCHOR matches row# + date, then lazily captures content, then extracts numeric tail
const ANCHOR_RE =
	/^(\s*\d+\.\s+\d{2}\.\d{2}\.\d{4}\s*)(.+?)\s+(\d{1,3})\s+(\d[\d,]*)\s+([\d,]+\.\d{2})\s+(SELESAI|SEDANG) TAYANGAN\s*$/
const DATE_RE = /(\d{2})\.(\d{2})\.(\d{4})/
const HEADER_RE =
	/^(NO|TARIKH|JUDUL FILEM|PENGELUAR|JUMLAH|JUALAN|MULA|HARI|PENONTON|STATUS|TAYANGAN FILEM|Data dijana|BAGI TAHUN|KESELURUHAN)/i
const FOOTER_RE = /JUMLAH KESELURUHAN/i

interface FilmRecord {
	id: string
	title: string
	year: number
	distributor: string
	grossMYR: string
	admissions: number
	genreIds: number[]
}

function makeId(title: string, year: number): string {
	const slug = title
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "")
	return `${year}-${slug}`
}

// Split a line into [titleFragment, distributorFragment] using 4+ spaces as column separator.
// Lines starting with >35 leading spaces are distributor-only (based on PDF layout analysis).
function splitLineContent(line: string): [string, string] {
	const stripped = line.trimStart()
	const leading = line.length - stripped.length
	if (!stripped) return ["", ""]
	const fourSpaceIdx = stripped.search(/\s{4,}/)
	if (fourSpaceIdx !== -1) {
		return [stripped.slice(0, fourSpaceIdx).trim(), stripped.slice(fourSpaceIdx).trim()]
	}
	if (leading > 35) return ["", stripped]
	return [stripped, ""]
}

function parsePdfText(text: string, year: number): FilmRecord[] {
	// Treat form feeds as blank lines to prevent cross-page block bleeding
	const normalized = text.replace(/\f/g, "\n\n")
	const blocks = normalized.split(/\n\s*\n/)
	const records: FilmRecord[] = []

	for (const block of blocks) {
		const lines = block.split("\n")
		// Collect all anchor lines within this block
		const anchorLines: Array<{ idx: number; line: string; m: RegExpMatchArray }> = []
		for (let i = 0; i < lines.length; i++) {
			const m = lines[i].match(ANCHOR_RE)
			if (m) anchorLines.push({ idx: i, line: lines[i], m })
		}

		for (let ai = 0; ai < anchorLines.length; ai++) {
			const { idx, m } = anchorLines[ai]
			const content = m[2] // text between date and numeric tail
			const admissions = parseInt(m[4].replace(/,/g, ""), 10)
			const gross = parseFloat(m[5].replace(/,/g, ""))
			const dateMatch = m[1].match(DATE_RE)
			if (!dateMatch) continue
			const recordYear = parseInt(dateMatch[3], 10)

			// Block boundaries: between prev anchor + 1 and next anchor
			const blockStart = ai > 0 ? anchorLines[ai - 1].idx + 1 : 0
			const blockEnd = ai < anchorLines.length - 1 ? anchorLines[ai + 1].idx : lines.length

			const titleParts: string[] = []
			const distParts: string[] = []

			for (let li = blockStart; li < blockEnd; li++) {
				const line = lines[li]
				if (!line.trim()) continue
				if (HEADER_RE.test(line.trim()) || FOOTER_RE.test(line.trim())) continue

				if (line === anchorLines[ai].line) {
					const [t, d] = splitLineContent(content)
					if (t) titleParts.push(t)
					if (d) distParts.push(d)
				} else {
					const [t, d] = splitLineContent(line)
					if (t) titleParts.push(t)
					if (d) distParts.push(d)
				}
			}

			const title = titleParts.join(" ").replace(/\s+/g, " ").trim()
			const distributor = distParts.join(" ").replace(/\s+/g, " ").trim()

			if (!title) continue

			records.push({
				id: makeId(title, recordYear),
				title,
				year: recordYear,
				distributor,
				grossMYR: gross.toFixed(2),
				admissions,
				genreIds: [],
			})
		}
	}

	return records
}

async function scrapeYear(year: number): Promise<FilmRecord[]> {
	const url = PDF_URL(year)
	const res = await fetch(url)
	if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
	const buf = Buffer.from(await res.arrayBuffer())

	const tmpFile = join(tmpdir(), `finas-${year}-${Date.now()}.pdf`)
	writeFileSync(tmpFile, buf)

	let text: string
	try {
		text = execSync(`pdftotext -layout "${tmpFile}" -`, { encoding: "utf8" })
	} finally {
		unlinkSync(tmpFile)
	}

	return parsePdfText(text, year)
}

export async function scrapeAllYears(): Promise<{ inserted: number; skipped: number }> {
	let inserted = 0
	let skipped = 0

	for (const year of YEARS) {
		let records: FilmRecord[]
		try {
			records = await scrapeYear(year)
		} catch (e) {
			console.warn(`  [${year}] Failed to fetch/parse: ${e}`)
			continue
		}

		if (records.length === 0) {
			console.log(`  [${year}] No records found`)
			continue
		}

		// Upsert in batches of 50
		const BATCH = 50
		for (let i = 0; i < records.length; i += BATCH) {
			const batch = records.slice(i, i + BATCH)
			await db
				.insert(finasMovieArchive)
				.values(batch)
				.onConflictDoUpdate({
					target: finasMovieArchive.id,
					set: {
						grossMYR: sql`excluded.gross_myr`,
						admissions: sql`excluded.admissions`,
						distributor: sql`excluded.distributor`,
					},
				})
		}

		console.log(`  [${year}] ${records.length} records upserted`)
		inserted += records.length
	}

	return { inserted, skipped }
}

// CLI entrypoint
if (process.argv[1].endsWith("scrape-finas.ts")) {
	scrapeAllYears()
		.then(({ inserted }) => {
			console.log(`Done. ${inserted} total records processed.`)
			process.exit(0)
		})
		.catch((e) => {
			console.error(e)
			process.exit(1)
		})
}
