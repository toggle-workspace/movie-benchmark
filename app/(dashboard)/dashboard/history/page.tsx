"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { Trash2, ChevronRight, History } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog"
import type { MovieConcept } from "@/app/api/benchmark/route"

interface HistoryItem {
	id: string
	createdAt: string
	concept: MovieConcept
	result: { aggregate: number }
}

function scoreVariant(score: number): "default" | "secondary" | "destructive" {
	if (score >= 70) return "default"
	if (score >= 40) return "secondary"
	return "destructive"
}

export default function HistoryPage() {
	const [runs, setRuns] = useState<HistoryItem[]>([])
	const [loading, setLoading] = useState(true)
	const [deleting, setDeleting] = useState<string | null>(null)

	useEffect(() => {
		fetch("/api/benchmark/history")
			.then((r) => r.json())
			.then(setRuns)
			.catch(() => toast.error("Failed to load history"))
			.finally(() => setLoading(false))
	}, [])

	async function deleteRun(id: string) {
		setDeleting(id)
		const res = await fetch(`/api/benchmark/${id}`, { method: "DELETE" })
		if (res.ok) {
			setRuns((prev) => prev.filter((r) => r.id !== id))
			toast.success("Benchmark run deleted")
		} else {
			toast.error("Failed to delete run")
		}
		setDeleting(null)
	}

	return (
		<div className="space-y-6 max-w-4xl">
			<div className="flex flex-col gap-2">
				<h1 className="text-4xl font-bold tracking-tight">History</h1>
				<p className="text-muted-foreground text-lg">
					Your past movie benchmark runs.
				</p>
			</div>

			{loading ? (
				<div className="text-muted-foreground">Loading…</div>
			) : runs.length === 0 ? (
				<Card>
					<CardContent className="flex flex-col items-center justify-center py-12 gap-4">
						<History className="h-12 w-12 text-muted-foreground" />
						<p className="text-muted-foreground text-center">
							No benchmark runs yet.{" "}
							<Link href="/dashboard/benchmark" className="text-primary underline">
								Run your first benchmark
							</Link>
						</p>
					</CardContent>
				</Card>
			) : (
				<div className="space-y-3">
					{runs.map((run) => (
						<Card
							key={run.id}
							className="group hover:shadow-md transition-all duration-200"
						>
							<CardHeader className="pb-2">
								<div className="flex items-center justify-between gap-4">
									<div className="flex items-center gap-3 min-w-0">
										<div className="min-w-0">
											<CardTitle className="text-base font-semibold truncate">
												{run.concept.title}
											</CardTitle>
											<p className="text-sm text-muted-foreground">
												{run.concept.companyName} · {run.concept.releaseYear} ·{" "}
												{new Date(run.createdAt).toLocaleDateString()}
											</p>
										</div>
									</div>
									<div className="flex items-center gap-2 shrink-0">
										<Badge variant={scoreVariant(run.result.aggregate)}>
											{run.result.aggregate}/100
										</Badge>

										<Dialog>
											<DialogTrigger asChild>
												<Button
													variant="ghost"
													size="icon"
													className="opacity-0 group-hover:opacity-100 transition-opacity"
												>
													<Trash2 className="h-4 w-4" />
												</Button>
											</DialogTrigger>
											<DialogContent>
												<DialogHeader>
													<DialogTitle>Delete benchmark run?</DialogTitle>
													<DialogDescription>
														This will permanently delete the benchmark for &ldquo;{run.concept.title}&rdquo;. This action cannot be undone.
													</DialogDescription>
												</DialogHeader>
												<DialogFooter>
													<Button variant="outline">Cancel</Button>
													<Button
														variant="destructive"
														disabled={deleting === run.id}
														onClick={() => deleteRun(run.id)}
													>
														{deleting === run.id ? "Deleting…" : "Delete"}
													</Button>
												</DialogFooter>
											</DialogContent>
										</Dialog>

										<Link href={`/dashboard/results/${run.id}`}>
											<Button variant="ghost" size="icon">
												<ChevronRight className="h-4 w-4" />
											</Button>
										</Link>
									</div>
								</div>
							</CardHeader>
						</Card>
					))}
				</div>
			)}
		</div>
	)
}
