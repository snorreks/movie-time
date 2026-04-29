import { googleAI } from "@genkit-ai/googleai";
import { genkit, z } from "genkit"; // <-- Import z from genkit hereimport { TMDB_API_READ_ACCESS_TOKEN } from "$env/static/private";
import { logger } from "$logger";
import { TMDB_API_READ_ACCESS_TOKEN } from "$env/static/private";

const MODEL_GEMINI = "googleai/gemini-2.5-flash";
const OPENROUTER_MODEL = "google/gemini-2.5-flash";

export type ConciergeResult = {
	title: string;
	posterUrl: string;
	genre: string;
	year: number;
	rating: number;
	synopsis: string;
};

// Zod schema to enforce correct AI output
const MovieSuggestionSchema = z.object({
	title: z.string().describe("The exact title of the suggested movie"),
	year: z.number().optional().describe("The release year of the movie"),
});

/**
 * Helper to fetch factual movie data from TMDB
 */
async function fetchMovieFromTMDB(
	query: string,
	year?: number,
): Promise<ConciergeResult | null> {
	if (!TMDB_API_READ_ACCESS_TOKEN) {
		throw new Error(
			"TMDB_API_READ_ACCESS_TOKEN is missing in environment variables.",
		);
	}

	// 1. Search for the movie
	let searchUrl = `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(query)}&include_adult=false&language=en-US&page=1`;
	if (year) searchUrl += `&year=${year}`;

	const searchRes = await fetch(searchUrl, {
		headers: {
			Authorization: `Bearer ${TMDB_API_READ_ACCESS_TOKEN}`,
			accept: "application/json",
		},
	});

	const searchData = await searchRes.json();
	const firstResult = searchData.results?.[0];

	if (!firstResult) return null;

	// 2. Fetch specific movie details to get exact genres and better data
	const detailsRes = await fetch(
		`https://api.themoviedb.org/3/movie/${firstResult.id}?language=en-US`,
		{
			headers: {
				Authorization: `Bearer ${TMDB_API_READ_ACCESS_TOKEN}`,
				accept: "application/json",
			},
		},
	);

	const details = await detailsRes.json();

	return {
		title: details.title,
		posterUrl: details.poster_path
			? `https://image.tmdb.org/t/p/w500${details.poster_path}`
			: "", // Fallback if no poster exists
		genre:
			details.genres?.map((g: { name: string }) => g.name).join(", ") ||
			"Unknown",
		year: new Date(details.release_date).getFullYear(),
		rating: Math.round(details.vote_average * 10) / 10, // Round to 1 decimal place
		synopsis: details.overview || "No synopsis available.",
	};
}

/**
 *  Main function: Handles AI suggestion or direct TMDB searches
 */
export const suggestMovie = async (
	prompt: string,
	useAi: boolean = true,
): Promise<ConciergeResult> => {
	// ---------------------------------------------------------
	// DIRECT SEARCH FLOW (No AI)
	// ---------------------------------------------------------
	if (!useAi) {
		const movieData = await fetchMovieFromTMDB(prompt);
		if (!movieData) {
			throw new Error(`No movie found on TMDB for "${prompt}".`);
		}
		return movieData;
	}

	// ---------------------------------------------------------
	// AI SUGGESTION FLOW
	// ---------------------------------------------------------
	const openRouterKey = process.env.OPENROUTER_API_KEY;
	let suggestedTitle = "";
	let suggestedYear: number | undefined;

	// Try OpenRouter first
	if (openRouterKey) {
		try {
			const response = await fetch(
				"https://openrouter.ai/api/v1/chat/completions",
				{
					method: "POST",
					headers: {
						Authorization: `Bearer ${openRouterKey}`,
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						model: OPENROUTER_MODEL,
						messages: [
							{
								role: "user",
								content: `Suggest a single movie for: ${prompt}. Return ONLY a JSON object with keys "title" (string) and "year" (number).`,
							},
						],
						response_format: { type: "json_object" },
					}),
				},
			);

			if (response.ok) {
				const data = (await response.json()) as {
					choices?: Array<{ message?: { content?: string } }>;
				};
				const content = data.choices?.[0]?.message?.content;
				if (content) {
					const parsed = JSON.parse(content);
					suggestedTitle = parsed.title;
					suggestedYear = parsed.year;
				}
			}
		} catch (err) {
			logger.warn("[genkit] OpenRouter failed, falling back to Gemini:", err);
		}
	}

	// Fallback to Genkit/Gemini if OpenRouter failed or isn't configured
	if (!suggestedTitle) {
		try {
			const ai = genkit({ plugins: [googleAI()] });
			const result = await ai.generate({
				model: MODEL_GEMINI,
				prompt: `Suggest a single movie for this request: ${prompt}`,
				output: { schema: MovieSuggestionSchema },
			});

			// Extract the structured output enforced by Zod
			const output = result.output;

			if (!output) {
				throw new Error("Failed to parse Genkit structured output.");
			}

			suggestedTitle = output.title;
			suggestedYear = output.year;
		} catch (err) {
			logger.error("[genkit] Gemini also failed:", err);
			throw new Error(
				"AI service is temporarily unavailable. Please try again later.",
			);
		}
	}

	// Fetch the actual facts and poster from TMDB using the AI's suggestion
	const movieData = await fetchMovieFromTMDB(suggestedTitle, suggestedYear);

	if (!movieData) {
		throw new Error(
			`AI suggested "${suggestedTitle}", but it could not be found on TMDB.`,
		);
	}

	return movieData;
};
