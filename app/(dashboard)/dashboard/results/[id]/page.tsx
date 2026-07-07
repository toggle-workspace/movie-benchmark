import { notFound } from "next/navigation"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { benchmarkRun } from "@/lib/schema"
import { and, eq } from "drizzle-orm"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table"
import type { BenchmarkScores, ScoreResult, SalesSummary } from "@/lib/scoring"
import type { MovieConcept } from "@/app/api/benchmark/route"

interface ResultPageProps {
	params: Promise<{ id: string }>
}

function scoreColor(score: number | null): string {
	if (score === null) return "secondary"
	if (score >= 70) return "default"
	if (score >= 40) return "outline"
	return "destructive"
}

function trendColor(trend: SalesSummary["trend"]): "default" | "secondary" | "destructive" {
	if (trend === "Growing") return "default"
	if (trend === "Stable") return "secondary"
	return "destructive"
}

function fmt(n: number): string {
	if (n >= 1_000_000) return `RM ${(n / 1_000_000).toFixed(1)}M`
	if (n >= 1_000) return `RM ${(n / 1_000).toFixed(0)}K`
	return `RM ${n.toLocaleString()}`
}

function SalesSummaryCard({ summary }: { summary: SalesSummary }) {
	return (
		<Card className="border-2 bg-muted/30">
			<CardHeader className="pb-2">
				<div className="flex items-center justify-between">
					<CardTitle className="text-xl">Sales Intelligence</CardTitle>
					<Badge variant={trendColor(summary.trend)}>{summary.trend}</Badge>
				</div>
			</CardHeader>
			<CardContent>
				<div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
					<div>
						<p className="text-xs text-muted-foreground uppercase tracking-wide">Gross Range (MY)</p>
						{summary.grossRangeMin > 0 ? (
							<p className="text-sm font-semibold mt-1">
								{fmt(summary.grossRangeMin)} – {fmt(summary.grossRangeMax)}
							</p>
						) : (
							<p className="text-sm text-muted-foreground mt-1">No data</p>
						)}
						{summary.grossRangeMedian > 0 && (
							<p className="text-xs text-muted-foreground">median {fmt(summary.grossRangeMedian)}</p>
						)}
					</div>
					<div>
						<p className="text-xs text-muted-foreground uppercase tracking-wide">Break-Even</p>
						{summary.breakEvenAdmissions ? (
							<>
								<p className="text-sm font-semibold mt-1">{summary.breakEvenAdmissions.toLocaleString()}</p>
								<p className="text-xs text-muted-foreground">admissions @ RM 15/ticket</p>
							</>
						) : (
							<p className="text-sm text-muted-foreground mt-1">Enter budget</p>
						)}
					</div>
					<div>
						<p className="text-xs text-muted-foreground uppercase tracking-wide">Genre Trend (MY)</p>
						<p className="text-sm font-semibold mt-1">{summary.trend}</p>
					</div>
					<div>
						<p className="text-xs text-muted-foreground uppercase tracking-wide">Top Distributors</p>
						{summary.topDistributors.length > 0 ? (
							<ul className="text-sm mt-1 space-y-0.5">
								{summary.topDistributors.map((d) => (
									<li key={d} className="truncate">{d}</li>
								))}
							</ul>
						) : (
							<p className="text-sm text-muted-foreground mt-1">No data</p>
						)}
					</div>
				</div>
			</CardContent>
		</Card>
	)
}

function ScoreCard({ label, result }: { label: string; result: ScoreResult }) {
	return (
		<Card>
			<CardHeader className="pb-2">
				<div className="flex items-center justify-between">
					<CardTitle className="text-base font-medium">{label}</CardTitle>
					<Badge variant={scoreColor(result.score) as "default" | "secondary" | "outline" | "destructive"}>
						{result.score !== null ? `${result.score}/100` : "N/A"}
					</Badge>
				</div>
				<p className="text-sm text-muted-foreground">{result.description}</p>
			</CardHeader>
			<CardContent className="space-y-4">
				{result.score !== null && (
					<Progress value={result.score} className="h-2" />
				)}
				{result.films.length > 0 && (
					<div className="rounded-md border overflow-x-auto">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Title</TableHead>
									<TableHead>Country</TableHead>
									<TableHead>Year</TableHead>
									<TableHead>Revenue</TableHead>
									<TableHead>Rating</TableHead>
									<TableHead>Admissions / Votes</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{result.films.map((film, i) => (
									<TableRow key={i}>
										<TableCell className="font-medium">{film.title}</TableCell>
										<TableCell>{film.country}</TableCell>
										<TableCell>{film.releaseYear}</TableCell>
										<TableCell>
											{film.revenue > 0
												? `${film.country === "MY" ? "RM" : "$"}${film.revenue.toLocaleString()}`
												: "—"}
										</TableCell>
										<TableCell>{film.avgRating > 0 ? film.avgRating.toFixed(1) : "—"}</TableCell>
										<TableCell>{film.voteCount.toLocaleString()}</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>
				)}
			</CardContent>
		</Card>
	)
}

export default async function ResultsPage({ params }: ResultPageProps) {
	const session = await auth.api.getSession({ headers: await headers() })
	if (!session) redirect("/login")

	const { id } = await params
	const [run] = await db
		.select()
		.from(benchmarkRun)
		.where(and(eq(benchmarkRun.id, id), eq(benchmarkRun.userId, session.user.id)))

	if (!run) notFound()

	const concept = run.concept as unknown as MovieConcept
	const result = run.result as unknown as BenchmarkScores

	const dimensions: { key: keyof Omit<BenchmarkScores, "aggregate" | "salesSummary">; label: string }[] = [
		{ key: "malaysianBoxOffice", label: "Malaysian Box Office" },
		{ key: "roiForecast", label: "ROI Forecast" },
		{ key: "genreMomentum", label: "Genre Momentum" },
		{ key: "audienceAppeal", label: "Audience Appeal" },
		{ key: "globalCompetitiveness", label: "Global Competitiveness" },
	]

	return (
		<div className="space-y-6 max-w-4xl">
			<div className="flex flex-col gap-2">
				<h1 className="text-4xl font-bold tracking-tight">{concept.title}</h1>
				<p className="text-muted-foreground text-lg">
					Benchmark results — {concept.releaseYear} · {concept.language}
				</p>
			</div>

			{/* Aggregate */}
			<Card className="border-2">
				<CardHeader className="pb-2">
					<div className="flex items-center justify-between">
						<CardTitle className="text-xl">Aggregate Score</CardTitle>
						<span className="text-5xl font-bold tabular-nums">{result.aggregate}</span>
					</div>
				</CardHeader>
				<CardContent>
					<Progress value={result.aggregate} className="h-4 rounded-full" />
					<p className="text-sm text-muted-foreground mt-2">
						Arithmetic mean of all available dimension scores.
					</p>
				</CardContent>
			</Card>

			{/* Sales Summary */}
			{result.salesSummary && <SalesSummaryCard summary={result.salesSummary} />}

			{/* Dimension score cards */}
			<div className="space-y-4">
				{dimensions
					.filter(({ key }) => result[key] != null)
					.map(({ key, label }) => (
						<ScoreCard key={key} label={label} result={result[key] as ScoreResult} />
					))}
			</div>
		</div>
	)
}
