import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { db } from "@/lib/db"
import * as schema from "@/lib/schema"

export const auth = betterAuth({
	database: drizzleAdapter(db, { provider: "pg", schema }),
	emailAndPassword: { enabled: true },
	session: {
		cookieCache: {
			enabled: true,
			maxAge: 60 * 5,
			strategy: "jwt",
		},
	},
	rateLimit: {
		enabled: true,
	},
})
