import * as cheerio from "cheerio"
import { Agent } from "undici"
import { db } from "@/lib/db"
import { boxOfficeFilm } from "@/lib/schema"
import { eq } from "drizzle-orm"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table"

const FINAS_YEARS = [2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017]

// ponytail: FINAS has an invalid SSL cert — disable verification for this one fetch
const insecureAgent = new Agent({ connect: { rejectUnauthorized: false } })

function parseRevenue(raw: string): string {
	const m = raw.match(/([\d.]+)([MB])?/i)
	if (!m) return "0.00"
	let val = parseFloat(m[1])
	if (m[2]?.toUpperCase() === "M") val *= 1_000_000
	if (m[2]?.toUpperCase() === "B") val *= 1_000_000_000
	return val.toFixed(2)
}

function parseDate(raw: string): Date {
	const [dd, mm, yyyy] = raw.split(".")
	return new Date(`${yyyy}-${mm}-${dd}`)
}

async function syncAndGet(year: number) {
	const url = new URL("https://www.finas.gov.my/industry/box-office")
	url.searchParams.set("year", String(year))

	try {
		// @ts-expect-error undici dispatcher not in fetch types
		const res = await fetch(url.toString(), { dispatcher: insecureAgent })
		if (res.ok) {
			const $ = cheerio.load(await res.text())
			const rows: (typeof boxOfficeFilm.$inferInsert)[] = []

			$(".film-row").each((i, el) => {
				const cells = $(el).children("div")
				const title = cells.eq(1).text().trim()
				if (!title) return
				rows.push({
					id: `BOX-${year}-${String(i + 1).padStart(3, "0")}`,
					year,
					title,
					producer: cells.eq(2).text().trim(),
					releaseDate: parseDate(cells.eq(3).text().trim()),
					revenue: parseRevenue(cells.eq(4).text().trim()),
				})
			})

			if (rows.length > 0) {
				await db.insert(boxOfficeFilm).values(rows).onConflictDoUpdate({
					target: boxOfficeFilm.id,
					set: {
						title: boxOfficeFilm.title,
						producer: boxOfficeFilm.producer,
						releaseDate: boxOfficeFilm.releaseDate,
						revenue: boxOfficeFilm.revenue,
						fetchedAt: new Date(),
					},
				})
			}
		}
	} catch {
		// fall through to DB read
	}

	return db
		.select()
		.from(boxOfficeFilm)
		.where(eq(boxOfficeFilm.year, year))
		.orderBy(boxOfficeFilm.revenue)
		.then((rows) => rows.reverse())
}

interface BoxOfficePageProps {
	searchParams: Promise<{ year?: string }>
}

export default async function BoxOfficePage({ searchParams }: BoxOfficePageProps) {
	const { year: yearParam } = await searchParams
	const year = yearParam ? Number(yearParam) : FINAS_YEARS[0]
	const films = await syncAndGet(year)

	return (
		<div className="space-y-6 max-w-5xl">
			<div className="flex flex-col gap-2">
				<h1 className="text-4xl font-bold tracking-tight">Malaysian Box Office</h1>
				<p className="text-muted-foreground text-lg">
					Data Kutipan Filem — Source: FINAS Wajib Tayang
				</p>
			</div>

			<div className="flex items-center gap-3">
				<span className="text-sm font-medium text-muted-foreground">Year:</span>
				<div className="flex gap-2 flex-wrap">
					{FINAS_YEARS.map((y) => (
						<a
							key={y}
							href={`/dashboard/box-office?year=${y}`}
							className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
								y === year
									? "bg-primary text-primary-foreground"
									: "bg-muted text-muted-foreground hover:bg-muted/80"
							}`}
						>
							{y}
						</a>
					))}
				</div>
			</div>

			<div className="rounded-md border overflow-x-auto">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead className="w-12">#</TableHead>
							<TableHead>Film Title</TableHead>
							<TableHead>Producer</TableHead>
							<TableHead>Release Date</TableHead>
							<TableHead>Revenue (MYR)</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{films.length === 0 ? (
							<TableRow>
								<TableCell colSpan={5} className="text-center text-muted-foreground py-12">
									No data available for {year}.
								</TableCell>
							</TableRow>
						) : (
							films.map((film, i) => (
								<TableRow key={film.id}>
									<TableCell className="text-muted-foreground">{i + 1}</TableCell>
									<TableCell className="font-medium">{film.title}</TableCell>
									<TableCell className="text-muted-foreground text-sm">{film.producer}</TableCell>
									<TableCell className="text-muted-foreground">
										{film.releaseDate.toISOString().slice(0, 10)}
									</TableCell>
									<TableCell className="font-semibold">
										{Number(film.revenue).toLocaleString("en-MY", { minimumFractionDigits: 2 })}
									</TableCell>
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
			</div>
		</div>
	)
}
