import { TMDB_API_READ_ACCESS_TOKEN } from "$env/static/private";
import { logger } from "$logger";

export type ConciergeResult = {
	title: string;
	posterUrl: string;
	genre: string;
	year: number;
	rating: number;
	synopsis: string;
};

/**
 * Search TMDB directly without any Genkit/Google AI imports
 */
export async function searchTMDBDirectly(
	query: string,
): Promise<ConciergeResult> {
	logger.info("[TMDB-Direct] Searching for:", query);

	if (!TMDB_API_READ_ACCESS_TOKEN) {
		logger.error("[TMDB-Direct] TMDB_API_READ_ACCESS_TOKEN is missing in environment variables.");
		throw new Error("TMDB_API_READ_ACCESS_TOKEN is missing in environment variables.");
	}

	// 1. Search for the movie
	const searchUrl = `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(query)}&include_adult=false&language=en-US&page=1`;

	logger.info("[TMDB-Direct] Search URL:", searchUrl.replace(/key=[^&]+/, "key=REDACTED"));

	const searchRes = await fetch(searchUrl, {
		headers: {
			Authorization: `Bearer ${TMDB_API_READ_ACCESS_TOKEN}`,
			accept: "application/json",
		},
	});

	logger.info("[TMDB-Direct] Search response status:", searchRes.status);

	const searchData = await searchRes.json();

	if (!searchData.results || searchData.results.length === 0) {
		logger.warn("[TMDB-Direct] No results found for:", query);
		throw new Error(`No movie found on TMDB for "${query}".`);
	}

	const firstResult = searchData.results?.[0];
	logger.info("[TMDB-Direct] First result:", firstResult?.title, "(ID:", firstResult?.id, ")");

	// 2. Fetch specific movie details
	logger.info("[TMDB-Direct] Fetching details for ID:", firstResult.id);
	const detailsRes = await fetch(
		`https://api.themoviedb.org/3/movie/${firstResult.id}?language=en-US`,
		{
			headers: {
				Authorization: `Bearer ${TMDB_API_READ_ACCESS_TOKEN}`,
				accept: "application/json",
			},
		},
	);

	logger.info("[TMDB-Direct] Details response status:", detailsRes.status);

	const details = await detailsRes.json();

	if (!details || details.status_code) {
		logger.error("[TMDB-Direct] Error fetching details:", details.status_message || "Unknown error");
		throw new Error("Failed to fetch movie details from TMDB.");
	}

	logger.info("[TMDB-Direct] Successfully got details for:", details.title);

	return {
		title: details.title,
		posterUrl: details.poster_path
			? `https://image.tmdb.org/t/p/w500${details.poster_path}`
			: "",
		genre:
			details.genres?.map((g: { name: string }) => g.name).join(", ") ||
			"Unknown",
		year: new Date(details.release_date).getFullYear(),
		rating: Math.round(details.vote_average * 10) / 10,
		synopsis: details.overview || "No synopsis available.",
	};
}
