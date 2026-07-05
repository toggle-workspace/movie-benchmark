import { fetchFinasBoxOffice, FINAS_YEARS } from "@/lib/finas"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table"

interface BoxOfficePageProps {
	searchParams: Promise<{ year?: string }>
}

export default async function BoxOfficePage({ searchParams }: BoxOfficePageProps) {
	const { year: yearParam } = await searchParams
	const year = yearParam ? Number(yearParam) : FINAS_YEARS[0]
	const films = await fetchFinasBoxOffice(year)

	return (
		<div className="space-y-6 max-w-5xl">
			<div className="flex flex-col gap-2">
				<h1 className="text-4xl font-bold tracking-tight">Malaysian Box Office</h1>
				<p className="text-muted-foreground text-lg">
					Data Kutipan Filem — Source: FINAS Wajib Tayang
				</p>
			</div>

			{/* Year selector */}
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
							<TableHead>Revenue</TableHead>
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
								<TableRow key={i}>
									<TableCell className="text-muted-foreground">{i + 1}</TableCell>
									<TableCell className="font-medium">{film.title}</TableCell>
									<TableCell className="text-muted-foreground text-sm">{film.producer}</TableCell>
									<TableCell className="text-muted-foreground">{film.releaseDate}</TableCell>
									<TableCell className="font-semibold">{film.revenue}</TableCell>
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
			</div>
		</div>
	)
}
