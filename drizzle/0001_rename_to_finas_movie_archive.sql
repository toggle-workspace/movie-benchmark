ALTER TABLE "box_office_film" RENAME TO "finas_movie_archive";--> statement-breakpoint
ALTER TABLE "finas_movie_archive" RENAME COLUMN "producer" TO "distributor";--> statement-breakpoint
ALTER TABLE "finas_movie_archive" RENAME COLUMN "revenue" TO "gross_myr";--> statement-breakpoint
ALTER TABLE "finas_movie_archive" DROP COLUMN "release_date";--> statement-breakpoint
ALTER TABLE "finas_movie_archive" DROP COLUMN "fetched_at";--> statement-breakpoint
ALTER TABLE "finas_movie_archive" ADD COLUMN "genre_ids" json DEFAULT '[]'::json NOT NULL;--> statement-breakpoint
ALTER TABLE "finas_movie_archive" ALTER COLUMN "gross_myr" TYPE numeric(12, 2);--> statement-breakpoint
ALTER TABLE "finas_movie_archive" ADD COLUMN "admissions" integer NOT NULL DEFAULT 0;
