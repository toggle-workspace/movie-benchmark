"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { Clapperboard, Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card"
import { TMDB_GENRES } from "@/lib/tmdb"

const formSchema = z.object({
	title: z.string().min(1, "Title is required"),
	genreId: z.coerce.number().int().positive("Genre is required"),
	releaseYear: z.coerce
		.number()
		.int()
		.min(2020)
		.max(2035, "Release year must be between 2020 and 2035"),
	companyId: z.coerce.number().int().positive("Select a production company"),
	companyName: z.string().min(1),
	director: z.string().optional(),
	cast: z.string().optional(),
	budgetMYR: z.coerce.number().optional(),
	synopsis: z.string().optional(),
	audience: z.enum(["General", "Family", "Teen", "Adult"]),
	language: z.enum(["Malay", "English", "Mandarin", "Tamil", "Other"]),
	platform: z.enum(["Cinema", "Streaming", "Both"]),
})

type FormValues = z.infer<typeof formSchema>

interface CompanyOption {
	id: number
	name: string
}

export default function BenchmarkPage() {
	const router = useRouter()
	const [companySearch, setCompanySearch] = useState("")
	const [companies, setCompanies] = useState<CompanyOption[]>([])
	const [searching, setSearching] = useState(false)

	const form = useForm<FormValues>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			title: "",
			releaseYear: new Date().getFullYear() + 1,
			companyName: "",
			audience: "General",
			language: "Malay",
			platform: "Cinema",
		},
	})

	async function searchCompanies() {
		if (companySearch.length < 2) return
		setSearching(true)
		try {
			const res = await fetch(`/api/company-search?q=${encodeURIComponent(companySearch)}`)
			const data = await res.json()
			setCompanies(data)
		} catch {
			toast.error("Failed to search companies")
		} finally {
			setSearching(false)
		}
	}

	function selectCompany(company: CompanyOption) {
		form.setValue("companyId", company.id)
		form.setValue("companyName", company.name)
		setCompanySearch(company.name)
		setCompanies([])
	}

	async function onSubmit(values: FormValues) {
		const res = await fetch("/api/benchmark", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(values),
		})

		if (!res.ok) {
			toast.error("Benchmark failed. Please try again.")
			return
		}

		const { id } = await res.json()
		router.push(`/dashboard/results/${id}`)
	}

	return (
		<div className="space-y-6 max-w-3xl">
			<div className="flex flex-col gap-2">
				<h1 className="text-4xl font-bold tracking-tight">Movie Benchmark</h1>
				<p className="text-muted-foreground text-lg">
					Enter your movie concept to get data-driven benchmark scores.
				</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Clapperboard className="h-5 w-5" />
						Movie Concept
					</CardTitle>
					<CardDescription>
						Fill in the details about your film concept to start benchmarking.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Form {...form}>
						<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
							{/* Basic Info */}
							<div className="grid gap-4 md:grid-cols-2">
								<FormField
									control={form.control}
									name="title"
									render={({ field }) => (
										<FormItem className="md:col-span-2">
											<FormLabel>Movie Title</FormLabel>
											<FormControl>
												<Input placeholder="Enter your movie title" {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="genreId"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Primary Genre</FormLabel>
											<Select
												onValueChange={field.onChange}
												value={field.value?.toString()}
											>
												<FormControl>
													<SelectTrigger>
														<SelectValue placeholder="Select a genre" />
													</SelectTrigger>
												</FormControl>
												<SelectContent>
													{Object.entries(TMDB_GENRES).map(([id, name]) => (
														<SelectItem key={id} value={id}>
															{name}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="releaseYear"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Planned Release Year</FormLabel>
											<FormControl>
												<Input type="number" placeholder="2026" {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>

							{/* Company Search */}
							<div className="space-y-2">
								<FormLabel>Production Company</FormLabel>
								<div className="flex gap-2">
									<Input
										placeholder="Search TMDB for your company…"
										value={companySearch}
										onChange={(e) => setCompanySearch(e.target.value)}
										onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), searchCompanies())}
									/>
									<Button
										type="button"
										variant="outline"
										onClick={searchCompanies}
										disabled={searching}
									>
										<Search className="h-4 w-4" />
									</Button>
								</div>
								{form.formState.errors.companyId && (
									<p className="text-sm font-medium text-destructive">
										{form.formState.errors.companyId.message}
									</p>
								)}
								{companies.length > 0 && (
									<div className="rounded-md border divide-y">
										{companies.map((c) => (
											<button
												key={c.id}
												type="button"
												className="w-full text-left px-4 py-2 hover:bg-muted text-sm"
												onClick={() => selectCompany(c)}
											>
												{c.name}
											</button>
										))}
									</div>
								)}
								{form.watch("companyName") && (
									<p className="text-sm text-muted-foreground">
										Selected: <span className="font-medium text-foreground">{form.watch("companyName")}</span>
									</p>
								)}
							</div>

							{/* Optional fields */}
							<div className="grid gap-4 md:grid-cols-2">
								<FormField
									control={form.control}
									name="director"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Director (optional)</FormLabel>
											<FormControl>
												<Input placeholder="Director name" {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="cast"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Lead Cast (optional)</FormLabel>
											<FormControl>
												<Input placeholder="Actor 1, Actor 2, …" {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="budgetMYR"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Estimated Budget (MYR, optional)</FormLabel>
											<FormControl>
												<Input type="number" placeholder="5000000" {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="audience"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Target Audience</FormLabel>
											<Select onValueChange={field.onChange} value={field.value}>
												<FormControl>
													<SelectTrigger>
														<SelectValue />
													</SelectTrigger>
												</FormControl>
												<SelectContent>
													{["General", "Family", "Teen", "Adult"].map((v) => (
														<SelectItem key={v} value={v}>{v}</SelectItem>
													))}
												</SelectContent>
											</Select>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="language"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Language</FormLabel>
											<Select onValueChange={field.onChange} value={field.value}>
												<FormControl>
													<SelectTrigger>
														<SelectValue />
													</SelectTrigger>
												</FormControl>
												<SelectContent>
													{["Malay", "English", "Mandarin", "Tamil", "Other"].map((v) => (
														<SelectItem key={v} value={v}>{v}</SelectItem>
													))}
												</SelectContent>
											</Select>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="platform"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Distribution Platform</FormLabel>
											<Select onValueChange={field.onChange} value={field.value}>
												<FormControl>
													<SelectTrigger>
														<SelectValue />
													</SelectTrigger>
												</FormControl>
												<SelectContent>
													{["Cinema", "Streaming", "Both"].map((v) => (
														<SelectItem key={v} value={v}>{v}</SelectItem>
													))}
												</SelectContent>
											</Select>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>

							<FormField
								control={form.control}
								name="synopsis"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Synopsis (optional)</FormLabel>
										<FormControl>
											<Textarea
												placeholder="Brief description of your movie concept…"
												className="resize-none"
												rows={4}
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<Button
								type="submit"
								className="w-full"
								disabled={form.formState.isSubmitting}
							>
								{form.formState.isSubmitting ? "Running benchmark…" : "Run Benchmark"}
							</Button>
						</form>
					</Form>
				</CardContent>
			</Card>
		</div>
	)
}
