import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { headers } from "next/headers"

export async function GET(
	_req: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const session = await auth.api.getSession({ headers: await headers() })
	if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

	const { id } = await params
	const run = await db.benchmarkRun.findFirst({
		where: { id, userId: session.user.id },
	})

	if (!run) return NextResponse.json({ error: "Not found" }, { status: 404 })
	return NextResponse.json(run)
}

export async function DELETE(
	_req: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const session = await auth.api.getSession({ headers: await headers() })
	if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

	const { id } = await params
	const run = await db.benchmarkRun.findFirst({
		where: { id, userId: session.user.id },
	})

	if (!run) return NextResponse.json({ error: "Not found" }, { status: 404 })

	await db.benchmarkRun.delete({ where: { id } })
	return NextResponse.json({ success: true })
}
