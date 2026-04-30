// src/hooks.server.ts
import { getAuth } from "$lib/server/firebase/auth";
import { logger } from "$logger";
import type { Handle } from "@sveltejs/kit";

const SESSION_COOKIE = "session_token";

/**
 * Reads the `session_token` cookie, verifies it as a Firebase ID token via the
 * Admin SDK, and populates `locals.uid` for downstream load functions.
 */
export const handle: Handle = async ({ event, resolve }) => {
	const token = event.cookies.get(SESSION_COOKIE);

	if (token) {
		try {
			const decoded = await getAuth().verifyIdToken(token);
			event.locals.uid = decoded.uid;
			logger.debug("[hooks.server] Verified session token for uid:", decoded.uid);
		} catch (err) {
			logger.warn("[hooks.server] Invalid session token, clearing cookie:", err instanceof Error ? err.message : err);
			event.cookies.delete(SESSION_COOKIE, { path: "/" });
			event.locals.uid = undefined;
		}
	} else {
		event.locals.uid = undefined;
	}

	return resolve(event);
};
