import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { benchmarkRun } from "@/lib/schema"
import { eq, desc } from "drizzle-orm"
import { headers } from "next/headers"

export async function GET() {
	const session = await auth.api.getSession({ headers: await headers() })
	if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

	const runs = await db
		.select()
		.from(benchmarkRun)
		.where(eq(benchmarkRun.userId, session.user.id))
		.orderBy(desc(benchmarkRun.createdAt))

	return NextResponse.json(runs)
}
