import { NextRequest, NextResponse } from "next/server"
import { searchCompanies } from "@/lib/tmdb"

export async function GET(req: NextRequest) {
	const query = req.nextUrl.searchParams.get("q")?.trim()
	if (!query || query.length < 2) {
		return NextResponse.json([])
	}

	const companies = await searchCompanies(query)
	return NextResponse.json(companies)
}
