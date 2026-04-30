import { googleAI } from "@genkit-ai/googleai";
import { genkit, z } from "genkit";
import { TMDB_API_READ_ACCESS_TOKEN } from "$env/static/private";
import { logger } from "$logger";

const MODEL_GEMINI = "googleai/gemini-3.1-flash-lite-preview";
const OPENROUTER_MODEL = "nvidia/nemotron-3-super-120b-a12b:free";

// Lazy initialization - only create Genkit instance when needed
let ai: ReturnType<typeof genkit> | null = null;

function getAI(): ReturnType<typeof genkit> | null {
	if (ai) return ai;

	const geminiApiKey = process.env.GEMINI_API_KEY;
	if (!geminiApiKey) {
		logger.warn(
			"[genkit] GEMINI_API_KEY missing, skipping Genkit initialization.",
		);
		return null;
	}

	try {
		ai = genkit({
			plugins: [
				googleAI({
					apiKey: geminiApiKey,
				}),
			],
		});
		logger.info("[genkit] Genkit initialized successfully");
		return ai;
	} catch (err) {
		logger.error("[genkit] Failed to initialize Genkit:", err);
		return null;
	}
}

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
	logger.info("[TMDB] Searching for:", query, year ? `(year: ${year})` : "");

	if (!TMDB_API_READ_ACCESS_TOKEN) {
		logger.error(
			"[TMDB] TMDB_API_READ_ACCESS_TOKEN is missing in environment variables.",
		);
		throw new Error(
			"TMDB_API_READ_ACCESS_TOKEN is missing in environment variables.",
		);
	}

	// 1. Search for the movie
	let searchUrl = `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(query)}&include_adult=false&language=en-US&page=1`;
	if (year) searchUrl += `&year=${year}`;

	logger.info(
		"[TMDB] Search URL:",
		searchUrl.replace(/key=[^&]+/, "key=REDACTED"),
	);

	const searchRes = await fetch(searchUrl, {
		headers: {
			Authorization: `Bearer ${TMDB_API_READ_ACCESS_TOKEN}`,
			accept: "application/json",
		},
	});

	logger.info("[TMDB] Search response status:", searchRes.status);

	const searchData = await searchRes.json();

	if (!searchData.results || searchData.results.length === 0) {
		logger.warn("[TMDB] No results found for:", query);
		return null;
	}

	const firstResult = searchData.results?.[0];
	logger.info(
		"[TMDB] First result:",
		firstResult?.title,
		"(ID:",
		firstResult?.id,
		")",
	);

	// 2. Fetch specific movie details to get exact genres and better data
	logger.info("[TMDB] Fetching details for ID:", firstResult.id);
	const detailsRes = await fetch(
		`https://api.themoviedb.org/3/movie/${firstResult.id}?language=en-US`,
		{
			headers: {
				Authorization: `Bearer ${TMDB_API_READ_ACCESS_TOKEN}`,
				accept: "application/json",
			},
		},
	);

	logger.info("[TMDB] Details response status:", detailsRes.status);

	const details = await detailsRes.json();

	if (!details || details.status_code) {
		logger.error(
			"[TMDB] Error fetching details:",
			details.status_message || "Unknown error",
		);
		return null;
	}

	logger.info("[TMDB] Successfully got details for:", details.title);
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

/**
 * Use OpenRouter API to get movie suggestion
 */
async function suggestViaOpenRouter(
	prompt: string,
): Promise<{ title: string; year?: number } | null> {
	const openRouterKey = process.env.OPENROUTER_API_KEY;
	if (!openRouterKey) return null;

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

		if (!response.ok) return null;

		const data = (await response.json()) as {
			choices?: Array<{ message?: { content?: string } }>;
		};
		const content = data.choices?.[0]?.message?.content;
		if (!content) return null;

		const parsed = JSON.parse(content);
		return {
			title: parsed.title,
			year: parsed.year,
		};
	} catch (err) {
		logger.warn("[genkit] OpenRouter failed:", err);
		return null;
	}
}

/**
 * Use Genkit with Zod schema to get movie suggestion
 */
async function suggestViaGenkit(
	prompt: string,
): Promise<{ title: string; year?: number } | null> {
	try {
		const aiInstance = getAI();

		if (!aiInstance) return null;

		const result = await aiInstance.generate({
			model: MODEL_GEMINI,
			prompt: `Suggest a single movie for this request: ${prompt}`,
			output: { schema: MovieSuggestionSchema },
		});

		const output = result.output;
		if (!output) return null;

		return {
			title: output.title,
			year: output.year,
		};
	} catch (error) {
		logger.error("[genkit] suggestViaGenkit failed:", error);
		return null;
	}
}

/**
 * Main function: Handles AI suggestion or direct TMDB searches
 */
export const suggestMovie = async (
	prompt: string,
	useAi: unknown = true,
): Promise<ConciergeResult> => {
	// Normalize useAi to boolean (handles string "false" from JSON)
	let useAiBoolean: boolean;
	if (typeof useAi === "string") {
		useAiBoolean = useAi.toLowerCase() !== "false";
	} else {
		useAiBoolean = useAi !== false;
	}

	logger.info(
		"[suggestMovie] Called with prompt:",
		prompt,
		"useAi:",
		useAiBoolean,
	);

	// ---------------------------------------------------------
	// DIRECT SEARCH FLOW (No AI - uses TMDB only)
	// ---------------------------------------------------------
	if (!useAiBoolean) {
		logger.info("[suggestMovie] Direct TMDB search for:", prompt);
		try {
			const movieData = await fetchMovieFromTMDB(prompt);
			if (!movieData) {
				logger.warn("[suggestMovie] No movie found on TMDB for:", prompt);
				throw new Error(`No movie found on TMDB for "${prompt}".`);
			}
			logger.info("[suggestMovie] TMDB found movie:", movieData.title);
			return movieData;
		} catch (err) {
			logger.error("[suggestMovie] TMDB search failed:", err);
			throw err;
		}
	}

	let suggestedTitle = "";
	let suggestedYear: number | undefined;

	// ---------------------------------------------------------
	// FLOW 1: AI ASSISTED (Genkit -> OpenRouter)
	// ---------------------------------------------------------
	if (useAiBoolean) {
		// Try Genkit/Gemini First
		logger.info("[suggestMovie] Attempting Genkit...");
		const genkitResult = await suggestViaGenkit(prompt);

		if (genkitResult) {
			suggestedTitle = genkitResult.title;
			suggestedYear = genkitResult.year;
		} else {
			// Try OpenRouter Second
			logger.info(
				"[suggestMovie] Genkit failed/skipped. Attempting OpenRouter...",
			);
			const orResult = await suggestViaOpenRouter(prompt);
			if (orResult) {
				suggestedTitle = orResult.title;
				suggestedYear = orResult.year;
			}
		}
	}

	// ---------------------------------------------------------
	// FLOW 2: FINAL FALLBACK (Direct TMDB Search)
	// ---------------------------------------------------------
	// If AI was disabled OR all AI providers failed, use the raw prompt
	if (!suggestedTitle) {
		logger.info(
			"[suggestMovie] Using direct prompt for TMDB search as fallback.",
		);
		suggestedTitle = prompt;
	}

	try {
		const movieData = await fetchMovieFromTMDB(suggestedTitle, suggestedYear);

		if (!movieData) {
			// If the AI gave us a hallucination, try one last time with the raw prompt
			if (suggestedTitle !== prompt) {
				logger.warn(
					`[suggestMovie] AI suggested "${suggestedTitle}" but TMDB found nothing. Falling back to raw prompt.`,
				);
				const retryData = await fetchMovieFromTMDB(prompt);
				if (retryData) return retryData;
			}
			throw new Error(`Could not find any movies for "${prompt}".`);
		}

		return movieData;
	} catch (err) {
		logger.error("[suggestMovie] Final execution failed:", err);
		throw err;
	}
};
