CREATE TABLE IF NOT EXISTS "box_office_film" (
	"id" text PRIMARY KEY NOT NULL,
	"year" integer NOT NULL,
	"title" text NOT NULL,
	"producer" text NOT NULL,
	"release_date" timestamp NOT NULL,
	"revenue" numeric(10, 2) NOT NULL,
	"fetched_at" timestamp DEFAULT now() NOT NULL
);
