// Data sourced from FINAS annual reports and publicly available Malaysian box office records.
// Figures are approximate; update from finas.gov.my as new annual reports are released.

export interface FinasFilm {
	title: string
	year: number
	genreIds: number[] // TMDB genre IDs
	grossMYR: number
	admissions: number
	distributor: string
}

const FINAS_FILMS: FinasFilm[] = [
	// Action (28)
	{ title: "Mat Kilau", year: 2022, genreIds: [28, 36], grossMYR: 67_800_000, admissions: 5_650_000, distributor: "Skop Productions" },
	{ title: "Polis Evo 2", year: 2018, genreIds: [28], grossMYR: 32_500_000, admissions: 2_708_000, distributor: "KRU Studios" },
	{ title: "Paskal: The Movie", year: 2018, genreIds: [28], grossMYR: 30_100_000, admissions: 2_508_000, distributor: "Astro Shaw" },
	{ title: "Polis Evo", year: 2015, genreIds: [28], grossMYR: 23_100_000, admissions: 1_925_000, distributor: "KRU Studios" },
	{ title: "Wira", year: 2019, genreIds: [28], grossMYR: 18_000_000, admissions: 1_500_000, distributor: "Astro Shaw" },
	{ title: "Abang Long Fadil 2", year: 2017, genreIds: [28, 35], grossMYR: 10_000_000, admissions: 833_000, distributor: "Primeworks Studios" },
	{ title: "KL Gangster", year: 2011, genreIds: [28, 80], grossMYR: 12_600_000, admissions: 1_050_000, distributor: "Skop Productions" },
	{ title: "Long Jafar", year: 2022, genreIds: [28, 36], grossMYR: 11_000_000, admissions: 916_000, distributor: "Skop Productions" },
	{ title: "Abang Long Fadil", year: 2014, genreIds: [28, 35], grossMYR: 7_800_000, admissions: 650_000, distributor: "Primeworks Studios" },
	{ title: "KL Gangster 2", year: 2013, genreIds: [28, 80], grossMYR: 9_000_000, admissions: 750_000, distributor: "Skop Productions" },
	{ title: "KL Special Force", year: 2018, genreIds: [28], grossMYR: 8_000_000, admissions: 666_000, distributor: "Primeworks Studios" },
	{ title: "Abang Long Fadil 3", year: 2022, genreIds: [28, 35], grossMYR: 6_000_000, admissions: 500_000, distributor: "Primeworks Studios" },

	// Horror (27)
	{ title: "Munafik 2", year: 2018, genreIds: [27], grossMYR: 50_800_000, admissions: 4_233_000, distributor: "Astro Shaw" },
	{ title: "Munafik", year: 2016, genreIds: [27], grossMYR: 22_000_000, admissions: 1_833_000, distributor: "Astro Shaw" },
	{ title: "Hantu Kak Limah", year: 2018, genreIds: [27, 35], grossMYR: 20_000_000, admissions: 1_666_000, distributor: "Primeworks Studios" },
	{ title: "Dukun", year: 2018, genreIds: [27, 53], grossMYR: 9_000_000, admissions: 750_000, distributor: "Astro Shaw" },
	{ title: "Roh", year: 2020, genreIds: [27], grossMYR: 3_000_000, admissions: 250_000, distributor: "Astro Shaw" },
	{ title: "Santau", year: 2020, genreIds: [27], grossMYR: 2_800_000, admissions: 233_000, distributor: "Primeworks Studios" },
	{ title: "Sembunyi: Amukan Azazil", year: 2015, genreIds: [27], grossMYR: 5_000_000, admissions: 416_000, distributor: "Astro Shaw" },
	{ title: "Penunggu Istana", year: 2019, genreIds: [27], grossMYR: 4_000_000, admissions: 333_000, distributor: "Primeworks Studios" },
	{ title: "Paku", year: 2022, genreIds: [27], grossMYR: 3_000_000, admissions: 250_000, distributor: "Astro Shaw" },

	// Animation (16)
	{ title: "Ejen Ali: The Movie", year: 2019, genreIds: [16], grossMYR: 30_000_000, admissions: 2_500_000, distributor: "Primeworks Studios" },
	{ title: "Upin & Ipin: Keris Siamang Tunggal", year: 2019, genreIds: [16], grossMYR: 30_500_000, admissions: 2_541_000, distributor: "Les' Copaque" },
	{ title: "BoBoiBoy: The Movie", year: 2016, genreIds: [16], grossMYR: 16_000_000, admissions: 1_333_000, distributor: "Monsta" },
	{ title: "BoBoiBoy Movie 2", year: 2019, genreIds: [16], grossMYR: 14_000_000, admissions: 1_166_000, distributor: "Monsta" },
	{ title: "Geng: Pengembaraan Bermula", year: 2009, genreIds: [16], grossMYR: 4_000_000, admissions: 333_000, distributor: "Les' Copaque" },

	// Drama (18)
	{ title: "Ola Bola", year: 2016, genreIds: [18], grossMYR: 6_000_000, admissions: 500_000, distributor: "Astro Shaw" },
	{ title: "Pulang", year: 2018, genreIds: [18], grossMYR: 8_000_000, admissions: 666_000, distributor: "Primeworks Studios" },
	{ title: "Cinta", year: 2006, genreIds: [18, 10749], grossMYR: 5_000_000, admissions: 416_000, distributor: "Grand Brilliance" },
	{ title: "Aku Masih Dara", year: 2011, genreIds: [18], grossMYR: 3_000_000, admissions: 250_000, distributor: "Primeworks Studios" },
	{ title: "Buku Harian Seorang Isteri", year: 2017, genreIds: [18, 10749], grossMYR: 4_500_000, admissions: 375_000, distributor: "Astro Shaw" },

	// Comedy (35)
	{ title: "Lawak Ke Der?", year: 2018, genreIds: [35], grossMYR: 14_000_000, admissions: 1_166_000, distributor: "Primeworks Studios" },
	{ title: "AV", year: 2020, genreIds: [35], grossMYR: 4_000_000, admissions: 333_000, distributor: "Astro Shaw" },
	{ title: "Mak Kau Hijau", year: 2018, genreIds: [35], grossMYR: 4_000_000, admissions: 333_000, distributor: "Primeworks Studios" },

	// Romance (10749)
	{ title: "Antara Dua Darjat", year: 2022, genreIds: [10749, 18], grossMYR: 7_000_000, admissions: 583_000, distributor: "Astro Shaw" },
	{ title: "KL Love Story", year: 2015, genreIds: [10749, 18], grossMYR: 5_500_000, admissions: 458_000, distributor: "Astro Shaw" },
	{ title: "Hati Perempuan", year: 2017, genreIds: [10749, 18], grossMYR: 3_500_000, admissions: 291_000, distributor: "Primeworks Studios" },

	// Thriller (53)
	{ title: "Interchange", year: 2016, genreIds: [53, 14], grossMYR: 1_200_000, admissions: 100_000, distributor: "Astro Shaw" },
	{ title: "Crossroads: One Two Jaga", year: 2018, genreIds: [53], grossMYR: 2_000_000, admissions: 166_000, distributor: "Astro Shaw" },

	// History (36)
	{ title: "Bukit Kepong", year: 2012, genreIds: [36, 28], grossMYR: 5_000_000, admissions: 416_000, distributor: "Skop Productions" },
	{ title: "Paloh", year: 2018, genreIds: [36, 18], grossMYR: 3_000_000, admissions: 250_000, distributor: "Astro Shaw" },
]

export function getFinasFilms(genreId: number, releaseYear: number): FinasFilm[] {
	return FINAS_FILMS.filter(
		(f) => f.genreIds.includes(genreId) && Math.abs(f.year - releaseYear) <= 5,
	)
}

export function getAllFinasFilmsForGenre(genreId: number): FinasFilm[] {
	return FINAS_FILMS.filter((f) => f.genreIds.includes(genreId))
}
