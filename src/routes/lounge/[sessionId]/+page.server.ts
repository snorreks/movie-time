// src/routes/lounge/[sessionId]/+page.server.ts
import { error } from "@sveltejs/kit";
import { getFirestore } from "$lib/server/firebase/database";
import { logger } from "$logger";
import type { PageServerLoad } from "./$types";

/** Loads the session to validate it exists before rendering the lounge. */
export const load: PageServerLoad = async ({ params }) => {
	const sessionId = params.sessionId;
	logger.debug("[+page.server.ts] Loading session with ID:", sessionId);
	const db = getFirestore();
	const sessionSnap = await db.collection("sessions").doc(sessionId).get();

	logger.debug(
		"[+page.server.ts] Session snapshot exists:",
		sessionSnap.exists,
	);

	if (!sessionSnap.exists) {
		logger.warn("[+page.server.ts] Session not found:", sessionId);
		throw error(404, "Session not found.");
	}

	return { sessionId };
};
