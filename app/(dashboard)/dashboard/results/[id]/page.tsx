import { notFound } from "next/navigation"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
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
import type { BenchmarkScores, ScoreResult } from "@/lib/scoring"
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
									<TableHead>Revenue (USD)</TableHead>
									<TableHead>Rating</TableHead>
									<TableHead>Votes</TableHead>
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
												? `$${film.revenue.toLocaleString()}`
												: "—"}
										</TableCell>
										<TableCell>{film.avgRating.toFixed(1)}</TableCell>
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
	const run = await db.benchmarkRun.findFirst({
		where: { id, userId: session.user.id },
	})

	if (!run) notFound()

	const concept = run.concept as unknown as MovieConcept
	const result = run.result as unknown as BenchmarkScores

	const dimensions: { key: keyof Omit<BenchmarkScores, "aggregate">; label: string }[] = [
		{ key: "revenuePotential", label: "Revenue Potential" },
		{ key: "audienceReception", label: "Audience Reception" },
		{ key: "regionalFit", label: "Regional Fit" },
		{ key: "trackRecord", label: "Production Company Track Record" },
		{ key: "globalCompetitiveness", label: "Global Competitiveness" },
	]

	return (
		<div className="space-y-6 max-w-4xl">
			<div className="flex flex-col gap-2">
				<h1 className="text-4xl font-bold tracking-tight">{concept.title}</h1>
				<p className="text-muted-foreground text-lg">
					Benchmark results — {concept.companyName} · {concept.releaseYear} · {concept.language}
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

			{/* Dimension score cards */}
			<div className="space-y-4">
				{dimensions.map(({ key, label }) => (
					<ScoreCard key={key} label={label} result={result[key]} />
				))}
			</div>
		</div>
	)
}
