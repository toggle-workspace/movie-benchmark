import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { db } from "@/lib/db"

export const auth = betterAuth({
	database: prismaAdapter(db, { provider: "postgresql" }),
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
		storage: "database",
	},
})
