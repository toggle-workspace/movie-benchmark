const FALLBACK_RATE = 0.236 // ~4.24 MYR/USD

export async function getMyrToUsdRate(): Promise<number> {
	const res = await fetch(
		"https://api.data.gov.my/data-catalogue?id=exchangerates_daily_0900&limit=1&sort=-date&filter=rate_type:middle",
		{ next: { revalidate: 3600 } },
	)
	if (!res.ok) return FALLBACK_RATE
	const data = await res.json()
	const usdPerMyr = data?.[0]?.usd
	return typeof usdPerMyr === "number" && usdPerMyr > 0 ? 1 / usdPerMyr : FALLBACK_RATE
}
