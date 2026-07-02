import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { headers } from "next/headers"

export async function GET() {
	const session = await auth.api.getSession({ headers: await headers() })
	if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

	const runs = await db.benchmarkRun.findMany({
		where: { userId: session.user.id },
		orderBy: { createdAt: "desc" },
		select: {
			id: true,
			createdAt: true,
			concept: true,
			result: true,
		},
	})

	return NextResponse.json(runs)
}
