// src/lib/server/genkit/index.ts

import { googleAI } from "@genkit-ai/googleai";
import { genkit } from "genkit";
import { logger } from "$logger";

const MODEL_GEMINI = "googleai/gemini-2.5-flash";
const OPENROUTER_MODEL = "google/gemini-2.5-flash";

type ConciergeResult = {
	title: string;
	posterUrl: string;
	genre: string;
	year: number;
	rating: number;
	synopsis: string;
};

/** Try OpenRouter first, fallback to Gemini via Genkit */
export const suggestMovie = async (
	prompt: string,
): Promise<ConciergeResult> => {
	const openRouterKey = process.env.OPENROUTER_API_KEY;

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
								content: `Suggest a movie for: ${prompt}. Return JSON with title, posterUrl, genre, year, rating, synopsis.`,
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
					return JSON.parse(content) as ConciergeResult;
				}
			}
		} catch (err) {
			logger.warn("[genkit] OpenRouter failed, falling back to Gemini:", err);
		}
	}

	// Fallback to Genkit/Gemini
	try {
		const ai = genkit({ plugins: [googleAI()] });
		const result = await ai.generate({
			model: MODEL_GEMINI,
			prompt: `Suggest a movie for: ${prompt}. Return JSON with title, posterUrl, genre, year, rating, synopsis.`,
		});
		return JSON.parse(result.text) as ConciergeResult;
	} catch (err) {
		logger.error("[genkit] Gemini also failed:", err);
		throw new Error(
			"AI service is temporarily unavailable. Please try again later.",
		);
	}
};
