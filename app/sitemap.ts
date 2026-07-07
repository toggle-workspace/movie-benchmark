import type { MetadataRoute } from "next";

const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export default function sitemap(): MetadataRoute.Sitemap {
	return [
		{ url: `${base}/dashboard/benchmark`, priority: 1 },
		{ url: `${base}/dashboard/history`, priority: 0.8 },
		{ url: `${base}/dashboard/box-office`, priority: 0.8 },
		{ url: `${base}/login`, priority: 0.5 },
		{ url: `${base}/register`, priority: 0.5 },
	];
}
