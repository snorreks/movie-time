// src/routes/api/concierge/+server.ts
import { error, json } from "@sveltejs/kit";
import { checkRateLimit, getClientIP } from "$lib/server/api-security";
import { logger } from "$logger";

export const POST = async ({ request }) => {
	const clientIP = getClientIP(request);

	// Rate limiting
	if (!checkRateLimit(clientIP)) {
		logger.warn("[Concierge API] Rate limit exceeded for IP:", clientIP);
		throw error(429, "Too many requests. Please wait a minute.");
	}

	let prompt: string;
	let useAi: boolean = true;

	try {
		const body = await request.json();
		prompt = body.prompt;
		useAi = body.useAi !== false; // default to true if not specified
	} catch {
		throw error(400, "Invalid JSON body.");
	}

	if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
		throw error(400, "Prompt is required.");
	}

	if (prompt.length > 500) {
		throw error(400, "Prompt too long (max 500 characters).");
	}

	logger.info("[Concierge API] Processing prompt:", prompt.slice(0, 100), "useAi:", useAi);

	try {
		const { suggestMovie } = await import("$lib/server/genkit/index.js");
		const result = await suggestMovie(prompt, useAi);
		return json(result);
	} catch (err) {
		logger.error("[Concierge API] Error:", err);
		const message =
			err instanceof Error
				? err.message
				: "Failed to get movie suggestion. Please try again.";
		throw error(500, message);
	}
};
