import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { scrapeAllYears } from "@/scripts/scrape-finas"

export async function POST() {
	const session = await auth.api.getSession({ headers: await headers() })
	if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

	try {
		const result = await scrapeAllYears()
		return NextResponse.json(result)
	} catch (e) {
		return NextResponse.json({ error: String(e) }, { status: 500 })
	}
}
