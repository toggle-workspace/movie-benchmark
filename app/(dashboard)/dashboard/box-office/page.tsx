import { db } from "@/lib/db"
import { finasMovieArchive } from "@/lib/schema"
import { eq, desc } from "drizzle-orm"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table"
import { YearSelect } from "./year-select"

const FINAS_YEARS = [2022, 2020, 2019, 2018, 2017, 2016, 2015, 2014, 2013, 2012, 2011, 2009, 2006]

function fmt(n: number): string {
	if (n >= 1_000_000) return `RM ${(n / 1_000_000).toFixed(1)}M`
	if (n >= 1_000) return `RM ${(n / 1_000).toFixed(0)}K`
	return `RM ${n.toLocaleString()}`
}

interface BoxOfficePageProps {
	searchParams: Promise<{ year?: string }>
}

export default async function BoxOfficePage({ searchParams }: BoxOfficePageProps) {
	const { year: yearParam } = await searchParams
	const year = yearParam ? Number(yearParam) : FINAS_YEARS[0]

	const films = await db
		.select()
		.from(finasMovieArchive)
		.where(eq(finasMovieArchive.year, year))
		.orderBy(desc(finasMovieArchive.grossMYR))

	return (
		<div className="space-y-6 max-w-5xl">
			<div className="flex flex-col gap-2">
				<h1 className="text-4xl font-bold tracking-tight">Malaysian Box Office</h1>
				<p className="text-muted-foreground text-lg">
					FINAS Archive — Historical Malaysian box office data
				</p>
			</div>

			<div className="flex items-center gap-3">
				<span className="text-sm font-medium text-muted-foreground">Year:</span>
				<YearSelect years={FINAS_YEARS} current={year} />
			</div>

			<div className="rounded-md border overflow-x-auto">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead className="w-12">#</TableHead>
							<TableHead>Film Title</TableHead>
							<TableHead>Distributor</TableHead>
							<TableHead>Gross (MYR)</TableHead>
							<TableHead>Admissions</TableHead>
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
									<TableCell className="text-muted-foreground text-sm">{film.distributor}</TableCell>
									<TableCell className="font-semibold">{fmt(Number(film.grossMYR))}</TableCell>
									<TableCell className="text-muted-foreground">{film.admissions.toLocaleString()}</TableCell>
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
			</div>
		</div>
	)
}
