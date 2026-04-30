// src/routes/api/auth/session/+server.ts
import { error, json } from "@sveltejs/kit";
import { getAuth } from "$lib/server/firebase/auth";
import { logger } from "$logger";
import type { RequestHandler } from "./$types";

const SESSION_COOKIE = "session_token";
/** 14 days in seconds */
const MAX_AGE = 60 * 60 * 24 * 14;

/**
 * POST /api/auth/session
 *
 * Accepts a Firebase ID token in the request body, verifies it via the Admin
 * SDK, then sets an httpOnly `session_token` cookie so subsequent SSR requests
 * can identify the user without a client-side round-trip.
 *
 * DELETE /api/auth/session
 *
 * Clears the session cookie (sign-out).
 */
export const POST: RequestHandler = async ({ request, cookies }) => {
	let idToken: string;

	try {
		const body = await request.json();
		idToken = body.idToken;
	} catch {
		throw error(400, "Invalid request body.");
	}

	if (!idToken || typeof idToken !== "string") {
		throw error(400, "idToken is required.");
	}

	try {
		const decoded = await getAuth().verifyIdToken(idToken);
		logger.info("[api/auth/session] Setting session cookie for uid:", decoded.uid);

		cookies.set(SESSION_COOKIE, idToken, {
			httpOnly: true,
			secure: true,
			sameSite: "lax",
			path: "/",
			maxAge: MAX_AGE,
		});

		return json({ uid: decoded.uid });
	} catch (err) {
		logger.warn("[api/auth/session] Token verification failed:", err instanceof Error ? err.message : err);
		throw error(401, "Invalid ID token.");
	}
};

export const DELETE: RequestHandler = async ({ cookies }) => {
	logger.info("[api/auth/session] Clearing session cookie");
	cookies.delete(SESSION_COOKIE, { path: "/" });
	return json({ ok: true });
};
