import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(req: NextRequest) {
	const { pathname } = req.nextUrl
	const sessionCookie =
		req.cookies.get("better-auth.session_token") ??
		req.cookies.get("__Secure-better-auth.session_token")

	const isAuthRoute =
		pathname.startsWith("/login") || pathname.startsWith("/register")
	const isProtected =
		pathname.startsWith("/dashboard") ||
		pathname.startsWith("/api/benchmark")

	if (isProtected && !sessionCookie) {
		const loginUrl = new URL("/login", req.url)
		loginUrl.searchParams.set("callbackUrl", pathname)
		return NextResponse.redirect(loginUrl)
	}

	if (isAuthRoute && sessionCookie) {
		return NextResponse.redirect(new URL("/dashboard/benchmark", req.url))
	}

	return NextResponse.next()
}

export const config = {
	matcher: ["/dashboard/:path*", "/api/benchmark/:path*", "/login", "/register"],
}
