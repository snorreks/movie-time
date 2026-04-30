import { googleAI } from "@genkit-ai/googleai";
import { genkit, z } from "genkit";
import { TMDB_API_READ_ACCESS_TOKEN } from "$env/static/private";
import { logger } from "$logger";

const MODEL_GEMINI = "googleai/gemini-2.5-flash";
const OPENROUTER_MODEL = "nvidia/nemotron-3-super-120b-a12b:free";

// Lazy initialization - only create Genkit instance when needed
let ai: ReturnType<typeof genkit> | null = null;

function getAI(): ReturnType<typeof genkit> {
	if (ai) return ai;

	const geminiApiKey = process.env.GEMINI_API_KEY;
	if (!geminiApiKey) {
		throw new Error("GEMINI_API_KEY is not set in environment variables.");
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
		throw new Error("Failed to initialize Genkit. Please check GEMINI_API_KEY.");
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
	logger.info("[TMDB] Searching for:", query, year ? `(year: ${year})` : '');

	if (!TMDB_API_READ_ACCESS_TOKEN) {
		logger.error("[TMDB] TMDB_API_READ_ACCESS_TOKEN is missing in environment variables.");
		throw new Error("TMDB_API_READ_ACCESS_TOKEN is missing in environment variables.");
	}

	// 1. Search for the movie
	let searchUrl = `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(query)}&include_adult=false&language=en-US&page=1`;
	if (year) searchUrl += `&year=${year}`;

	logger.info("[TMDB] Search URL:", searchUrl.replace(/key=[^&]+/, 'key=REDACTED'));

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
	logger.info("[TMDB] First result:", firstResult?.title, "(ID:", firstResult?.id, ")");

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
		logger.error("[TMDB] Error fetching details:", details.status_message || 'Unknown error');
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
): Promise<{ title: string; year?: number }> {
	const aiInstance = getAI();
	const result = await aiInstance.generate({
		model: MODEL_GEMINI,
		prompt: `Suggest a single movie for this request: ${prompt}`,
		output: { schema: MovieSuggestionSchema },
	});

	const output = result.output;
	if (!output) {
		throw new Error("Failed to parse Genkit structured output.");
	}

	return {
		title: output.title,
		year: output.year,
	};
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
	if (typeof useAi === 'string') {
		useAiBoolean = useAi.toLowerCase() !== 'false';
	} else {
		useAiBoolean = useAi !== false;
	}
	
	logger.info("[suggestMovie] Called with prompt:", prompt, "useAi:", useAiBoolean);

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

	// ---------------------------------------------------------
	// AI SUGGESTION FLOW
	// ---------------------------------------------------------
	let suggestedTitle = "";
	let suggestedYear: number | undefined;

	// Try OpenRouter first
	try {
		const openRouterResult = await suggestViaOpenRouter(prompt);
		if (openRouterResult) {
			suggestedTitle = openRouterResult.title;
			suggestedYear = openRouterResult.year;
			logger.info("[genkit] OpenRouter succeeded with:", suggestedTitle);
		}
	} catch (err) {
		logger.warn("[genkit] OpenRouter failed:", err);
	}

	// Fallback to Genkit/Gemini if OpenRouter failed or isn't configured
	if (!suggestedTitle) {
		try {
			logger.info("[genkit] Falling back to Genkit/Gemini...");
			const genkitResult = await suggestViaGenkit(prompt);
			suggestedTitle = genkitResult.title;
			suggestedYear = genkitResult.year;
			logger.info("[genkit] Genkit succeeded with:", suggestedTitle);
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
