import { pgTable, text, boolean, timestamp, json, integer, numeric } from "drizzle-orm/pg-core"

export const user = pgTable("user", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	email: text("email").notNull().unique(),
	emailVerified: boolean("emailVerified").notNull().default(false),
	image: text("image"),
	createdAt: timestamp("createdAt").notNull().defaultNow(),
	updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const session = pgTable("session", {
	id: text("id").primaryKey(),
	userId: text("userId")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	token: text("token").notNull().unique(),
	expiresAt: timestamp("expiresAt").notNull(),
	ipAddress: text("ipAddress"),
	userAgent: text("userAgent"),
	createdAt: timestamp("createdAt").notNull().defaultNow(),
	updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const account = pgTable("account", {
	id: text("id").primaryKey(),
	userId: text("userId")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	accountId: text("accountId").notNull(),
	providerId: text("providerId").notNull(),
	accessToken: text("accessToken"),
	refreshToken: text("refreshToken"),
	idToken: text("idToken"),
	accessTokenExpiresAt: timestamp("accessTokenExpiresAt"),
	refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt"),
	scope: text("scope"),
	password: text("password"),
	createdAt: timestamp("createdAt").notNull().defaultNow(),
	updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const verification = pgTable("verification", {
	id: text("id").primaryKey(),
	identifier: text("identifier").notNull(),
	value: text("value").notNull(),
	expiresAt: timestamp("expiresAt").notNull(),
	createdAt: timestamp("createdAt").notNull().defaultNow(),
	updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const boxOfficeFilm = pgTable("box_office_film", {
	id: text("id").primaryKey(),
	year: integer("year").notNull(),
	title: text("title").notNull(),
	producer: text("producer").notNull(),
	releaseDate: timestamp("release_date").notNull(),
	revenue: numeric("revenue", { precision: 10, scale: 2 }).notNull(),
	fetchedAt: timestamp("fetched_at").notNull().defaultNow(),
})

export const benchmarkRun = pgTable("benchmark_run", {
	id: text("id").primaryKey(),
	userId: text("userId")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	createdAt: timestamp("createdAt").notNull().defaultNow(),
	concept: json("concept").notNull(),
	result: json("result").notNull(),
})
