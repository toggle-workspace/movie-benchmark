export interface TmdbMovie {
	id: number
	title: string
	release_date: string
	vote_average: number
	vote_count: number
	genre_ids: number[]
	revenue: number
	budget: number
	origin_country: string[]
}

export interface TmdbCompany {
	id: number
	name: string
}

export const TMDB_GENRES: Record<number, string> = {
	28: "Action",
	12: "Adventure",
	16: "Animation",
	35: "Comedy",
	80: "Crime",
	99: "Documentary",
	18: "Drama",
	10751: "Family",
	14: "Fantasy",
	36: "History",
	27: "Horror",
	10402: "Music",
	9648: "Mystery",
	10749: "Romance",
	878: "Science Fiction",
	53: "Thriller",
	10752: "War",
	37: "Western",
}

const BASE = "https://api.themoviedb.org/3"

async function tmdb<T>(
	path: string,
	params: Record<string, string> = {},
): Promise<T> {
	const url = new URL(`${BASE}${path}`)
	url.searchParams.set("api_key", process.env.TMDB_API_KEY!)
	for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
	const res = await fetch(url.toString(), { next: { revalidate: 0 } })
	if (!res.ok) throw new Error(`TMDB ${path} → ${res.status}`)
	return res.json()
}

export async function fetchCompanyFilms(companyId: number): Promise<TmdbMovie[]> {
	const data = await tmdb<{ results: TmdbMovie[] }>("/discover/movie", {
		with_companies: String(companyId),
		sort_by: "release_date.desc",
		page: "1",
	})
	return data.results.slice(0, 20)
}

export async function fetchRegionalFilms(
	genreId: number,
	releaseYear: number,
): Promise<TmdbMovie[]> {
	const data = await tmdb<{ results: TmdbMovie[] }>("/discover/movie", {
		with_genres: String(genreId),
		"primary_release_date.gte": `${releaseYear - 5}-01-01`,
		"primary_release_date.lte": `${releaseYear + 5}-12-31`,
		with_origin_country: "MY|ID|TH",
		sort_by: "vote_count.desc",
		page: "1",
	})
	return data.results
}

export async function fetchGlobalFilms(
	genreId: number,
	releaseYear: number,
): Promise<TmdbMovie[]> {
	const [page1, page2] = await Promise.all([
		tmdb<{ results: TmdbMovie[] }>("/discover/movie", {
			with_genres: String(genreId),
			"primary_release_date.gte": `${releaseYear - 1}-01-01`,
			"primary_release_date.lte": `${releaseYear + 1}-12-31`,
			sort_by: "popularity.desc",
			page: "1",
		}),
		tmdb<{ results: TmdbMovie[] }>("/discover/movie", {
			with_genres: String(genreId),
			"primary_release_date.gte": `${releaseYear - 1}-01-01`,
			"primary_release_date.lte": `${releaseYear + 1}-12-31`,
			sort_by: "popularity.desc",
			page: "2",
		}),
	])
	return [...page1.results, ...page2.results].slice(0, 50)
}

export async function fetchMovieDetails(movieId: number): Promise<TmdbMovie> {
	return tmdb<TmdbMovie>(`/movie/${movieId}`)
}

export async function searchCompanies(query: string): Promise<TmdbCompany[]> {
	const data = await tmdb<{ results: TmdbCompany[] }>("/search/company", {
		query,
	})
	return data.results.slice(0, 10)
}

export async function enrichWithRevenue(
	movies: TmdbMovie[],
	limit = 10,
): Promise<TmdbMovie[]> {
	const top = movies.slice(0, limit)
	const detailed = await Promise.all(
		top.map((m) => fetchMovieDetails(m.id).catch(() => m)),
	)
	return detailed
}
